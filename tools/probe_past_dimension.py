"""Probe custom dimension JSON on the pinned BDS, without experiments or players."""
from pathlib import Path
import json, subprocess, time, uuid
import team

root = team.ROOT
server = root / '.local/dimension-probe'
assert not server.exists(), 'Use a new probe destination'
server.mkdir(parents=True)
archive = root.parents[1] / '.downloads/bedrock-server-1.26.60.6.zip'
assert team.sha(archive) == team.cfg(root)['serverSha256']
team.extract(archive, server)
bp = server / 'worlds/PROBE/behavior_packs/PastProbe'
(bp/'scripts').mkdir(parents=True)
(bp/'dimensions').mkdir()
uid = str(uuid.uuid4())
team.write(bp/'manifest.json', {'format_version':2,'header':{'name':'El Pasado compatibility probe','description':'Isolated test','uuid':uid,'version':[1,0,0],'min_engine_version':[1,26,50]},'modules':[{'type':'data','uuid':str(uuid.uuid4()),'version':[1,0,0]},{'type':'script','language':'javascript','entry':'scripts/main.js','uuid':str(uuid.uuid4()),'version':[1,0,0]}],'dependencies':[{'module_name':'@minecraft/server','version':'2.10.0'}]})
team.write(bp/'dimensions/el_pasado.json',{'format_version':'1.26.50','minecraft:dimension':{'description':{'identifier':'warland:el_pasado'},'components':{'minecraft:dimension_height':{'min_y':-64,'height_range':384},'minecraft:generation':{'generator_type':'void'},'minecraft:default_biome':{'biome':'minecraft:plains'}}}})
team.write(bp.parents[1]/'world_behavior_packs.json',[{'pack_id':uid,'version':[1,0,0]}])
(bp/'scripts/main.js').write_text("""import {world,system} from '@minecraft/server';
world.afterEvents.worldLoad.subscribe(()=>{try {
 const d=world.getDimension('warland:el_pasado');
 console.warn('[PAST_DIMENSION] '+JSON.stringify({id:d.id,height:d.heightRange}));
 console.warn('[PAST_AREA] '+JSON.stringify(d.runCommand('tickingarea add circle 0 64 0 1 past_probe true')));
 system.runTimeout(()=>{try{d.getBlock({x:0,y:64,z:0}).setType('minecraft:stone');console.warn('[PAST_PROBE_OK] '+d.getBlock({x:0,y:64,z:0}).typeId)}catch(e){console.warn('[PAST_PROBE_FAIL] '+e.stack)}},80);
}catch(e){console.warn('[PAST_PROBE_FAIL] '+e.stack)}});
""",encoding='utf-8')
(server/'server.properties').write_text('server-name=Past probe\nlevel-name=PROBE\nserver-ip=127.0.0.1\nserver-port=19162\nserver-portv6=19163\nserver-udp-ports=19162\ntransport=nethernet\nenable-lan-visibility=false\nallow-list=true\nonline-mode=true\nallow-cheats=true\ncontent-log-console-output-enabled=true\n',encoding='utf-8')
team.write(server/'allowlist.json',[])
log=server/'probe.log'
with log.open('w',encoding='utf-8') as stream:
 p=subprocess.Popen([str(server/'bedrock_server.exe')],cwd=server,stdin=subprocess.PIPE,stdout=stream,stderr=subprocess.STDOUT,text=True,creationflags=subprocess.CREATE_NO_WINDOW)
 time.sleep(18)
 p.communicate('stop\n',timeout=40)
output=log.read_text(encoding='utf-8',errors='replace')
report={'serverVersion':'1.26.60.6','api':'2.10.0','experimentsEnabled':False,'passed':'[PAST_PROBE_OK]' in output and 'Quit correctly' in output and '[PAST_PROBE_FAIL]' not in output,'evidence':[l for l in output.splitlines() if 'PAST_' in l or '[error]' in l.lower() or 'Quit correctly' in l]}
team.write(root/'.local/dimension-compatibility.json',report)
print(json.dumps(report,ensure_ascii=False))
