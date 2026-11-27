"""Install the complete addon and the new Past terrain into two CLOSED worlds.

Each stage derives from its own destination, never from a test world's DB.
No process is stopped. Backups and rollback folders are retained on success.
"""
from pathlib import Path
import argparse,datetime,json,shutil
from audit_pack_parity import audit,hashes,read
from install_unified_update import guard,processes,write
from past_official_terrain import apply as add_terrain

def checked_move(source,destination,roots):
    source=source.resolve();destination=destination.resolve()
    if not all(any(p.is_relative_to(r)for r in roots)for p in (source,destination)):raise RuntimeError('Move leaves explicit installation/backup roots')
    if destination.exists():raise RuntimeError('Refuse occupied move destination '+str(destination))
    destination.parent.mkdir(parents=True,exist_ok=True);source.rename(destination)

def install(a):
    candidate=a.candidate.resolve();previous=a.previous.resolve();users=a.users.resolve();server=a.server.resolve();backup=a.backup.resolve()
    targets=[('official',a.official.resolve()),('server',server/'worlds'/a.server_world)]
    before_processes=guard(server)
    if backup.exists():raise RuntimeError('Use a fresh backup folder')
    meta=read(candidate/'consolidation.json');old=read(previous/'consolidation.json')
    actual={f'{name}/{rel}':value for name in ['WARLAND_BP','WARLAND_RP']for rel,value in hashes(candidate/name).items()}
    if actual!=meta['outputHashes']or set(old['outputHashes'])-set(actual):raise RuntimeError('Incomplete/changed candidate')
    if not audit(previous,users,targets)['parityVerified']:raise RuntimeError('Current targets changed; integrate their newest content first')
    for name in ['WARLAND_BP','WARLAND_RP']:
        if read(candidate/name/'manifest.json')['header']['uuid']!=read(previous/name/'manifest.json')['header']['uuid']:raise RuntimeError('This update must preserve pack identity')
    registered=[]
    for kind,name in [('behavior','WARLAND_BP'),('resource','WARLAND_RP')]:
        uid=read(candidate/name/'manifest.json')['header']['uuid'];matches=[p.parent for p in (users/f'Shared/games/com.mojang/{kind}_packs').glob('*/manifest.json')if read(p)['header']['uuid']==uid]
        if len(matches)!=1 or hashes(matches[0])!=hashes(previous/name):raise RuntimeError('Unreviewed Shared registration')
        registered.append((matches[0],name))
    backup.mkdir(parents=True);snapshots={};stages={};terrain_reports={};swaps=[];refs=[]
    roots=[w.resolve()for _,w in targets]+[p.resolve()for p,_ in registered]+[backup]
    report={'installed':False,'version':meta['version'],'candidate':str(candidate),'backup':str(backup),'targets':[{'label':k,'path':str(v)}for k,v in targets],'processesStopped':False}
    write(backup/'transaction.json',report)
    # Everything is concrete and verified before altering an active folder.
    for label,world in targets:
        guard(server);snapshots[label]=hashes(world);saved=backup/label/'world';shutil.copytree(world,saved)
        if hashes(saved)!=snapshots[label]:raise RuntimeError('Backup mismatch '+label)
        stage=backup/label/'stage';shutil.copytree(saved,stage);stages[label]=stage
        (stage/'.warland-past-stage').write_text('Closed destination-derived installation stage')
        terrain_reports[label]=add_terrain(stage,a.terrain.resolve(),a.project.resolve())
        for kind,name in [('behavior','WARLAND_BP'),('resource','WARLAND_RP')]:
            shutil.copytree(candidate/name,stage/f'{kind}_packs'/name,dirs_exist_ok=True)
            if hashes(stage/f'{kind}_packs'/name)!=hashes(candidate/name):raise RuntimeError('Stage pack mismatch')
            h=read(candidate/name/'manifest.json')['header'];write(stage/f'world_{kind}_packs.json',[{'pack_id':h['uuid'],'version':h['version']}])
        untouched=lambda data:{k:v for k,v in data.items()if not k.startswith(('db/','behavior_packs/','resource_packs/'))and k not in ['world_behavior_packs.json','world_resource_packs.json','.warland-past-stage']}
        if untouched(hashes(stage))!=untouched(snapshots[label]):raise RuntimeError('World settings changed in stage')
    for folder,name in registered:
        shutil.copytree(folder,backup/'shared'/folder.name)
        if hashes(folder)!=hashes(backup/'shared'/folder.name):raise RuntimeError('Shared backup mismatch')
        shutil.copytree(candidate/name,backup/'shared-stage'/folder.name)
    guard(server)
    for label,world in targets:
        if hashes(world)!=snapshots[label]:raise RuntimeError('World changed during preparation')
    try:
        for label,world in targets:
            stage=stages[label]
            for rel in ['db','behavior_packs/WARLAND_BP','resource_packs/WARLAND_RP']:
                guard(server);destination=world/rel;oldfolder=backup/'rollback'/label/rel
                expected=hashes(stage/rel)
                checked_move(destination,oldfolder,roots);swaps.append((destination,oldfolder))
                checked_move(stage/rel,destination,roots)
                if hashes(destination)!=expected:raise RuntimeError('Installed folder mismatch '+str(destination))
            for kind in ['behavior','resource']:
                guard(server);f=world/f'world_{kind}_packs.json';refs.append((f,f.read_bytes()));f.write_bytes((stage/f.name).read_bytes())
        for folder,name in registered:
            guard(server);oldfolder=backup/'rollback/shared'/folder.name
            checked_move(folder,oldfolder,roots);swaps.append((folder,oldfolder));checked_move(backup/'shared-stage'/folder.name,folder,roots)
            if hashes(folder)!=hashes(candidate/name):raise RuntimeError('Shared install mismatch')
        final=audit(candidate,users,targets)
        if not final['parityVerified']:raise RuntimeError('Installed parity failed')
        after_processes=processes()
        for p in before_processes:
            if p['Name'].lower()=='bedrock_server.exe' and p not in after_processes:raise RuntimeError('A preexisting server stopped during installation')
        report.update(installed=True,parity=True,terrain=terrain_reports,registered=[str(f)for f,_ in registered],clientVisualVerified=False,processesAtStart=before_processes,processesAtEnd=after_processes,at=datetime.datetime.now().astimezone().isoformat())
        write(backup/'transaction.json',report);write(a.report,report);print(json.dumps(report))
    except Exception as error:
        report['error']=str(error);write(backup/'transaction.json',report)
        # Never roll a world back while Minecraft has opened it unexpectedly.
        guard(server)
        for f,data in reversed(refs):f.write_bytes(data)
        for i,(destination,oldfolder)in enumerate(reversed(swaps)):
            if destination.exists():checked_move(destination,backup/'failed'/str(i),roots)
            checked_move(oldfolder,destination,roots)
        report['rolledBack']=True;write(backup/'transaction.json',report)
        raise

if __name__=='__main__':
    p=argparse.ArgumentParser()
    for key in ['candidate','previous','users','server','official','backup','report','terrain','project']:p.add_argument('--'+key,required=True,type=Path)
    p.add_argument('--server-world',required=True);install(p.parse_args())
