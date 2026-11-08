import {registerRetaliation,provokedTarget,recordHostileHurt} from './hostile-retaliation.js';
registerRetaliation(['warland:thermal_creeper_prototype'],{native:true});
export const recordThermalHurt=recordHostileHurt;
// Keep the confirmed attacker when they stop moving or turn away.
export function consumeThermalHit(entity,players,tick,range){
 const p=provokedTarget(entity,range);return p&&players.some(v=>v.id===p.id)?p:null;
}
