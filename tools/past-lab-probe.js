import {world,system} from '@minecraft/server';
import {pastDebug} from './past.js';
const wait=t=>new Promise(r=>system.runTimeout(r,t));
world.afterEvents.worldLoad.subscribe(()=>system.runTimeout(async()=>{try{
 const d=world.getDimension('warland:el_pasado'),evidence=[];
 console.warn('[PAST_TEST_MANAGER] '+JSON.stringify({manager:typeof world.tickingAreaManager,create:typeof world.tickingAreaManager?.createTickingArea}));
 for(const dx of [0,1024]){
  const area='past_test_'+dx;
  try{d.runCommand('tickingarea remove '+area)}catch{}
  const res=d.runCommand(`tickingarea add ${208+dx} 48 -848 ${415+dx} 160 -737 ${area} true`);
  console.warn('[PAST_TEST_AREA] '+JSON.stringify({dx,success:res.successCount}));
  const samples=[[250,63,-783],[250,64,-783],[250,65,-783],[361,62,-770],[284,64,-783],[239,65,-783],[272,64,-800],[302,75,-766]];
  for(let i=0;i<400;i++){await wait(2);if(samples.every(([x,y,z])=>!!d.getBlock({x:x+dx,y,z})))break}
  const blocks=[];
  for(const [x,y,z] of samples){
   const b=d.getBlock({x:x+dx,y,z});if(!b)throw Error('Unloaded sample '+[x,y,z]);blocks.push({at:[x+dx,y,z],type:b.typeId});
  }
  const column=[];for(let y=40;y<=75;y++){const b=d.getBlock({x:250+dx,y,z:-783});if(b&&!b.isAir)column.push([y,b.typeId]);}
  console.warn('[PAST_TEST_SAMPLES] '+JSON.stringify({normal:!!dx,blocks,column}));
  if(!column.length)throw Error('Terrain column empty');
  evidence.push({normal:!!dx,blocks});d.runCommand('tickingarea remove '+area);await wait(20);
 }
 const c=pastDebug();if(!c.loaded||c.film)throw Error('Unexpected runtime state');
 console.warn('[PAST_TEST_DONE] '+JSON.stringify({dimension:d.id,checks:19,evidence,runtime:c}));
}catch(e){console.warn('[PAST_TEST_FAIL] '+String(e)+' '+e.stack)}},20));
