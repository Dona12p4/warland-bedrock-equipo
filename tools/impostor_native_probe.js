// LAB ONLY. This file is never included in the exported add-on.
import { world, system, GameMode, ItemStack } from '@minecraft/server';
import * as GT from '@minecraft/server-gametest';
import { connectedPlayers, initialize } from './main.js';
import { bindIdentity, appearanceFor, NAME_KEY, SKIN_KEY } from './identity.js';
import {setPace, tryRunningJump, movementDebug} from './movement.js';
const checks = [];
const wait = ticks => new Promise(resolve => system.runTimeout(resolve, ticks));
const check = (name, pass, details) => { checks.push({ name, passed: !!pass, details }); if (!pass) throw Error(name); };
const pos = { x: 10000.5, y: 110, z: 10000.5 };

world.afterEvents.worldLoad.subscribe(() => system.runTimeout(async () => {
  try {
    const dim = world.getDimension('overworld');
    try { dim.runCommand('tickingarea add circle 10000 110 10000 2 impostor_probe true'); } catch {}
    await wait(50);
    dim.runCommand('fill 9980 109 9980 10020 109 10020 stone');
    dim.runCommand('fill 9980 110 9980 10020 116 10020 air');
    dim.runCommand('gamerule doMobSpawning false');
    const saved = world.getDynamicProperty('warland:impostor_probe_v033_saved');
    if (saved) {
      await wait(50);
      const state = JSON.parse(saved), mob = world.getEntity(state.id);
      check('entity survives native server restart', mob?.isValid, state);
      check('exact displayed name survives restart', mob.nameTag === state.name, mob.nameTag);
      check('stored identity survives restart', mob.getDynamicProperty(NAME_KEY) === state.name);
      check('default appearance survives restart', mob.getProperty(SKIN_KEY) === appearanceFor(state.name));
      check('no player account is created by impostor', world.getAllPlayers().length === 0);
      console.warn('[IMPOSTOR_RESULT] ' + JSON.stringify({ passed: true, phase: 'restart', checks }));
      return;
    }
    for (const old of dim.getEntities({type:'warland:impostor',location:pos,maxDistance:80})) old.remove();
    const early = dim.spawnEntity('warland:impostor', pos);
    await wait(5);
    check('egg is registered', new ItemStack('warland:impostor_spawn_egg').typeId === 'warland:impostor_spawn_egg');
    check('no online players leaves an honest placeholder', early.nameTag === 'Impostor', early.nameTag);
    const alice = GT.spawnSimulatedPlayer({ dimension: dim, ...pos, x: pos.x + 6 }, 'Copia Alice', GameMode.Survival);
    const bob = GT.spawnSimulatedPlayer({ dimension: dim, ...pos, x: pos.x - 6 }, 'Copia Bob', GameMode.Survival);
    await wait(100);
    alice.teleport({ ...pos, x: pos.x + 6 }); bob.teleport({ ...pos, x: pos.x - 6 });
    check('native online player detection', ['Copia Alice', 'Copia Bob'].every(n => connectedPlayers().some(p => p.name === n)), connectedPlayers());
    check('waiting impostor receives an online name', ['Copia Alice', 'Copia Bob'].includes(early.nameTag), early.nameTag);
    bob.setGameMode(GameMode.Spectator);
    const mob = dim.spawnEntity('warland:impostor', { ...pos, z: pos.z + 5 });
    await wait(5);
    check('spectators are excluded', mob.nameTag === 'Copia Alice', mob.nameTag);
    check('default appearance synced', mob.getProperty(SKIN_KEY) === appearanceFor('Copia Alice'));
    check('normal entity, not a player account', mob.typeId === 'warland:impostor' && !world.getAllPlayers().some(p => p.id === mob.id));
    check('does not have an attack component', !mob.getComponent('minecraft:attack'));
    check('native health', mob.getComponent('minecraft:health').currentValue === 20);
    bob.setGameMode(GameMode.Survival);
    bindIdentity(mob, connectedPlayers().find(p => p.name === 'Copia Bob'));
    initialize(mob);
    check('initialization does not replace an existing identity', mob.nameTag === 'Copia Bob');
    const admin = GT.spawnSimulatedPlayer({ dimension: dim, ...pos, z: pos.z + 6 }, 'Hatsudemiku', GameMode.Creative);
    await wait(80);
    admin.teleport({ ...mob.location, z: mob.location.z + 1 });
    admin.runCommand('scriptevent warland:impostor Copia Alice');
    await wait(3);
    check('authorized command copies exact online name with spaces', mob.nameTag === 'Copia Alice', mob.nameTag);
    bob.teleport({ ...mob.location, z: mob.location.z + 1 });
    bob.runCommand('scriptevent warland:impostor Copia Bob');
    await wait(3);
    check('non-admin command cannot change identity', mob.nameTag === 'Copia Alice');
    admin.runCommand('scriptevent warland:impostor Player Not Online');
    await wait(3);
    check('offline name is rejected', mob.nameTag === 'Copia Alice');
    let path = 0, previous = { ...mob.location };
    for (let i = 0; i < 300; i++) {
      await wait(1);
      path += Math.hypot(mob.location.x - previous.x, mob.location.z - previous.z);
      previous = { ...mob.location };
    }
    check('native navigation walks without teleporting', path > 0.5, { path });
    setPace(mob, 'walk'); await wait(2);
    const walkSpeed = mob.getComponent('minecraft:movement').currentValue;
    check('does not jump while walking', !tryRunningJump(mob, () => 0));
    setPace(mob, 'run'); await wait(2);
    check('run is synchronized and faster than walk', mob.getProperty('warland:running') && mob.getComponent('minecraft:movement').currentValue > walkSpeed);
    // Wait for real native navigation to move; jump still requires solid landing and headroom.
    mob.teleport(pos);setPace(mob,'run');
    let jumped = false, takeoff = pos.y;
    for (let i=0; i<240 && !jumped; i++) {
      jumped = movementDebug(mob).awaitLanding || tryRunningJump(mob, () => 0);
      if(!jumped) await wait(1);
    }
    check('running mob can physically jump while navigating', jumped,{position:mob.location,velocity:mob.getVelocity(),onGround:mob.isOnGround,running:mob.getProperty('warland:running')});
    setPace(mob,'walk'); // Observe one complete ballistic arc without starting another.
    let apex = takeoff;const arc=[];
    for(let i=0; i<30; i++){await wait(1);apex=Math.max(apex,mob.location.y);arc.push(mob.location.y-takeoff);}
    check('jump rises then lands with native physics', apex-takeoff>1.1 && apex-takeoff<1.4 && Math.abs(mob.location.y-takeoff)<.2,{takeoff,apex,landed:mob.location.y,arc});
    mob.teleport(pos);setPace(mob,'run',system.currentTick,()=>0);
    let observed=0, lastRemaining=6;const groundPauses=[];
    for(let i=0;i<430;i++){
      await wait(1);
      const motion=movementDebug(mob);
      if(motion.mode!=='run') break;
      const launched=Math.max(0,lastRemaining-motion.burstRemaining);
      observed+=launched;lastRemaining=motion.burstRemaining;
      if(launched&&motion.lastGroundedPause!==undefined)groundPauses.push(motion.lastGroundedPause);
      if(observed===6&&!motion.awaitLanding)break;
    }
    check('running burst completes six consecutive physical jumps',observed===6,{observed,motion:movementDebug(mob)});
    // The engine can refresh horizontal movement one tick after its ground
    // flag. Permit that 20 Hz update, but reject the old 5-10-tick timer gap.
    check('successive jumps launch within one native tick of landing without an inserted timer',groundPauses.length===5&&groundPauses.every(n=>n<=1),{groundPauses});
    setPace(mob,'walk');await wait(25);
    check('walking clears the running burst',movementDebug(mob).burstRemaining===0&&!tryRunningJump(mob,()=>0));
    // Native navigation must open a closed wooden door to inspect this chest.
    dim.runCommand('fill 9994 110 9998 10008 113 10002 stone');
    dim.runCommand('fill 9995 110 9999 10007 112 10001 air');
    dim.runCommand('fill 10000 110 9999 10000 112 10001 stone');
    dim.runCommand('setblock 10000 110 10000 wooden_door ["direction"=0,"upper_block_bit"=false,"open_bit"=false]');
    dim.runCommand('setblock 10000 111 10000 wooden_door ["direction"=0,"upper_block_bit"=true,"open_bit"=false]');
    dim.runCommand('setblock 10004 110 10000 chest');
    const container=dim.getBlock({x:10004,y:110,z:10000}).getComponent('minecraft:inventory').container;
    container.setItem(0,new ItemStack('minecraft:diamond',7));
    mob.teleport({x:9997.5,y:110,z:10000.5});setPace(mob,'search');
    let doorOpened=false,inspected=false;
    for(let i=0;i<290;i++){
      await wait(1);
      doorOpened ||= [110,111].some(y=>!!dim.getBlock({x:10000,y,z:10000}).permutation.getState('open_bit'));
      inspected ||= !!mob.getProperty('warland:inspecting');
      if(inspected)break;
    }
    check('opens a wooden door through native navigation',doorOpened,{at:mob.location,lower:dim.getBlock({x:10000,y:110,z:10000}).permutation.getAllStates(),upper:dim.getBlock({x:10000,y:111,z:10000}).permutation.getAllStates()});
    check('reaches a chest and enters inspect animation',inspected&&mob.location.x>10000,{at:mob.location});
    await wait(30);
    const angle=Math.atan2(-(10004.5-mob.location.x),10000.5-mob.location.z)*180/Math.PI;
    const error=Math.abs(((angle-mob.getRotation().y+540)%360)-180);
    check('inspection faces the chest instead of looking into empty space',error<8,{yaw:mob.getRotation().y,angle,error});
    await wait(80);
    check('inspection ends instead of looping at the same chest',!mob.getProperty('warland:inspecting')&&movementDebug(mob).mode==='walk');
    check('inspection preserves real chest inventory',container.getItem(0)?.typeId==='minecraft:diamond'&&container.getItem(0)?.amount===7);
    setPace(mob,'rest'); await wait(2);
    check('rest stops locomotion and cannot jump', !mob.getProperty('warland:running') && mob.getComponent('minecraft:movement').currentValue===0 && !tryRunningJump(mob,()=>0));
    setPace(mob,'walk');
    check('name still matches while walking', mob.nameTag === 'Copia Alice');
    check('no phantom player in player list', world.getAllPlayers().length === 3, world.getAllPlayers().map(p => p.name));
    const state = { id: mob.id, name: mob.nameTag };
    world.setDynamicProperty('warland:impostor_probe_v033_saved', JSON.stringify(state));
    alice.disconnect(); bob.disconnect(); admin.disconnect();
    await wait(5);
    check('disconnection does not turn name into undefined', mob.nameTag === state.name);
    console.warn('[IMPOSTOR_RESULT] ' + JSON.stringify({ passed: true, phase: 'first', checks }));
  } catch (error) {
    console.warn('[IMPOSTOR_RESULT] ' + JSON.stringify({ passed: false, checks, error: String(error), stack: error.stack }));
  }
}, 60));
