"""Load the complete addon in a NEW temporary BDS; never stop an existing BDS.

Uses the already-approved settings of a closed lab, not an official world's DB.
This verifies native loading and registries, not client visuals or world migration.
"""
from pathlib import Path
import argparse, hashlib, json, queue, re, shutil, subprocess, threading, time

def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,v):p.write_text(json.dumps(v,indent=2),encoding='utf-8')

def processes():
    raw=subprocess.check_output(['powershell','-NoProfile','-Command',
        "@(Get-CimInstance Win32_Process -Filter \"Name = 'bedrock_server.exe'\" | Select-Object ProcessId,ExecutablePath) | ConvertTo-Json -Compress"],text=True).strip()
    value=json.loads(raw or '[]');return value if isinstance(value,list) else [value]

def run(candidate,source,out,biomes_probe=False,past_world=None):
    candidate=candidate.resolve();source=source.resolve();out=out.resolve()
    if out.exists():raise RuntimeError('Use a fresh isolated output')
    before=processes()
    if any(str(p.get('ExecutablePath','')).lower()==str(source/'bedrock_server.exe').lower() for p in before):raise RuntimeError('Source lab is open')
    version=subprocess.check_output(['powershell','-NoProfile','-Command',f"(Get-Item -LiteralPath '{source / 'bedrock_server.exe'}').VersionInfo.FileVersion"],text=True).strip()
    if version!='1.26.60.6':raise RuntimeError('Unapproved BDS version')
    ports=subprocess.run(['powershell','-NoProfile','-Command',
        "if ((Get-NetUDPEndpoint -LocalPort 19172,19173 -ErrorAction SilentlyContinue) -or (Get-NetTCPConnection -LocalPort 19172,19173 -State Listen -ErrorAction SilentlyContinue)) { exit 1 }"],capture_output=True)
    if ports.returncode:raise RuntimeError('Test ports are occupied')
    server=out/'server';server.mkdir(parents=True)
    for name in ['bedrock_server.exe','config','data','definitions','resource_packs','behavior_packs','profanity_filter.wlist']:
        src=source/name
        if src.is_dir():shutil.copytree(src,server/name)
        elif src.is_file():shutil.copy2(src,server/name)
    for dll in source.glob('*.dll'):shutil.copy2(dll,server/dll.name)
    world=server/'worlds/WARLAND_LAB';world.mkdir(parents=True)
    template=source/'worlds/WARLAND_LAB/level.dat'
    shutil.copy2(template,world/'level.dat')
    if past_world:
        past_world=past_world.resolve()
        # Only a disposable preparation stage, never an active client world.
        if not (past_world/'.warland-past-stage').is_file():raise RuntimeError('Past input must be a closed preparation stage')
        if any(str(past_world).lower().startswith(str(Path(p.get('ExecutablePath') or '').parent).lower()) for p in before):raise RuntimeError('Past stage is in a running server')
        shutil.copytree(past_world/'db',world/'db')
        shutil.copy2(past_world/'level.dat',world/'level.dat')
    (world/'levelname.txt').write_text('WARLAND complete smoke - disposable')
    for kind,name in [('behavior','WARLAND_BP'),('resource','WARLAND_RP')]:
        shutil.copytree(candidate/name,world/f'{kind}_packs'/name)
        h=read(candidate/name/'manifest.json')['header'];write(world/f'world_{kind}_packs.json',[{'pack_id':h['uuid'],'version':h['version']}])
    bp=world/'behavior_packs/WARLAND_BP'
    ids={category:[] for category in ['entities','items','blocks']}
    for category,tag in [('entities','minecraft:entity'),('items','minecraft:item'),('blocks','minecraft:block')]:
        for f in (bp/category).rglob('*.json'):
            value=read(f).get(tag,{}).get('description',{}).get('identifier')
            if value:ids[category].append(value)
    probe="""import {world,system,EntityTypes,ItemTypes,BlockTypes} from '@minecraft/server';
const expected=EXPECTED;
system.runTimeout(()=>{
 const checks=[];
 try {
  for(const [kind,registry] of [['entities',EntityTypes],['items',ItemTypes],['blocks',BlockTypes]])
   for(const id of expected[kind])checks.push({name:kind+':'+id,passed:!!registry.get(id)});
  world.setDynamicProperty('warland:unified_probe','complete');
  checks.push({name:'unified properties readable',passed:world.getDynamicProperty('warland:unified_probe')==='complete'});
  world.setDynamicProperty('warland:unified_probe',undefined);
  console.warn('[UNIFIED_RESULT] '+JSON.stringify({passed:checks.every(c=>c.passed),checks}));
 }catch(e){console.warn('[UNIFIED_RESULT] '+JSON.stringify({passed:false,error:String(e),checks}));}
},160);
""".replace('EXPECTED',json.dumps(ids))
    (bp/'scripts/unified-probe.js').write_text(probe,encoding='utf-8')
    with (bp/'scripts/main.js').open('a',encoding='utf-8') as f:f.write("\nimport './unified-probe.js';\n")
    if biomes_probe:
        shutil.copy2(Path(__file__).with_name('biomes-native-probe.js'),bp/'scripts/biomes-probe.js')
        with (bp/'scripts/main.js').open('a',encoding='utf-8') as f:f.write("\nimport './biomes-probe.js';\n")
        manifest=read(bp/'manifest.json')
        manifest['dependencies'].append({'module_name':'@minecraft/server-gametest','version':'1.0.0-beta'})
        write(bp/'manifest.json',manifest)
    if past_world:
        shutil.copy2(Path(__file__).with_name('past-arrival-native-probe.js'),bp/'scripts/past-arrival-probe.js')
        with (bp/'scripts/main.js').open('a',encoding='utf-8')as f:f.write("\nimport './past-arrival-probe.js';\n")
        manifest=read(bp/'manifest.json')
        if not any(d.get('module_name')=='@minecraft/server-gametest' for d in manifest['dependencies']):manifest['dependencies'].append({'module_name':'@minecraft/server-gametest','version':'1.0.0-beta'})
        write(bp/'manifest.json',manifest)
    (server/'server.properties').write_text('\n'.join([
        'server-name=WARLAND unified disposable check','level-name=WARLAND_LAB','server-ip=127.0.0.1',
        'server-port=19172','server-portv6=19173','server-udp-ports=19172','transport=nethernet',
        'enable-lan-visibility=false','online-mode=true','allow-list=true','allow-cheats=true',
        'gamemode=creative','difficulty=peaceful','view-distance=4','tick-distance=4',
        'content-log-console-output-enabled=true','texturepack-required=true'])+'\n')
    write(server/'allowlist.json',[]);write(server/'permissions.json',[])
    proc=subprocess.Popen([str(server/'bedrock_server.exe')],cwd=server,stdin=subprocess.PIPE,stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,text=True,encoding='utf-8',errors='replace',creationflags=subprocess.CREATE_NO_WINDOW)
    q=queue.Queue();lines=[];result=None;biomes_result=None;past_result=None;stopping=False;deadline=time.monotonic()+140
    def reader():
        for line in proc.stdout:q.put(line)
    threading.Thread(target=reader,daemon=True).start()
    while proc.poll() is None or not q.empty():
        try:line=q.get(timeout=.2)
        except queue.Empty:line=''
        if line:
            lines.append(line)
            if '[UNIFIED_RESULT] ' in line:result=json.loads(line.split('[UNIFIED_RESULT] ',1)[1])
            if '[BIOMES_RESULT] ' in line:biomes_result=json.loads(line.split('[BIOMES_RESULT] ',1)[1])
            if '[PAST_ARRIVAL_RESULT] ' in line:past_result=json.loads(line.split('[PAST_ARRIVAL_RESULT] ',1)[1])
        if proc.poll() is None and not stopping and ((result is not None and (not biomes_probe or biomes_result is not None) and (not past_world or past_result is not None)) or time.monotonic()>deadline):
            # Only the process created above receives stop. Existing servers are untouched.
            proc.stdin.write('stop\n');proc.stdin.flush();stopping=True
        if stopping and time.monotonic()>deadline+40:raise RuntimeError('Test BDS did not confirm exit; do not force or copy PID '+str(proc.pid))
    log=''.join(lines);errors=[l for l in log.splitlines() if re.search(r'\bERROR\]',l,re.I)]
    after=processes();preserved=all(p in after for p in before)
    report={'passed':bool(result and result.get('passed') and (not biomes_probe or biomes_result and biomes_result.get('passed')) and (not past_world or past_result and past_result.get('passed')) and not errors and proc.returncode==0 and 'Quit correctly' in log and preserved),
        'biomesResult':biomes_result,
        'pastArrivalResult':past_result,
        'result':result,'errors':errors,'exitCode':proc.returncode,'quitCorrectly':'Quit correctly' in log,
        'existingServersPreserved':preserved,'existingServers':before,'serverVersion':version,
        'settingsTemplateSha256':hashlib.sha256(template.read_bytes()).hexdigest(),
        'worldDatabaseCopied':bool(past_world),'closedPastStage':str(past_world) if past_world else None,'officialModified':False,'clientVisualVerified':False,'realWorldMigrationVerified':False}
    (out/'native.log').write_text(log,encoding='utf-8');write(out/'native.json',report)
    print(json.dumps({'passed':report['passed'],'checks':len((result or {}).get('checks',[])), 'biomesResult':biomes_result,'pastArrivalChecks':len((past_result or {}).get('checks',[])),'pastArrivalError':(past_result or {}).get('error'),'errors':errors,'resultError':(result or {}).get('error'),'existingServersPreserved':preserved,'report':str(out/'native.json')}))
    if not report['passed']:raise RuntimeError('Native complete-addon check failed')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--candidate',type=Path,required=True);p.add_argument('--source-server',type=Path,required=True);p.add_argument('--out',type=Path,required=True)
    p.add_argument('--biomes-probe',action='store_true')
    p.add_argument('--past-world',type=Path)
    a=p.parse_args();run(a.candidate,a.source_server,a.out,a.biomes_probe,a.past_world)
