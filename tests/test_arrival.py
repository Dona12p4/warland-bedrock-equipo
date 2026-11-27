import json
from pathlib import Path
import shutil
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
RP = ROOT / 'packs/resource_packs/WARLAND_Lobby_RP'

class ArrivalTests(unittest.TestCase):
    @unittest.skipUnless(shutil.which('node'), 'Node is needed for the JavaScript policy checks')
    def test_spawn_policy(self):
        subprocess.run(['node', 'tests/arrival-policy.test.mjs'], cwd=ROOT, check=True, capture_output=True)

    def test_particle_assets_and_budget(self):
        effects = list((RP / 'particles').glob('arrival_*.json'))
        self.assertEqual(len(effects), 6)
        total = 0
        for file in effects:
            effect = json.loads(file.read_text(encoding='utf-8'))['particle_effect']
            self.assertEqual(effect['description']['identifier'], 'warland:' + file.stem)
            texture = effect['description']['basic_render_parameters']['texture']
            self.assertTrue((RP / (texture + '.png')).is_file(), texture)
            c = effect['components']
            total += c['minecraft:emitter_rate_instant']['num_particles']
            self.assertLessEqual(c['minecraft:particle_lifetime_expression']['max_lifetime'], 5.5)
            self.assertIn('minecraft:particle_motion_parametric', c)
            self.assertNotIn('minecraft:emitter_rate_steady', c)
        self.assertLessEqual(total, 100, 'Keep mobile fill rate and event load bounded')

if __name__ == '__main__':
    unittest.main()
