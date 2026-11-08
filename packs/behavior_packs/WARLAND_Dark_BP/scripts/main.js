import './umbral-building-rules.js';
import {echoFogTransitioning} from './umbral-clear-sight.js';
import {CLEAR_POTION,BASIC_POTION,remainingClearSight,remainingBasicSight,clarityLevel} from './umbral-clear-sight.js';
import {generationFogFor} from './umbral-generation-visibility.js';
import './umbral-chorus-cleanup.js';
import './umbral-wardens.js';
import './umbral-native-end-cleanup.js';
import {installCompass} from './umbral-compass.js';
import {installDecay} from './umbral-decay.js';
import {prepareRiftArrival} from './umbral-rift-route.js';
import {installRift} from './umbral-rift.js';
import {returnToSpawn} from './umbral-rift-return.js';
import {habitatForSpawn,chooseResidentMob} from './umbral-habitat-population.js';
import './shriekers.js';
import {world,system,ItemStack,ItemTypes,CommandPermissionLevel,CustomCommandStatus} from '@minecraft/server';
import {ActionFormData} from '@minecraft/server-ui';
import {cfg} from './void-config.js';
import {biomeAt,terrainAt,surfaceAt,generatedBiomeAt,naturalGround,prepareSilentBiome,prepareBiome,isGenerated,prepareArrival,requestAround} from './terrain.js';
import {installDevour} from './devour.js';
import {POTION} from './atmosphere.js';
import {remainingVision,reconcileNightVision,drinkUmbralVision,clearUmbralVision} from './vision.js';
import './habitat-atmosphere.js';
export const inUmbral=e=>e.dimension.id==='minecraft:the_end';
const mobs=['warland:shadow_boss_prototype','warland:thermal_creeper_prototype','warland:palpador_prototype','warland:rastreador_prototype','warland:apagavelas_prototype','warland:garganta_abierta_prototype',"warland:ender_creeper","warland:ghost_creeper","warland:magma_creeper","warland:mummy_creeper","warland:sculk_creeper","warland:skeleton_creeper"];
export const residentForBiome=id=>cfg.biomes.catalog.find(b=>b.id===(id==='forest'?'roots':id))?.mob??mobs[1];
export function chooseHabitatMob(id,existing,players=1,random=Math.random){return chooseResidentMob(cfg,mobs,id,existing,players,random);}

const FOG='warland_dark_zone',RETURN='warland:dark_return',fog=new Map();let ready=null,nextSpawn=0;
const arriving=new Map(),distantNatural=new Map();
const deathSpectator=p=>p.hasTag('warland_heart_spectator')||String(p.getGameMode()).toLowerCase()==='spectator';
function protectArrival(p){
 if(deathSpectator(p)||arriving.has(p.id))return;
 arriving.set(p.id,p);
 ensureRealm().then(pos=>{if(p.isValid&&inUmbral(p)&&!deathSpectator(p))p.teleport(pos);arriving.delete(p.id);}).catch(e=>{arriving.delete(p.id);console.warn('[UMBRAL] Llegada: '+e);});
}
world.beforeEvents.entityHurt.subscribe(e=>{if(arriving.has(e.hurtEntity.id))e.cancel=true;});
system.runInterval(()=>{for(const [id,p]of arriving){if(!p.isValid||!inUmbral(p)||deathSpectator(p)){arriving.delete(id);continue;}p.teleport({x:cfg.arrival.x,y:53,z:cfg.arrival.z});}},1);
const admin=p=>cfg.admins.some(n=>n.toLowerCase()===p.name.toLowerCase());
export function ensureRealm(){if(!ready)ready=prepareArrival().then(prepareRiftArrival).catch(e=>{ready=null;throw e;});return ready;}
function clearFog(p){try{p.runCommand(`fog @s remove ${FOG}`);}catch{}fog.delete(p.id);}
function applyGenerationFog(p){if(!inUmbral(p)){if(fog.has(p.id))clearFog(p);return;}const mode=generationFogFor(p);if(fog.get(p.id)!==mode){clearFog(p);p.runCommand(`fog @s push warland:dark_${mode} ${FOG}`);fog.set(p.id,mode);}}
export async function enter(p,returnPoint,stillValid=()=>true){
 const alreadyHere=inUmbral(p);
 const arrival=await ensureRealm();if(!p.isValid||!stillValid())return false;
 const back=returnPoint??{dimension:p.dimension.id,location:p.location,rotation:p.getRotation()};
 if(!alreadyHere)p.setDynamicProperty(RETURN,JSON.stringify(back));p.teleport(arrival,{dimension:world.getDimension('the_end'),rotation:{x:0,y:0}});
 applyGenerationFog(p);p.onScreenDisplay.setTitle('§8EL UMBRAL');p.sendMessage('§7Consulta la brújula. Materiales del Umbral: permanentes. Otros bloques: 15 s.');return true;
}
export async function leave(p){
 const ok=await returnToSpawn(p);
 if(ok){clearFog(p);reconcileNightVision(p);p.setDynamicProperty(RETURN,undefined);}
 return ok;
}

export function forbidden(e){
 if(!inUmbral(e)||e.typeId==='minecraft:player'||e.typeId==='minecraft:warden'||e.typeId.startsWith('warland:'))return false;
 return !!e.getComponent('minecraft:health')||['minecraft:ender_crystal','minecraft:dragon_fireball','minecraft:shulker_bullet'].includes(e.typeId);
}
export function suppressVanilla(entities=world.getDimension('the_end').getEntities()){for(const e of entities)try{if(forbidden(e))e.remove();}catch{}}
world.afterEvents.entitySpawn.subscribe(({entity})=>{try{if(forbidden(entity))entity.remove();}catch{}});
const distanceTo=(e,p)=>Math.hypot(e.location.x-p.location.x,e.location.y-p.location.y,e.location.z-p.location.z);
export function nearbyPopulation(players,entities=world.getDimension('the_end').getEntities()){return entities.filter(e=>mobs.includes(e.typeId)&&players.some(p=>distanceTo(e,p)<=cfg.population.activeRadius));}
export function retireDistantNatural(players,tick,entities=world.getDimension('the_end').getEntities()){
 const present=players.filter(inUmbral),d=world.getDimension('the_end'),seen=new Set();let removed=0;
 for(const e of entities)if(e.isValid&&mobs.includes(e.typeId)&&e.hasTag('wl_umbral_natural')){
  seen.add(e.id);
  if(e.nameTag||present.some(p=>distanceTo(e,p)<=cfg.population.despawnDistance)){distantNatural.delete(e.id);continue;}
  if(!distantNatural.has(e.id))distantNatural.set(e.id,tick);
  else if(tick-distantNatural.get(e.id)>=cfg.population.despawnDelayTicks){e.remove();distantNatural.delete(e.id);removed++;}
 }
 for(const id of distantNatural.keys())if(!seen.has(id))distantNatural.delete(id);return removed;
}
export function spawnPopulation(players,tick,random=Math.random,entities){
 const present=players.filter(inUmbral);if(!present.length||tick<nextSpawn)return null;nextSpawn=tick+cfg.population.retryTicks;
 const d=world.getDimension('the_end'),existing=nearbyPopulation(present,entities),cap=Math.min(cfg.population.maximum,cfg.population.cap+present.length-1);
 if(existing.length>=cap)return null;
 for(let i=0;i<48;i++){
  const anchor=present[Math.floor(random()*present.length)],a=random()*Math.PI*2,r=cfg.population.minimumDistance+random()*(cfg.population.maximumDistance-cfg.population.minimumDistance);
  const x=Math.floor(anchor.location.x+Math.cos(a)*r)+.5,z=Math.floor(anchor.location.z+Math.sin(a)*r)+.5,t=surfaceAt(x,z),pos={x,y:t.floor+1,z};
  if(t.solid||!isGenerated(Math.floor(x/16),Math.floor(z/16))||present.some(p=>Math.hypot(p.location.x-x,p.location.z-z)<cfg.population.minimumDistance))continue;
  try{let clear=true;for(let y=0;y<5;y++)if(!d.getBlock({...pos,y:pos.y+y})?.isAir)clear=false;
   if(!clear||!naturalGround(d.getBlock({...pos,y:pos.y-1})?.typeId))continue;
   const biome=habitatForSpawn(x,z,generatedBiomeAt,biomeAt),type=chooseHabitatMob(biome,existing,present.length,random),e=d.spawnEntity(type,pos);e.addTag('wl_umbral_natural');e.addTag('wl_habitat_'+biome);nextSpawn=tick+(biome==='watch'?(cfg.population.shadowIntervalTicks??80):cfg.population.intervalTicks);return e;
  }catch{}
 }
 return null;
}
async function menu(p){
 const here=inUmbral(p),f=new ActionFormData().title('El Umbral').body(here?`${generatedBiomeAt(p.location.x,p.location.z).name}\nMobs: ${nearbyPopulation([p]).length}\nEcolocalizador: clic derecho para emitir un pulso\nClaridad ${clarityLevel(p)===2?'II':clarityLevel(p)===1?'I':'—'}: ${Math.ceil((clarityLevel(p)===2?remainingClearSight(p):remainingBasicSight(p))/20)} s`:'Viajar al Umbral.');
 const actions=[],button=(label,action)=>{f.button(label);actions.push(action);};
 if(!here)button('Entrar al Umbral',()=>enter(p));
 else if(admin(p))button('Salir · Prueba',()=>leave(p));
 if(here)button('Brújula · Prueba',()=>compass.provide(p,true));
 if(admin(p)&&here){
  button('Ver grieta · Prueba',()=>rift.preview(p));
  button('Explorar biomas',()=>biomeMenu(p));
  button('Probar pulso de ecolocalización',()=>remainingVision(p)>0?clearUmbralVision(p):drinkUmbralVision(p));
  for(const [i,name]of ['Sombra','Creeper térmico','Palpador','Rastreador','Apagavelas','Garganta Abierta'].entries())button('Invocar '+name,()=>{const v=p.getViewDirection(),x=p.location.x+v.x*8,z=p.location.z+v.z*8,t=surfaceAt(x,z);if(!t.solid)p.dimension.spawnEntity(mobs[i],{x,y:t.floor+1,z});});
 }
 if(admin(p))for(const [label,item]of [['Claridad I · Prueba',BASIC_POTION],['Claridad II · Prueba',CLEAR_POTION]])button(label,()=>{const left=p.getComponent('inventory').container.addItem(new ItemStack(item));if(left)p.sendMessage('§7Libera un hueco.');});
 if(admin(p))button('Ecolocalizador · Reutilizable',()=>{const left=p.getComponent('inventory').container.addItem(new ItemStack(POTION));p.sendMessage(left?'§7Libera un hueco del inventario.':'§3Ecolocalizador entregado. Clic derecho: pulso hacia delante.');});
 const a=await f.show(p);if(!a.canceled&&p.isValid)await actions[a.selection]?.();
}
async function biomeMenu(p){
 if(!admin(p)||!inUmbral(p))return;
 const f=new ActionFormData().title('Biomas del Umbral').body('Elige una zona nueva.');
 for(const b of cfg.biomes.catalog)f.button(b.name);f.button('Volver');
 const a=await f.show(p);if(a.canceled)return;if(a.selection===cfg.biomes.catalog.length)return menu(p);
 const b=cfg.biomes.catalog[a.selection];if(!b||!p.isValid||!inUmbral(p))return;p.sendMessage('§7Preparando '+b.name+'…');
 const pos=await prepareBiome(p.location,b.id);if(p.isValid&&inUmbral(p)){p.teleport(pos);p.sendMessage('§7'+b.name+' · '+Math.floor(pos.x)+', '+pos.y+', '+Math.floor(pos.z));}
}
system.beforeEvents.startup.subscribe(e=>e.customCommandRegistry.registerCommand({name:'warland:umbral',description:'Viajar a la dimensión oscura o regresar',permissionLevel:CommandPermissionLevel.Any,cheatsRequired:false},o=>{if(o.sourceEntity?.typeId==='minecraft:player')system.run(()=>menu(o.sourceEntity).catch(err=>o.sourceEntity.sendMessage('§c'+err)));return {status:CustomCommandStatus.Success};}));
world.afterEvents.itemUse.subscribe(e=>{if(e.itemStack.typeId==='warland:umbral')menu(e.source).catch(console.warn);});
world.afterEvents.worldLoad.subscribe(()=>ensureRealm().catch(e=>console.warn('[UMBRAL] Preparación: '+e)));
world.afterEvents.playerDimensionChange.subscribe(({player:p})=>{applyGenerationFog(p);if(inUmbral(p)&&(!isGenerated(Math.floor(p.location.x/16),Math.floor(p.location.z/16))||p.location.y<terrainAt(p.location.x,p.location.z).floor+1))protectArrival(p);});
world.afterEvents.playerSpawn.subscribe(({player:p})=>system.run(()=>{
 clearFog(p);applyGenerationFog(p);if(inUmbral(p)&&(!isGenerated(Math.floor(p.location.x/16),Math.floor(p.location.z/16))||p.location.y<22))protectArrival(p);
 if(!ItemTypes.get('warland:administracion')&&admin(p)&&!p.getDynamicProperty('warland:umbral_book')){const left=p.getComponent('inventory').container.addItem(new ItemStack('warland:umbral'));if(!left)p.setDynamicProperty('warland:umbral_book',true);}
}));
system.runInterval(()=>{
 const players=world.getAllPlayers(),entities=world.getDimension('the_end').getEntities();suppressVanilla(entities);
 for(const p of players)try{
  if(!inUmbral(p)){if(fog.has(p.id))clearFog(p);continue;}
  if(arriving.has(p.id))continue;
  requestAround(p);
  if(p.location.y<22&&!deathSpectator(p)){const t=terrainAt(p.location.x,p.location.z);if(isGenerated(Math.floor(p.location.x/16),Math.floor(p.location.z/16))&&!t.solid)p.teleport({...p.location,y:t.floor+1});else ensureRealm().then(pos=>{if(p.isValid&&inUmbral(p)&&!deathSpectator(p))p.teleport(pos);});}
  applyGenerationFog(p);
 }catch(e){console.warn('[UMBRAL] '+e);}
 retireDistantNatural(players,system.currentTick,entities);spawnPopulation(players,system.currentTick,Math.random,entities.filter(e=>e.isValid));
},10);
const rift=installRift({leave,canJoin:p=>!arriving.has(p.id)});
installDevour({enter,ready:ensureRealm});

const compass=installCompass({getVisit:rift.state,canJoin:p=>!arriving.has(p.id)});
const decay=installDecay();
export {rift,compass,decay};

// Only transition frames need a faster fog update; terrain work remains cached.
system.runInterval(()=>{for(const p of world.getAllPlayers())if(inUmbral(p)&&echoFogTransitioning(p))try{applyGenerationFog(p);}catch{}},2);
