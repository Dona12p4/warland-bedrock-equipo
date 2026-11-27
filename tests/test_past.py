from pathlib import Path
import json,math,subprocess,sys,unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import past_terrain as terrain

class PastTests(unittest.TestCase):
    def test_runtime_contracts(self):
        subprocess.run(['node',str(ROOT/'tests/past_runtime.mjs')],check=True,capture_output=True,text=True)

    def test_lobby_return_contracts(self):
        subprocess.run(['node',str(ROOT/'tests/past_lobby_return.mjs')],check=True,capture_output=True,text=True)

    def test_admin_menu_navigation_and_permissions(self):
        subprocess.run(['node',str(ROOT/'tests/past_admin_menu.mjs')],check=True,capture_output=True,text=True)

    def test_all_concatenated_containers_stripped_and_shifted(self):
        records=[]
        for x in [201,230]:
            records.append(terrain.root('',{'id':(8,'Chest'),'x':(3,x),'y':(3,64),'z':(3,-780),'Items':(9,(10,[{'Name':(8,'minecraft:diamond'),'Count':(1,64)}])),'LootTable':(8,'secret'),'CustomName':(8,'Original chest')}))
        r=terrain.NBT(terrain.block_entities(b''.join(records),1024))
        for x in [1225,1254]:
            _,data=r.root();self.assertEqual(data['x'][1],x);self.assertNotIn('Items',data);self.assertNotIn('LootTable',data);self.assertEqual(data['CustomName'][1],'Original chest')
        self.assertEqual(r.i,len(r.data))

    def test_portal_palette_sanitized_without_modifying_safe_entries(self):
        p={'name':(8,'minecraft:portal'),'states':(10,{}),'version':(3,18168865)}
        raw=bytes([9,1,4,0])+terrain.root('',p)
        changed,n=terrain.sanitize_subchunk(raw);self.assertEqual(n,1)
        r=terrain.NBT(changed[4:]);self.assertEqual(r.root()[1]['name'][1],'minecraft:obsidian')
        p['name']=(8,'minecraft:stone');raw=bytes([9,1,4,0])+terrain.root('',p)
        self.assertEqual(terrain.sanitize_subchunk(raw),(raw,0))

    def test_atmosphere_budget_and_world_collision(self):
        rp=ROOT/'packs/resource_packs/WARLAND_UmbralLoading_RP'
        counts=[]
        for name in ['past_ash','past_ash_near']:
            c=json.loads((rp/f'particles/{name}.json').read_text())['particle_effect']['components']
            self.assertTrue(c['minecraft:particle_motion_collision']['expire_on_contact'])
            self.assertNotIn('minecraft:emitter_local_space',c)
            counts.append(c['minecraft:emitter_rate_instant']['num_particles']*math.ceil(c['minecraft:particle_lifetime_expression']['max_lifetime']*4))
            self.assertIn('-6.5',str(c['minecraft:particle_initial_speed'][1]))
            billboard=c['minecraft:particle_appearance_billboard']
            self.assertEqual(billboard['facing_camera_mode'],'lookat_direction')
            self.assertEqual(billboard['direction']['mode'],'derive_from_velocity')
        drift=json.loads((rp/'particles/past_drift.json').read_text())['particle_effect']['components']
        drift_alive=drift['minecraft:emitter_rate_instant']['num_particles']*math.ceil(drift['minecraft:particle_lifetime_expression']['max_lifetime']/3)*4
        guide_alive=0
        for name in ['beam','halo','core','sparks']:
            c=json.loads((rp/f'particles/past_guide_{name}.json').read_text())['particle_effect']['components']
            self.assertNotIn('minecraft:emitter_local_space',c)
            self.assertNotIn('minecraft:particle_appearance_lighting',c)
            guide_alive+=c['minecraft:emitter_rate_instant']['num_particles']*math.ceil(c['minecraft:particle_lifetime_expression']['max_lifetime'])*2
        self.assertLessEqual(sum(counts)*4+drift_alive+guide_alive,2850)
        sound=json.loads((rp/'sounds/sound_definitions.json').read_text())['sound_definitions']['warland.past.wind']['sounds'][0]
        self.assertTrue(sound['stream']);self.assertFalse(sound['is3D'])
        self.assertLess((rp/(sound['name']+'.ogg')).stat().st_size,150000)
        self.assertFalse(list(rp.rglob('memoria_frames*')))

    def test_actor_clock_and_three_quarter_reference(self):
        rp=ROOT/'packs/resource_packs/WARLAND_UmbralLoading_RP'
        actor=json.loads((ROOT/'packs/behavior_packs/WARLAND_BP/entities/pasado_coloso.json').read_text())
        clock=actor['minecraft:entity']['description']['properties']['warland:performance_time']
        self.assertTrue(clock['client_sync']);self.assertIsInstance(clock['default'],float)
        client=json.loads((rp/'entity/pasado_coloso.entity.json').read_text())['minecraft:client_entity']['description']
        self.assertEqual(client['scripts']['animate'],['scene'])
        ctrl=json.loads((rp/'animation_controllers/pasado_coloso.json').read_text())['animation_controllers'][client['animations']['scene']]
        self.assertEqual(ctrl['states']['waiting']['animations'],['idle','orb_hidden'])
        self.assertEqual(ctrl['states']['acting']['animations'],['performance'])
        clip=json.loads((rp/'animations/pasado_coloso.animation.json').read_text())['animations'][client['animations']['performance']]
        self.assertEqual(clip['anim_time_update'],"query.property('warland:performance_time')")
        # Real source poses, not merely the existence of an animation name.
        arm=clip['bones']['right_upper_arm']['rotation']
        self.assertGreater(abs(arm['8.0'][0]-arm['0.0'][0]),35)
        orb=clip['bones']['r4_orb']['scale']
        self.assertEqual(orb['0.0'],[0,0,0]);self.assertGreater(orb['8.0'][0],.5)
        self.assertEqual(orb['18.9333333'],[0,0,0])

    def test_guide_is_white_in_texture_and_tint(self):
        import struct,zlib
        rp=ROOT/'packs/resource_packs/WARLAND_UmbralLoading_RP'
        for name in ['beam','halo','core','sparks']:
            effect=json.loads((rp/f'particles/past_guide_{name}.json').read_text())['particle_effect']
            self.assertEqual(effect['components']['minecraft:particle_appearance_tinting']['color'][:3],[1,1,1])
            png=(rp/(effect['description']['basic_render_parameters']['texture']+'.png')).read_bytes()
            pos=8;data=b'';width=height=0
            while pos<len(png):
                size=struct.unpack('>I',png[pos:pos+4])[0];kind=png[pos+4:pos+8];payload=png[pos+8:pos+8+size];pos+=size+12
                if kind==b'IHDR':width,height=struct.unpack('>II',payload[:8]);self.assertEqual(payload[8:10],bytes([8,6]))
                if kind==b'IDAT':data+=payload
            rgba=zlib.decompress(data);stride=width*4+1
            for y in range(height):
                self.assertEqual(rgba[y*stride],0)
                for x in range(width):
                    r,g,b,a=rgba[y*stride+1+x*4:y*stride+5+x*4]
                    if a:self.assertEqual((r,g,b),(255,255,255))

if __name__=='__main__':unittest.main()
