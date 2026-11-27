import {isDeepStrictEqual} from 'node:util';
export function mergePropertyTag(tag,mapping,counts={namespaces:0,properties:0}){
  if(tag?.type==='list')for(const value of tag.value.value)mergePropertyTag({type:tag.value.type,value},mapping,counts);
  if(tag?.type!=='compound')return;
  const obj=tag.value;
  for(const child of Object.values(obj))mergePropertyTag(child,mapping,counts);
  for(const old of Object.keys(obj)){
    const target=mapping[old];if(!target||target===old)continue;
    if(obj[old].type!=='compound')throw Error('Namespace is not a compound: '+old);
    if(!obj[target])obj[target]={type:'compound',value:{}};
    if(obj[target].type!=='compound')throw Error('Destination is not a compound');
    for(const [name,value] of Object.entries(obj[old].value)){
      if(obj[target].value[name]&&!isDeepStrictEqual(obj[target].value[name],value))throw Error('Conflicting saved property '+name+' in '+old);
      obj[target].value[name]=value;counts.properties++;
    }
    delete obj[old];counts.namespaces++;
  }
}
