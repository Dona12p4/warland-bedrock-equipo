import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const path=new URL('../packs/behavior_packs/WARLAND_BP/scripts/',import.meta.url),calls=[],forms=[],replies=[];
const read=n=>fs.readFileSync(new URL(n,path),'utf8').replace(/^import .+;\r?\n/gm,'').replace(/\bexport /g,'');
let entering=true,flight=false,beta=true;
const core={ADMIN_NAMES:['danielgamersc','hatsudemiku'],inPast:p=>p.past,
 enterPast:async(p,...args)=>{calls.push(['enter',...args]);return entering;},exitPast:async(p,...args)=>calls.push(['exit',...args]),
 startPastFilm:p=>calls.push(['film']),stopPastFilm:p=>calls.push(['stop']),unstuckPast:p=>calls.push(['unstuck']),
 pastArrivalActive:()=>flight,startPastArrival:()=>{calls.push(['flight']);return true;}};
const ctx=vm.createContext(core);vm.runInContext(read('past-admin-menu.js'),ctx);const page=vm.runInContext('pastAdminPage',ctx);
const player={name:'DanielGamerSC',id:'admin',past:false,runCommand:c=>calls.push(['command',c]),getComponent:()=>({currentValue:20})};
assert.throws(()=>page({...player,name:'visitante'}),/administradores/);
let data=page(player);assert(!data.rows.some(r=>r.id==='past-lobby'));assert(data.rows.some(r=>r.id==='lobby-visit'));
entering=false;await data.rows.find(r=>r.id==='past-arrival').run();assert(!calls.some(c=>c[0]==='flight'));
calls.length=0;entering=true;flight=true;await data.rows.find(r=>r.id==='past-arrival').run();assert.equal(calls.length,1,'Do not start a second flight');
calls.length=0;flight=false;await data.rows.find(r=>r.id==='past-arrival').run();assert.deepEqual(calls,[['enter',false,true]]);
player.past=true;data=page(player);await data.rows.find(r=>r.id==='past-lobby').run();assert.deepEqual(calls.at(-1),['exit',true]);
await data.rows.find(r=>r.id==='past-origin').run();assert.deepEqual(calls.at(-1),['exit']);
player.name='visitante';await assert.rejects(()=>data.rows.find(r=>r.id==='past-film').run(),/administradores/);player.name='DanielGamerSC';
class Form{constructor(){this.buttons=[];}title(s){this.label=s;return this;}body(){return this;}button(s){this.buttons.push(s);return this;}async show(){forms.push({title:this.label,buttons:[...this.buttons]});const next=replies.shift();return next?{selection:this.buttons.indexOf(next),canceled:false}:{canceled:true};}}
const events=new Proxy({}, {get:()=>({subscribe(){}})});
Object.assign(ctx,{pastAdminPage:page,world:{beforeEvents:events,afterEvents:events,getDynamicProperty:()=>beta},system:{beforeEvents:events},ActionFormData:Form,ModalFormData:Form,FormCancelationReason:{UserBusy:'busy'},ItemTypes:{get:()=>false},registerAction(){},performAction(){},freeBetaShop:()=>true,seasonDay:()=>1,W3:{},localDay:()=>'',teamTag(){}});
vm.runInContext(read('inventory-menu.js'),ctx);const make=vm.runInContext('createInventoryMenu',ctx),messages=[];
const menu=make({ready:()=>true,recordFor:()=>({id:'a'}),w3:{ensure(){},repo:{get:()=>({balance:0,maximumHealth:20})},getSeason:()=>({startedAt:null,firstMandateAt:null})},message:(p,s)=>messages.push(s)});
replies.push('El Pasado y llegadas','Recorrer ruinas · sin llegada');await menu.open(player);assert.equal(forms[0].title,'Administración · BETA');assert.equal(forms[1].title,'El Pasado y llegadas');assert.deepEqual(calls.at(-1),['enter',false,true]);assert.equal(forms.length,2,'Travel closes the menu before cinematic');
forms.length=0;await menu.open(player,'beta');assert(forms[0].buttons.includes('El Pasado y llegadas'));
forms.length=0;player.name='visitante';await menu.open(player);assert(!forms[0].buttons.includes('El Pasado y llegadas'));
forms.length=0;await menu.open(player,'past');assert.equal(forms.length,0);assert(messages.some(s=>/administradores/.test(s)));
forms.length=0;player.name='Hatsudemiku';beta=false;await menu.open(player);assert(forms[0].buttons.includes('El Pasado y llegadas'));
console.log('PASS: Administration/Beta navigation, authorized actions, hidden nonadmin access, travel menu closure, replay guard and return routing.');
