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
        self.assertEqual(len(effects), 7)
        total = 0
        for file in effects:
            effect = json.loads(file.read_text(encoding='utf-8'))['particle_effect']
            self.assertEqual(effect['description']['identifier'], 'warland:' + file.stem)
            texture = effect['description']['basic_render_parameters']['texture']
            self.assertTrue((RP / (texture + '.png')).is_file(), texture)
            c = effect['components']
            total += c['minecraft:emitter_rate_instant']['num_particles'] * (2 if file.stem == 'arrival_lightning' else 1)
            self.assertLessEqual(c['minecraft:particle_lifetime_expression']['max_lifetime'], 5.5)
            self.assertIn('minecraft:particle_motion_parametric', c)
            self.assertNotIn('minecraft:emitter_rate_steady', c)
        self.assertLessEqual(total, 100, 'Keep mobile fill rate and event load bounded')

    def test_hidden_player_expires_and_restores_head_and_attachments(self):
        animations = json.loads((RP / 'animations/arrival_player.json').read_text())['animations']
        hidden = animations['animation.warland.arrival.hidden']
        restore = animations['animation.warland.arrival.restore']
        self.assertFalse(hidden['loop'], 'A script failure must not leave an endless invisible player')
        policy = subprocess.run(['node', '--input-type=module', '-e', "import {ARRIVAL} from './packs/behavior_packs/WARLAND_Lobby_BP/scripts/arrival-policy.js';console.log(ARRIVAL.reveal/20)"], cwd=ROOT, capture_output=True, text=True, check=True)
        self.assertEqual(hidden['animation_length'], float(policy.stdout))
        for bone in ('root', 'head', 'body', 'cape', 'leftItem', 'rightItem'):
            self.assertEqual(hidden['bones'][bone]['scale'], 0, bone)
            self.assertEqual(restore['bones'][bone]['scale'], 1, bone)

if __name__ == '__main__':
    unittest.main()
