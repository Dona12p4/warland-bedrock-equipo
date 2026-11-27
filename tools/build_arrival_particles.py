"""Deterministic native particle choreography. Reuses the existing lobby texture."""
from pathlib import Path
import json, subprocess
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'packs/resource_packs/WARLAND_Lobby_RP/particles'
age='variable.particle_age';life='variable.particle_lifetime'
r1='variable.particle_random_1';r2='variable.particle_random_2';r3='variable.particle_random_3'
timeline=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {ARRIVAL} from './packs/behavior_packs/WARLAND_Lobby_BP/scripts/arrival-policy.js';console.log(JSON.stringify(ARRIVAL))"],cwd=ROOT,text=True))
descent=(timeline['impact']-timeline['descent'])/20
height='variable.arrival_height';cloud_y='variable.arrival_cloud_y'
def clamp(x):return f'math.clamp({x},0,1)'
def smooth(x):
 q=clamp(x);return f'({q}*{q}*(3-2*{q}))'
drop=smooth(f'{age}/{descent}')
specs={
 'core':dict(count=3,life=descent+.75,pos=[f'({r1}-.5)*.12',f'1.1+{height}*(1-{drop})',f'({r2}-.5)*.12'],size=[f'.65+.5*{drop}',f'1.0+.25*{drop}'],alpha=f'{clamp(age+"/.18")}*{clamp("("+str(descent+.75)+"-"+age+")/.65")}'),
 'trail':dict(count=20,life=descent+.8,pos=[f'(.1+{r1}*.32)*math.cos({r2}*360+{age}*45)',f'1.1+{height}*(1-{smooth("("+age+"-"+r3+"*.4)/"+str(descent))})',f'(.1+{r1}*.32)*math.sin({r2}*360+{age}*45)'],size=[.11,.6],alpha=f'.65*{clamp(age+"/.2")}*{clamp("("+str(descent+.8)+"-"+age+")/.65")}'),
 'body':dict(count=3,life=2.35,pos=[f'({r1}-.5)*.08',1.1,f'({r2}-.5)*.08'],size=[f'1.15+.18*math.sin({age}*110)',1.5],alpha=f'{clamp(age+"/.12")}*{clamp("(2.35-"+age+")/1.2")}'),
 'ring':dict(count=24,life=1.05,pos=[f'(.4+{age}*3)*math.cos({r1}*360)',.08,f'(.4+{age}*3)*math.sin({r1}*360)'],size=[.12,.09],alpha=f'.85*{clamp("(1.05-"+age+")/.7")}'),
 'converge':dict(count=28,life=1.55,pos=[f'(2.1*(1-{smooth(age+"/1.4")}))*math.cos({r1}*360+{age}*150)',f'.15+{r2}*2.1',f'(2.1*(1-{smooth(age+"/1.4")}))*math.sin({r1}*360+{age}*150)'],size=[.11,.18],alpha=f'{clamp(age+"/.15")}*{clamp("(1.55-"+age+")/.35")}'),
 'embers':dict(count=16,life=1.25,pos=[f'({r1}-.5)*(1+{age})',f'.2+{r2}*1.8+{age}*.6',f'({r3}-.5)*(1+{age})'],size=[.06,.09],alpha=f'.7*{clamp("(1.25-"+age+")/.7")}'),
 'lightning':dict(count=1,life=.5,pos=[0,0,0],size=[6,2.5],alpha=f'{age}<.08?1:({age}<.14?.12:({age}<.23?.9:{clamp("(.5-"+age+")/.27")}))',texture='arrival_lightning',uv=[64,32],facing='emitter_transform_xz'),
 'cloud_outer':dict(count=22,life=5.4,pos=[f'(9+{r1}*5)*math.cos({r1}*360+{age}*26)',f'{cloud_y}+({r3}-.5)*1.2',f'(9+{r1}*5)*math.sin({r1}*360+{age}*26)'],size=[f'3.5+{r2}*1.5',f'1.4+{r3}*.6'],alpha=f'.88*{clamp(age+"/.55")}*{clamp("(5.4-"+age+")/1.5")}',texture='arrival_cloud',uv=[32,32]),
 'cloud_inner':dict(count=14,life=5.2,pos=[f'(4.5+{r1}*4)*math.cos({r1}*540+{age}*52)',f'{cloud_y}-.6+({r3}-.5)',f'(4.5+{r1}*4)*math.sin({r1}*540+{age}*52)'],size=[f'2+{r2}',1.2],alpha=f'.9*{clamp(age+"/.55")}*{clamp("(5.2-"+age+")/1.3")}',texture='arrival_cloud',uv=[32,32]),
}
# Small original pixel-art bolt, reproducible from blocky paths. Two sprites,
# not a rainstorm or dozens of segment emitters. No vanilla texture replacement.
bolt=Image.new('RGBA',(64,32),(0,0,0,0));draw=ImageDraw.Draw(bolt)
paths=[[(0,13),(10,13),(10,19),(23,19),(23,11),(37,11),(37,18),(48,18),(48,13),(63,13)],[(23,19),(23,25),(36,25),(36,30)],[(37,11),(44,11),(44,4),(55,4)]]
for width,color in [(11,(125,161,255,24)),(7,(154,187,255,72)),(3,(205,222,255,245)),(1,(255,250,230,255))]:
 for path in paths:draw.line(path,fill=color,width=width)
bolt.save(ROOT/'packs/resource_packs/WARLAND_Lobby_RP/textures/particle/arrival_lightning.png')
cloud=Image.new('RGBA',(32,32),(0,0,0,0));draw=ImageDraw.Draw(cloud)
for box,color in [((4,11,27,24),(165,175,190,90)),((1,13,30,21),(185,193,207,130)),((5,8,25,24),(195,203,215,235)),((9,5,20,24),(213,220,230,245)),((3,12,28,22),(204,213,224,245)),((7,9,24,17),(232,237,245,255)),((11,6,19,13),(248,250,255,255)),((6,20,25,24),(162,173,191,220))]:draw.rectangle(box,fill=color)
cloud.save(ROOT/'packs/resource_packs/WARLAND_Lobby_RP/textures/particle/arrival_cloud.png')
animations_path=ROOT/'packs/resource_packs/WARLAND_Lobby_RP/animations/arrival_player.json'
animations=json.loads(animations_path.read_text());animations['animations']['animation.warland.arrival.hidden']['animation_length']=timeline['reveal']/20
animations_path.write_text(json.dumps(animations,indent=2)+'\n',encoding='utf8')
for name,s in specs.items():
 uv=s.get('uv',[64,128]);texture=s.get('texture','lobby_light')
 components={
  'minecraft:emitter_rate_instant':{'num_particles':s['count']},
  'minecraft:emitter_lifetime_once':{'active_time':.01},
  'minecraft:emitter_shape_point':{'offset':[0,0,0],'direction':[0,0,0]},
  'minecraft:particle_initial_speed':0,
  'minecraft:particle_lifetime_expression':{'max_lifetime':s['life']},
  'minecraft:particle_motion_parametric':{'relative_position':s['pos']},
  'minecraft:particle_appearance_billboard':{'size':s['size'],'facing_camera_mode':s.get('facing','lookat_y' if name=='body' else 'lookat_xyz'),'uv':{'texture_width':uv[0],'texture_height':uv[1],'uv':[0,0],'uv_size':uv}},
  'minecraft:particle_appearance_tinting':{'color':([.48,.54,.65] if name.startswith('cloud_') else [1,1,1])+[s['alpha']]}
 }
 effect={'format_version':'1.10.0','particle_effect':{'description':{'identifier':'warland:arrival_'+name,'basic_render_parameters':{'material':'particles_blend','texture':'textures/particle/'+texture}},'components':components}}
 (OUT/('arrival_'+name+'.json')).write_text(json.dumps(effect,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'effects':len(specs),'particlesPerSequence':sum(s['count']*(2 if name=='lightning' else 1) for name,s in specs.items())}))
