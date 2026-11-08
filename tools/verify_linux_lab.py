"""CI/native Linux proof using the published world, with no client or open LAN ports."""
import json
import socket
import subprocess
import time
from pathlib import Path
import team

root=Path(__file__).resolve().parents[1]
assert team.server_platform()=='linux'
archive,pointer=team.world_archive(root)
team.prepare_lab(root,online=False,archive=archive,pointer=pointer)
command,server,env=team.server_launch(root)
log=root/'.local/linux-native.log'
checks={}
with log.open('w',encoding='utf-8') as stream:
    proc=subprocess.Popen(command,cwd=server,env=env,stdin=subprocess.PIPE,stdout=stream,stderr=subprocess.STDOUT,text=True)
    try:
        for _ in range(60):
            text=log.read_text(encoding='utf-8',errors='replace')
            if 'Server started.' in text or proc.poll() is not None:break
            time.sleep(1)
        checks['started']='Server started.' in text
        checks['copyBlockedWhileRunning']=False
        try:team.closed()
        except RuntimeError:checks['copyBlockedWhileRunning']=True
        port=team.cfg(root)['port'];listeners=[]
        for protocol in ('tcp','tcp6','udp','udp6'):
            table=Path('/proc/net')/protocol
            for line in table.read_text().splitlines()[1:]:
                fields=line.split();address,hexport=fields[1].split(':')
                if int(hexport,16)!=port:continue
                family=socket.AF_INET6 if protocol.endswith('6') else socket.AF_INET
                raw=bytes.fromhex(address)
                raw=b''.join(raw[i:i+4][::-1] for i in range(0,len(raw),4))
                listeners.append({'protocol':protocol,'address':socket.inet_ntop(family,raw),'port':port})
        checks['listeners']=listeners
        checks['loopbackOnly']=bool(listeners) and all(x['address'] in ('127.0.0.1','::1','::ffff:127.0.0.1') for x in listeners)
    finally:
        # No terminate/kill: preserve the same graceful close required for worlds.
        if proc.poll() is None:proc.communicate('stop\n',timeout=45)
text=log.read_text(encoding='utf-8',errors='replace')
checks['quitCorrectly']='Quit correctly' in text and proc.returncode==0
checks['errors']=[x for x in text.splitlines() if '[error]' in x.lower() or 'SyntaxError' in x or 'ReferenceError' in x]
checks['worldTag']=pointer['tag'];checks['version']=team.cfg(root)['serverVersion'];checks['clientVisualTest']=False
checks['passed']=all(checks[k] for k in ('started','copyBlockedWhileRunning','loopbackOnly','quitCorrectly')) and not checks['errors']
team.write(root/'.local/linux-native.json',checks);print(json.dumps(checks,ensure_ascii=False))
assert checks['passed'],'Revisar linux-native.log'
