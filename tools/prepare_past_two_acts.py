"""A new full-addon review server from a CLOSED backup, leaving live labs alone."""
from pathlib import Path
import json,shutil,struct,uuid,zipfile
import team,past_terrain as t
from migrate_unified_props import migrate
R=team.ROOT;P=R.parents[1]
def prepare(candidate,out):
    assert not out.exists() and out.resolve().is_relative_to((R/'.local').resolve())
    template=R/'.local/server';backup=R/'.local/backups/past-before-atmosphere-20261127-020244'
    server=out/'server';server.mkdir(parents=True)
    for name in ['bedrock_server.exe','config','data','definitions','resource_packs','behavior_packs','profanity_filter.wlist']:
        src=template/name
        if src.is_dir():shutil.copytree(src,server/name)
        elif src.is_file():shutil.copy2(src,server/name)
    for src in template.glob('*.dll'):shutil.copy2(src,server/src.name)
    world=server/'worlds/WARLAND_LAB';world.mkdir(parents=True)
    for src in backup.iterdir():
        if src.name in ['behavior_packs','resource_packs','world_behavior_packs.json','world_resource_packs.json']:continue
        if src.is_dir():shutil.copytree(src,world/src.name)
        else:shutil.copy2(src,world/src.name)
    (world/'.warland-unified-stage').write_text('Closed-copy candidate; no original/live DB source.')
    report=team.read(candidate/'consolidation.json');mapping=out/'property-map.json';team.write(mapping,report['propertyMigration'])
    migration=migrate(world,mapping,P/'.runtime/world-tools',P/'.runtime/nbt-tools/node_modules/prismarine-nbt')
    for kind,name in [('behavior','WARLAND_BP'),('resource','WARLAND_RP')]:
        shutil.copytree(candidate/name,world/f'{kind}_packs'/name)
    # Isolate client resource caching without changing gameplay identity.
    rp=world/'resource_packs/WARLAND_RP/manifest.json';m=team.read(rp);old=m['header']['uuid'];new=str(uuid.uuid4());m['header']['uuid']=new
    for module in m['modules']:module['uuid']=str(uuid.uuid4())
    team.write(rp,m);bp=world/'behavior_packs/WARLAND_BP/manifest.json';b=team.read(bp)
    for dep in b.get('dependencies',[]):
        if dep.get('uuid')==old:dep['uuid']=new
    team.write(bp,b)
    for kind,m in [('behavior',b),('resource',m)]:team.write(world/f'world_{kind}_packs.json',[{'pack_id':m['header']['uuid'],'version':m['header']['version']}])
    DB=t.load_leveldb(P);db=DB(str(world/'db'));before=dict(db.items());_,table=t.NBT(before[b'DimensionNameIdTable']).root();dim=table['entries'][1][t.DIMENSION][1];pending={}
    with zipfile.ZipFile(R/'.local/past-two-acts/terrain.zip')as z:
        for name in z.namelist():
            k=bytes.fromhex(name);cx,cz=struct.unpack('<ii',k[:8]);assert (8<=cx<=31 or 72<=cx<=95)and -60<=cz<=-37 and k[8] in t.SAFE_CHUNK_TAGS
            pending[k[:8]+struct.pack('<i',dim)+k[8:]]=z.read(name)
    db.put_batch(pending);after=dict(db.items());db.close()
    assert all(after[k]==v for k,v in before.items()if k not in pending)
    assert all(after[k]==v for k,v in pending.items())
    (world/'levelname.txt').write_text('WARLAND - El Pasado - Dos actos - LAB')
    props=(template/'server.properties').read_text();lines=[]
    replacements={'server-name':'WARLAND - El Pasado - Dos actos','server-port':'19178','server-portv6':'19179','server-udp-ports':'19178','view-distance':'8'}
    for line in props.splitlines():
        key=line.split('=',1)[0];lines.append(key+'='+replacements[key]if key in replacements else line)
    (server/'server.properties').write_text('\n'.join(lines)+'\n')
    shutil.copy2(template/'allowlist.json',server/'allowlist.json');shutil.copy2(template/'permissions.json',server/'permissions.json')
    team.write(out/'preparation.json',{'closedSource':str(backup),'fullAddon':str(candidate),'version':report['version'],'propertyMigration':migration,'terrainRecords':len(pending),'unrelatedRecordsExact':True,'liveServerStopped':False,'officialTouched':False,'port':19178,'world':str(world)})
    print('Prepared full candidate',server)
if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('--candidate',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args();prepare(a.candidate,a.out)
