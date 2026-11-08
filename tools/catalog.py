"""Generate a complete, deterministic, offline catalog from installed Bedrock packs."""
from pathlib import Path
import base64, collections, fnmatch, hashlib, json, re, struct, zlib

ROOT=Path(__file__).resolve().parents[1]

def read(p): return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def label(s):
    return s.split(':')[-1].replace('WARLAND_','').replace('_prototype','').replace('_',' ').replace('-',' ').strip().capitalize()
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def rel(p,root): return p.relative_to(root).as_posix()
def chunk(kind,data): return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)

def image_uri(p):
    if not p or not p.exists(): return None
    b=p.read_bytes()
    if p.suffix.lower()=='.tga':
        w,h=struct.unpack_from('<HH',b,12);depth=b[16]//8
        if b[2]!=2 or depth not in (3,4) or b[1]: return None
        start=18+b[0];rows=[]
        for y in range(h):
            iy=y if b[17]&32 else h-1-y;row=bytearray()
            for x in range(w):
                ix=w-1-x if b[17]&16 else x;i=start+(iy*w+ix)*depth
                # Bedrock TGA alpha encodes emissivity, not the opacity of the skin.
                row.extend((b[i+2],b[i+1],b[i],255))
            rows.append(b'\x00'+row)
        b=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows),9))+chunk(b'IEND',b'')
        ext='png'
    else: ext='jpeg' if p.suffix.lower() in ('.jpg','.jpeg') else 'png'
    return 'data:image/'+ext+';base64,'+base64.b64encode(b).decode()

def build(root=ROOT):
    root=Path(root);packs=root/'packs';editor=read(root/'catalogo/editorial.json')
    # Path ordering is case-insensitive on Windows but not on Linux CI.
    # Sort portable strings so both systems publish the same inventory hash.
    paths=sorted((p for p in packs.rglob('*') if p.is_file()),key=lambda p:rel(p,root))
    docs={rel(p,root):read(p) for p in paths if p.suffix=='.json'}
    names={};textures={};terrain={};geometries={};animations={};clients={};images={};models={}
    files=[];entries=[];groups=[]
    def image(p,embed=False):
        if not p: return None
        key=rel(p,root)
        if key not in images or embed:
            images[key]=image_uri(p) if embed or p.suffix.lower()=='.tga' else '../'+key
        return key if images[key] else None
    def texture(base,name):
        if isinstance(name,dict):name=name.get('path',name.get('textures'))
        if isinstance(name,list):name=name[0] if name else None
        if not isinstance(name,str):return None
        for ext in ('','.png','.tga','.jpg'):
            p=base/(name+ext)
            if p.is_file():return p
        for d in sorted((packs/'resource_packs').iterdir(),key=lambda p:p.name):
            for ext in ('','.png','.tga'):
                p=d/(name+ext)
                if p.is_file():return p
        return None
    for p in paths:
        path=rel(p,root);a=p.relative_to(packs).parts
        files.append({'path':path,'pack':a[1],'kind':a[2] if len(a)>3 else 'raíz','bytes':p.stat().st_size,'sha256':digest(p)})
        if p.suffix=='.lang' and p.name in ('es_ES.lang','es_MX.lang','en_US.lang'):
            for line in p.read_text(encoding='utf-8-sig').splitlines():
                if '=' in line and not line.startswith('#'):
                    k,v=line.split('=',1);v=re.sub(r'§.','',v.split('##')[0])
                    if p.name.startswith('es_'):names[k]=v
                    else:names.setdefault(k,v)
        j=docs.get(path,{})
        if not isinstance(j,dict):j={}
        if p.name in ('item_texture.json','terrain_texture.json'):
            target=textures if p.name=='item_texture.json' else terrain
            for k,v in j.get('texture_data',{}).items():target[k]=(p.parents[1],v.get('textures'))
        for g in j.get('minecraft:geometry',[]):geometries[g['description']['identifier']]={'file':path,'data':g}
        for key,value in j.items():
            if key.startswith('geometry.') and isinstance(value,dict) and 'bones' in value:
                converted={'description':{'identifier':key,'texture_width':value.get('texturewidth',64),'texture_height':value.get('textureheight',64)},'bones':value['bones']}
                geometries[key]={'file':path,'data':converted}
        for k,v in j.get('animations',{}).items():animations[k]={'file':path,'data':v}
        ce=j.get('minecraft:client_entity',{}).get('description')
        if ce:clients[ce['identifier']]=(p.parents[1],path,ce)
    def entry(cat,id,name,path,**more):
        e={'category':cat,'id':id,'name':name,'path':path,'pack':Path(path).parts[2] if path.startswith('packs/') else 'WARLAND',**more}
        entries.append(e);return e
    def title(id,prefix):return names.get(prefix+id+'.name',names.get(prefix+id,label(id)))
    for path,j in docs.items():
        if not isinstance(j,dict):continue
        p=root/path;packbase=p.parents[1]
        if p.name=='manifest.json':
            h=j['header'];groups.append({'name':h['name'],'folder':p.parent.name,'version':'.'.join(map(str,h['version'])),'uuid':h['uuid'],'path':path,'kind':p.parent.parent.name,'dependencies':j.get('dependencies',[])})
        for key,cat,prefix in [('minecraft:entity','mobs','entity.'),('minecraft:item','items','item.'),('minecraft:block','blocks','tile.')]:
            if key not in j:continue
            node=j[key];d=node.get('description',{});id=d.get('identifier',p.stem);c=node.get('components',{})
            ed=editor.get('entities',{}).get(id,{})
            variants=bool(re.search(r'brujula_umbral_prueba_\d\d$',id))
            auxiliary=bool(cat=='mobs' and (not d.get('is_spawnable',False) or id.startswith('minecraft:')))
            e=entry(cat,id,ed.get('name',title(id,prefix)),path,summary=ed.get('summary',''),details=node,variants=variants,auxiliary=auxiliary)
            if cat=='mobs':
                e['facts']={}
                for component,key in [('minecraft:health','Vida base'),('minecraft:attack','Daño base JSON'),('minecraft:movement','Movimiento base')]:
                    value=c.get(component)
                    if value is not None:e['facts'][key]=value.get('max',value.get('damage',value.get('value'))) if isinstance(value,dict) else value
                e['commands']=['/summon '+id] if not auxiliary else []
                if d.get('is_spawnable'):e['commands'].append('/give @s '+id+'_spawn_egg')
                if id in clients:
                    base,cp,ce=clients[id];gmap=ce.get('geometry',{});g=geometries.get(gmap.get('default',next(iter(gmap.values()),'')))
                    if g:
                        tex=ce.get('textures',{});tpath=texture(base,tex.get('default',next(iter(tex.values()),'')))
                        keys={v:animations[v] for v in ce.get('animations',{}).values() if v in animations}
                        models[id]={'geometry':g['data'],'texture':image(tpath,True),'clips':keys,'clientFile':cp,'geometryFile':g['file']}
                        e['model']=id;e['facts']['Clips nativos']=len(keys)
            else:
                e['commands']=['/give @s '+id]
                icon=c.get('minecraft:icon',{})
                ik=icon if isinstance(icon,str) else icon.get('textures',{}).get('default',icon.get('texture'))
                if cat=='blocks':
                    mat=c.get('minecraft:material_instances',{});first=mat.get('*',next(iter(mat.values()),{}));ik=first.get('texture') if isinstance(first,dict) else None
                lookup=textures if cat=='items' else terrain
                if ik in lookup:e['image']=image(texture(*lookup[ik]))
                dn=c.get('minecraft:display_name',{});value=dn.get('value') if isinstance(dn,dict) else dn
                if value:e['name']=names.get(value,value)
        for key,node in j.items():
            if key.startswith('minecraft:recipe_'):
                entry('recipes',node.get('description',{}).get('identifier',p.stem),label(p.stem),path,details=node,summary='Receta Bedrock instalada. Ingredientes y resultado leídos del archivo actual.')
        for id,node in j.get('animations',{}).items():
            info={k:v for k,v in node.items() if k!='bones'};info['bones']=list(node.get('bones',{}))
            entry('animations',id,label(id.split('.')[-1]),path,details=info,summary=f"Clip nativo · {node.get('animation_length','duración por expresión')} s",facts={'Huesos':len(node.get('bones',{})),'Bucle':node.get('loop',False)})
        for id,node in j.get('sound_definitions',{}).items():
            sounds=[]
            sound_root=root.joinpath(*Path(path).parts[:3])
            for s in node.get('sounds',[]):
                name=s if isinstance(s,str) else s.get('name');a=sound_root/(str(name)+'.ogg')
                if not a.exists():a=sound_root/str(name)
                if a.is_file():sounds.append(rel(a,root))
            entry('sounds',id,label(id),path,details=node,audio=sounds,summary='Categoría de audio: '+node.get('category','sin categoría explícita'))
        pe=j.get('particle_effect',{});id=pe.get('description',{}).get('identifier')
        if id:entry('effects',id,label(id),path,details=pe,summary='Partícula nativa Bedrock; configuración actual del emisor.')
        if '/fogs/' in path or '/lighting/' in path or '/atmospherics/' in path:
            entry('effects',path,label(p.stem),path,details=j,variants=True,summary='Ambiente, iluminación o variante de niebla.')
        if '/ui/' in path:entry('interface',path,label(p.stem),path,details=j,summary='Interfaz del paquete de recursos instalado.')
        if '/spawn_rules/' in path or '/loot_tables/' in path or '/dimensions/' in path or '/biomes/' in path or '/attachables/' in path or '/animation_controllers/' in path or '/render_controllers/' in path:
            entry('rules',path,label(p.stem),path,details=j,summary='Regla o controlador nativo: '+p.parent.name)
    # Configured habitats and configuration objects (no execution of arbitrary JS).
    scripts=[p for p in paths if p.suffix=='.js']
    for p in scripts:
        path=rel(p,root);text=p.read_text(encoding='utf-8-sig');config=re.search(r'export const \w+\s*=\s*(\{.*\});?\s*$',text,re.S)
        if config:
            try:obj=json.loads(config[1])
            except ValueError:obj=None
            if obj:
                entry('settings',path,label(p.stem),path,details=obj,summary='Valores leídos directamente de la configuración instalada.')
                if p.name=='void-config.js':
                    for b in obj.get('biomes',{}).get('catalog',[]):entry('biomes',b['id'],b['name'],path,summary=editor['habitats'].get(b['id'],''),details=b,resident=b.get('mob'))
        # Literal command registrations and references; dynamic builders remain linked through their source module.
        seen=set()
        for m in re.finditer(r"\b(?:register|command)\(\s*['\"]([a-z_]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]",text):
            id='warland:'+m[1];seen.add(id);entry('commands',id,id,path,summary=m[2],command='/'+id,details={'nota':'Base del comando. Consultar el archivo para parámetros y permisos; no todos son para jugadores.'})
        for m in re.finditer(r"\bname\s*:\s*['\"](warland:[a-z_]+)['\"]",text):
            if m[1] not in seen:seen.add(m[1]);entry('commands',m[1],m[1],path,command='/'+m[1],summary='Comando registrado en el módulo instalado. Revisar permisos y parámetros.',details={'source':path})
        if 'registerCommand' in text:
            for m in re.finditer(r"\[\s*['\"]([a-z_]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*,\s*(?:\w+|\([^)]*\))\s*=>",text):
                id='warland:'+m[1]
                if id not in seen:seen.add(id);entry('commands',id,id,path,command='/'+id,summary=m[2],details={'source':path})
        entry('modules',path,label(p.stem),path,summary='Módulo de lógica Bedrock. Incluido completo en el inventario de archivos.',details={'archivo':path,'lineas':text.count('\n')+1})
    for sys in editor['systems']:
        sources=[f['path'] for f in files if any(fnmatch.fnmatch(f['path'].lower(),pat.lower()) for pat in sys['patterns'])]
        entry('systems',sys['name'],sys['name'],sources[0] if sources else 'docs/ESTADO.md',summary=sys['summary'],sources=sources)
    # Human explanations complement the exact inventory; they are not a live world state.
    guide_file=root/'catalogo/guias.json'
    guides=read(guide_file) if guide_file.exists() else {'systems':[], 'entities':{}}
    for guide in guides.get('systems',[]):
        target=next((e for e in entries if e['category']=='systems' and e['name']==guide.get('match')),None)
        if target is None:
            sources=[f['path'] for f in files if any(fnmatch.fnmatch(f['path'].lower(),pat.lower()) for pat in guide.get('patterns',[]))]
            target=entry('systems',guide['id'],guide['name'],sources[0] if sources else 'docs/ESTADO.md',sources=sources)
        target.update({k:v for k,v in guide.items() if k not in ('match','patterns')})
        target.setdefault('status','Incluido en los paquetes; estado de partida por comprobar')
    for target in entries:
        if target['category']=='mobs':
            target.update(guides.get('entities',{}).get(target['id'],{}))
    # Read the seven prepared lobby stages from the installed policy, not a second calendar.
    policy=root/'packs/behavior_packs/WARLAND_Lobby_BP/scripts/lobby-timeline-policy.js'
    if policy.exists():
        text=policy.read_text(encoding='utf-8-sig')
        titles=re.search(r'export const STAGE_TITLES\s*=\s*\[([^\]]*)\]',text)
        prepared=re.search(r'preparedThrough\s*:\s*(\d+)',text)
        total=re.search(r'\bdays\s*:\s*(\d+)',text)
        if not (titles and prepared and total): raise ValueError('Revisar el lector de cronologia: cambio el formato de la politica instalada.')
        names=re.findall(r"'([^']*)'",titles[1])
        for day,name in enumerate(names,1):
            entry('timeline',f'lobby-day-{day}',f'Día {day} · {name}',rel(policy,root),topics=['calendar','lobby'],status='Etapa visual preparada',summary='Estado del lobby. Avance manual por administradores; no inicia ni cambia el reloj de la temporada.',facts={'Semana':(day-1)//7+1,'Día':day},sections=[{'title':'Cómo se activa','items':['Desde la Línea del tiempo administrativa, avanzando a un día posterior. El cambio se guarda por etapas y no ofrece retroceso.','Esta ficha describe el lobby preparado, no una misión, bendición o evento diario confirmado.']}])
        if int(prepared[1])<int(total[1]):
            entry('timeline','lobby-pending',f'Días {int(prepared[1])+1}–{total[1]} · Por diseñar',rel(policy,root),topics=['calendar','lobby'],status='Pendiente · bloqueado',summary='Estos estados visuales del lobby todavía no están preparados. No confundir las fases de temporada del código con escenarios diarios terminados.')
    # Textures and sprites are individually accessible; unknown file formats are never omitted.
    for p in paths:
        if p.suffix.lower() in ('.png','.tga','.jpg','.jpeg'):
            e=entry('textures',rel(p,root),label(p.stem),rel(p,root),summary='Textura del paquete actual.',image=image(p))
    counts=dict(collections.Counter(e['category'] for e in entries))
    public_config=read(root/'config/toolchain.json');pointer=read(root/'world-release.json')
    fingerprint=hashlib.sha256(json.dumps({'files':files,'editorial':editor,'guides':guides,'world':pointer,'config':public_config},sort_keys=True,ensure_ascii=False).encode()).hexdigest()
    data={'schema':1,'title':editor['title'],'subtitle':editor['subtitle'],'fingerprint':fingerprint,'files':files,'entries':entries,'packs':groups,'models':models,'images':images,'counts':counts,'world':pointer,'toolchain':public_config,'snapshot':read(root/'baseline.json').get('capturedUtc'),'coverage':{'indexed':len(files),'total':len(paths),'missing':[]}}
    return data

def generate(root=ROOT):
    root=Path(root);data=build(root);out=root/'catalogo';out.mkdir(exist_ok=True)
    model_dir=out/'models';model_dir.mkdir(exist_ok=True)
    # Geometry and clips are loaded only when opening a 3D card.
    for key,model in list(data['models'].items()):
        model_json=json.dumps(model,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
        stamp=hashlib.sha256(model_json.encode()).hexdigest()[:24]
        payload='window.WARLAND_MODEL_BANK=window.WARLAND_MODEL_BANK||{};window.WARLAND_MODEL_BANK["'+stamp+'"]='+model_json+';'
        (model_dir/(stamp+'.js')).write_text(payload,encoding='utf-8',newline='\n')
        data['models'][key]={'asset':'models/'+stamp+'.js','key':stamp,'clips':list(model['clips']),'geometryFile':model['geometryFile']}
    payload='window.WARLAND_CATALOG='+json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')+';\n'
    (out/'data.js').write_text(payload,encoding='utf-8',newline='\n')
    report={k:data[k] for k in ('fingerprint','counts','coverage','snapshot')}
    (out/'coverage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    assert {f['path'] for f in data['files']}=={rel(p,root) for p in (root/'packs').rglob('*') if p.is_file()}
    return report

if __name__=='__main__': print(json.dumps(generate(),ensure_ascii=False))
