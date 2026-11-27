"""Plan physical river exits from closed terrain exports. Never edits a world.

The output is an exact block delta plus verified voxel paths, suitable for a
marked staging world. Inventories and block entities are outside its scope.
"""
from pathlib import Path
import collections, json, struct, zipfile
import numpy as np
from past_scene_stage import unpack,pack
import past_terrain as t
R=Path(__file__).resolve().parents[1]
WATER={'minecraft:water','minecraft:flowing_water'}
AIR={'minecraft:air','minecraft:short_grass','minecraft:tallgrass','minecraft:deadbush','minecraft:seagrass','minecraft:kelp','minecraft:kelp_plant','minecraft:waterlily','minecraft:snow_layer'}
GROUND={'minecraft:dirt','minecraft:grass','minecraft:grass_block','minecraft:stone','minecraft:cobblestone','minecraft:cobbled_deepslate','minecraft:deepslate','minecraft:gravel','minecraft:sand','minecraft:blackstone','minecraft:mossy_cobblestone','minecraft:stonebrick'}
DIRS=[(1,0),(-1,0),(0,1),(0,-1)]
class Terrain:
    def __init__(self,path):
        with zipfile.ZipFile(path) as z:self.records={bytes.fromhex(k):z.read(k)for k in z.namelist()}
        self.cache={};self.edits=[]
    def cell(self,x,y,z):
        k=struct.pack('<iiBb',x//16,z//16,47,y//16)
        if k not in self.cache:
            if k not in self.records:return None
            sy,layers=unpack(self.records[k]);self.cache[k]=[sy,layers,[[t.NBT(p).root()[1]for p in pal]for ids,pal in layers]]
        sy,layers,defs=self.cache[k];i=(x%16)*256+(z%16)*16+y%16
        return k,i,sy,layers,defs
    def name(self,x,y,z):
        c=self.cell(x,y,z)
        if c is None:return 'unloaded'
        _,i,_,layers,defs=c;names=[ds[int(ids[i])]['name'][1]for (ids,pal),ds in zip(layers,defs)]
        # Waterlogging does not remove the primary block's collision. Treat
        # coral fans, stairs and other occupied cells conservatively as solid.
        return next((n for n in names if n in WATER),names[0]) if names[0] in AIR|WATER else names[0]
    def free(self,x,y,z):
        n=self.name(x,y,z);return n in AIR|WATER or n.startswith('minecraft:light_block')
    def set(self,x,y,z,name):
        c=self.cell(x,y,z);assert c is not None
        k,i,sy,layers,defs=c;before=self.name(x,y,z)
        if before==name:return
        assert before in AIR|WATER|GROUND,(x,y,z,before)
        for j,((ids,pal),ds)in enumerate(zip(layers,defs)):
            n=name if j==0 else 'minecraft:air'
            block={'name':(8,n),'states':(10,{}),'version':ds[int(ids[i])].get('version',(3,18168865))};raw=t.root('',block)
            if raw not in pal:pal.append(raw);ds.append(block)
            ids[i]=pal.index(raw)
        self.edits.append({'at':[x,y,z],'before':before,'after':name})
    def foot(self,x,y,z):return self.free(x,y,z)and self.free(x,y+1,z)and(not self.free(x,y-1,z)or self.name(x,y,z)in WATER)
    def top_water(self,x,z):
        for y in range(68,54,-1):
            if self.name(x,y,z)in WATER and self.free(x,y+1,z):return y
    def land(self,x,z,lo,hi):
        for y in range(lo,hi+1):
            if self.foot(x,y,z) and self.name(x,y-1,z)in GROUND:return y
    def path(self,start,goal):
        q=collections.deque([tuple(start)]);prev={tuple(start):None};goal=tuple(goal)
        while q and len(prev)<12000:
            p=q.popleft()
            if p==goal:
                route=[]
                while p is not None:route.append(p);p=prev[p]
                return route[::-1]
            x,y,z=p
            for dx,dz in DIRS:
                for dy in [0,1,-1]:
                    n=(x+dx,y+dy,z+dz)
                    if n in prev or not 208<=n[0]<=431 or not -896<=n[2]<=-657 or not 54<=n[1]<=78:continue
                    if self.foot(*n) and (dy<=0 or self.free(x,y+2,z)):
                        prev[n]=p;q.append(n)
        return None
    def save(self,out):
        modified={struct.pack('<iiBb',x//16,z//16,47,y//16)for e in self.edits for x,y,z in [e['at']]}
        with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED)as z:
            for k,v in self.records.items():z.writestr(k.hex(),pack(*self.cache[k][:2])if k in modified else v)

def plan(terrain,offset=0):
    candidates=[]
    # All public shores, including the winding river and the outside moat.
    for x in range(210+offset,430+offset):
        for z in range(-894,-658):
            wy=terrain.top_water(x,z)
            if wy is None:continue
            for dx,dz in DIRS:
                land=terrain.land(x+dx,z+dz,wy+1,wy+5)
                if land is None:continue
                depth=land-wy;start=[x-dx*(depth+1),wy,z-dz*(depth+1)]
                if not terrain.foot(*start):continue
                if any(abs(x-a[0])+abs(z-a[2])<15 for a in candidates):continue
                candidates.append([x,wy,z,dx,dz,land,start])
    routes=[]
    for x,wy,z,dx,dz,land,start in candidates:
        goal=[x+dx,land,z+dz];depth=land-wy
        # Support rises a block at a time, two blocks wide. Do not cut banks,
        # lamp posts, chests or walls: only replace water/air in the river.
        edits=[];valid=True
        for step in range(depth+1):
            xx=x-dx*(depth-step);zz=z-dz*(depth-step);top=wy-1+step
            for side in [0,1]:
                sx,sz=xx-dz*side,zz+dx*side
                for y in range(wy-2,top+1):
                    n=terrain.name(sx,y,sz)
                    if n not in AIR|WATER|GROUND:valid=False
                    if n in AIR|WATER:edits.append([sx,y,sz])
                if not terrain.free(sx,top+1,sz)or not terrain.free(sx,top+2,sz):valid=False
        if not valid:continue
        before=len(terrain.edits)
        for xx,yy,zz in edits:terrain.set(xx,yy,zz,'minecraft:mossy_cobblestone'if offset else'minecraft:cobbled_deepslate')
        route=terrain.path(start,goal) if not offset else None
        # Normal copy uses the same bounded path algorithm in local coordinates.
        if offset:
            proxy=type('LocalTerrain',(),{})();proxy.foot=lambda x,y,z:terrain.foot(x+offset,y,z);proxy.free=lambda x,y,z:terrain.free(x+offset,y,z)
            route=Terrain.path(proxy,[start[0]-offset,start[1],start[2]],[goal[0]-offset,goal[1],goal[2]])
            if route:route=[(a+offset,b,c)for a,b,c in route]
        assert route,('Unreachable new ramp',start,goal)
        routes.append({'waterStart':start,'dryEnd':goal,'path':route,'addedBlocks':len(terrain.edits)-before})
    return routes

def main():
    out=R/'.local/past-two-acts';out.mkdir(exist_ok=True)
    terrain=Terrain(R/'.local/past-playable-terrain-v2/terrain.zip')
    routes=plan(terrain)+plan(terrain,1024)
    assert routes and any(285<=r['waterStart'][0]<=325 and -825<=r['waterStart'][2]<=-765 for r in routes),'No central river exit'
    # Low, invisible fill and rim lights belong only to the actor's ruined set.
    # His body must remain legible under the opaque ceiling in classic graphics.
    lights=[]
    for x,y,z,level in [(359,64,-769,11),(363,64,-769,11),(360,69,-767,12),(364,68,-768,10)]:
        if terrain.name(x,y,z)=='minecraft:air':terrain.set(x,y,z,'minecraft:light_block_'+str(level));lights.append([x,y,z,level])
    terrain.save(out/'terrain.zip')
    report={'routes':routes,'edits':terrain.edits,'verifiedRoutes':len(routes),'actorLights':lights,'physicalExits':True,'sourceWorldModified':False,'inventoriesModified':False}
    (out/'river-exits.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps({'routes':len(routes),'blocks':len(terrain.edits),'centralRiver':[r['waterStart']for r in routes if 285<=r['waterStart'][0]<=325 and -825<=r['waterStart'][2]<=-765]}))
if __name__=='__main__':main()
