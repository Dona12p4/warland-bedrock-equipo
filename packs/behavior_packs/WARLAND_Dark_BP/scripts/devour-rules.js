export function eligibleStrike({player,alive,mode,dimension,action,damage,cause,busy,cooldown}){
 return player&&alive&&!['minecraft:the_end','the_end'].includes(dimension)&&['Survival','Adventure','survival','adventure'].includes(mode)&&action>=1&&action<=4&&damage>0&&cause==='entityAttack'&&!busy&&!cooldown;
}
export const chooseDevour=(chance,random=Math.random)=>chance>0&&random()<chance;
export function devourChanceForDay(day,settings){
 const elapsed=Math.min(29,Math.max(0,Math.floor(Number(day)||0)-1));
 return Math.min(settings.maximumChance??.15,Math.max(0,settings.chance+(settings.dailyIncrease??.005)*elapsed));
}
