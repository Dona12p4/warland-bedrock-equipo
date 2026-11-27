import json, re, subprocess, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
RP=ROOT/'packs/resource_packs/WARLAND_BiomesParticles_RP'

class BiomesParticlesTests(unittest.TestCase):
    def test_every_effect_has_bounded_lifetime_and_referenced_artwork(self):
        effects=list((RP/'particles').rglob('*.json'))
        self.assertEqual(len(effects),85)
        for path in effects:
            d=json.loads(path.read_text(encoding='utf-8'))['particle_effect'];c=d['components']
            self.assertTrue((RP/(d['description']['basic_render_parameters']['texture']+'.png')).is_file(),path)
            self.assertIn('minecraft:emitter_lifetime_once',c)
            self.assertNotIn('minecraft:emitter_lifetime_expression',c)
            self.assertNotIn('events',d)
            self.assertNotIn('minecraft:particle_lifetime_events',c)
            self.assertEqual(sum(k in c for k in ['minecraft:emitter_rate_steady','minecraft:emitter_rate_instant']),1)
            rate=c.get('minecraft:emitter_rate_steady')
            if rate:self.assertLessEqual(rate['max_particles'],24)
            life=c['minecraft:particle_lifetime_expression']['max_lifetime']
            if isinstance(life,(int,float)):self.assertLessEqual(life,8)
            else:self.assertTrue(life.startswith('math.clamp(') and life.endswith(', 0.1, 8)'),path)

    def test_runtime_budget_roofs_water_biomes_and_multiplayer(self):
        out=subprocess.run(['node',str(ROOT/'tests/biomes_particles.mjs')],capture_output=True,text=True,encoding='utf-8')
        self.assertEqual(out.returncode,0,out.stdout+out.stderr)
        self.assertTrue(json.loads(out.stdout)['passed'])

if __name__=='__main__':unittest.main()
