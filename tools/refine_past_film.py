"""Derive native presentation from the approved bass-cuts-tp-18 sources.

Only repo packs are written. No client database, movie frame or global time.
"""
from pathlib import Path
import copy, hashlib, json, math, subprocess
from PIL import Image

R=Path(__file__).resolve().parents[1];P=R.parents[1]
RP=R/'packs/resource_packs/WARLAND_UmbralLoading_RP';BP=R/'packs/behavior_packs/WARLAND_BP'
O=P/'outputs/WARLAND1-Memoria-IV/Mundo-reconstruido';B=O/'Cortes-al-bajo'
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def write(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
assert read(B/'delivery.json')['revision']=='bass-cuts-tp-18'
def encode(src,dst,filters=None):
    args=['ffmpeg','-v','error','-nostdin','-y','-i',str(src)]
    if filters:args+=['-af',filters]
    subprocess.run(args+['-ac','2','-ar','32000','-c:a','libvorbis','-q:a','3',str(dst)],check=True)
encode(B/'combinado-efecto.wav',RP/'sounds/warland/past_cinema.ogg')
# Same gain and intro as approved film; extend its MUSIC beyond the final shot.
encode(O/'Ceniza-integrada/fondo-void.webm',RP/'sounds/warland/past_ambient.ogg','volume=-13.82dB,afade=t=in:d=1.2,afade=t=out:st=299.461:d=2.4')
sounds=read(RP/'sounds/sound_definitions.json')
for event,file in [('cinema','past_cinema'),('ambient','past_ambient')]:
    sounds['sound_definitions']['warland.past.'+event]={'category':'ambient','sounds':[{'name':'sounds/warland/'+file,'stream':True,'is3D':False,'volume':1}]}
write(RP/'sounds/sound_definitions.json',sounds)
write(BP/'cameras/presets/past_film.json',{'format_version':'1.19.50','minecraft:camera_preset':{'identifier':'warland:past_film','inherit_from':'minecraft:free','listener':'player','player_effects':False}})
dim=read(BP/'dimensions/el_pasado.json');dim['minecraft:dimension']['components']['minecraft:dimension_height']['height_range']=512;write(BP/'dimensions/el_pasado.json',dim)
# Extra drawing distance for the approved long landscape perspectives.
fog=read(RP/'fogs/past_ruins.json');fog['minecraft:fog_settings']['description']['identifier']='warland:past_cinema'
for medium in fog['minecraft:fog_settings']['distance'].values():medium.update(fog_start=4,fog_end=120,fog_color='#080B11')
write(RP/'fogs/past_cinema.json',fog)
# Approved film crops 132 px from a 1080 px viewport at top AND bottom.
# Native 3-D remains behind the two bars. No frame atlas or video playback.
image=RP/'textures/ui/past_black.png';Image.new('RGBA',(1,1),(0,0,0,255)).save(image)
ui=read(RP/'ui/hud_screen.json');controls=ui['root_panel']['modifications'][0]['value']
controls[:]=[c for c in controls if 'warland_past_frame' not in c]
bar=lambda edge:{'type':'image','texture':'textures/ui/past_black','size':['100%','12.222222%'],'anchor_from':edge,'anchor_to':edge,'layer':120}
controls.append({'warland_past_frame':{'type':'panel','size':['100%','100%'],'layer':120,'bindings':[{'binding_name':'#hud_title_text_string'},{'binding_type':'view','source_property_name':"(#hud_title_text_string = 'WL_PAST|FILM')",'target_property_name':'#visible'}],'controls':[{'top':bar('top_middle')},{'bottom':bar('bottom_middle')}]}})
write(RP/'ui/hud_screen.json',ui)
# Use the source clip, not the previously coarsely retimed clip.
actor=read(O/'Ruinas-oscuras/Actor-aprobado.json')
clip=copy.deepcopy(actor['animation']['animations']['animation.warland.ruins2.performance'])
def source_time(t):
    if t<14.4:return t
    if t<14.4+4/30-1e-8:return [14.4,15+2/3,16+14/15,18.2][min(3,int((t-14.4)*30+1e-7))]
    return 19.6+t-(14.4+4/30)
def sample(keys,t):
    a=sorted((float(k),v) for k,v in keys.items())
    if t<=a[0][0]:return a[0][1]
    for (ta,va),(tb,vb) in zip(a,a[1:]):
        if t<=tb:
            u=(t-ta)/(tb-ta);return [x+(y-x)*u for x,y in zip(va,vb)]
    return a[-1][1]
for channels in clip['bones'].values():
    for channel,keys in list(channels.items()):
        if isinstance(keys,dict):channels[channel]={str(round(i/30,7)):sample(keys,source_time(i/30)) for i in range(569)}
clip['animation_length']=568/30;clip.pop('sound_effects',None)
# Attach each short halo to the ACTUAL moving hand, instead of spawning one
# ten-second orb at the actor's body after he had already disappeared.
scale=clip['bones']['r4_orb']['scale']
active=[t for t,s in scale.items() if s[0]>.02 and float(t)<14.4]
clip['particle_effects']={str(round(t,3)):{'effect':'power','locator':'r4_palm','bind_to_actor':True} for t in [i/10 for i in range(144)] if active and float(active[0])<=t<=14.3}
anims=read(RP/'animations/pasado_coloso.animation.json');anims['animations']['animation.warland.pasado.performance']=clip;write(RP/'animations/pasado_coloso.animation.json',anims)
halo=read(RP/'particles/past_power.json');c=halo['particle_effect']['components'];c['minecraft:particle_lifetime_expression']['max_lifetime']=.16
c.pop('minecraft:particle_motion_parametric',None)
c['minecraft:particle_appearance_billboard']['size']=[.32,.32]
c['minecraft:particle_appearance_tinting']['color']=[1,1,1,'0.65 * (1 - variable.particle_age / variable.particle_lifetime)']
write(RP/'particles/past_power.json',halo)
# A bounded 3-D cloud replaces the single old halo used for disappearance.
departure=copy.deepcopy(halo);departure['particle_effect']['description']['identifier']='warland:past_departure';c=departure['particle_effect']['components'];c.pop('minecraft:emitter_local_space',None)
c['minecraft:emitter_rate_instant']['num_particles']=240
c.pop('minecraft:emitter_shape_point',None);c['minecraft:emitter_shape_box']={'half_dimensions':[1.6,3.2,.9],'direction':'outwards'}
c['minecraft:particle_initial_speed']='0.3 + variable.particle_random_1 * 0.8'
c['minecraft:particle_motion_dynamic']={'linear_acceleration':[0,.12,0],'linear_drag_coefficient':.8}
c['minecraft:particle_lifetime_expression']['max_lifetime']=3.8
c['minecraft:particle_appearance_billboard']['size']=['(.09 + variable.particle_random_2 * .18) * (1 + variable.particle_age * .5)']*2
c['minecraft:particle_appearance_tinting']['color']=[.56,.28,.74,'0.55 * (1 - variable.particle_age / variable.particle_lifetime)']
write(RP/'particles/past_departure.json',departure)
# Ash must occlude with terrain and must not look like glowing screen flecks.
for name in ['past_ash','past_ash_near']:
    d=read(RP/f'particles/{name}.json');d['particle_effect']['description']['basic_render_parameters']['material']='particles_alpha'
    c=d['particle_effect']['components'];c['minecraft:particle_initial_speed']=[.12,-.24,.055]
    c['minecraft:particle_appearance_tinting']['color']=[.73,.72,.69,'0.82 * math.min(1, variable.particle_age / 0.4) * math.min(1, (variable.particle_lifetime - variable.particle_age) / 0.8)']
    write(RP/f'particles/{name}.json',d)
receipt={'sourceRevision':'bass-cuts-tp-18','musicDuration':301.861,'playbackVolume':.5,'musicContinuesAfterFilm':True,'effectsSeparate':True,'barsFraction':132/1080,'snapFrames':[432,433,434,435],'teleport':59.1,'worldSpaceAsh':True,'maxDepartureParticles':240}
write(R/'.local/past-film-assets.json',receipt);print(json.dumps(receipt))
