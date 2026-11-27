"""Read-only pack audit. Does not open/copy LevelDB, stop servers or install packs."""
from pathlib import Path
import argparse, collections, datetime, hashlib, json

def read(p):
    return json.loads(p.read_text(encoding='utf-8-sig'))

def hashes(root):
    return {p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(root.rglob('*')) if p.is_file()}

def refs(world):
    return {kind:read(world/f'world_{kind}_packs.json') if (world/f'world_{kind}_packs.json').exists() else []
            for kind in ('behavior','resource')}

def audit(candidate, users, targets):
    manifest=read(candidate/'consolidation.json')
    actual={f'{name}/{rel}':value for name in ('WARLAND_BP','WARLAND_RP') for rel,value in hashes(candidate/name).items()}
    if actual!=manifest['outputHashes']:raise ValueError('Candidate content changed since build')
    expected={kind:read(candidate/name/'manifest.json')['header'] for kind,name in [('behavior','WARLAND_BP'),('resource','WARLAND_RP')]}
    worlds=[];used=collections.defaultdict(list)
    for dat in sorted(users.glob('*/games/com.mojang/minecraftWorlds/*/level.dat')):
        world=dat.parent
        name=(world/'levelname.txt').read_text(encoding='utf-8-sig') if (world/'levelname.txt').exists() else world.name
        item={'path':str(world),'name':name,'refs':refs(world)};worlds.append(item)
        for rr in item['refs'].values():
            for ref in rr:used[ref['pack_id']].append(str(world))
    for file in users.glob('*/games/com.mojang/global_resource_packs.json'):
        for ref in read(file):used[ref['pack_id']].append(str(file))
    registered=[]
    for file in sorted(users.glob('*/games/com.mojang/*_packs/*/manifest.json')):
        m=read(file)['header']
        registered.append({'path':str(file.parent),'name':m['name'],'uuid':m['uuid'],'version':m['version'],
            'referencedBy':used[m['uuid']],'hasIcon':(file.parent/'pack_icon.png').is_file(),
            'unified':m['uuid'] in {v['uuid'] for v in expected.values()}})
    reports=[]
    for label,world in targets:
        state={'label':label,'path':str(world),'exists':world.exists(),'refs':refs(world),'packs':[]}
        for kind,name in [('behavior','WARLAND_BP'),('resource','WARLAND_RP')]:
            h=expected[kind]
            activation=state['refs'][kind]==[{'pack_id':h['uuid'],'version':h['version']}]
            # A deployment requires physical files in the world. Shared-only
            # resolution is deliberately not sufficient evidence of parity.
            matches=[]
            for mf in world.glob(f'{kind}_packs/*/manifest.json'):
                if read(mf)['header']['uuid']==h['uuid']:matches.append(mf.parent)
            exact=len(matches)==1 and hashes(matches[0])==hashes(candidate/name)
            state['packs'].append({'kind':kind,'activationMatches':activation,'filesMatch':exact,
                                   'matchingLocations':[str(p) for p in matches]})
        state['matchesCandidate']=state['exists'] and all(p['activationMatches'] and p['filesMatch'] for p in state['packs'])
        reports.append(state)
    return {'readOnly':True,'databaseOpened':False,'processesStopped':False,
        'createdUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'candidate':str(candidate),
        'version':manifest['version'],'sourceModules':len(manifest['modules']),
        'targets':reports,'parityVerified':len(reports)==2 and all(t['matchesCandidate'] for t in reports),
        'registered':registered,'worlds':worlds,
        'cleanupPolicy':'Backup first; unreferenced does not by itself authorize deletion. Preserve study worlds and unrelated addons.'}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--candidate',type=Path,required=True);p.add_argument('--minecraft-users',type=Path,required=True)
    p.add_argument('--server-world',type=Path,required=True);p.add_argument('--world',type=Path,required=True);p.add_argument('--out',type=Path,required=True)
    a=p.parse_args();result=audit(a.candidate.resolve(),a.minecraft_users.resolve(),[('server',a.server_world.resolve()),('mobile',a.world.resolve())])
    a.out.parent.mkdir(parents=True,exist_ok=True);a.out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'report':str(a.out),'parityVerified':result['parityVerified'],
        'targets':[{'label':t['label'],'matches':t['matchesCandidate']} for t in result['targets']],
        'registrations':len(result['registered']),'referencedRegistrations':sum(bool(r['referencedBy']) for r in result['registered']),
        'missingIcons':sum(not r['hasIcon'] for r in result['registered'])}))
