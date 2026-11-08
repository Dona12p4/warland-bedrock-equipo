import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import uuid
import zipfile

spec = importlib.util.spec_from_file_location('team', Path(__file__).resolve().parents[1] / 'tools/team.py')
t = importlib.util.module_from_spec(spec)
spec.loader.exec_module(t)

def cmd(*args, cwd):
    return subprocess.run(args, cwd=cwd, check=True, capture_output=True, text=True).stdout.strip()

def identity(root):
    cmd('git','config','user.name','WARLAND Test',cwd=root)
    cmd('git','config','user.email','test@example.invalid',cwd=root)

def fixture(root):
    root.mkdir(parents=True, exist_ok=True)
    t.write(root / 'config/toolchain.json', {'mainBranch':'main','serverVersion':'test',
        'stableScriptApi':'2.10.0','baseBetaException':'2.12.0-beta','port':19152,'transport':'nethernet'})
    rp, bp = str(uuid.uuid4()), str(uuid.uuid4())
    for kind, name, uid, deps in [('resource_packs','RP',rp,[]), ('behavior_packs','BP',bp,[{'uuid':rp,'version':[1,0,0]}])]:
        t.write(root/'packs'/kind/name/'manifest.json', {'format_version':2, 'header':{'uuid':uid,'name':name,'version':[1,0,0]},
            'modules':[{'uuid':str(uuid.uuid4()),'version':[1,0,0],'type':'resources' if kind=='resource_packs' else 'data'}], 'dependencies':deps})
        t.write(root/'pack-order'/('world_'+kind+'.json'),[{'pack_id':uid,'version':[1,0,0]}])
    (root/'.gitignore').write_text('.local/\n')
    return bp,rp

class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.base=Path(self.temp.name)
        self.root=self.base/'project'
        self.bp,self.rp=fixture(self.root)
    def tearDown(self): self.temp.cleanup()
    def test_pack_baseline_valid(self):
        self.assertEqual(t.check(self.root)['packs'],2)
    def test_mismatched_registry_rejected(self):
        t.write(self.root/'pack-order/world_behavior_packs.json',[{'pack_id':self.bp,'version':[2,0,0]}])
        with self.assertRaises(RuntimeError):t.check(self.root)
    def test_missing_dependency_rejected(self):
        p=self.root/'packs/behavior_packs/BP/manifest.json';m=t.read(p);m['dependencies'][0]['uuid']=str(uuid.uuid4());t.write(p,m)
        with self.assertRaises(RuntimeError):t.check(self.root)
    def test_duplicate_uuid_rejected(self):
        shutil.copytree(self.root/'packs/behavior_packs/BP',self.root/'packs/behavior_packs/BP2')
        with self.assertRaises(RuntimeError):t.check(self.root)
    def test_zip_traversal_rejected(self):
        for name in ('../escape','C:/escape','/absolute'):
            z=self.base/'bad.zip'
            with zipfile.ZipFile(z,'w') as out:
                info=zipfile.ZipInfo('entry');info.filename=name
                out.writestr(info,'bad')
            with self.assertRaises(RuntimeError):t.extract(z,self.base/'safe')
        self.assertFalse((self.base/'escape').exists())
        with self.assertRaises(RuntimeError):t.safe_child(self.base,'folder\\escape')
    def test_resource_isolation_preserves_bp_and_redirects_dependencies(self):
        dest=self.base/'isolated';mapping=t.isolated_packs(self.root,dest,'one')
        bp=t.read(dest/'behavior_packs/BP/manifest.json');rp=t.read(dest/'resource_packs/RP/manifest.json')
        self.assertEqual(bp['header']['uuid'],self.bp)
        self.assertNotEqual(rp['header']['uuid'],self.rp)
        self.assertEqual(bp['dependencies'][0]['uuid'],rp['header']['uuid'])
        self.assertEqual(bp['dependencies'][0]['version'],rp['header']['version'])
        self.assertNotIn(self.bp,mapping)
    def test_live_world_copy_blocked(self):
        with patch.object(t,'processes',return_value='minecraft.windows.exe'):
            with self.assertRaises(RuntimeError):t.closed(client=True)
        with patch.object(t,'processes',return_value='bedrock_server.exe'):
            with self.assertRaises(RuntimeError):t.closed()
    def test_archive_roundtrip(self):
        src=self.base/'world';(src/'db').mkdir(parents=True);(src/'level.dat').write_bytes(b'level');(src/'db/record').write_bytes(b'data')
        z=self.base/'world.zip';h=t.archive_tree(src,z);t.extract(z,self.base/'copied')
        self.assertEqual(h,t.hashes(self.base/'copied'))
    def make_lab(self):
        src=self.base/'map';(src/'db').mkdir(parents=True);(src/'level.dat').write_bytes(b'level');(src/'db/record').write_bytes(b'original')
        z=self.base/'map.zip';t.archive_tree(src,z)
        (self.root/'.local/server').mkdir(parents=True)
        return z
    def test_lab_update_keeps_progress_and_backups(self):
        z=self.make_lab()
        with patch.object(t,'closed'),patch.object(t,'setup_server'):
            lab=t.prepare_lab(self.root,online=False,archive=z,pointer={'tag':'test'})
            (lab/'db/record').write_bytes(b'new player progress')
            (self.root/'packs/behavior_packs/BP/new.txt').write_text('new mob')
            t.prepare_lab(self.root,online=False,archive=z,pointer={'tag':'test'})
            self.assertEqual((lab/'db/record').read_bytes(),b'new player progress')
            self.assertTrue((lab/'behavior_packs/BP/new.txt').exists())
            self.assertTrue(list((self.root/'.local/backups').glob('*.zip')))
    def test_unmanaged_destination_refused(self):
        z=self.make_lab();p=self.root/'.local/server/worlds/WARLAND_LAB';p.mkdir(parents=True);(p/'important').write_text('keep')
        with patch.object(t,'closed'),patch.object(t,'setup_server'):
            with self.assertRaises(RuntimeError):t.prepare_lab(self.root,online=False,archive=z,pointer={'tag':'test'})
        self.assertEqual((p/'important').read_text(),'keep')
    def test_failed_swap_restores_previous_world(self):
        z=self.make_lab()
        with patch.object(t,'closed'),patch.object(t,'setup_server'):
            lab=t.prepare_lab(self.root,online=False,archive=z,pointer={'tag':'test'})
            before=t.hashes(lab)
            old_marker=t.read(self.root/'.local/lab.json')
            (self.root/'packs/behavior_packs/BP/new.txt').write_text('new mob')
            with patch.object(t,'server_config',side_effect=OSError('simulated failure')):
                with self.assertRaises(OSError):t.prepare_lab(self.root,online=False,archive=z,pointer={'tag':'test'})
            self.assertEqual(before,t.hashes(lab))
            self.assertEqual(old_marker,t.read(self.root/'.local/lab.json'))
    def test_new_map_release_backups_previous_lab(self):
        z=self.make_lab()
        with patch.object(t,'closed'),patch.object(t,'setup_server'):
            lab=t.prepare_lab(self.root,online=False,archive=z,pointer={'tag':'one'})
            (lab/'db/record').write_bytes(b'local work')
            with zipfile.ZipFile(z,'w') as f:
                f.writestr('level.dat',b'level');f.writestr('db/record',b'new official map')
            t.prepare_lab(self.root,online=False,archive=z,pointer={'tag':'two'})
            self.assertEqual((lab/'db/record').read_bytes(),b'new official map')
            with zipfile.ZipFile(next((self.root/'.local/backups').glob('*.zip'))) as f:
                self.assertEqual(f.read('db/record'),b'local work')

class MergeTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.base=Path(self.temp.name)
        self.remote=self.base/'remote.git';self.remote.mkdir();cmd('git','init','--bare','--initial-branch=main',cwd=self.remote)
        self.a=self.base/'owner';cmd('git','clone',str(self.remote),str(self.a),cwd=self.base);identity(self.a)
        t.write(self.a/'config/toolchain.json',{'mainBranch':'main'})
        (self.a/'common.txt').write_text('original\n');cmd('git','add','.',cwd=self.a);cmd('git','commit','-m','initial',cwd=self.a);cmd('git','push','origin','main',cwd=self.a)
        self.b=self.base/'colleague';cmd('git','clone',str(self.remote),str(self.b),cwd=self.base);identity(self.b);cmd('git','switch','-c','codex/sun',cwd=self.b)
    def tearDown(self):self.temp.cleanup()
    def commit(self,root,name,content):
        (root/name).write_text(content);cmd('git','add','.',cwd=root);cmd('git','commit','-m',name,cwd=root)
    def test_three_new_mobs_and_sun_survive_merge(self):
        self.commit(self.b,'sun.txt','frozen sun')
        for i in range(3):self.commit(self.a,f'mob{i}.txt',f'mob{i}')
        cmd('git','push','origin','main',cwd=self.a)
        with self.assertRaises(RuntimeError):t.fresh(self.b)
        t.sync(self.b);t.fresh(self.b)
        self.assertEqual((self.b/'sun.txt').read_text(),'frozen sun')
        self.assertTrue(all((self.b/f'mob{i}.txt').exists() for i in range(3)))
    def test_dirty_sync_refuses_without_losing_work(self):
        (self.b/'common.txt').write_text('unsaved')
        with self.assertRaises(RuntimeError):t.sync(self.b)
        self.assertEqual((self.b/'common.txt').read_text(),'unsaved')
    def test_conflict_not_silently_overwritten(self):
        self.commit(self.a,'common.txt','owner\n');cmd('git','push','origin','main',cwd=self.a)
        self.commit(self.b,'common.txt','colleague\n')
        with self.assertRaises(RuntimeError):t.sync(self.b)
        content=(self.b/'common.txt').read_text()
        self.assertIn('owner',content);self.assertIn('colleague',content)
        self.assertIn('UU',cmd('git','status','--porcelain',cwd=self.b))
    def test_offline_is_not_claimed_current(self):
        cmd('git','remote','set-url','origin',str(self.base/'missing.git'),cwd=self.b)
        with self.assertRaises(RuntimeError):t.fresh(self.b)

if __name__=='__main__':unittest.main()
