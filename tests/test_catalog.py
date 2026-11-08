import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'tools'))
import catalog
from build_site import build_site


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value), encoding='utf-8')


class CatalogTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.actual = catalog.build(ROOT)

    def test_every_pack_file_has_exact_hash(self):
        expected = {catalog.rel(p, ROOT): catalog.digest(p) for p in (ROOT/'packs').rglob('*') if p.is_file()}
        self.assertEqual({f['path']: f['sha256'] for f in self.actual['files']}, expected)
        self.assertEqual(self.actual['coverage']['missing'], [])

    def test_main_models_and_sounds_resolve(self):
        for entry in self.actual['entries']:
            if entry['category'] == 'mobs' and not entry['auxiliary']:
                self.assertIn(entry['id'], self.actual['models'], entry['id'])
            if entry['category'] == 'sounds':
                self.assertTrue(entry['audio'], entry['id'])
                for source in entry['audio']:
                    self.assertTrue((ROOT/source).is_file())
        for image in self.actual['images'].values():
            self.assertTrue(image.startswith('data:image/') or (ROOT/'catalogo'/image).is_file(), image[:140])

    def test_system_descriptions_link_to_existing_sources(self):
        for entry in self.actual['entries']:
            if entry['category'] == 'systems':
                self.assertTrue(entry['sources'], entry['name'])
                for path in entry['sources']: self.assertTrue((ROOT/path).is_file())

    def test_generation_is_deterministic_and_does_not_modify_packs(self):
        first = catalog.generate(ROOT)
        data = (ROOT/'catalogo/data.js').read_bytes()
        second = catalog.generate(ROOT)
        self.assertEqual(first, second)
        self.assertEqual(data, (ROOT/'catalogo/data.js').read_bytes())
        self.assertLess(len(data), 5_000_000)
        self.assertEqual(self.actual['fingerprint'], catalog.build(ROOT)['fingerprint'])
        generated = json.loads(data.decode().split('=', 1)[1].rstrip(';\n'))
        for model in generated['models'].values():
            self.assertTrue((ROOT/'catalogo'/model['asset']).is_file())
            self.assertNotIn('geometry', model)

    def test_new_content_and_unknown_formats_appear_without_manual_lists(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            write(root/'catalogo/editorial.json', {'title':'Prueba','subtitle':'Prueba','systems':[], 'habitats':{}})
            write(root/'config/toolchain.json', {})
            write(root/'world-release.json', {'tag':'one'})
            write(root/'baseline.json', {'capturedUtc':'2026-11-08T00:00:00Z'})
            write(root/'packs/resource_packs/RP/textures/item_texture.json', {})
            write(root/'packs/behavior_packs/BP/entities/new.json', {'minecraft:entity':{'description':{'identifier':'warland:new','is_spawnable':True},'components':{}}})
            original = catalog.build(root)
            p = root/'packs/behavior_packs/BP/unknown.resource'
            p.write_bytes(b'new format')
            write(root/'packs/behavior_packs/BP/blocks/new.json', {'minecraft:block':{'description':{'identifier':'warland:new_block'},'components':{}}})
            added = catalog.build(root)
            self.assertNotEqual(original['fingerprint'], added['fingerprint'])
            self.assertEqual(added['coverage']['indexed'], original['coverage']['indexed']+2)
            self.assertIn('warland:new_block', [e['id'] for e in added['entries']])
            self.assertIn(catalog.rel(p, root), [f['path'] for f in added['files']])
            write(root/'world-release.json', {'tag':'two'})
            changed = catalog.build(root)
            self.assertNotEqual(added['fingerprint'], changed['fingerprint'])
            self.assertEqual(changed['world']['tag'], 'two')

    def test_site_contains_only_current_assets(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for folder in ('packs','catalogo','config','docs'):
                shutil.copytree(ROOT/folder, root/folder)
            for name in ('world-release.json','baseline.json'): shutil.copy2(ROOT/name, root/name)
            (root/'.local/site').mkdir(parents=True)
            (root/'.local/site/stale.txt').write_text('obsolete')
            (root/'.local/private.txt').write_text('local only')
            (root/'catalogo/models/stale.js').write_text('obsolete model')
            report = build_site(root)
            site = root/'.local/site'
            self.assertEqual(report['coverage'], self.actual['coverage'])
            self.assertFalse((site/'stale.txt').exists())
            self.assertFalse((site/'catalogo/models/stale.js').exists())
            self.assertEqual({p.name for p in site.iterdir()}, {'packs','catalogo','docs','index.html','.nojekyll'})
            self.assertEqual({catalog.rel(p,site) for p in (site/'packs').rglob('*') if p.is_file()}, {f['path'] for f in self.actual['files']})


if __name__ == '__main__': unittest.main()
