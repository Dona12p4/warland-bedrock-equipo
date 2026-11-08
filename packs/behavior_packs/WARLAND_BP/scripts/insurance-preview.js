import {world} from '@minecraft/server';
world.afterEvents.worldLoad.subscribe(()=>{world.gameRules.keepInventory=false;world.setDynamicProperty('warland:insurance_preview',true);});
