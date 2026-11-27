"""Bake the approved moving palm locator, in the same ZYX basis as the film."""
from pathlib import Path
import json,math
import numpy as np
R=Path(__file__).resolve().parents[1];RP=R/'packs/resource_packs/WARLAND_UmbralLoading_RP';BP=R/'packs/behavior_packs/WARLAND_BP'
g=json.loads((RP/'models/entity/pasado_coloso.geo.json').read_text())['minecraft:geometry'][0]
clip=json.loads((RP/'animations/pasado_coloso.animation.json').read_text())['animations']['animation.warland.pasado.performance']
def sample(k,t,default):
    if k is None:return default
    if not isinstance(k,dict):return k
    a=sorted((float(s),np.array(v))for s,v in k.items())
    if t<=a[0][0]:return a[0][1]
    for (ta,va),(tb,vb)in zip(a,a[1:]):
        if t<=tb:return va+(vb-va)*(t-ta)/(tb-ta)
    return a[-1][1]
def point(v):return np.array([-v[0],v[1],v[2]])
def rotation(v):
    x,y,z=np.radians([-v[0],-v[1],v[2]]);cx,sx=math.cos(x),math.sin(x);cy,sy=math.cos(y),math.sin(y);cz,sz=math.cos(z),math.sin(z)
    return np.array([[cz,-sz,0],[sz,cz,0],[0,0,1]])@np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]])@np.array([[1,0,0],[0,cx,-sx],[0,sx,cx]])
rows=[];bones={b['name']:b for b in g['bones']}
for i in range(74):
    time=i*.2;mat={}
    for name,b in bones.items():
        ch=clip['bones'].get(name,{});parent=bones.get(b.get('parent'));base=point(b['pivot'])-(point(parent['pivot'])if parent else 0)
        m=np.eye(4);m[:3,:3]=rotation(sample(ch.get('rotation'),time,b.get('rotation',[0,0,0])))@np.diag(sample(ch.get('scale'),time,[1,1,1]));m[:3,3]=base+point(sample(ch.get('position'),time,[0,0,0]));mat[name]=mat.get(b.get('parent'),np.eye(4))@m
    b=bones['right_hand'];p=mat['right_hand']@np.append(point(b['locators']['r4_palm'])-point(b['pivot']),1)
    scale=float(sample(clip['bones']['r4_orb']['scale'],time,[0,0,0])[0]);pos=p[:3]/16+np.array([361,63,-770]);rows.append([round(time,3),*[round(float(v),3)for v in pos],0 if scale<=.02 or time>=14.534 else min(15,10+round(scale*5))])
(BP/'scripts/past-palm-path.js').write_text('// Approved actor locator, sampled at 5 Hz; classic Bedrock block light.\nexport const PALM_LIGHT='+json.dumps(rows,separators=(',',':'))+';\n',encoding='utf-8')
print('Palm path',len(rows),'samples; bounds',np.min(np.array(rows)[:,1:4],axis=0),np.max(np.array(rows)[:,1:4],axis=0))
