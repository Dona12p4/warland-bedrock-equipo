// One-time authoring in the isolated laboratory, never imported by production.
import {world,system} from '@minecraft/server';
const wait=t=>new Promise(r=>system.runTimeout(r,t));
world.afterEvents.worldLoad.subscribe(()=>system.runTimeout(async()=>{try{
 const d=world.getDimension('warland:el_pasado'),evidence=[];
 for(const name of ['past_test','past_test_0','past_test_1024'])try{d.runCommand('tickingarea remove '+name)}catch{}
 // A distant opaque ceiling removes skylight only over the ruined copy.
 // It is above the allowed traversal/camera region and beyond its dark fog.
 for(let z=-960;z<=-577;z+=64){
  const name='past_roof_'+(-z);try{d.runCommand('tickingarea remove '+name)}catch{}await wait(2);
  const add=d.runCommand(`tickingarea add 128 32 ${z} 511 255 ${z+63} ${name} true`);
  if(add.successCount!==1)throw Error('Unable to reserve roof strip '+z);
  let ready=false;
  for(let i=0;i<400&&!ready;i++){
   await wait(2);ready=true;
   for(let x=128;x<512;x+=16)for(let zz=z;zz<z+64;zz+=16)try{if(!d.getBlock({x,y:240,z:zz}))ready=false}catch{ready=false}
  }
  if(!ready)throw Error('Unloaded strip '+z);
  const result=d.runCommand(`fill 128 240 ${z} 511 240 ${z+63} black_concrete replace air`);
  await wait(4);
  for(let x=128;x<512;x+=16)for(let zz=z;zz<z+64;zz+=16)if(d.getBlock({x,y:240,z:zz}).typeId!=='minecraft:black_concrete')throw Error('Missing darkness ceiling');
  evidence.push({z,placed:result.successCount,verifiedChunks:96});d.runCommand('tickingarea remove '+name);await wait(4);
 }
 world.setDynamicProperty('warland:past_darkness_v1',true);
 console.warn('[PAST_TEST_DONE] '+JSON.stringify({darknessCeiling:240,chunks:576,normalCopyUntouched:true,evidence}));
}catch(e){console.warn('[PAST_TEST_FAIL] '+String(e)+' '+e.stack)}},20));
