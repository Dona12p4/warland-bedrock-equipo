"""Build the November 27 feedback delta in source packs only; never deploy."""
from pathlib import Path
import json, math, struct, zlib

ROOT=Path(__file__).resolve().parents[1]
BP=ROOT/'packs/behavior_packs/WARLAND_BP'
RP=ROOT/'packs/resource_packs/WARLAND_UmbralLoading_RP'
def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,v):
    p.parent.mkdir(parents=True,exist_ok=True)
    original=p.read_bytes() if p.exists() else b''
    newline='\r\n' if b'\r\n' in original else '\n'
    p.write_bytes((json.dumps(v,ensure_ascii=False,indent=2)+'\n').replace('\n',newline).encode('utf-8'))

def build():
    path=BP/'entities/pasado_coloso.json';d=read(path)
    d['minecraft:entity']['description']['properties']['warland:performance_time']={
        'type':'float','range':[0.0,20.0],'default':0.0,'client_sync':True}
    write(path,d)
    path=RP/'entity/pasado_coloso.entity.json';d=read(path);e=d['minecraft:client_entity']['description']
    e['animations']['scene']='controller.animation.warland.pasado.scene'
    e['scripts']['animate']=['scene']
    write(path,d)
    write(RP/'animation_controllers/pasado_coloso.json',{'format_version':'1.10.0','animation_controllers':{
        'controller.animation.warland.pasado.scene':{'initial_state':'waiting','states':{
            'waiting':{'animations':['idle','orb_hidden'],'transitions':[{'acting':"query.property('warland:performance')"}]},
            'acting':{'animations':['performance'],'transitions':[{'waiting':"!query.property('warland:performance')"}]}
        }}}})
    path=RP/'animations/pasado_coloso.animation.json';d=read(path)
    d['animations']['animation.warland.pasado.performance']['anim_time_update']="query.property('warland:performance_time')"
    write(path,d)
    # 4 Hz, at most four shared cells. Max 2,736 flakes + 32 drifting wisps.
    for name,count,life,extent,size in [
        ('past_ash',104,1.4,[6,4,6],['0.013 + variable.particle_random_2 * 0.009','0.22 + variable.particle_random_2 * 0.30']),
        ('past_ash_near',20,.65,[2.8,2,2.8],['0.016 + variable.particle_random_2 * 0.012','0.10 + variable.particle_random_2 * 0.18'])]:
        path=RP/f'particles/{name}.json';d=read(path);c=d['particle_effect']['components']
        c['minecraft:emitter_rate_instant']['num_particles']=count
        c['minecraft:particle_lifetime_expression']['max_lifetime']=life
        c['minecraft:particle_initial_speed']=['5.5 + variable.particle_random_1 * 2.5','-6.5 - variable.particle_random_3 * 3',1.8]
        c['minecraft:particle_motion_dynamic']['linear_acceleration']=[.6,-1,.1]
        c['minecraft:emitter_shape_box'].update(half_dimensions=extent,offset=[-3,2,-1])
        c.pop('minecraft:particle_initial_spin',None)
        c['minecraft:particle_appearance_billboard'].update(size=size,facing_camera_mode='lookat_direction',direction={'mode':'derive_from_velocity','min_speed_threshold':.01})
        c['minecraft:particle_appearance_tinting']['color']=[.73,.72,.69,'0.86 * math.min(1, variable.particle_age / 0.08) * math.min(1, (variable.particle_lifetime - variable.particle_age) / 0.20)']
        write(path,d)
    # A tiny procedural white radial sprite: neither the original purple halo
    # nor the lobby's gold texture can become white by applying a white tint.
    rows=[]
    for y in range(32):
        row=bytearray([0])
        for x in range(32):
            radius=math.hypot((x-15.5)/15.5,(y-15.5)/15.5)
            row.extend((255,255,255,round(255*max(0,1-radius)**1.6)))
        rows.append(bytes(row))
    def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
    png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',32,32,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows)))+chunk(b'IEND',b'')
    (RP/'textures/particle/past_white.png').write_bytes(png)
    for name in ['beam','halo','core','sparks']:
        path=RP/f'particles/past_guide_{name}.json';d=read(path);e=d['particle_effect']
        e['description']['basic_render_parameters']['texture']='textures/particle/past_white'
        e['components']['minecraft:particle_appearance_billboard']['uv']={'texture_width':32,'texture_height':32,'uv':[0,0],'uv_size':[32,32]}
        color=e['components']['minecraft:particle_appearance_tinting']['color'];color[:3]=[1,1,1]
        write(path,d)

if __name__=='__main__':build()
