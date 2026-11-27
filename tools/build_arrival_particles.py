"""Deterministic native particle choreography. Reuses the existing lobby texture."""
from pathlib import Path
import json
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'packs/resource_packs/WARLAND_Lobby_RP/particles'
age='variable.particle_age';life='variable.particle_lifetime'
r1='variable.particle_random_1';r2='variable.particle_random_2';r3='variable.particle_random_3'
def clamp(x):return f'math.clamp({x},0,1)'
def smooth(x):
 q=clamp(x);return f'({q}*{q}*(3-2*{q}))'
drop=smooth(f'{age}/2.4')
specs={
 'core':dict(count=3,life=3.15,pos=[f'({r1}-.5)*.12',f'1.1+26*(1-{drop})',f'({r2}-.5)*.12'],size=[f'.65+.5*{drop}',f'1.0+.25*{drop}'],alpha=f'{clamp(age+"/.18")}*{clamp("(3.15-"+age+")/.65")}'),
 'trail':dict(count=20,life=3.2,pos=[f'(.1+{r1}*.32)*math.cos({r2}*360+{age}*45)',f'1.1+26*(1-{smooth("("+age+"-"+r3+"*.4)/2.4")})',f'(.1+{r1}*.32)*math.sin({r2}*360+{age}*45)'],size=[.11,.6],alpha=f'.65*{clamp(age+"/.2")}*{clamp("(3.2-"+age+")/.65")}'),
 'body':dict(count=3,life=2.35,pos=[f'({r1}-.5)*.08',1.1,f'({r2}-.5)*.08'],size=[f'1.15+.18*math.sin({age}*110)',1.5],alpha=f'{clamp(age+"/.12")}*{clamp("(2.35-"+age+")/1.2")}'),
 'ring':dict(count=24,life=1.05,pos=[f'(.4+{age}*3)*math.cos({r1}*360)',.08,f'(.4+{age}*3)*math.sin({r1}*360)'],size=[.12,.09],alpha=f'.85*{clamp("(1.05-"+age+")/.7")}'),
 'converge':dict(count=28,life=1.55,pos=[f'(2.1*(1-{smooth(age+"/1.4")}))*math.cos({r1}*360+{age}*150)',f'.15+{r2}*2.1',f'(2.1*(1-{smooth(age+"/1.4")}))*math.sin({r1}*360+{age}*150)'],size=[.11,.18],alpha=f'{clamp(age+"/.15")}*{clamp("(1.55-"+age+")/.35")}'),
 'embers':dict(count=16,life=1.25,pos=[f'({r1}-.5)*(1+{age})',f'.2+{r2}*1.8+{age}*.6',f'({r3}-.5)*(1+{age})'],size=[.06,.09],alpha=f'.7*{clamp("(1.25-"+age+")/.7")}'),
 'lightning':dict(count=1,life=.5,pos=[0,0,0],size=[2.5,7],alpha=f'{age}<.08?1:({age}<.14?.12:({age}<.23?.9:{clamp("(.5-"+age+")/.27")}))'),
}
# Small original pixel-art bolt, reproducible from blocky paths. Two sprites,
# not a rainstorm or dozens of segment emitters. No vanilla texture replacement.
bolt=Image.new('RGBA',(64,128),(0,0,0,0));draw=ImageDraw.Draw(bolt)
paths=[[(36,0),(36,14),(28,14),(28,29),(35,29),(35,42),(23,42),(23,58),(30,58),(30,73),(20,73),(20,92),(26,92),(26,108),(18,108),(18,127)],[(28,29),(46,29),(46,44),(53,44),(53,60)],[(30,73),(42,73),(42,88),(48,88),(48,103)]]
for width,color in [(11,(125,161,255,24)),(7,(154,187,255,72)),(3,(205,222,255,245)),(1,(255,250,230,255))]:
 for path in paths:draw.line(path,fill=color,width=width)
bolt.save(ROOT/'packs/resource_packs/WARLAND_Lobby_RP/textures/particle/arrival_lightning.png')
for name,s in specs.items():
 components={
  'minecraft:emitter_rate_instant':{'num_particles':s['count']},
  'minecraft:emitter_lifetime_once':{'active_time':.01},
  'minecraft:emitter_shape_point':{'offset':[0,0,0],'direction':[0,0,0]},
  'minecraft:particle_initial_speed':0,
  'minecraft:particle_lifetime_expression':{'max_lifetime':s['life']},
  'minecraft:particle_motion_parametric':{'relative_position':s['pos']},
  'minecraft:particle_appearance_billboard':{'size':s['size'],'facing_camera_mode':'lookat_y' if name=='body' else 'lookat_xyz','uv':{'texture_width':64,'texture_height':128,'uv':[0,0],'uv_size':[64,128]}},
  'minecraft:particle_appearance_tinting':{'color':[1,1,1,s['alpha']]}
 }
 effect={'format_version':'1.10.0','particle_effect':{'description':{'identifier':'warland:arrival_'+name,'basic_render_parameters':{'material':'particles_blend','texture':'textures/particle/'+('arrival_lightning' if name=='lightning' else 'lobby_light')}},'components':components}}
 (OUT/('arrival_'+name+'.json')).write_text(json.dumps(effect,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'effects':len(specs),'particlesPerSequence':sum(s['count']*(2 if name=='lightning' else 1) for name,s in specs.items())}))
