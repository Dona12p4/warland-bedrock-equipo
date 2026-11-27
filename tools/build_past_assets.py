"""Import the approved native actor and soundtrack; no movie frames."""
from pathlib import Path
import json, shutil
import team

R=team.ROOT; project=R.parents[1]
source=json.loads((project/'outputs/WARLAND1-Memoria-IV/Mundo-reconstruido/studio.json').read_text(encoding='utf-8'))
bp=R/'packs/behavior_packs/WARLAND_BP'
rp=R/'packs/resource_packs/WARLAND_UmbralLoading_RP'
oldrp=Path(source['rp']);oldbp=Path(source['bp'])
def write(p,v):p.parent.mkdir(parents=True,exist_ok=True);team.write(p,v)
def renamed(v):
 s=json.dumps(v)
 for a,b in [('warland:ruins2_coloso','warland:pasado_coloso'),('geometry.warland.coloso_boceto','geometry.warland.pasado_coloso'),('animation.warland.ruins2.performance','animation.warland.pasado.performance'),('animation.warland.coloso_boceto','animation.warland.pasado'),('animation.warland.ruins4','animation.warland.pasado'),('controller.render.warland.ruins2_coloso','controller.render.warland.pasado_coloso'),('textures/entity/coloso','textures/entity/pasado_coloso'),('warland1:ash_near','warland:past_ash_near'),('warland1:ash','warland:past_ash'),('warland1:r4_power','warland:past_power'),('textures/particle/warland1_ash','textures/particle/past_ash'),('textures/particle/r4_orb_halo','textures/particle/past_halo')]:s=s.replace(a,b)
 return json.loads(s)
write(bp/'dimensions/el_pasado.json',{'format_version':'1.26.50','minecraft:dimension':{'description':{'identifier':'warland:el_pasado'},'components':{'minecraft:dimension_height':{'min_y':-64,'height_range':384},'minecraft:generation':{'generator_type':'void'},'minecraft:default_biome':{'biome':'minecraft:plains'}}}})
write(bp/'entities/pasado_coloso.json',renamed(json.loads((oldbp/'entities/coloso.json').read_text(encoding='utf-8'))))
for src,dst in [('models/entity/coloso.geo.json','models/entity/pasado_coloso.geo.json'),('entity/coloso.entity.json','entity/pasado_coloso.entity.json'),('render_controllers/coloso.json','render_controllers/pasado_coloso.json'),('animations/coloso_cinema.animation.json','animations/pasado_coloso.animation.json'),('particles/ash.json','particles/past_ash.json'),('particles/ash_near.json','particles/past_ash_near.json'),('particles/r4_power.json','particles/past_power.json')]:
 write(rp/dst,renamed(json.loads((oldrp/src).read_text(encoding='utf-8'))))
for src,dst in [('textures/entity/coloso.tga','textures/entity/pasado_coloso.tga'),('textures/particle/warland1_ash.png','textures/particle/past_ash.png'),('textures/particle/r4_orb_halo.png','textures/particle/past_halo.png')]:
 (rp/dst).parent.mkdir(parents=True,exist_ok=True);shutil.copy2(oldrp/src,rp/dst)
# Retiming native numeric tracks to the approved abrupt fist / teleport.
path=rp/'animations/pasado_coloso.animation.json';doc=json.loads(path.read_text(encoding='utf-8'))
clip=doc['animations']['animation.warland.pasado.performance'];clip['animation_length']=18.933333333
def sample(keys,t):
 if not isinstance(keys,dict):return keys
 a=sorted((float(k),v)for k,v in keys.items())
 if t<=a[0][0]:return a[0][1]
 for (ta,va),(tb,vb) in zip(a,a[1:]):
  if t<=tb:
   u=(t-ta)/(tb-ta);return [x+(y-x)*u for x,y in zip(va,vb)]
 return a[-1][1]
for channels in clip['bones'].values():
 for channel,keys in list(channels.items()):
  if not isinstance(keys,dict):continue
  output={k:v for k,v in keys.items() if float(k)<14.4}
  for t,src in [(14.4,14.4),(14.45,15.6666667),(14.5,16.9333333),(14.5333333,18.2),(14.55,19.6),(18.9333333,24)]:output[str(t)]=sample(keys,src)
  channels[channel]=output
clip.pop('particle_effects',None);clip.pop('sound_effects',None)
write(path,doc)
# Atmosphere is per visitor. Never set global time/weather to darken this scene.
for name,color,start,end in [('ruins','#171B23',10,86),('intact','#A9BBC7',48,180)]:
 write(rp/f'fogs/past_{name}.json',{'format_version':'1.16.100','minecraft:fog_settings':{'description':{'identifier':'warland:past_'+name},'distance':{medium:{'fog_start':start,'fog_end':end,'fog_color':color,'render_distance_type':'fixed'}for medium in ['air','weather']}}})
particle=json.loads((rp/'particles/past_ash.json').read_text(encoding='utf-8'));c=particle['particle_effect']['components'];c['minecraft:emitter_rate_instant']['num_particles']=24;c['minecraft:particle_lifetime_expression']['max_lifetime']=4
write(rp/'particles/past_ash.json',particle)
particle=json.loads((rp/'particles/past_ash_near.json').read_text(encoding='utf-8'));c=particle['particle_effect']['components'];c['minecraft:emitter_rate_instant']['num_particles']=8;c['minecraft:particle_lifetime_expression']['max_lifetime']=3
write(rp/'particles/past_ash_near.json',particle)
audio=project/'.runtime/cinematic-command-worktree/packs/resource_packs/WARLAND_UmbralLoading_RP/sounds/warland/memoria.ogg'
(rp/'sounds/warland').mkdir(parents=True,exist_ok=True);shutil.copy2(audio,rp/'sounds/warland/past_cinema.ogg')
sounds=json.loads((rp/'sounds/sound_definitions.json').read_text(encoding='utf-8'));sounds['sound_definitions']['warland.past.cinema']={'category':'music','sounds':[{'name':'sounds/warland/past_cinema','stream':True,'volume':1}]};write(rp/'sounds/sound_definitions.json',sounds)
for folder,version,refs in [(bp,[0,6,21],'world_behavior_packs.json'),(rp,[1,1,19],'world_resource_packs.json')]:
 m=json.loads((folder/'manifest.json').read_text(encoding='utf-8'));m['header']['version']=version
 for mod in m['modules']:mod['version']=version
 write(folder/'manifest.json',m)
 order=json.loads((R/'pack-order'/refs).read_text(encoding='utf-8'))
 for ref in order:
  if ref['pack_id']==m['header']['uuid']:ref['version']=version
 write(R/'pack-order'/refs,order)
print('Native dimension, actor, particles, fog and approved audio prepared.')
