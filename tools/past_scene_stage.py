"""Add an elevated intact flash set and repair small traps in the LAB only."""
from pathlib import Path
import collections,datetime,hashlib,json,shutil,struct,subprocess,zipfile
import numpy as np
import past_terrain as t
import team
R=team.ROOT;P=R.parents[1];W=R/'.local/server/worlds/WARLAND_LAB';OUT=R/'.local/past-stage'

def unpack(data):
    r=t.NBT(data);version=r.num('B');assert version==9
    count=r.num('B');sy=r.num('b');layers=[]
    for _ in range(count):
        header=r.num('B');bits=header>>1;assert header%2==0
        if bits:
            per=32//bits;words=np.frombuffer(r.take(((4096+per-1)//per)*4),dtype='<u4');i=np.arange(4096)
            ids=((words[i//per]>>((i%per)*bits))&((1<<bits)-1)).astype(np.uint32);n=r.num('i')
        else:
            ids=np.zeros(4096,dtype=np.uint32);n=1 if r.data[r.i]==10 else r.num('i')
        pal=[]
        for _ in range(n):
            a=r.i;r.root();pal.append(r.data[a:r.i])
        layers.append([ids,pal])
    assert r.i==len(data)
    return sy,layers

def pack(sy,layers):
    out=bytearray([9,len(layers),sy%256])
    for ids,pal in layers:
        bits=next(x for x in [1,2,3,4,5,6,8,16] if len(pal)<=2**x);per=32//bits
        words=np.zeros((4096+per-1)//per,dtype='<u4')
        for offset in range(per):
            vals=ids[offset::per];words[:len(vals)]|=vals.astype(np.uint32)<<(offset*bits)
        out+=bytes([bits<<1])+words.tobytes()+struct.pack('<i',len(pal))+b''.join(pal)
    return bytes(out)

def main():
    assert W.resolve()==(R/'.local/server/worlds/WARLAND_LAB').resolve() and 'el-pasado-worktree' in str(W)
    processes=subprocess.check_output(['powershell','-NoProfile','-Command',"Get-CimInstance Win32_Process -Filter \"Name='bedrock_server.exe'\" | Select-Object -ExpandProperty ExecutablePath"],text=True)
    assert str(R/'.local/server/bedrock_server.exe').lower() not in processes.lower(),'Stop lab first'
    assert not (OUT/'receipt.json').exists(),'Stage already installed; inspect instead of overwriting'
    OUT.mkdir(parents=True,exist_ok=True)
    backup=R/'.local/backups'/('past-before-stage-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'));shutil.copytree(W,backup)
    assert team.hashes(W)==team.hashes(backup)
    DB=t.load_leveldb(P);db=DB(str(W/'db'));before=dict(db.items());pending={}
    _,table=t.NBT(before[b'DimensionNameIdTable']).root();dim=table['entries'][1][t.DIMENSION][1];assert dim>=1000
    def key(cx,cz,tag,sy=None):return struct.pack('<iiiB',cx,cz,dim,tag)+(bytes([sy%256]) if sy is not None else b'')
    with zipfile.ZipFile(R/'.local/terrain/normal/terrain.zip') as z:
        for name in z.namelist():
            k=bytes.fromhex(name);cx,cz=struct.unpack('<ii',k[:8]);cx-=64;tag=k[8];v=z.read(name)
            if tag==47:
                sy=struct.unpack('b',k[9:])[0]
                if not 3<=sy<=10:continue
                nk=key(cx,cz,47,sy+16)
                preserve=[]
                if nk in before:
                    _,existing=unpack(before[nk])
                    for ids,pal in existing:
                        for i in np.unique(ids):
                            name1=t.NBT(pal[int(i)]).root()[1]['name'][1]
                            assert name1=='minecraft:air' or name1.startswith('minecraft:light_block'),('Nonempty stage destination',cx,cz,sy+16,name1)
                            if name1!='minecraft:air':preserve.extend((int(j),pal[int(i)]) for j in np.flatnonzero(ids==i))
                assert v[0]==9 and v[2]==sy
                pending[nk]=v[:2]+bytes([sy+16])+v[3:]
                if preserve:
                    newsy,layers=unpack(pending[nk]);ids,pal=layers[0]
                    for j,raw in preserve:
                        if raw not in pal:pal.append(raw)
                        ids[j]=pal.index(raw)
                    pending[nk]=pack(newsy,layers)
            elif tag==49:
                reader=t.NBT(v);extra=[]
                while reader.i<len(v):
                    name0,b=reader.root()
                    if not 48<=b.get('y',(3,-999))[1]<=175:continue
                    b['x']=(3,b['x'][1]-1024);b['y']=(3,b['y'][1]+256);extra.append(t.root(name0,b))
                nk=key(cx,cz,49);pending[nk]=before.get(nk,b'')+b''.join(extra)
            elif tag==43:
                nk=key(cx,cz,43)
                if nk in before:
                    heights=np.maximum(np.frombuffer(before[nk][:512],dtype='<u2'),np.frombuffer(v[:512],dtype='<u2')+256).astype('<u2')
                    pending[nk]=heights.tobytes()+before[nk][512:]
    # Audit all small dry depressions in the public ruins using the source's
    # real block occupancy. Broad lakes, containers and buildings are untouched.
    terrain=json.loads((P/'outputs/WARLAND1-Memoria-IV/Mundo-reconstruido/Ruinas-oscuras/terrain.json').read_text(encoding='utf-8'))
    palette=terrain['palette'];names=[v['name'] for v in palette]
    cells={(x,y,z):i for x,y,z,i,*_ in terrain['blocks'] if 208<=x<=431 and -896<=z<=-657 and 54<=y<=66}
    air=lambda p:names[cells.get(p,0)] in ('minecraft:air','minecraft:short_grass','minecraft:tallgrass','minecraft:deadbush')
    floors={}
    ground={'minecraft:stone','minecraft:dirt','minecraft:grass','minecraft:grass_block','minecraft:deepslate','minecraft:cobbled_deepslate','minecraft:gravel','minecraft:sand','minecraft:blackstone','minecraft:cobblestone'}
    for x in range(208,432):
        for z in range(-896,-656):
            for y in range(62,55,-1):
                if not air((x,y,z)) and air((x,y+1,z)) and air((x,y+2,z)):
                    floors[x,z]=y;break
    pits={p for p,y in floors.items() if y<=60 and names[cells.get((p[0],y,p[1]),0)] in ground}
    components=[]
    while pits:
        start=pits.pop();q=[start]
        for x,z in q:
            for dx,dz in [(1,0),(-1,0),(0,1),(0,-1)]:
                n=x+dx,z+dz
                if n in pits:pits.remove(n);q.append(n)
        components.append(q)
    edits=[];cache={}
    def set_block(x,y,z,name):
        nk=key(x//16,z//16,47,y//16)
        if nk not in cache:cache[nk]=unpack(pending.get(nk,before[nk]))
        sy,layers=cache[nk];ids,pal=layers[0];index=(x%16)*256+(z%16)*16+y%16
        current=t.NBT(pal[int(ids[index])]).root()[1]
        if current['name'][1] not in ('minecraft:air','minecraft:tallgrass','minecraft:short_grass','minecraft:deadbush'):return False
        block={'name':(8,name),'states':(10,{}),'version':current.get('version',(3,18168865))};raw=t.root('',block)
        if raw not in pal:pal.append(raw)
        ids[index]=pal.index(raw);edits.append({'at':[x,y,z],'before':current['name'][1],'after':name});return True
    repaired=[]
    for comp in components:
        if len(comp)>24:continue
        # Only isolated pits with an adjacent two-block-or-higher rim qualify.
        perimeter=[((x,z),(x+dx,z+dz)) for x,z in comp for dx,dz in [(1,0),(-1,0),(0,1),(0,-1)] if (x+dx,z+dz) not in comp and (x+dx,z+dz) in floors]
        if not perimeter or any(floors[b]<=floors[a]+1 for a,b in perimeter):continue
        a,b=min(perimeter,key=lambda ab:floors[ab[1]]-floors[ab[0]])
        if floors[b]>62:continue
        # A small fallen-stone foothold leaves the crater visible, but gives an
        # ordinary player a one-block step back onto the surrounding ground.
        for y in range(floors[a]+1,floors[b]):set_block(a[0],y,a[1],'minecraft:cobbled_deepslate')
        repaired.append({'cells':len(comp),'step':[a[0],floors[b]-1,a[1]],'rim':[b[0],floors[b],b[1]]})
    # Clear the exact archway already cleared by the approved render source.
    for y in range(63,71):
        for z in range(-786,-777):
            nk=key(243//16,z//16,47,y//16)
            if nk not in cache:cache[nk]=unpack(pending.get(nk,before[nk]))
            sy,layers=cache[nk];ids,pal=layers[0];i=(243%16)*256+(z%16)*16+y%16
            b=t.NBT(pal[int(ids[i])]).root()[1]
            if 'fence' in b['name'][1]:
                raw=t.root('',{'name':(8,'minecraft:air'),'states':(10,{}),'version':b.get('version',(3,18168865))})
                if raw not in pal:pal.append(raw)
                ids[i]=pal.index(raw);edits.append({'at':[243,y,z],'before':b['name'][1],'after':'minecraft:air','reason':'approved camera arch'})
    for k,(sy,layers) in cache.items():pending[k]=pack(sy,layers)
    for k,v in pending.items():db.put(k,v)
    after=dict(db.items());db.close()
    assert all(v==after[k] for k,v in before.items() if k not in pending)
    assert all(v==after[k] for k,v in pending.items())
    report={'backup':str(backup),'stageHeight':256,'stageRecords':len(pending),'unchangedRecords':len(before)-len(set(before)&set(pending)),'exactUnrelatedRecords':True,'smallDryPitsRepaired':repaired,'blockEdits':edits,'inventoriesCopied':False,'officialTouched':False}
    team.write(OUT/'receipt.json',report)
    # This exact delta can later be reviewed by an installer; no whole lab DB.
    with zipfile.ZipFile(OUT/'delta.zip','w',zipfile.ZIP_DEFLATED) as z:
        for k,v in pending.items():z.writestr(k.hex(),v)
    print(json.dumps({k:v for k,v in report.items() if k not in ('blockEdits','smallDryPitsRepaired')}),len(edits),'edits;',len(repaired),'small pits')
if __name__=='__main__':main()
