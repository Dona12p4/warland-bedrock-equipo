import {chooseSelectedResident} from './selected-creeper-population.js';
// The stored chunk label describes its centre. Revision 7+ decorates every
// column using biomeAt, so a spawn on an edge must use that exact column.
export function habitatForSpawn(x,z,generatedBiomeAt,biomeAt){
 const saved=generatedBiomeAt(x,z);
 const id=saved.revision>=7?biomeAt(x,z).id:saved.id;
 return id==='forest'?'roots':id;
}

export function chooseResidentMob(cfg,mobs,id,existing,players=1,random=Math.random){
 const selected=chooseSelectedResident(cfg,id,existing,players,random);if(selected)return selected;
 id=id==='forest'?'roots':id;
 const resident=cfg.biomes.catalog.find(b=>b.id===id)?.mob??mobs[1],ghost='warland:apagavelas_prototype';
 const cap=Math.min(cfg.population.maximum,cfg.population.cap+Math.max(0,players-1));
 const ghostLimit=cfg.population.ghostCapPerPlayer*players;
 const target=Math.min(Math.ceil(cap*.75),resident===ghost?ghostLimit:cap);
 const residentCount=existing.filter(e=>e.typeId===resident&&e.isValid!==false).length;
 // With a small cap, independent rolls can fill all remaining slots with
// visitors. Establish the resident group first, then use the configured odds.
 if(residentCount<target)return resident;
 const visitors=id==='roots'?[mobs[2],mobs[0]]:id==='ash'?[mobs[3],mobs[0]]:id==='silent'?[mobs[3],mobs[0]]:id==='watch'?[mobs[2],mobs[1]]:[mobs[2],mobs[0]];
 if(mobs.includes('warland:garganta_abierta_prototype'))visitors.push('warland:garganta_abierta_prototype');
 const pool=[...Array(id==='watch'?18:cfg.population.residentWeight).fill(resident),...visitors].filter(type=>type!==ghost||existing.filter(e=>e.typeId===ghost&&e.isValid!==false).length<ghostLimit);
 return pool[Math.min(pool.length-1,Math.max(0,Math.floor(random()*pool.length)))];
}
