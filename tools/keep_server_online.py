"""Keep the explicitly configured Windows BDS online without deploying packs.

No running server is stopped or restarted. A local hold.json {"hold": true}
only prevents future launches; it does not terminate a live process. Use that
hold before a later, explicitly authorized maintenance/shutdown operation.
"""
from pathlib import Path
import argparse,ctypes,datetime,hashlib,json,os,subprocess,threading,time

def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()

def write(path,value):
    tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps(value,indent=2),encoding='utf-8');os.replace(tmp,path)

def server_pids(executable):
    command="@(Get-CimInstance Win32_Process -Filter \"Name='bedrock_server.exe'\" | Select-Object ProcessId,ExecutablePath) | ConvertTo-Json -Compress"
    result=subprocess.run(['powershell','-NoProfile','-Command',command],capture_output=True,text=True,creationflags=subprocess.CREATE_NO_WINDOW,timeout=20,check=True)
    rows=json.loads(result.stdout.strip()or'[]');rows=rows if isinstance(rows,list)else[rows]
    normalize=lambda p:os.path.normcase(os.path.normpath(str(p)))
    return [int(p['ProcessId'])for p in rows if normalize(p.get('ExecutablePath')or'')==normalize(executable)]

def launch_needed(existing,held,clock,retry_at):
    return not existing and not held and clock>=retry_at

def authorized_stop(request,held,pid):
    return held and request.get('action')=='stop' and request.get('serverPid')==pid and request.get('explicitUserRequest')is True

def acquire_mutex(executable):
    kernel=ctypes.WinDLL('kernel32',use_last_error=True)
    kernel.CreateMutexW.argtypes=[ctypes.c_void_p,ctypes.c_bool,ctypes.c_wchar_p]
    kernel.CreateMutexW.restype=ctypes.c_void_p
    name='Local\\WARLAND_KEEP_'+hashlib.sha256(str(executable).casefold().encode()).hexdigest()[:24]
    handle=kernel.CreateMutexW(None,False,name)
    if not handle:raise ctypes.WinError(ctypes.get_last_error())
    if ctypes.get_last_error()==183:
        kernel.CloseHandle.argtypes=[ctypes.c_void_p];kernel.CloseHandle(handle);return None
    return handle

def run(server,state):
    if os.name!='nt':raise RuntimeError('This launcher is Windows-only')
    server=server.resolve();state=state.resolve();exe=server/'bedrock_server.exe'
    if not exe.is_file():raise FileNotFoundError(exe)
    props=dict(line.split('=',1)for line in (server/'server.properties').read_text(encoding='utf-8-sig').splitlines()if '='in line and not line.startswith('#'))
    if props.get('server-port')!='19152' or props.get('level-name')!='WARLAND_LAB':raise RuntimeError('Not the approved project server')
    if not (server/'worlds/WARLAND_LAB/level.dat').is_file():raise RuntimeError('Refuse to create a different world')
    mutex=acquire_mutex(exe)
    if mutex is None:return
    state.mkdir(parents=True,exist_ok=True)
    kernel=ctypes.WinDLL('kernel32',use_last_error=True)
    kernel.SetThreadExecutionState.argtypes=[ctypes.c_uint];kernel.SetThreadExecutionState.restype=ctypes.c_uint
    child=None;retry_at=0;starts=0;failures=0;ready=threading.Event();log=None;last_error=None
    def consume(process,path):
        with path.open('ab',buffering=0)as stream:
            for line in iter(process.stdout.readline,b''):
                stream.write(line)
                if b'Server started.'in line:ready.set()
    def event(kind,**data):
        with (state/'events.jsonl').open('a',encoding='utf-8')as f:f.write(json.dumps({'at':now(),'event':kind,**data})+'\n')
    event('supervisor_started',pid=os.getpid(),server=str(server))
    while True:
        try:
            held=False
            hold_file=state/'hold.json'
            if hold_file.exists():held=json.loads(hold_file.read_text(encoding='utf-8')).get('hold')is True
            # Prevent automatic idle sleep while serving; display sleep and a
            # manual Windows shutdown/sleep remain under the user's control.
            kernel.SetThreadExecutionState(0x80000000 if held else 0x80000001)
            if child is not None and child.poll()is not None:
                uptime=time.monotonic()-started_at;code=child.returncode;child.stdin.close();child=None;ready.clear()
                failures=0 if uptime>120 else failures+1
                delay=min(60,5*2**min(failures,4));retry_at=time.monotonic()+delay
                event('server_exited',code=code,retrySeconds=delay);last_error='BDS exited: '+str(code)
            # A CIM failure must not be treated as proof the server is absent.
            existing=[child.pid]if child is not None else server_pids(exe)
            if launch_needed(existing,held,time.monotonic(),retry_at):
                log=state/('server-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'.log')
                ready.clear()
                child=subprocess.Popen([str(exe)],cwd=server,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
                started_at=time.monotonic();starts+=1;existing=[child.pid]
                threading.Thread(target=consume,args=(child,log),daemon=True).start()
                event('server_started',serverPid=child.pid,log=str(log));last_error=None
            # This inbox is diagnostic only; it cannot send stop, reload, or
            # arbitrary commands. A nonce prevents replaying an old request.
            request=state/'probe.json'
            if child is not None and ready.is_set() and request.exists():
                probe=json.loads(request.read_text(encoding='utf-8'))
                if probe.get('serverPid')==child.pid and probe.get('command')=='list':
                    child.stdin.write(b'list\n');child.stdin.flush();event('list_probe',nonce=probe.get('nonce'))
                request.unlink()
            # Reserved for a NEW explicit user order. A hold alone never stops
            # the server, and an old request cannot target a replacement PID.
            control=state/'control.json'
            if child is not None and control.exists():
                request=json.loads(control.read_text(encoding='utf-8'))
                if authorized_stop(request,held,child.pid):
                    child.stdin.write(b'stop\n');child.stdin.flush();event('explicit_user_stop',serverPid=child.pid)
                control.unlink()
            write(state/'status.json',{'at':now(),'supervisorPid':os.getpid(),'server':str(server),'port':19152,'serverPids':existing,'running':bool(existing),'ready':bool(child is not None and ready.is_set()),'managedChild':child is not None,'held':held,'starts':starts,'log':str(log)if log else None,'error':last_error})
        except Exception as exc:
            last_error=str(exc);event('supervisor_error',message=last_error)
        time.sleep(5)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--server',type=Path,required=True);parser.add_argument('--state',type=Path,required=True);a=parser.parse_args();run(a.server,a.state)
