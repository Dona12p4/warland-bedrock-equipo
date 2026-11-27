from pathlib import Path
import hashlib, json, struct, unittest

ROOT = Path(__file__).resolve().parents[1]
BP = ROOT / 'packs/behavior_packs/WARLAND_Impostor_BP'
RP = ROOT / 'packs/resource_packs/WARLAND_Impostor_RP'
def read(p): return json.loads(p.read_text(encoding='utf-8'))

class ImpostorResources(unittest.TestCase):
    def test_release_is_stable_and_excludes_native_probe(self):
        manifest = read(BP / 'manifest.json')
        self.assertEqual([d for d in manifest['dependencies'] if 'module_name' in d], [{'module_name': '@minecraft/server', 'version': '2.10.0'}])
        self.assertFalse((BP / 'scripts/probe.js').exists())
        self.assertNotIn("import './probe.js'", (BP / 'scripts/main.js').read_text())

    def test_name_is_visible_and_no_player_identity_or_combat(self):
        entity = read(BP / 'entities/impostor.json')['minecraft:entity']
        components = entity['components']
        self.assertTrue(components['minecraft:nameable']['always_show'])
        self.assertFalse(components['minecraft:nameable']['allow_name_tag_renaming'])
        self.assertNotIn('runtime_identifier', entity['description'])
        self.assertNotIn('player', components['minecraft:type_family']['family'])
        self.assertNotIn('minecraft:attack', components)
        self.assertNotIn('minecraft:inventory', components)
        self.assertFalse((BP / 'spawn_rules').exists())
        self.assertEqual(read(BP / 'loot_tables/entities/impostor.json'), {'pools': []})

    def test_official_textures_and_matching_arm_widths(self):
        sources = read(RP / 'asset-sources.json')
        for rel, digest in sources['files'].items():
            content = (RP / rel).read_bytes()
            self.assertEqual(hashlib.sha256(content).hexdigest(), digest)
            self.assertEqual(content[:8], b'\x89PNG\r\n\x1a\n')
            self.assertEqual(struct.unpack('>II', content[16:24]), (64, 64))
        geometries = read(RP / 'models/entity/impostor.geo.json')['minecraft:geometry']
        self.assertEqual(len(geometries), 2)
        for geo, width in zip(geometries, [4, 3]):
            bones = {b['name']: b for b in geo['bones']}
            for arm in ['leftArm', 'rightArm', 'leftSleeve', 'rightSleeve']:
                self.assertEqual(bones[arm]['cubes'][0]['size'][0], width)
            self.assertTrue(all(b.get('parent') in bones for b in bones.values() if b.get('parent')))
            height = max(c['origin'][1] + c['size'][1] for b in bones.values() for c in b.get('cubes', [])) / 16
            collision = read(BP / 'entities/impostor.json')['minecraft:entity']['components']['minecraft:collision_box']
            self.assertEqual(collision['height'], 1.8)  # Vanilla player clearance through two-block doors.
            self.assertLessEqual(height, 2)

    def test_animation_targets_and_renderer_cover_both_skins(self):
        geometries = read(RP / 'models/entity/impostor.geo.json')['minecraft:geometry']
        animations = read(RP / 'animations/impostor.animation.json')['animations']
        for geo in geometries:
            names = {b['name'] for b in geo['bones']}
            for clip in animations.values(): self.assertTrue(set(clip['bones']) <= names)
        controller = read(RP / 'render_controllers/impostor.render_controllers.json')['render_controllers']['controller.render.warland.impostor']
        self.assertEqual(len(controller['arrays']['textures']['Array.skins']), 2)
        self.assertEqual(len(controller['arrays']['geometries']['Array.bodies']), 2)

if __name__ == '__main__': unittest.main()
