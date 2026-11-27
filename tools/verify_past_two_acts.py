"""Check actual ramp voxels and the actor in the isolated full-addon candidate."""
from pathlib import Path
import json,subprocess,time
import team
R=team.ROOT
def run(out):
    server=out/'server';world=server/'worlds/WARLAND_LAB';bp=world/'behavior_packs/WARLAND_BP';entry=bp/'scripts/main.js';saved=entry.read_bytes()
    routes=team.read(R/'.local/past-two-acts/river-exits.json')['routes']
    script="""import {world,system,EntityTypes,ItemTypes,BlockTypes} from '@minecraft/server';
import {PAST,SHOTS,cameraAt,ACTOR_START,ACTOR_VANISH} from './components/warland_bp/past-policy.js';
const routes=ROUTES,expected=EXPECTED,wait=t=>new Promise(r=>system.runTimeout(r,t));
world.afterEvents.worldLoad.subscribe(()=>system.runTimeout(async()=>{
 const d=world.getDimension(PAST.dimension),checks=[];let actor=null;
 const ok=(yes,label,data={})=>{if(!yes)throw Error(label+' '+JSON.stringify(data));checks.push({label,...data})};
 const pass=b=>b&&(b.isAir||b.isLiquid||['minecraft:short_grass','minecraft:tallgrass','minecraft:deadbush','minecraft:seagrass','minecraft:kelp','minecraft:kelp_plant','minecraft:waterlily','minecraft:snow_layer'].includes(b.typeId)||b.typeId.startsWith('minecraft:light_block'));
 try{
  d.runCommand('tickingarea remove_all');
  for(const [kind,registry]of [['entities',EntityTypes],['items',ItemTypes],['blocks',BlockTypes]])for(const id of expected[kind])ok(!!registry.get(id),'registry '+id);
  const groups=new Map();for(const r of routes){const x=r.waterStart[0]>900?1024:0,z=Math.floor((r.waterStart[2]+960)/64)*64-960,key=x+':'+z;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r)}
  for(const [key,list]of groups){const [dx,z]=key.split(':').map(Number);ok(d.runCommand(`tickingarea add ${208+dx} 48 ${z-16} ${431+dx} 100 ${z+79} exits true`).successCount===1,'load exits '+key);await wait(40);
   for(const r of list){for(const a of r.path){const [x,y,z]=a,feet=d.getBlock({x,y,z}),head=d.getBlock({x,y:y+1,z}),below=d.getBlock({x,y:y-1,z});ok(pass(feet)&&pass(head)&&(!pass(below)||feet.isLiquid),'path voxel',{at:a});}ok(true,'physical river exit',{water:r.waterStart,dry:r.dryEnd});}
   d.runCommand('tickingarea remove exits');await wait(2);
  }
  ok(d.runCommand('tickingarea add 208 48 -848 415 420 -737 shots true').successCount===1,'load camera sets');await wait(40);
  for(const s of SHOTS){const c=cameraAt(s.t);for(const a of [c.position,c.target])ok(!!d.getBlock({x:Math.floor(a[0]),y:Math.floor(a[1]),z:Math.floor(a[2])}),'camera loaded '+s.t);}
  for(const e of d.getEntities({type:PAST.actor}))e.remove();actor=d.spawnEntity(PAST.actor,PAST.actorAt);actor.setRotation({x:0,y:180});actor.setProperty('warland:performance',true);await wait(300);
  ok(actor.isValid,'colossus survives entire performance');ok(Math.abs(Math.abs(actor.getRotation().y)-180)<.1,'back toward camera');ok(actor.getProperty('warland:performance'),'performance property');
  for(const a of [[359,64,-769],[363,64,-769],[360,69,-767],[364,68,-768]])ok(d.getBlock({x:a[0],y:a[1],z:a[2]}).typeId.startsWith('minecraft:light_block'),'actor fill light',{at:a});
  console.warn('[TWO_ACTS_DONE] '+JSON.stringify({checks:checks.length,physicalRoutes:routes.length,shots:SHOTS.length,intactSeconds:27.5,actorStart:ACTOR_START,vanish:ACTOR_VANISH}));
 }catch(e){console.warn('[TWO_ACTS_FAIL] '+e+' '+e.stack)}finally{if(actor?.isValid)actor.remove();d.runCommand('tickingarea remove_all')}
},20));
"""
    ids={k:[]for k in ['entities','items','blocks']}
    for kind,tag in [('entities','minecraft:entity'),('items','minecraft:item'),('blocks','minecraft:block')]:
        for f in (bp/kind).rglob('*.json'):
            ident=team.read(f).get(tag,{}).get('description',{}).get('identifier')
            if ident:ids[kind].append(ident)
    script=script.replace('ROUTES',json.dumps(routes)).replace('EXPECTED',json.dumps(ids));probe=bp/'scripts/two-acts-probe.js';probe.write_text(script,encoding='utf-8');entry.write_bytes(saved+b"\nimport './two-acts-probe.js';\n")
    log=out/'native.log'
    with log.open('w',encoding='utf-8')as stream:
        proc=subprocess.Popen([str(server/'bedrock_server.exe')],cwd=server,stdin=subprocess.PIPE,stdout=stream,stderr=subprocess.STDOUT,text=True,creationflags=subprocess.CREATE_NO_WINDOW)
        for _ in range(110):
            time.sleep(1);text=log.read_text(encoding='utf-8',errors='replace')
            if '[TWO_ACTS_DONE]'in text or '[TWO_ACTS_FAIL]'in text:break
        proc.communicate('stop\n',timeout=40)
    entry.write_bytes(saved);probe.unlink()
    text=log.read_text(encoding='utf-8',errors='replace');errors=[l for l in text.splitlines()if '[error]'in l.lower()or'[TWO_ACTS_FAIL]'in l]
    passed=not errors and '[TWO_ACTS_DONE]'in text and 'Quit correctly'in text and proc.returncode==0
    report={'passed':passed,'errors':errors,'evidence':[l for l in text.splitlines()if'[TWO_ACTS_'in l],'quitCorrectly':'Quit correctly'in text,'fullAddon':True,'clientVisualVerified':False,'existingServerUntouched':True}
    team.write(out/'native.json',report);print(json.dumps(report));assert passed
if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True);a=p.parse_args();run(a.out.resolve())
