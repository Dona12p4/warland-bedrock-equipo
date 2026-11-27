import sys,unittest
from pathlib import Path
from unittest.mock import patch
from types import SimpleNamespace
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
import keep_server_online as k

class OnlinePolicyTests(unittest.TestCase):
    def test_running_server_is_never_relaunched(self):
        for held in [False,True]:self.assertFalse(k.launch_needed([123],held,999,0))
    def test_hold_and_retry_delay_prevent_launch(self):
        self.assertFalse(k.launch_needed([],True,999,0))
        self.assertFalse(k.launch_needed([],False,9,10))
        self.assertTrue(k.launch_needed([],False,10,10))
    def test_process_identity_uses_full_executable_path(self):
        rows='[{"ProcessId":7,"ExecutablePath":"C:/Other/bedrock_server.exe"},{"ProcessId":8,"ExecutablePath":"C:/Project/bedrock_server.exe"}]'
        with patch.object(k.subprocess,'run',return_value=SimpleNamespace(stdout=rows)),patch.object(k.subprocess,'CREATE_NO_WINDOW',0,create=True):
            self.assertEqual(k.server_pids(Path('C:/Project/bedrock_server.exe')),[8])
    def test_inventory_failure_is_not_server_absence(self):
        with patch.object(k.subprocess,'run',side_effect=RuntimeError('CIM failed')),patch.object(k.subprocess,'CREATE_NO_WINDOW',0,create=True):
            with self.assertRaisesRegex(RuntimeError,'CIM failed'):k.server_pids(Path('bedrock_server.exe'))
    def test_stop_requires_later_user_order_hold_and_matching_pid(self):
        request={'action':'stop','serverPid':8,'explicitUserRequest':True}
        self.assertFalse(k.authorized_stop(request,False,8))
        self.assertFalse(k.authorized_stop(request,True,9))
        self.assertFalse(k.authorized_stop({**request,'explicitUserRequest':False},True,8))
        self.assertTrue(k.authorized_stop(request,True,8))

if __name__=='__main__':unittest.main()
