// Manual, global lobby chronology. It does not start WARLAND's season clock.
export const TIMELINE = {days:30,preparedThrough:7,version:1};
export const STAGE_TITLES=['Refugio intacto','La primera mancha','Raíces invasoras','La luz se debilita','El santuario enferma','El último resplandor','La Cuna corrompida'];
export const timelineAdmin=p=>!!p&&['danielgamersc','hatsudemiku'].includes(String(p.name).toLowerCase());
export const weekOf=day=>Math.floor((day-1)/7)+1;
export const dayInWeek=day=>(day-1)%7+1;
export function weeksFrom(day){
 return Array.from({length:Math.ceil(TIMELINE.days/7)},(_,i)=>({week:i+1,first:i*7+1,last:Math.min(i*7+7,TIMELINE.days),locked:i*7+1>TIMELINE.preparedThrough})).filter(w=>w.week>=weekOf(day));
}
export function daysAfter(day,week){
 return Array.from({length:7},(_,i)=>(week-1)*7+i+1).filter(n=>n>day&&n<=TIMELINE.days).map(n=>({day:n,label:dayInWeek(n),locked:n>TIMELINE.preparedThrough,title:STAGE_TITLES[n-1]??'Por diseñar'}));
}
export function assertAdvance(player,from,to,current,busy){
 if(!timelineAdmin(player))throw Error('Solo administradores autorizados.');
 if(busy)throw Error('El lobby todavía está cambiando.');
 if(from!==current)throw Error('Otro administrador ya avanzó la línea del tiempo. Vuelve a abrirla.');
 if(!Number.isInteger(to)||to<=current||to<2||to>TIMELINE.days)throw Error('Solo se puede avanzar a un día posterior.');
 if(to>TIMELINE.preparedThrough)throw Error('Esta semana está bloqueada hasta diseñar su lobby.');
}
