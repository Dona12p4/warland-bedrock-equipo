"""Update an already unified pair while both target worlds are closed.

Never stops/starts processes. Never migrates or edits LevelDB. All paths are
explicit arguments, not public personal-machine configuration.
"""
from pathlib import Path
import argparse, datetime, json, shutil, subprocess, sys
from audit_pack_parity import hashes, audit, read

def write(p,value):
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')

def processes():
    raw=subprocess.check_output(['powershell','-NoProfile','-Command',
      "@(Get-CimInstance Win32_Process | Where-Object {$_.Name -match 'Minecraft.Windows|bedrock_server'} | Select-Object Name,ProcessId,ExecutablePath) | ConvertTo-Json -Compress"],text=True).strip()
    data=json.loads(raw or '[]');return data if isinstance(data,list) else [data]

def guard(server):
    procs=processes()
    for p in procs:
        if p['Name'].lower()=='minecraft.windows.exe':raise RuntimeError('Minecraft is open; installation remains pending')
        if str(p.get('ExecutablePath') or '').lower()==str(server/'bedrock_server.exe').lower():raise RuntimeError('Target server is open; installation remains pending')
    return procs

def install(a):
    candidate=a.candidate.resolve();previous=a.previous.resolve();users=a.users.resolve();server=a.server.resolve()
    target=[('official',a.official.resolve()),('server',server/'worlds'/a.server_world)]
    baseline=audit(previous,users,target)
    if not baseline['parityVerified']:raise RuntimeError('Installed pair differs from the expected previous candidate')
    expected=read(candidate/'consolidation.json')['outputHashes']
    actual={f'{name}/{rel}':v for name in ['WARLAND_BP','WARLAND_RP'] for rel,v in hashes(candidate/name).items()}
    if actual!=expected:raise RuntimeError('Candidate hash mismatch')
    # This updater is intentionally additive; it cannot leave stale removed files.
    old=read(previous/'consolidation.json')['outputHashes']
    if set(old)-set(expected):raise RuntimeError('Removed files require a separate reviewed migration')
    for name in ['WARLAND_BP','WARLAND_RP']:
        if read(candidate/name/'manifest.json')['header']['uuid']!=read(previous/name/'manifest.json')['header']['uuid']:raise RuntimeError('UUID migration is outside this updater')
    before=guard(server);backup=a.backup.resolve()
    if backup.exists():raise RuntimeError('Use a fresh backup directory')
    backup.mkdir(parents=True)
    snapshots={}
    for label,world in target:
        guard(server);snapshots[label]=hashes(world)
        shutil.copytree(world,backup/label/'world')
        if hashes(backup/label/'world')!=snapshots[label]:raise RuntimeError('World backup did not match')
    shared=users/'Shared/games/com.mojang'
    registered=[]
    for kind,name in [('behavior','WARLAND_BP'),('resource','WARLAND_RP')]:
        uid=read(candidate/name/'manifest.json')['header']['uuid']
        found=[p.parent for p in (shared/f'{kind}_packs').glob('*/manifest.json') if read(p)['header']['uuid']==uid]
        if len(found)!=1:raise RuntimeError('Expected a unique complete Shared registration')
        folder=found[0]
        if hashes(folder)!=hashes(previous/name):raise RuntimeError('Shared registration has unreviewed changes')
        shutil.copytree(folder,backup/'shared'/folder.name)
        if hashes(folder)!=hashes(backup/'shared'/folder.name):raise RuntimeError('Shared backup mismatch')
        registered.append((folder,name))
    guard(server)
    for label,world in target:
        if hashes(world)!=snapshots[label]:raise RuntimeError('Target changed during backup; no installation performed')
    for label,world in target:
        guard(server)
        for kind,name in [('behavior','WARLAND_BP'),('resource','WARLAND_RP')]:
            folder=world/f'{kind}_packs'/name
            if not folder.is_dir():raise RuntimeError('Unexpected installation layout')
            shutil.copytree(candidate/name,folder,dirs_exist_ok=True)
            head=read(candidate/name/'manifest.json')['header']
            write(world/f'world_{kind}_packs.json',[{'pack_id':head['uuid'],'version':head['version']}])
    for folder,name in registered:
        guard(server);shutil.copytree(candidate/name,folder,dirs_exist_ok=True)
        if hashes(folder)!=hashes(candidate/name):raise RuntimeError('Shared post-installation mismatch')
    final=audit(candidate,users,target)
    if not final['parityVerified']:raise RuntimeError('Pair verification failed; backups retained')
    preserved={}
    for label,world in target:
        now=hashes(world)
        untouched=lambda d:{k:v for k,v in d.items() if not k.startswith(('behavior_packs/','resource_packs/')) and k not in ['world_behavior_packs.json','world_resource_packs.json']}
        if untouched(now)!=untouched(snapshots[label]):raise RuntimeError('Non-pack world files changed')
        preserved[label]=len(untouched(now))
    report={'installed':True,'version':read(candidate/'consolidation.json')['version'],
      'candidate':str(candidate),'backup':str(backup),'parity':final['parityVerified'],
      'targets':[{'label':k,'path':str(v)} for k,v in target], 'registered':[str(p) for p,_ in registered],
      'unchangedWorldFiles':preserved,'databaseModified':False,'processesStopped':False,
      'processesAtStart':before,'processesAtEnd':processes(),'clientVisualVerified':False,
      'installedUtc':datetime.datetime.now(datetime.timezone.utc).isoformat()}
    write(a.report,report)
    print(json.dumps(report))

if __name__=='__main__':
    p=argparse.ArgumentParser()
    for key in ['candidate','previous','users','server','official','backup','report']:p.add_argument('--'+key,required=True,type=Path)
    p.add_argument('--server-world',required=True)
    install(p.parse_args())
