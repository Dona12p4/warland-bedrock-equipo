import {ADMIN_NAMES} from './core.js';
import {inPast} from './past-policy.js';
import {enterPast,exitPast,startPastFilm,stopPastFilm,unstuckPast} from './past.js';

export function pastAdminPage(p){
 const allowed=()=>ADMIN_NAMES.includes(p.name.toLowerCase());
 if(!allowed())throw Error('Solo administradores autorizados.');
 const action=(id,text,fn)=>({id,text,close:true,run:async()=>{
  if(!allowed())throw Error('Solo administradores autorizados.');
  return await fn();
 }});
 return {title:'El Pasado y llegadas',body:'Pruebas de viaje y cinemáticas. Conservan tu inventario y cama.\nLa luz de salida de El Pasado te lleva al lobby con su animación.',rows:[
  action('past-arrival','Entrar a El Pasado · buscar la luz',()=>enterPast(p,false,true)),
  action('past-ruins','Recorrer ruinas · sin llegada',()=>enterPast(p,false,true)),
  action('past-film','Ver cinemática del Coloso',()=>startPastFilm(p)),
  action('past-intact','Antes de la ceniza · vista previa',()=>enterPast(p,true)),
  ...(inPast(p)?[
   action('past-stop-film','Salir de la cinemática',()=>stopPastFilm(p)),
   action('past-entrance','Volver a la entrada de El Pasado',()=>unstuckPast(p)),
   action('past-lobby','Volver al lobby · con animación',()=>exitPast(p,true)),
   action('past-origin','Regresar a mi punto anterior',()=>exitPast(p)),
  ]:[action('lobby-visit','Visitar el lobby',()=>p.runCommand('warland:lobby'))]),
  action('lobby-arrival','Probar llegada del lobby · desde su luz',()=>p.runCommand('warland:llegada')),
  {text:'Volver a Administración',page:'main'},
 ]};
}
