function mobileSetProperty(entity,key,value){if(entity.getProperty(key)!==value)entity.setProperty(key,value);}
// Apariciones VISUALES alrededor del mob: nunca se modifica su ubicación física.
const halfWidth=0.55, height=3.5;
/** @typedef {{x:number,z:number}} Offset */
/** @typedef {{presenceRadiusBlocks:number,presenceMinRadiusBlocks:number,presenceHeadPitchDegrees:number,presenceHeadYawDegrees:number,presenceHeadRollDegrees:number}} PresenceSettings */
/** @param {import('@minecraft/server').Vector3} a @param {import('@minecraft/server').Vector3} b */
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

/** @param {import('@minecraft/server').Dimension} dimension @param {import('@minecraft/server').Vector3} location */
function clearAppearance(dimension,location) {
  try {
    for(let x=Math.floor(location.x-halfWidth);x<=Math.floor(location.x+halfWidth-0.001);x++)
      for(let z=Math.floor(location.z-halfWidth);z<=Math.floor(location.z+halfWidth-0.001);z++)
        for(let y=Math.floor(location.y+0.001);y<=Math.floor(location.y+height-0.001);y++)
          if(!dimension.getBlock({x,y,z})?.isAir)return false;
    return true;
  } catch {return false;} // Sin apariciones dentro de paredes ni chunks descargados.
}

/** @param {import('@minecraft/server').Entity} entity @param {Offset} offset */
function appearanceLocation(entity,offset) {
  const p=entity.location,angle=-entity.getRotation().y*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  return {x:p.x+offset.x*c-offset.z*s,y:p.y,z:p.z+offset.x*s+offset.z*c};
}

/** @param {import('@minecraft/server').Entity} entity */
export function resetPresence(entity) {
  mobileSetProperty(entity,'warland:presence_x',0);
  mobileSetProperty(entity,'warland:presence_z',0);
  for(const axis of ['pitch','yaw','roll','weight'])mobileSetProperty(entity,'warland:head_'+axis,0);
}

/** @param {number} elapsedTicks @param {{presenceHeadHoldTicks:number,presenceHeadRecoverTicks:number}} settings */
export function presenceHeadWeight(elapsedTicks,settings) {
  const elapsed=Math.max(0,elapsedTicks-settings.presenceHeadHoldTicks+1);
  return Math.round(100*Math.max(0,1-elapsed/Math.max(1,settings.presenceHeadRecoverTicks)));
}

/** @param {import('@minecraft/server').Entity} entity @param {PresenceSettings} settings @param {()=>number} random */
function twitchHead(entity,settings,random) {
  const previousRoll=Number(entity.getProperty('warland:head_roll')??0);
  const sign=previousRoll ? -Math.sign(previousRoll) : (random()<.5?-1:1);
  /** @param {number} limit @param {number} cap */
  const magnitude=(limit,cap)=>Math.round(Math.max(0,Math.min(cap,limit))*(.6+.4*random()));
  const head={
    pitch:(random()<.5?-1:1)*magnitude(settings.presenceHeadPitchDegrees,24),
    yaw:(random()<.5?-1:1)*magnitude(settings.presenceHeadYawDegrees,35),
    roll:sign*magnitude(settings.presenceHeadRollDegrees,42)
  };
  for(const [axis,angle] of Object.entries(head))mobileSetProperty(entity,'warland:head_'+axis,angle);
  mobileSetProperty(entity,'warland:head_weight',100);
  return head;
}

/**
 * Dos apariciones y regreso al centro, todas referidas al mismo cuerpo físico.
 * Radio absoluto 0,45: incluso entre extremos son <=0,9 bloques, sin deriva.
 * @param {import('@minecraft/server').Entity} entity
 * @param {PresenceSettings} settings
 */
export function pulsePresence(entity,settings,returnToCenter=false,random=Math.random) {
  const physicalBefore=entity.location;
  const previous={x:Number(entity.getProperty('warland:presence_x')??0)/1000,z:Number(entity.getProperty('warland:presence_z')??0)/1000};
  const cap=Math.max(0,Math.min(0.45,settings.presenceRadiusBlocks));
  const min=Math.max(0,Math.min(cap,settings.presenceMinRadiusBlocks));
  /** @type {Offset|undefined} */
  let offset=returnToCenter?{x:0,z:0}:undefined;
  for(let attempt=0;!offset&&attempt<8;attempt++) {
    const angle=random()*Math.PI*2,amount=min+random()*(cap-min);
    const candidate={x:Math.round(Math.cos(angle)*amount*1000)/1000,z:Math.round(Math.sin(angle)*amount*1000)/1000};
    if(Math.hypot(candidate.x,candidate.z)>cap)continue;
    if(Math.hypot(candidate.x-previous.x,candidate.z-previous.z)<0.16)continue;
    if(clearAppearance(entity.dimension,appearanceLocation(entity,candidate)))offset=candidate;
  }
  if(!offset)return null;
  mobileSetProperty(entity,'warland:presence_x',Math.round(offset.x*1000));
  mobileSetProperty(entity,'warland:presence_z',Math.round(offset.z*1000));
  const step=Math.hypot(offset.x-previous.x,offset.z-previous.z);
  const head=step>0.01?twitchHead(entity,settings,random):null;
  if(step>0.01)for(const at of [appearanceLocation(entity,previous),appearanceLocation(entity,offset)])
    entity.dimension.spawnParticle('warland:shadow_jump',{x:at.x,y:at.y+1.7,z:at.z});
  const result={offset,head,radius:Math.hypot(offset.x,offset.z),visualStep:step,physicalShift:distance(physicalBefore,entity.location),returnedToCenter:returnToCenter};
  if(entity.hasTag('warland_shadow_probe'))console.warn('[SHADOW_PRESENCE] '+JSON.stringify(result));
  return result;
}
