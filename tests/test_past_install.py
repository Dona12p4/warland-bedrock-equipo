from pathlib import Path
import contextlib,io,json,sys,tempfile,unittest
from types import SimpleNamespace
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tools'))
import install_past_official as installer
from audit_pack_parity import hashes

class OfficialPastInstallTests(unittest.TestCase):
    def fixture(self,r):
        write=lambda p,v:(p.parent.mkdir(parents=True,exist_ok=True),p.write_text(json.dumps(v)))
        for folder,version in [('previous',[0,7,3]),('candidate',[0,7,4])]:
            stage=r/folder
            for name,uid in [('WARLAND_BP','00000000-0000-0000-0000-000000000001'),('WARLAND_RP','00000000-0000-0000-0000-000000000002')]:
                write(stage/name/'manifest.json',{'header':{'name':name,'uuid':uid,'version':version}})
                (stage/name/'content.txt').write_text(folder)
            write(stage/'consolidation.json',{'version':version,'modules':[],'outputHashes':{name+'/'+k:v for name in ['WARLAND_BP','WARLAND_RP']for k,v in hashes(stage/name).items()}})
        import shutil
        for world in [r/'official',r/'server/worlds/WARLAND_LAB']:
            (world/'db').mkdir(parents=True);(world/'db/player').write_text('inventory-and-coins');(world/'level.dat').write_bytes(b'unchanged-world-settings')
            for kind,name in [('behavior','WARLAND_BP'),('resource','WARLAND_RP')]:
                shutil.copytree(r/'previous'/name,world/f'{kind}_packs'/name)
                h=json.loads((r/'previous'/name/'manifest.json').read_text())['header'];write(world/f'world_{kind}_packs.json',[{'pack_id':h['uuid'],'version':h['version']}])
        for kind,name in [('behavior','WARLAND_BP'),('resource','WARLAND_RP')]:shutil.copytree(r/'previous'/name,r/f'users/Shared/games/com.mojang/{kind}_packs'/name)
        return SimpleNamespace(candidate=r/'candidate',previous=r/'previous',users=r/'users',server=r/'server',server_world='WARLAND_LAB',official=r/'official',backup=r/'backup',terrain=r/'terrain.zip',project=r,report=r/'result.json')
    def add_terrain(self,stage,*args):
        self.assertEqual((stage/'db/player').read_text(),'inventory-and-coins')
        (stage/'db/new-dimension').write_text('only-the-reviewed-terrain')
        return {'existingRecordsByteIdentical':True}
    def test_own_data_preserved_and_pair_updated(self):
        with tempfile.TemporaryDirectory()as tmp:
            r=Path(tmp);a=self.fixture(r)
            with patch.object(installer,'guard',return_value=[]),patch.object(installer,'processes',return_value=[]),patch.object(installer,'add_terrain',side_effect=self.add_terrain),contextlib.redirect_stdout(io.StringIO()):installer.install(a)
            self.assertTrue(json.loads(a.report.read_text())['parity'])
            for w in [a.official,a.server/'worlds/WARLAND_LAB']:
                self.assertEqual((w/'db/player').read_text(),'inventory-and-coins');self.assertTrue((w/'db/new-dimension').is_file());self.assertEqual((w/'level.dat').read_bytes(),b'unchanged-world-settings')
    def test_failure_between_folder_swaps_rolls_back(self):
        with tempfile.TemporaryDirectory()as tmp:
            r=Path(tmp);a=self.fixture(r);before={k:hashes(v)for k,v in [('official',a.official),('server',a.server/'worlds/WARLAND_LAB')]};move=installer.checked_move;count=0
            def fail_once(*args):
                nonlocal count
                count+=1
                if count==4:raise OSError('simulated interrupted folder install')
                return move(*args)
            with patch.object(installer,'guard',return_value=[]),patch.object(installer,'processes',return_value=[]),patch.object(installer,'add_terrain',side_effect=self.add_terrain),patch.object(installer,'checked_move',side_effect=fail_once):
                with self.assertRaises(OSError):installer.install(a)
            self.assertEqual(before['official'],hashes(a.official));self.assertEqual(before['server'],hashes(a.server/'worlds/WARLAND_LAB'));self.assertTrue(json.loads((a.backup/'transaction.json').read_text())['rolledBack'])
    def test_open_client_prevents_all_writes(self):
        with tempfile.TemporaryDirectory()as tmp:
            r=Path(tmp);a=self.fixture(r);before=hashes(a.official)
            with patch.object(installer,'guard',side_effect=RuntimeError('Minecraft open')):
                with self.assertRaises(RuntimeError):installer.install(a)
            self.assertFalse(a.backup.exists());self.assertEqual(before,hashes(a.official))

if __name__=='__main__':unittest.main()
