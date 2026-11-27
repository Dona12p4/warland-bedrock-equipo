export const PAST={dimension:'warland:el_pasado',returnKey:'warland:past_return_v1',filmKey:'warland:past_film_v1',filmTag:'warland_past_film',normalOffset:1024,sound:'warland.past.cinema',duration:63.5,actor:'warland:pasado_coloso',actorAt:{x:361,y:63,z:-770},spawn:{x:250.5,y:64,z:-782.5},bounds:{x0:208,x1:431,z0:-896,z1:-657}};
export const SHOTS=[
 {t:0,d:13.7,a:[229,65.6,-782.5],b:[266,67,-782.5],f:[284,67,-783],fov:64},
 {t:13.7,d:13.733333333,a:[268,70.5,-795],b:[276,70,-800],f:[284,67,-783],fov:64},
 {t:27.433333333,d:17.133333334,a:[302,79,-766],b:[294,76,-760],f:[284,67,-783],fov:64},
 {t:44.566666667,d:18.933333333,a:[365.25,70.4,-766.6],b:[365,70.3,-767],f:[361.7,69.6,-774],fov:55}
];
export const pastAdmin=name=>['danielgamersc','hatsudemiku'].includes(String(name).toLowerCase());
export const inPast=e=>e?.dimension?.id===PAST.dimension;
export const normalPast=p=>inPast(p)&&p.location.x>900;
export const offsetPoint=(p,normal=false)=>({...p,x:p.x+(normal?PAST.normalOffset:0)});
export function inPastBounds(p){const x=p.x-(p.x>900?PAST.normalOffset:0),b=PAST.bounds;return x>=b.x0&&x<=b.x1&&p.z>=b.z0&&p.z<=b.z1&&p.y>40&&p.y<180;}
export function shotAt(seconds){let i=0;while(i+1<SHOTS.length&&seconds>=SHOTS[i+1].t)i++;return {index:i,shot:SHOTS[i],u:Math.max(0,Math.min(1,(seconds-SHOTS[i].t)/SHOTS[i].d))};}
export function cameraAt(seconds){const {shot:s,u}=shotAt(seconds);return {position:s.a.map((n,i)=>n+(s.b[i]-n)*u),target:s.f,fov:s.fov};}
export function validReturn(s){return !!s&&typeof s.dimension==='string'&&s.dimension!==PAST.dimension&&['x','y','z'].every(k=>Number.isFinite(s.location?.[k]))&&['Survival','Creative','Adventure','Spectator'].map(x=>x.toLowerCase()).includes(String(s.mode).toLowerCase());}
