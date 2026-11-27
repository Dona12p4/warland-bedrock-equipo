"""Bounded terrain-only transfer into an ALREADY registered custom dimension.

Never copies player/actor records, global rules or inventories. Source databases
are opened only through disposable copies. This utility targets a stopped lab;
an official installer must apply and verify its own backup and delta guards.
"""
from pathlib import Path
import argparse, hashlib, json, shutil, struct, sys, zipfile

DIMENSION = 'warland:el_pasado'
BOUNDS = (128, 511, -960, -577)
SAFE_CHUNK_TAGS = {43, 44, 45, 47, 49, 54}
DISABLED_BLOCKS = {'minecraft:portal','minecraft:end_portal','minecraft:end_gateway',
 'minecraft:command_block','minecraft:chain_command_block','minecraft:repeating_command_block'}

class NBT:
    def __init__(self, data): self.data=data; self.i=0
    def take(self,n):
        b=self.data[self.i:self.i+n]; assert len(b)==n; self.i+=n; return b
    def num(self,f): return struct.unpack('<'+f,self.take(struct.calcsize('<'+f)))[0]
    def string(self): return self.take(self.num('H')).decode('utf-8','surrogateescape')
    def payload(self,t):
        if 1<=t<=6:return self.num({1:'b',2:'h',3:'i',4:'q',5:'f',6:'d'}[t])
        if t==7:return self.take(self.num('i'))
        if t==8:return self.string()
        if t==9:
            st=self.num('B');return (st,[self.payload(st) for _ in range(self.num('i'))])
        if t==10:
            out={}
            while (st:=self.num('B')):
                name=self.string();out[name]=(st,self.payload(st))
            return out
        if t in (11,12):return [self.num('i' if t==11 else 'q') for _ in range(self.num('i'))]
        raise ValueError(t)
    def root(self):
        t=self.num('B');assert t==10;name=self.string();return name,self.payload(t)

def string(s):
    b=s.encode('utf-8','surrogateescape');return struct.pack('<H',len(b))+b
def payload(t,v):
    if 1<=t<=6:return struct.pack('<'+{1:'b',2:'h',3:'i',4:'q',5:'f',6:'d'}[t],v)
    if t==7:return struct.pack('<i',len(v))+v
    if t==8:return string(v)
    if t==9:return bytes([v[0]])+struct.pack('<i',len(v[1]))+b''.join(payload(v[0],x) for x in v[1])
    if t==10:return b''.join(bytes([s])+string(k)+payload(s,x) for k,(s,x) in v.items())+b'\0'
    if t in (11,12):return struct.pack('<i',len(v))+b''.join(struct.pack('<'+('i' if t==11 else 'q'),x) for x in v)
    raise ValueError(t)
def root(name,v):return b'\x0a'+string(name)+payload(10,v)

def block_entities(data, offset):
    reader=NBT(data);result=[]
    while reader.i<len(data):
        name,v=reader.root()
        if v.get('id',(0,''))[1] in ('CommandBlock','EndGateway','EndPortal'):continue
        for key in list(v):
            if key.lower() in ('items','loottable','loottableseed','command','lastoutput','owner','ownerid'):del v[key]
        if 'x' in v:v['x']=(v['x'][0],v['x'][1]+offset)
        result.append(root(name,v))
    return b''.join(result)

def sanitize_subchunk(data):
    # Retain bitpacking and both fluid layers verbatim; replace only unsafe
    # palette compounds. The replacement keeps the same palette index.
    r=NBT(data);version=r.num('B');assert version in (8,9)
    layers=r.num('B')
    if version==9:r.take(1)
    out=[data[:r.i]];replaced=0
    for _ in range(layers):
        start=r.i;bits=r.num('B')>>1
        if bits:r.take(((4096+(32//bits)-1)//(32//bits))*4)
        count=1 if bits==0 and data[r.i]==10 else r.num('i')
        out.append(data[start:r.i])
        for _ in range(count):
            begin=r.i;name,v=r.root()
            if v['name'][1] in DISABLED_BLOCKS:
                v['name']=(8,'minecraft:obsidian');v['states']=(10,{})
                out.append(root(name,v));replaced+=1
            else:out.append(data[begin:r.i])
    assert r.i==len(data)
    return b''.join(out),replaced

def load_leveldb(root_path):
    sys.path.insert(0,str(root_path/'.runtime/world-tools'))
    from amulet.leveldb import LevelDB
    return LevelDB

def digest_records(records):
    h=hashlib.sha256()
    for k in sorted(records):h.update(struct.pack('<I',len(k))+k+struct.pack('<I',len(records[k]))+records[k])
    return h.hexdigest()

def export(source, dest, offset, project):
    dest.mkdir(parents=True,exist_ok=True)
    assert not (dest/'terrain.zip').exists(),'Export already exists'
    copy=dest/'source-copy'
    if not copy.exists():shutil.copytree(source/'db',copy/'db')
    DB=load_leveldb(project);db=DB(str(copy/'db'));records={};chunks=set();replaced=0
    for k,v in db.items():
        if len(k) not in (9,10):continue
        x,z=struct.unpack('<ii',k[:8]);tag=k[8]
        if not (BOUNDS[0]//16<=x<=BOUNDS[1]//16 and BOUNDS[2]//16<=z<=BOUNDS[3]//16 and tag in SAFE_CHUNK_TAGS):continue
        nk=struct.pack('<ii',x+offset//16,z)+k[8:]
        if tag==49:v=block_entities(v,offset)
        if tag==47:
            v,n=sanitize_subchunk(v);replaced+=n;chunks.add((x,z))
        records[nk]=v
    db.close()
    core={(x,z) for x in range(12,28) for z in range(-57,-40)}
    assert core.issubset(chunks),(sorted(core-chunks),'Playable terrain coverage incomplete')
    with zipfile.ZipFile(dest/'terrain.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for k,v in records.items():z.writestr(k.hex(),v)
    receipt={'source':str(source),'offsetX':offset,'bounds':list(BOUNDS),'chunks':len(chunks),'coreChunks':len(core),'coreComplete':True,'records':len(records),'sha256Records':digest_records(records),'disabledPaletteEntries':replaced,'playersCopied':False,'entitiesCopied':False,'inventoriesCopied':False}
    (dest/'terrain.json').write_text(json.dumps(receipt,indent=2))
    print(json.dumps(receipt))

def inject(world, exports, project):
    assert 'el-pasado-worktree' in str(world.resolve()) and world.name=='WARLAND_LAB','Only the independent laboratory is allowed'
    backup=world.parents[2]/'backups/past-pre-terrain'
    assert not backup.exists(),'Existing backup: inspect before retry'
    shutil.copytree(world,backup)
    DB=load_leveldb(project);db=DB(str(world/'db'))
    _,table=NBT(db.get(b'DimensionNameIdTable')).root()
    dimension=table['entries'][1][DIMENSION][1]
    assert dimension>=1000
    # Back up all DB records so the caller can prove an exact bounded delta.
    before=dict(db.items());added={}
    for export_path in exports:
        with zipfile.ZipFile(export_path/'terrain.zip') as z:
            records={bytes.fromhex(n):z.read(n) for n in z.namelist()}
        receipt=json.loads((export_path/'terrain.json').read_text(encoding='utf-8'))
        assert digest_records(records)==receipt['sha256Records']
        for k,v in records.items():
            nk=k[:8]+struct.pack('<i',dimension)+k[8:]
            assert nk not in before and nk not in added,'Refuse to overwrite existing terrain'
            added[nk]=v
    for k,v in added.items():db.put(k,v)
    after=dict(db.items());db.close()
    assert all(after[k]==v for k,v in before.items())
    assert all(after[k]==v for k,v in added.items())
    assert len(after)==len(before)+len(added)
    report={'dimension':DIMENSION,'dimensionId':dimension,'backup':str(backup),'addedRecords':len(added),'untouchedRecords':len(before),'existingRecordsExact':True,'sourceRecordHash':digest_records(added)}
    (world.parents[2]/'past-terrain-installation.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('action',choices=['export','inject']);p.add_argument('source',type=Path);p.add_argument('destination',type=Path);p.add_argument('--offset',type=int,default=0);p.add_argument('--project',type=Path,required=True);p.add_argument('--normal',type=Path);a=p.parse_args()
    if a.action=='export':export(a.source,a.destination,a.offset,a.project)
    else:inject(a.destination,[a.source]+([a.normal] if a.normal else []),a.project)
