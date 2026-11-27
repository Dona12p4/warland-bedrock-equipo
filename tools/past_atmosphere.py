"""Bounded, world-space atmosphere for the ruins; no screen overlay."""
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1]
RP=R/'packs/resource_packs/WARLAND_UmbralLoading_RP'
def write(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
def build():
    path=RP/'fogs/past_ruins.json';d=json.loads(path.read_text(encoding='utf-8'))
    for medium in d['minecraft:fog_settings']['distance'].values():
        medium.update(fog_start=0,fog_end=58,fog_color='#05070C')
    write(path,d)
    # More fresh flakes and faster crosswind, with a shorter lifetime. At 1 Hz,
    # four shared cells retain at most 1200 flakes including overlapping cohorts.
    for name,count,life,extent,size in [('past_ash',72,2.8,[6,3.2,6],.042),('past_ash_near',28,2.5,[2.8,2,2.8],.035)]:
        path=RP/f'particles/{name}.json';d=json.loads(path.read_text(encoding='utf-8'));c=d['particle_effect']['components']
        c['minecraft:emitter_rate_instant']['num_particles']=count
        c['minecraft:particle_lifetime_expression']['max_lifetime']=life
        c['minecraft:particle_initial_speed']=['2.7 + variable.particle_random_1 * 1.4',-.35,.8]
        c['minecraft:particle_motion_dynamic']['linear_acceleration']=[.24,-.04,.08]
        c['minecraft:emitter_shape_box']['half_dimensions']=extent
        c['minecraft:emitter_shape_box']['offset']=[-3,1,-1]
        c['minecraft:particle_appearance_billboard']['size']=[f'{size} + variable.particle_random_2 * 0.038']*2
        c['minecraft:particle_appearance_tinting']['color']=[.73,.72,.69,'0.95 * math.min(1, variable.particle_age / 0.2) * math.min(1, (variable.particle_lifetime - variable.particle_age) / 0.5)']
        write(path,d)
    d=json.loads((RP/'particles/past_ash.json').read_text(encoding='utf-8'))
    d['particle_effect']['description']['identifier']='warland:past_drift'
    d['particle_effect']['description']['basic_render_parameters']={'material':'particles_alpha','texture':'textures/particle/past_halo'}
    c=d['particle_effect']['components'];c['minecraft:emitter_rate_instant']['num_particles']=8
    c['minecraft:particle_lifetime_expression']['max_lifetime']=2.8
    c['minecraft:emitter_shape_box']['half_dimensions']=[7,.7,7]
    c['minecraft:emitter_shape_box']['offset']=[-3,0,-1]
    c['minecraft:particle_initial_speed']=[2.8,.015,.8]
    c['minecraft:particle_motion_dynamic']['linear_acceleration']=[0,0,0]
    c['minecraft:particle_appearance_billboard']['size']=[2,.65]
    c['minecraft:particle_appearance_billboard']['facing_camera_mode']='lookat_y'
    c['minecraft:particle_appearance_billboard']['uv']={'texture_width':64,'texture_height':64,'uv':[0,0],'uv_size':[64,64]}
    c['minecraft:particle_appearance_tinting']['color']=[.30,.29,.27,'0.2 * math.min(1, variable.particle_age / 0.4) * math.min(1, (variable.particle_lifetime - variable.particle_age) / 0.6)']
    c.pop('minecraft:particle_initial_spin',None)
    write(RP/'particles/past_drift.json',d)
    # Fullbright additive shafts with depth testing; a tall narrow core stays
    # readable above the wall while a larger halo marks the actual doorway.
    for name,size,color in [
        ('beam',[.24,17],[1,1,.94,1]),
        ('halo',[1.8,17],[1,.92,.68,.5]),
        ('core',[2.2,2.5],[1,.97,.82,.95])]:
        effect={'format_version':'1.10.0','particle_effect':{
            'description':{'identifier':'warland:past_guide_'+name,'basic_render_parameters':{'material':'particles_add','texture':'textures/particle/past_halo'}},
            'components':{
                'minecraft:emitter_rate_instant':{'num_particles':1},
                'minecraft:emitter_lifetime_once':{'active_time':.01},
                'minecraft:emitter_shape_point':{'offset':[0,0,0]},
                'minecraft:particle_lifetime_expression':{'max_lifetime':1.1},
                'minecraft:particle_appearance_billboard':{'size':size,'facing_camera_mode':'lookat_y','uv':{'texture_width':64,'texture_height':64,'uv':[0,0],'uv_size':[64,64]}},
                'minecraft:particle_appearance_tinting':{'color':color[:3]+[f'{color[3]} * math.min(1, variable.particle_age / 0.1) * math.min(1, (variable.particle_lifetime - variable.particle_age) / 0.1)']}
            }}}
        write(RP/f'particles/past_guide_{name}.json',effect)
    d=json.loads((RP/'particles/past_ash.json').read_text(encoding='utf-8'))
    d['particle_effect']['description']={'identifier':'warland:past_guide_sparks','basic_render_parameters':{'material':'particles_add','texture':'textures/particle/past_ash'}}
    c=d['particle_effect']['components'];c['minecraft:emitter_rate_instant']['num_particles']=8
    c['minecraft:particle_lifetime_expression']['max_lifetime']=2
    c['minecraft:emitter_shape_box'].update(offset=[0,0,0],half_dimensions=[1.2,.15,1.2])
    c['minecraft:particle_initial_speed']=[0,1.1,0]
    c['minecraft:particle_motion_dynamic']['linear_acceleration']=[0,.1,0]
    c['minecraft:particle_appearance_billboard']['size']=[.045,.045]
    c['minecraft:particle_appearance_tinting']['color']=[1,.94,.72,'math.min(1, variable.particle_age / 0.2) * math.min(1, (variable.particle_lifetime - variable.particle_age) / 0.4)']
    write(RP/'particles/past_guide_sparks.json',d)
    path=RP/'ui/hud_screen.json';text=path.read_text(encoding='utf-8')
    text=text.replace("(#hud_title_text_string != 'WL_PAST|FILM')","(not (#hud_title_text_string = 'WL_PAST|FILM'))")
    path.write_text(text,encoding='utf-8')
if __name__=='__main__':build()
