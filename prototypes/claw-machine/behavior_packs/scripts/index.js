import { world, system, Player, InputPermissionCategory, ItemStack } from "@minecraft/server";

const MACHINE = "warland:claw_machine";
const PRIZES = ["warland:peluche_conejo", "warland:peluche_gato", "warland:peluche_perro", "warland:peluche_hamster", "warland:peluche_caballo", "warland:peluche_rata"];
const sessions = new Map();



function closeSession(playerId, message) {
  const session = sessions.get(playerId);
  if (!session) return;
  sessions.delete(playerId);
  try { session.player.camera.clear(); } catch {}
  try { session.player.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, session.priorCamera); } catch {}
  try { session.player.inputPermissions.setPermissionCategory(InputPermissionCategory.LateralMovement, session.priorLateral); } catch {}
  try { session.player.inputPermissions.setPermissionCategory(InputPermissionCategory.Jump, session.priorJump); } catch {}
  try {
    session.machine.setProperty("warland:lever_x", 0);
    session.machine.setProperty("warland:lever_z", 0);
    session.machine.setProperty("warland:state", 0);
  } catch {}
  if (message) { try { session.player.sendMessage(message); } catch {} }
}

function moveClaw(session, mx, mz) {
  session.clawX = Math.max(-12, Math.min(12, session.clawX + mx * 0.05));
  session.clawZ = Math.max(-12, Math.min(12, session.clawZ + mz * 0.05));
  try {
    session.machine.setProperty("warland:claw_x", session.clawX);
    session.machine.setProperty("warland:claw_z", session.clawZ);
    session.machine.setProperty("warland:lever_x", mx);
    session.machine.setProperty("warland:lever_z", mz);
  } catch {}
}

function getMachineFront(machine) {
  const facing = machine.getViewDirection();
  const length = Math.hypot(facing.x, facing.z);
  return length < 0.001 ? { x: 0, z: -1 } : { x: facing.x / length, z: facing.z / length };
}

function readClawInput(session, velocity) {
  try {
    const movement = session.player.inputInfo?.getMovementVector?.();
    if (movement && Number.isFinite(movement.x) && Number.isFinite(movement.y) &&
        (Math.abs(movement.x) > 0.001 || Math.abs(movement.y) > 0.001)) {
      return {
        x: Math.max(-1, Math.min(1, movement.x)),
        z: Math.max(-1, Math.min(1, movement.y))
      };
    }
  } catch {}

  const facing = getMachineFront(session.machine);
  const forwardX = -facing.x;
  const forwardZ = -facing.z;
  const rightX = -forwardZ;
  const rightZ = forwardX;
  const localX = velocity.x * rightX + velocity.z * rightZ;
  const localZ = velocity.x * forwardX + velocity.z * forwardZ;
  const scale = value => Math.abs(value) < 0.01 ? 0 : Math.max(-1, Math.min(1, value / 0.1));
  return { x: scale(localX), z: scale(localZ) };
}

function anchorPlayer(session) {
  const player = session.player;
  const dx = player.location.x - session.anchor.x;
  const dy = player.location.y - session.anchor.y;
  const dz = player.location.z - session.anchor.z;
  if (dx * dx + dy * dy + dz * dz > 0.0016) {
    try {
      player.teleport(session.anchor, { rotation: session.anchorRotation, keepVelocity: false });
      return;
    } catch {}
  }
  try { player.clearVelocity(); } catch {}
}

function beginDrop(session) {
  if (session.state !== "PLAYING") return;
  session.state = "DROPPING";
  session.ticks = 0;
  try { session.machine.setProperty("warland:state", 5); } catch {}
  try { session.player.playSound("block.piston.out"); } catch {}
  try { session.player.onScreenDisplay.setActionBar("§6El gancho desciende..."); } catch {}
}

world.afterEvents.playerInteractWithEntity.subscribe(({ player, target }) => {
  if (target.typeId !== MACHINE) return;
  const active = sessions.get(player.id);
  if (active) {
    if (active.machine.id === target.id) beginDrop(active);
    return;
  }
  if ([...sessions.values()].some(session => session.machine.id === target.id)) {
    player.sendMessage("§cEsta máquina ya está en uso.");
    return;
  }
  let priorCamera = true, priorLateral = true, priorJump = true;
  try { priorCamera = player.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Camera); } catch {}
  try { priorLateral = player.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.LateralMovement); } catch {}
  try { priorJump = player.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Jump); } catch {}
  const rotation = player.getRotation();
  const session = {
    player, machine: target, state: "PLAYING", ticks: 0,
    clawX: Number(target.getProperty("warland:claw_x") ?? 0), clawZ: Number(target.getProperty("warland:claw_z") ?? 0),
    anchor: { ...player.location }, anchorRotation: { x: rotation.x, y: rotation.y },
    priorCamera, priorLateral, priorJump
  };
  sessions.set(player.id, session);
  try { player.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, false); } catch {}
  try { player.inputPermissions.setPermissionCategory(InputPermissionCategory.LateralMovement, true); } catch {}
  try { player.inputPermissions.setPermissionCategory(InputPermissionCategory.Jump, false); } catch {}
  try {
    const location = target.location;
    const front = getMachineFront(target);
    const right = { x: -front.z, z: front.x };
    const playerSide = (player.location.x - location.x) * right.x +
      (player.location.z - location.z) * right.z;
    const side = playerSide >= 0 ? -2.0 : 2.0;
    player.camera.setCamera("minecraft:free", {
      location: {
        x: location.x + front.x * 4.2 + right.x * side,
        y: location.y + 2.75,
        z: location.z + front.z * 4.2 + right.z * side
      },
      facingLocation: { x: location.x, y: location.y + 2.1, z: location.z }
    });
  } catch { try { player.camera.setCamera("minecraft:first_person"); } catch {} }
  player.sendMessage("§eCruceta/joystick: mover X/Z | §aAtacar: bajar | §cAgacharse: salir");
});

world.afterEvents.itemUse.subscribe(({ source }) => {
  if (!(source instanceof Player)) return;
  const session = sessions.get(source.id);
  if (session) beginDrop(session);
});

world.afterEvents.entityHitEntity.subscribe(({ damagingEntity, hitEntity }) => {
  if (!(damagingEntity instanceof Player) || hitEntity.typeId !== MACHINE) return;
  const session = sessions.get(damagingEntity.id);
  if (session) {
    if (session.machine.id === hitEntity.id) beginDrop(session);
    return;
  }
  if ([...sessions.values()].some(active => active.machine.id === hitEntity.id)) {
    damagingEntity.sendMessage("§cEsta máquina está en uso.");
    return;
  }
  try {
    hitEntity.remove();
    const stack = new ItemStack(MACHINE, 1);
    const inventory = damagingEntity.getComponent("inventory")?.container;
    const leftover = inventory?.addItem(stack);
    if (!inventory || leftover) damagingEntity.dimension.spawnItem(leftover ?? stack, damagingEntity.location);
    damagingEntity.sendMessage("§aMáquina recogida.");
  } catch {
    damagingEntity.sendMessage("§cNo se pudo recoger la máquina.");
  }
});

function award(player, itemId) {
  const stack = new ItemStack(itemId, 1);
  const inventory = player.getComponent("inventory")?.container;
  const leftover = inventory?.addItem(stack);
  if (!inventory || leftover) player.dimension.spawnItem(leftover ?? stack, player.location);
  player.playSound("random.levelup");
  player.sendMessage(`§a¡Premio! Has ganado §e${itemId.replace("warland:", "")}§a.`);
}

system.runInterval(() => {
  for (const [playerId, session] of sessions) {
    const { player, machine } = session;
    if (!player.isValid() || !machine.isValid()) { closeSession(playerId); continue; }
    if (player.isSneaking) { closeSession(playerId, "§7Has salido de la máquina."); continue; }
    if (session.state === "PLAYING") {
      let velocity = { x: 0, y: 0, z: 0 };
      try { velocity = player.getVelocity(); } catch {}
      const movement = readClawInput(session, velocity);
      const mx = movement.x, mz = movement.z;
      if (mx !== 0 || mz !== 0) moveClaw(session, mx, mz);
      else {
        try { machine.setProperty("warland:lever_x", 0); machine.setProperty("warland:lever_z", 0); } catch {}
      }
    } else {
      session.ticks++;
      if (session.state === "DROPPING" && session.ticks === 8) {
        try { machine.setProperty("warland:state", 1); } catch {}
      }
      if (session.state === "DROPPING" && session.ticks === 38) {
        try { machine.setProperty("warland:state", 3); } catch {}
      }
      if (session.ticks === 48 && Math.random() < 0.45) {
        session.prize = PRIZES[Math.floor(Math.random() * PRIZES.length)];
        session.state = "RETURNING";
        try { machine.setProperty("warland:state", 2); } catch {}
      } else if (session.ticks === 48 && !session.prize) {
        session.state = "RETURNING";
        try { machine.setProperty("warland:state", 4); } catch {}
      }
      if (session.ticks >= (session.prize ? 78 : 64)) {
        if (session.prize) award(player, session.prize);
        else { try { player.onScreenDisplay.setActionBar("§cEl gancho resbaló. ¡Inténtalo de nuevo!"); } catch {} }
        session.prize = undefined;
        session.state = "PLAYING";
        session.ticks = 0;
        try { machine.setProperty("warland:state", 0); } catch {}
      }
    }
    anchorPlayer(session);
  }
}, 1);
