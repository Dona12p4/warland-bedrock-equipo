"""Merge saved pack namespaces ONLY in a marked, closed staging world."""
from pathlib import Path
import argparse,base64,hashlib,json,subprocess,sys

def migrate(world,mapping,leveldb_tools,nbt_module):
    world=world.resolve()
    if not (world/'.warland-unified-stage').is_file():raise RuntimeError('Not a marked staging world; never edit a live/original DB')
    sys.path.insert(0,str(leveldb_tools.resolve()))
    from amulet.leveldb import LevelDB
    namespace=json.loads(mapping.read_text());needles=[x.encode() for x,y in namespace.items() if x!=y]
    db=LevelDB(str(world/'db'));before={k:hashlib.sha256(v).hexdigest() for k,v in db.items()}
    rows=[{'key':base64.b64encode(k).decode(),'value':base64.b64encode(v).decode()} for k,v in db.items() if (k==b'DynamicProperties' or b'DynamicProperties' in v) and any(n in v for n in needles)]
    db.close()
    inp=world.parent/'property-input.json';out=world.parent/'property-output.json';inp.write_text(json.dumps(rows))
    subprocess.run(['node',str(Path(__file__).with_name('merge_property_nbt.mjs')),str(inp),str(out),str(mapping.resolve()),str(nbt_module.resolve())],check=True)
    edits=json.loads(out.read_text());changes={base64.b64decode(r['key']):base64.b64decode(r['value']) for r in edits}
    db=LevelDB(str(world/'db'))
    # Refuse a DB that changed while the migration was being prepared.
    assert {k:hashlib.sha256(v).hexdigest() for k,v in db.items()}==before
    db.put_batch(changes);db.close()
    db=LevelDB(str(world/'db'));after={k:hashlib.sha256(v).hexdigest() for k,v in db.items()};db.close()
    assert set(before)==set(after)
    for k,h in before.items():assert after[k]==(hashlib.sha256(changes[k]).hexdigest() if k in changes else h)
    report={'passed':True,'records':len(before),'changed':len(changes),'namespacesMerged':sum(r['namespaces'] for r in edits),'propertiesPreserved':sum(r['properties'] for r in edits),'otherRecordsByteIdentical':True,'world':str(world)}
    (world.parent/'property-migration.json').write_text(json.dumps(report,indent=2));print(json.dumps(report));return report
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--world',type=Path,required=True);p.add_argument('--map',type=Path,required=True);p.add_argument('--leveldb-tools',type=Path,required=True);p.add_argument('--nbt-module',type=Path,required=True);a=p.parse_args();migrate(a.world,a.map,a.leveldb_tools,a.nbt_module)
