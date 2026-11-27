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
    for name,count,life,extent,size in [('past_ash',48,5,[8,4,8],.032),('past_ash_near',12,4,[3.8,2.5,3.8],.026)]:
        path=RP/f'particles/{name}.json';d=json.loads(path.read_text(encoding='utf-8'));c=d['particle_effect']['components']
        c['minecraft:emitter_rate_instant']['num_particles']=count
        c['minecraft:particle_lifetime_expression']['max_lifetime']=life
        c['minecraft:particle_initial_speed']=[.3,-.3,.11]
        c['minecraft:particle_motion_dynamic']['linear_acceleration']=[.018,-.012,.005]
        c['minecraft:emitter_shape_box']['half_dimensions']=extent
        c['minecraft:particle_appearance_billboard']['size']=[f'{size} + variable.particle_random_2 * 0.038']*2
        c['minecraft:particle_appearance_tinting']['color']=[.65,.66,.7,'0.82 * math.min(1, variable.particle_age / 0.4) * math.min(1, (variable.particle_lifetime - variable.particle_age) / 0.8)']
        write(path,d)
    d=json.loads((RP/'particles/past_ash.json').read_text(encoding='utf-8'))
    d['particle_effect']['description']['identifier']='warland:past_drift'
    d['particle_effect']['description']['basic_render_parameters']={'material':'particles_alpha','texture':'textures/particle/past_halo'}
    c=d['particle_effect']['components'];c['minecraft:emitter_rate_instant']['num_particles']=6
    c['minecraft:particle_lifetime_expression']['max_lifetime']=6
    c['minecraft:emitter_shape_box']['half_dimensions']=[10,.2,10]
    c['minecraft:emitter_shape_box']['offset']=[0,0,0]
    c['minecraft:particle_initial_speed']=[.25,.015,.06]
    c['minecraft:particle_motion_dynamic']['linear_acceleration']=[0,0,0]
    c['minecraft:particle_appearance_billboard']['size']=[2.5,.45]
    c['minecraft:particle_appearance_billboard']['facing_camera_mode']='lookat_y'
    c['minecraft:particle_appearance_billboard']['uv']={'texture_width':64,'texture_height':64,'uv':[0,0],'uv_size':[64,64]}
    c['minecraft:particle_appearance_tinting']['color']=[.11,.13,.16,'0.10 * math.min(1, variable.particle_age / 1.2) * math.min(1, (variable.particle_lifetime - variable.particle_age) / 1.6)']
    c.pop('minecraft:particle_initial_spin',None)
    write(RP/'particles/past_drift.json',d)
    path=RP/'ui/hud_screen.json';text=path.read_text(encoding='utf-8')
    text=text.replace("(#hud_title_text_string != 'WL_PAST|FILM')","(not (#hud_title_text_string = 'WL_PAST|FILM'))")
    path.write_text(text,encoding='utf-8')
if __name__=='__main__':build()
