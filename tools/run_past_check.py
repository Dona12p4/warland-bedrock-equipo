"""Run only this worktree's disposable BDS; never touch a client's open world."""
from pathlib import Path
import argparse,json,subprocess,time
import team
R=team.ROOT;S=R/'.local/server';W=S/'worlds/WARLAND_LAB'
p=argparse.ArgumentParser();p.add_argument('--probe',type=Path);p.add_argument('--seconds',type=int,default=18);a=p.parse_args()
exe=str(S/'bedrock_server.exe')
processes=subprocess.check_output(['powershell','-NoProfile','-Command',"Get-CimInstance Win32_Process -Filter \"Name='bedrock_server.exe'\" | Select-Object -ExpandProperty ExecutablePath"],text=True)
assert exe.lower() not in processes.lower(),'This laboratory is already running'
bp=W/'behavior_packs/WARLAND_BP';entry=bp/'scripts/main.js';saved=entry.read_bytes()
if a.probe:
 (bp/'scripts/past-lab-probe.js').write_bytes(a.probe.read_bytes());entry.write_bytes(saved+b"\nimport './past-lab-probe.js';\n")
log=R/'.local/past-native.log'
with log.open('w',encoding='utf-8') as stream:
 child=subprocess.Popen([exe],cwd=S,stdin=subprocess.PIPE,stdout=stream,stderr=subprocess.STDOUT,text=True,creationflags=subprocess.CREATE_NO_WINDOW)
 for _ in range(a.seconds):
  time.sleep(1);s=log.read_text(encoding='utf-8',errors='replace')
  if '[PAST_TEST_DONE]' in s or '[PAST_TEST_FAIL]' in s:break
 child.communicate('stop\n',timeout=40)
entry.write_bytes(saved)
s=log.read_text(encoding='utf-8',errors='replace')
errors=[x for x in s.splitlines() if '[error]' in x.lower() or '[PAST_TEST_FAIL]' in x]
result={'started':'Server started.' in s,'quitCorrectly':'Quit correctly' in s,'errors':errors,'evidence':[x for x in s.splitlines() if '[PAST_TEST_' in x or '[WARLAND_PAST]' in x]}
result['passed']=result['started'] and result['quitCorrectly'] and not errors and (not a.probe or '[PAST_TEST_DONE]' in s)
team.write(R/'.local/past-native.json',result);print(json.dumps(result,ensure_ascii=False));raise SystemExit(0 if result['passed'] else 1)
