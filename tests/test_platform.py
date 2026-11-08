import importlib.util
from pathlib import Path
import os
import tempfile
import unittest
from unittest.mock import patch
import zipfile

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('platform_team',ROOT/'tools/team.py')
t=importlib.util.module_from_spec(spec);spec.loader.exec_module(t)

class PlatformTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
        t.write(self.root/'config/toolchain.json',t.cfg(ROOT))
    def tearDown(self):self.temp.cleanup()
    def test_each_platform_selects_its_verified_binary(self):
        for host,binary,fragment in [('linux','bedrock_server','bin-linux'),('windows','bedrock_server.exe','bin-win')]:
            with patch.object(t,'server_platform',return_value=host):dist=t.server_distribution(self.root)
            self.assertEqual(dist['executable'],binary);self.assertIn(fragment,dist['url']);self.assertEqual(len(dist['sha256']),64)
        self.assertEqual(t.cfg(self.root)['serverVersion'],'1.26.60.6')
    def test_linux_launch_sets_libraries_without_changing_global_environment(self):
        server=self.root/'.local/server';server.mkdir(parents=True);(server/'bedrock_server').write_bytes(b'ELF test')
        original=dict(os.environ)
        with patch.object(t,'server_platform',return_value='linux'):
            command,cwd,env=t.server_launch(self.root)
        self.assertEqual(Path(command[0]).name,'bedrock_server');self.assertEqual(cwd,server)
        self.assertTrue(env['LD_LIBRARY_PATH'].startswith(str(server.resolve())))
        self.assertEqual(dict(os.environ),original)
    def test_windows_does_not_gain_linux_library_configuration(self):
        server=self.root/'.local/server';server.mkdir(parents=True);(server/'bedrock_server.exe').write_bytes(b'MZ test')
        with patch.object(t,'server_platform',return_value='windows'):
            command,_,env=t.server_launch(self.root)
        self.assertEqual(Path(command[0]).name,'bedrock_server.exe');self.assertEqual(env,dict(os.environ))
    def test_archive_hash_checked_before_extraction(self):
        archive=self.root/'wrong.zip'
        with zipfile.ZipFile(archive,'w') as z:z.writestr('bedrock_server','test')
        with patch.object(t,'server_platform',return_value='linux'),patch.object(t,'closed'):
            with self.assertRaisesRegex(RuntimeError,'SHA256'):t.setup_server(archive,self.root)
        self.assertFalse((self.root/'.local/server/bedrock_server').exists())
    def test_other_operating_system_lab_is_never_overwritten(self):
        binary=self.root/'.local/server/bedrock_server.exe';binary.parent.mkdir(parents=True);binary.write_bytes(b'keep')
        with patch.object(t,'server_platform',return_value='linux'):
            with self.assertRaisesRegex(RuntimeError,'otro sistema'):t.setup_server(root=self.root)
        self.assertEqual(binary.read_bytes(),b'keep')
    def test_linux_processes_prevent_copying_a_live_world(self):
        with patch.object(t.sys,'platform','linux'),patch.object(t,'run',return_value='python3\nbedrock_server\n'):
            with self.assertRaisesRegex(RuntimeError,'Guardar/cerrar'):t.closed(client=True)
    def test_verified_linux_archive_sets_executable_and_reuses_marker(self):
        archive=self.root/'linux.zip'
        with zipfile.ZipFile(archive,'w') as z:z.writestr('bedrock_server',b'ELF test')
        conf=t.cfg(self.root);conf['serverPlatforms']['linux']['sha256']=t.sha(archive);t.write(self.root/'config/toolchain.json',conf)
        with patch.object(t,'server_platform',return_value='linux'),patch.object(t,'closed'):
            t.setup_server(archive,self.root)
            t.setup_server(root=self.root)
        self.assertEqual(t.read(self.root/'.local/server-version.json')['platform'],'linux')
        if os.name!='nt':self.assertTrue((self.root/'.local/server/bedrock_server').stat().st_mode&0o111)
    def test_hooks_use_python3_and_are_executable(self):
        with patch.object(t,'git'):t.install_hooks(self.root)
        p=self.root/'.local/hooks/pre-push';s=p.read_text()
        self.assertIn('command -v python3',s);self.assertNotIn('\r',s)
        if os.name!='nt':self.assertTrue(p.stat().st_mode&0o111)
    def test_arm_is_not_silently_treated_as_x86(self):
        with patch.object(t.platform,'machine',return_value='aarch64'):
            with self.assertRaisesRegex(RuntimeError,'ARM'):t.server_platform()

if __name__=='__main__':unittest.main()
