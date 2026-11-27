"""Add only the reviewed Past dimension to a marked CLOSED installation stage.

No player records, existing chunks, inventories, clocks or rules are imported.
All original records, including the prior dimension mapping, are audited.
"""
from pathlib import Path
import hashlib,json,struct,zipfile
import past_terrain as t

def plan(before,archive):
    old=before.get(b'DimensionNameIdTable');name,table=t.NBT(old).root()if old else ('',{'entries':(10,{})})
    entries=table['entries'][1]
    if t.DIMENSION in entries:raise ValueError('El Pasado already exists; refusing to replace its progress')
    used={value[1]for value in entries.values()}
    for k in before:
        if len(k) in (13,14) and k[12]in t.SAFE_CHUNK_TAGS:
            dimension=struct.unpack('<i',k[8:12])[0]
            if 1000<=dimension<100000:used.add(dimension)
    dim=max({999,*used})+1
    delta={};chunks=set();blocks=0
    with zipfile.ZipFile(archive)as z:
        for fname in z.namelist():
            k=bytes.fromhex(fname);assert len(k)in (9,10)
            x,zz=struct.unpack('<ii',k[:8]);tag=k[8]
            if not ((8<=x<=31 or 72<=x<=95)and -60<=zz<=-37 and tag in t.SAFE_CHUNK_TAGS):raise ValueError('Outside approved terrain bounds')
            v=z.read(fname)
            if tag==49:
                nbt=t.NBT(v)
                while nbt.i<len(v):
                    _,entity=nbt.root()
                    if any(key in entity for key in ['Items','LootTable','Command','Owner','OwnerID']):raise ValueError('Historical container has inventory or executable data')
                    blocks+=1
            if tag==47:chunks.add((x,zz))
            key=k[:8]+struct.pack('<i',dim)+k[8:]
            if key in before:raise ValueError('Existing destination chunk; refusing overwrite')
            delta[key]=v
    assert len(chunks)>=1100 and len(delta)>=15000,'Incomplete terrain export'
    entries[t.DIMENSION]=(3,dim);delta[b'DimensionNameIdTable']=t.root(name,table)
    return delta,{'dimensionId':dim,'chunks':len(chunks),'terrainRecords':len(delta)-1,'sanitizedBlockEntities':blocks,'terrainSha256':hashlib.sha256(Path(archive).read_bytes()).hexdigest()}

def apply(world,archive,project):
    assert (world/'.warland-past-stage').is_file(),'Only a marked CLOSED stage'
    DB=t.load_leveldb(project);db=DB(str(world/'db'))
    try:
        before=dict(db.items());delta,report=plan(before,archive);db.put_batch(delta);after=dict(db.items())
        assert len(after)==len(before)+len(delta)-(1 if b'DimensionNameIdTable'in before else 0)
        assert all(after[k]==v for k,v in before.items()if k!=b'DimensionNameIdTable')
        assert all(after[k]==v for k,v in delta.items())
        report.update(originalRecords=len(before),existingRecordsByteIdentical=True,playersAndInventoriesUnchanged=True)
        return report
    finally:db.close()
