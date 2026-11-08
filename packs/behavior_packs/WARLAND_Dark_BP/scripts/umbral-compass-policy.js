export const COMPASS='warland:brujula_umbral_prueba';
export const isCompass=id=>id===COMPASS||/^warland:brujula_umbral_prueba_\d{2}$/.test(id??'');
export function compassFrame(position,yaw,target,frames=32){
 if(!target)return null;
 const dx=target.x-position.x,dz=target.z-position.z;
 if(Math.hypot(dx,dz)<.25)return 0;
 // Bedrock yaw 0 faces +Z; +90 faces -X. Screen clockwise is target yaw minus player yaw.
 const degrees=-Math.atan2(dx,dz)*180/Math.PI-yaw;
 return ((Math.round(degrees/360*frames)%frames)+frames)%frames;
}
export const compassType=frame=>frame===null?COMPASS:COMPASS+'_'+String(frame).padStart(2,'0');
