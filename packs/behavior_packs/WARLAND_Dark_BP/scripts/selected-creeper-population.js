export function chooseSelectedResident(cfg,id,existing,players,random){
 id=id==='forest'?'roots':id;
 const table=cfg.population.selectedHabitats?.[id];if(!table)return null;
 const cap=Math.min(cfg.population.maximum,cfg.population.cap+Math.max(0,players-1));
 const count=type=>existing.filter(e=>e.isValid!==false&&e.typeId===type).length;
 const allowed=type=>type!=='warland:apagavelas_prototype'||count(type)<cfg.population.ghostCapPerPlayer*players;
 for(const [type,fraction] of table.minimums){if(allowed(type)&&count(type)<Math.ceil(cap*fraction))return type;}
 const pool=Object.entries(table.weights).filter(([t,w])=>w>0&&allowed(t));
 const total=pool.reduce((n,[,w])=>n+w,0);let roll=Math.min(.999999999,Math.max(0,random()))*total;
 for(const [type,w] of pool){roll-=w;if(roll<0)return type;}
 return pool.at(-1)?.[0]??null;
}
