import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {mergePropertyTag} from './property_merge.mjs';
const [input,output,mapFile,nbtModule]=process.argv.slice(2);
const nbt=createRequire(import.meta.url)(nbtModule),mapping=JSON.parse(readFileSync(mapFile));

const edits=[];
for(const row of JSON.parse(readFileSync(input))){
  const buffer=Buffer.from(row.value,'base64'),parts=[],counts={namespaces:0,properties:0};let offset=0;
  // Block-entity records can contain several concatenated NBT roots. Never
  // serialize only the first root and silently discard the following ones.
  while(offset<buffer.length){
    const parsed=nbt.protoLE.parsePacketBuffer('nbt',buffer.subarray(offset));
    const size=parsed.metadata.size;if(!size||size>buffer.length-offset)throw Error('Invalid NBT size');
    const before=counts.namespaces;mergePropertyTag(parsed.data,mapping,counts);
    parts.push(counts.namespaces===before?buffer.subarray(offset,offset+size):nbt.writeUncompressed(parsed.data,'little'));
    offset+=size;
  }
  if(counts.namespaces)edits.push({key:row.key,value:Buffer.concat(parts).toString('base64'),...counts});
}
writeFileSync(output,JSON.stringify(edits));
