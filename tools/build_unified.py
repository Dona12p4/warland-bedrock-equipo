"""One installable WARLAND BP/RP pair. Modular source files are not installers.

Never edits a Minecraft installation. Existing worlds require a separate saved
property migration before their old component-pack references can be removed.
"""
from pathlib import Path
import argparse, collections, hashlib, json, shutil, uuid, zipfile, struct, zlib, subprocess

ROOT=Path(__file__).resolve().parents[1]
VERSION=[0,7,8]
BP_ID='0c8a75c4-f955-5e24-bacf-72e9b2cb02ec'
RP_ID='3493724d-c395-54d4-929c-a229b0398abf'
def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,v):
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()

def pack_icon():
    # Original code-drawn pixel W; both halves of the addon use the same icon.
    rows=[]
    glyph=['1000001','1000001','1000001','1001001','1010101','1100011','1000001']
    for y in range(128):
        row=bytearray()
        for x in range(128):
            color=(16,22,27,255)
            if 6<=x<122 and 6<=y<122 and (x<10 or x>=118 or y<10 or y>=118):color=(172,135,65,255)
            gx,gy=(x-22)//12,(y-22)//12
            if 0<=gx<7 and 0<=gy<7 and glyph[gy][gx]=='1':color=(237,213,151,255)
            row.extend(color)
        rows.append(b'\0'+row)
    def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',128,128,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows)))+chunk(b'IEND',b'')
def merge(a,b,path=''):
    if a==b:return a
    if isinstance(a,dict) and isinstance(b,dict):
        result=dict(a)
        for k,v in b.items():result[k]=merge(result[k],v,path+'/'+k) if k in result else v
        return result
    if path=='/resource_pack_name':return 'WARLAND'
    if path=='/format_version':return max([a,b],key=lambda v:tuple(v) if isinstance(v,list) else tuple(int(n) for n in str(v).split('.')))
    # No silent priority loss in geometry, UI, sounds, items or terrain indexes.
    raise ValueError('Conflicting content at '+path+': '+repr(a)[:100]+' / '+repr(b)[:100])
def build(out):
    out=out.resolve()
    if out.exists():raise RuntimeError('Use a fresh stage, not an existing output: '+str(out))
    report={'version':VERSION,'modules':[],'files':[],'merged':[],'propertyMigration':{},'requiresWorldMigration':True,'installed':False}
    report['sourceHashes']={p.relative_to(ROOT).as_posix():digest(p) for base in [ROOT/'packs',ROOT/'pack-order'] for p in sorted(base.rglob('*')) if p.is_file()}
    report['sourceCommit']=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    stages={}
    for kind,name,ident in [('behavior_packs','WARLAND_BP',BP_ID),('resource_packs','WARLAND_RP',RP_ID)]:
        dst=out/name;dst.mkdir(parents=True);stages[kind]=dst
        entries=[];manifests={read(m)['header']['uuid']:m for m in (ROOT/'packs'/kind).glob('*/manifest.json')}
        refs=read(ROOT/'pack-order'/('world_'+kind+'.json'))
        if len(manifests)!=len(list((ROOT/'packs'/kind).glob('*/manifest.json'))):raise ValueError('Duplicate source pack UUID')
        if len(refs)!=len({r['pack_id'] for r in refs}) or {r['pack_id'] for r in refs}!=set(manifests):raise ValueError('Unreferenced or duplicate source pack; refusing omission')
        for ref in refs:
            manifest=manifests[ref['pack_id']];m=read(manifest);folder=manifest.parent;slug=folder.name.lower()
            if ref['version']!=m['header']['version']:raise ValueError('Activation version mismatch: '+str(folder))
            report['modules'].append({'folder':folder.name,'uuid':ref['pack_id'],'version':m['header']['version']})
            if kind=='behavior_packs':report['propertyMigration'][ref['pack_id']]=BP_ID
            for mod in m['modules']:
                if mod['type']=='script':entries.append('./components/'+slug+'/'+mod['entry'].removeprefix('scripts/'))
            for src in sorted(folder.rglob('*')):
                if not src.is_file():continue
                rel=src.relative_to(folder)
                if rel.name in ['manifest.json','pack_icon.png','asset-sources.json']:continue
                target=dst/rel
                if rel.parts[0]=='scripts':target=dst/'scripts/components'/slug/Path(*rel.parts[1:])
                target.parent.mkdir(parents=True,exist_ok=True)
                if target.exists() and src.read_bytes()!=target.read_bytes():
                    if src.suffix=='.lang':
                        def lang(p):return dict(line.split('=',1) for line in p.read_text(encoding='utf-8-sig').splitlines() if '=' in line and not line.startswith('##'))
                        vals=merge(lang(target),lang(src));target.write_text('\n'.join(k+'='+v for k,v in vals.items())+'\n',encoding='utf-8')
                    elif rel.as_posix()=='texts/languages.json':write(target,sorted(set(read(target)+read(src))))
                    elif src.suffix=='.json':write(target,merge(read(target),read(src)))
                    else:raise RuntimeError('Binary collision: '+str(src))
                    report['merged'].append(rel.as_posix())
                else:shutil.copy2(src,target)
                report['files'].append({'source':src.relative_to(ROOT).as_posix(),'sourceSha256':digest(src),'output':target.relative_to(out).as_posix()})
        manifest={'format_version':2,'header':{'name':'WARLAND Â· '+('Juego' if kind=='behavior_packs' else 'Recursos'),'description':'Todo WARLAND en un solo complemento. Incluye criaturas, Umbral, lobby, economia y HUD.','uuid':ident,'version':VERSION,'min_engine_version':[1,26,60]},'modules':[{'type':'data' if kind=='behavior_packs' else 'resources','uuid':str(uuid.uuid5(uuid.NAMESPACE_URL,'warland/unified/'+kind)),'version':VERSION}]}
        if kind=='behavior_packs':
            manifest['modules'].append({'type':'script','language':'javascript','entry':'scripts/main.js','uuid':str(uuid.uuid5(uuid.NAMESPACE_URL,'warland/unified/script')),'version':VERSION})
            manifest['dependencies']=[{'uuid':RP_ID,'version':VERSION},{'module_name':'@minecraft/server','version':'2.12.0-beta'},{'module_name':'@minecraft/server-ui','version':'2.0.0'}]
            entry='// Unified entry point; original module-relative imports are preserved.\n'+'\n'.join("import '"+e+"';" for e in entries)+'\n'
            if (dst/'scripts/components/warland_lobby_bp/past-return.js').is_file():
                if not (dst/'scripts/components/warland_bp/past.js').is_file():raise ValueError('Past return needs the complete Base component')
                entry+="import {registerPastLobbyTransfer} from './components/warland_bp/past.js';\nimport {returnFromPast} from './components/warland_lobby_bp/past-return.js';\nregisterPastLobbyTransfer(returnFromPast);\n"
            (dst/'scripts/main.js').write_text(entry,encoding='utf-8')
        write(dst/'manifest.json',manifest)
        (dst/'pack_icon.png').write_bytes(pack_icon())
    report['merged']=sorted(set(report['merged']))
    report['outputHashes']={p.relative_to(out).as_posix():digest(p) for d in stages.values() for p in d.rglob('*') if p.is_file()}
    write(out/'consolidation.json',report)
    addon=out/'WARLAND.mcaddon'
    with zipfile.ZipFile(addon,'w',zipfile.ZIP_DEFLATED) as z:
        for rel in sorted(report['outputHashes']):
            info=zipfile.ZipInfo(rel,(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
            z.writestr(info,(out/rel).read_bytes())
    with zipfile.ZipFile(addon) as z:
        assert {n:hashlib.sha256(z.read(n)).hexdigest() for n in z.namelist()}==report['outputHashes']
        assert len([n for n in z.namelist() if n.endswith('/manifest.json')])==2
    print(json.dumps({'addon':str(addon),'sha256':digest(addon),'sourceFiles':len(report['files']),'outputFiles':len(report['outputHashes']),'packs':2,'requiresWorldMigration':True}))
    return report
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--out',required=True,type=Path);args=parser.parse_args();build(args.out)
