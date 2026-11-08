export const END='minecraft:the_end';
export const arrivalGuardRadius=cfg=>cfg.wardens?.minimumArrivalDistance??448;
export function nearArrival(position,cfg,margin=0){return Math.hypot(position.x-cfg.arrival.x,position.z-cfg.arrival.z)<arrivalGuardRadius(cfg)+margin;}
export const leavesUmbral=(from,to)=>from===END&&to!==END;
export const tooOld=(entityEpoch,epoch)=>epoch>0&&(entityEpoch===undefined||Number(entityEpoch)<epoch);
export const safeArrivalBiome=(id,x,z,cfg)=>id==='silent'&&nearArrival({x,z},cfg)?'roots':id;
