"""Build a separate lab from verified closed archives; never copy an open DB."""
from pathlib import Path
import argparse,json,shutil,uuid
import team

def prepare(bds,archive):
    root=team.ROOT; server=root/'.local/server'; target=server/'worlds/WARLAND_LAB'
    if target.exists():raise RuntimeError('Laboratorio ya preparado; no sobrescribir su progreso.')
    # Other worktrees may have a running server. Only this destination is ours.
    if server.exists():raise RuntimeError('Destino BDS ya existe; revisar antes de continuar.')
    if team.sha(bds)!=team.cfg(root)['serverSha256']:raise RuntimeError('BDS SHA256 incorrecto')
    pointer=team.read(root/'world-release.json')
    if team.sha(archive)!=pointer['sha256']:raise RuntimeError('Snapshot SHA256 incorrecto')
    server.mkdir(parents=True);team.extract(bds,server)
    stage=root/'.local/snapshot';stage.mkdir();team.extract(archive,stage)
    target.mkdir(parents=True)
    # The archive contains closed world data. Copy data only, add current packs.
    for child in stage.iterdir():
        if child.name in ('behavior_packs','resource_packs','world_behavior_packs.json','world_resource_packs.json'):continue
        if child.is_dir():shutil.copytree(child,target/child.name)
        else:shutil.copy2(child,target/child.name)
    identity=uuid.uuid4().hex
    team.isolated_packs(root,target,identity)
    (target/'levelname.txt').write_text('WARLAND - EL PASADO - LAB',encoding='utf-8')
    team.write(root/'.local/user.json',{'port':19160})
    team.server_config(root,server)
    team.write(root/'.local/identity.json',{'namespace':identity})
    team.write(root/'.local/server-version.json',{'version':team.cfg(root)['serverVersion'],'sha256':team.sha(bds),'platform':'windows'})
    team.write(root/'.local/lab.json',{'managed':'warland-team-v1','worldSha256':team.sha(archive),'worldTag':pointer['tag'],'sourcePacks':team.hashes(root/'packs'),'installedPacks':team.pack_hashes(target),'snapshotDataPreserved':True})
    print(json.dumps({'world':str(target),'port':19160,'otherServersUntouched':True}))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('bds',type=Path);p.add_argument('world',type=Path);a=p.parse_args();prepare(a.bds,a.world)
