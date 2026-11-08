import {EquipmentSlot} from '@minecraft/server';
export function breakRiftChestplate(player){
 const equipment=player.getComponent('minecraft:equippable');
 if(equipment?.getEquipment(EquipmentSlot.Chest)?.typeId!=='warland:peto_del_osario')return false;
 equipment.setEquipment(EquipmentSlot.Chest,undefined);
 try{player.playSound('random.break',{volume:.7,pitch:.9});player.sendMessage('§7La grieta ha quebrado tu Peto del Osario.');}catch{}
 return true;
}
