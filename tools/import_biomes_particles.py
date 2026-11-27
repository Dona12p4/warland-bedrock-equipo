"""Import the user-supplied artwork as a source module, never an installed addon.

No executable from the archive is run. Only particle JSON and referenced PNGs
are read. The full WARLAND builder remains the only distribution route.
"""
from pathlib import Path, PurePosixPath
import argparse, hashlib, json, re, uuid, zipfile

ROOT = Path(__file__).resolve().parents[1]

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

def bounded(value, limit, minimum=0):
    if isinstance(value, (int, float)): return max(minimum, min(value, limit))
    return f'math.clamp(({value}), {minimum}, {limit})'

def run(archive):
    rp=ROOT/'packs/resource_packs/WARLAND_BiomesParticles_RP'
    bp=ROOT/'packs/behavior_packs/WARLAND_BiomesParticles_BP'
    if rp.exists(): raise RuntimeError('Already imported; edit sources without reimporting')
    report={'author':'MrsTrader','sourceSha256':hashlib.sha256(archive.read_bytes()).hexdigest(),
            'scope':'Particle artwork only; WARLAND replaces the original scheduler.', 'effects':[]}
    with zipfile.ZipFile(archive) as z:
        if sum(i.file_size for i in z.infolist())>32_000_000: raise ValueError('Unexpected archive size')
        for n in z.namelist():
            if PurePosixPath(n).is_absolute() or '..' in PurePosixPath(n).parts: raise ValueError('Unsafe archive path')
        for n in z.namelist():
            if not n.startswith('RP Biomes Particles/particles/') or not n.endswith('.json'): continue
            data=json.loads(z.read(n));effect=data['particle_effect'];c=effect['components']
            original=effect['description']['identifier'];name=original.split(':')[1]
            texture=effect['description']['basic_render_parameters']['texture']
            # Two unused tumbleweed fragments reference artwork absent from the supplied addon.
            if 'RP Biomes Particles/'+texture+'.png' not in z.namelist():
                report.setdefault('omittedBrokenEffects',[]).append(original);continue
            # Isolated names prevent collisions with any other mod or vanilla particle.
            newtex='textures/warland/biomes_particles/'+texture.removeprefix('textures/')
            effect['description']['identifier']='warland_biomes:'+name
            effect['description']['basic_render_parameters']['texture']=newtex
            dest=rp/(newtex+'.png');dest.parent.mkdir(parents=True,exist_ok=True)
            dest.write_bytes(z.read('RP Biomes Particles/'+texture+'.png'))
            aurora=name.startswith('northern_lights')
            oldlife=c.get('minecraft:emitter_lifetime_once',{}).get('active_time',1)
            for key in ['minecraft:emitter_lifetime_expression','minecraft:emitter_lifetime_looping','minecraft:emitter_lifetime_events']:
                c.pop(key,None)
            c['minecraft:emitter_lifetime_once']={'active_time':bounded(oldlife,6 if aurora else 1,.05)}
            if 'minecraft:emitter_rate_steady' in c:
                c.pop('minecraft:emitter_rate_instant',None)
                rate=c['minecraft:emitter_rate_steady']
                rate['spawn_rate']=bounded(rate['spawn_rate'],3 if aurora else 12)
                rate['max_particles']=16 if aurora else 24
            else:
                rate=c['minecraft:emitter_rate_instant'];rate['num_particles']=bounded(rate['num_particles'],12,1)
            c['minecraft:particle_lifetime_expression']['max_lifetime']=bounded(c['minecraft:particle_lifetime_expression'].get('max_lifetime',4),8,.1)
            # Remove the broken recursive trail (missing in the original) and
            # collision callbacks that spawn more emitters outside our budget.
            effect.pop('events',None);c.pop('minecraft:particle_lifetime_events',None)
            collision=c.get('minecraft:particle_motion_collision',{})
            collision.pop('events',None)
            if 'minecraft:emitter_shape_entity_aabb' in c:
                c.pop('minecraft:emitter_shape_entity_aabb')
                c['minecraft:emitter_shape_box']={'half_dimensions':[2,1,2],'direction':'outwards'}
            if name.startswith('underwater_'):
                for key in ['minecraft:emitter_shape_box','minecraft:emitter_shape_disc']:
                    if key in c:c[key]['offset']=[0,0,0]
            # These emitters have no actor/animation query context.
            rendered=json.dumps(data,ensure_ascii=False).replace('q.anim_time','v.particle_age')
            rendered=rendered.replace('q.ground_speed','0')
            write(rp/'particles/warland_biomes'/f'{name}.json',json.loads(rendered))
            report['effects'].append(name)
    version=[1,0,0];ids={kind:str(uuid.uuid5(uuid.NAMESPACE_URL,'warland/biomes-particles/'+kind)) for kind in ['bp','rp']}
    for kind,folder,typ in [('bp',bp,'data'),('rp',rp,'resources')]:
        manifest={'format_version':2,'header':{'name':'WARLAND Biomes Particles · fuente',
          'description':'Particulas de MrsTrader adaptadas al pack completo WARLAND. No instalar separado.',
          'uuid':ids[kind],'version':version,'min_engine_version':[1,26,60]},
          'metadata':{'authors':['MrsTrader','WARLAND (adaptacion y optimizacion)']},
          'modules':[{'type':typ,'uuid':str(uuid.uuid5(uuid.NAMESPACE_URL,'warland/biomes-particles/'+typ)),'version':version}]}
        if kind=='bp':
            manifest['modules'].append({'type':'script','language':'javascript','entry':'scripts/main.js',
                'version':version,'uuid':str(uuid.uuid5(uuid.NAMESPACE_URL,'warland/biomes-particles/script'))})
            manifest['dependencies']=[{'uuid':ids['rp'],'version':version},{'module_name':'@minecraft/server','version':'2.10.0'}]
        write(folder/'manifest.json',manifest)
        order=ROOT/'pack-order'/('world_behavior_packs.json' if kind=='bp' else 'world_resource_packs.json')
        refs=json.loads(order.read_text(encoding='utf-8-sig'));refs.append({'pack_id':ids[kind],'version':version});write(order,refs)
    write(ROOT/'config/biomes-particles-source.json',report)
    print(json.dumps({'effects':len(report['effects']),'omittedBrokenEffects':report.get('omittedBrokenEffects',[])}))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('archive',type=Path);run(parser.parse_args().archive)
