"""Add maximum classic light only in air at the gate of the exported copies.

Reads/writes closed, bounded terrain artifacts. Never opens a Minecraft world.
The historical original and the elevated intact film set are not modified.
"""
from pathlib import Path
import argparse,json
from past_escape_routes import Terrain

LIGHTS=[(x,65,z)for x in [240,244,248]for z in [-785,-783,-781]]

def build(source,out):
    out.mkdir(parents=True,exist_ok=False);terrain=Terrain(source)
    # The ruined road has a two-block depression immediately inside the gate.
    # Three supports turn it into two ordinary steps; never alter the original.
    for at in [(249,61,-783),(248,61,-783),(248,62,-783)]:
        assert terrain.name(*at)=='minecraft:air'
        terrain.set(*at,'minecraft:cobbled_deepslate')
    for dx in [0,1024]:
        for x,y,z in LIGHTS:
            at=(x+dx,y,z)
            if terrain.name(*at)!='minecraft:air':raise ValueError('Gate light would replace a block '+str(at))
            terrain.set(*at,'minecraft:light_block_15')
        # Walkable doorway: the player's feet and head remain empty/passable.
        proxy=type('LocalTerrain',(),{})()
        proxy.foot=lambda x,y,z:terrain.foot(x+dx,y,z)
        proxy.free=lambda x,y,z:terrain.free(x+dx,y,z)
        start=next(([250,y,-783]for y in range(61,65)if proxy.foot(250,y,-783)),None)
        assert start and Terrain.path(proxy,start,[245,63,-783]),'Gate has no walkable approach'
    terrain.save(out/'terrain.zip')
    report={'source':str(source),'edits':terrain.edits,'gateLights':18,'sourceWorldModified':False,'maximumClassicLight':15}
    (out/'guide-terrain.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps({'gateLights':18,'terrain':str(out/'terrain.zip')}))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args();build(a.source,a.out)
