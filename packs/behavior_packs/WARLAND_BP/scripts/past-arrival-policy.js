// A sky arrival across the ruined town, independent of the Colossus film.
import {PAST} from './past-policy.js';
export const PAST_ARRIVAL=Object.freeze({ticks:280,turn:190,tag:'warland_past_arrival',key:'warland:past_arrival_v1',maxConcurrent:4});
const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=n=>{n=clamp(n);return n*n*(3-2*n)};
const bezier=(a,b,c,d,u)=>a.map((v,i)=>(1-u)**3*v+3*(1-u)**2*u*b[i]+3*(1-u)*u*u*c[i]+u**3*d[i]);
const point=a=>({x:a[0],y:a[1],z:a[2]});
export function pastArrivalLight(t){
 if(t<=PAST_ARRIVAL.turn)return point(bezier([407,194,-832],[391,179,-820],[264,128,-716],[243,106,-700],clamp(t/PAST_ARRIVAL.turn)));
 return point(bezier([243,106,-700],[227,92,-688],[242,74,-765],[PAST.spawn.x,PAST.spawn.y+1.8,PAST.spawn.z],clamp((t-PAST_ARRIVAL.turn)/(PAST_ARRIVAL.ticks-PAST_ARRIVAL.turn))));
}
export function pastArrivalFrame(t){
 const light=pastArrivalLight(t),ahead=pastArrivalLight(t+1),behind=pastArrivalLight(t-1);
 const dx=ahead.x-behind.x,dz=ahead.z-behind.z,n=Math.hypot(dx,dz)||1;
 const wide=smooth((t-80)/40)*(1-smooth((t-160)/40)),landing=1-smooth((t-240)/40),side=(5+39*wide)*landing;
 const camera={x:light.x+dz/n*side-dx/n*6*landing,y:light.y+7+13*wide,z:light.z-dx/n*side-dz/n*6*landing};
 return {light,camera,target:light,wide,anchor:{x:camera.x,y:camera.y-2,z:camera.z}};
}
