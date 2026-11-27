import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
def module(name):
    spec=importlib.util.spec_from_file_location(name,ROOT/'tools'/f'{name}.py')
    result=importlib.util.module_from_spec(spec);spec.loader.exec_module(result);return result

builder=module('build_unified');audit=module('audit_pack_parity')

class UnifiedTests(unittest.TestCase):
    def test_conflicting_content_is_not_silently_overwritten(self):
        with self.assertRaises(ValueError):builder.merge({'sounds':{'hit':{'volume':1}}},{'sounds':{'hit':{'volume':2}}})
        self.assertEqual(builder.merge({'one':1},{'two':2}),{'one':1,'two':2})

    def test_parity_requires_both_destinations_and_exact_files(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);candidate=root/'candidate';users=root/'users'
            for name,uid in [('WARLAND_BP','bp'),('WARLAND_RP','rp')]:
                folder=candidate/name;folder.mkdir(parents=True)
                (folder/'manifest.json').write_text(json.dumps({'header':{'uuid':uid,'version':[1,0,0]}}))
                (folder/'content.txt').write_text('expected')
            expected={f'{name}/{rel}':v for name in ['WARLAND_BP','WARLAND_RP'] for rel,v in audit.hashes(candidate/name).items()}
            (candidate/'consolidation.json').write_text(json.dumps({'version':[1,0,0],'modules':[], 'outputHashes':expected}))
            targets=[('server',root/'server'),('mobile',root/'mobile')]
            for _,world in targets:
                world.mkdir()
                for kind,name,uid in [('behavior','WARLAND_BP','bp'),('resource','WARLAND_RP','rp')]:
                    shutil.copytree(candidate/name,world/f'{kind}_packs'/name)
                    (world/f'world_{kind}_packs.json').write_text(json.dumps([{'pack_id':uid,'version':[1,0,0]}]))
            self.assertTrue(audit.audit(candidate,users,targets)['parityVerified'])
            extra=root/'mobile/resource_packs/WARLAND_RP/probe.js';extra.write_text('probe')
            self.assertFalse(audit.audit(candidate,users,targets)['parityVerified']);extra.unlink()
            (root/'server/world_resource_packs.json').write_text('[]')
            self.assertFalse(audit.audit(candidate,users,targets)['parityVerified'])
            self.assertFalse(audit.audit(candidate,users,targets[:1])['parityVerified'])

    def test_tampered_candidate_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);(root/'WARLAND_BP').mkdir();(root/'WARLAND_RP').mkdir()
            (root/'WARLAND_BP/extra').write_text('unexpected')
            (root/'consolidation.json').write_text(json.dumps({'outputHashes':{}}))
            with self.assertRaises(ValueError):audit.audit(root,root/'users',[])

if __name__=='__main__':unittest.main()
