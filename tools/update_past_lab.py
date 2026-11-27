"""Update only this worktree's stopped lab, with a complete backup."""
from pathlib import Path
import datetime,json,shutil,subprocess,tempfile
import team
root=team.ROOT;world=root/'.local/server/worlds/WARLAND_LAB'
expected=root.resolve()/'.local/server/worlds/WARLAND_LAB'
assert world.resolve()==expected and 'el-pasado-worktree' in str(expected)
processes=subprocess.check_output(['powershell','-NoProfile','-Command',"Get-CimInstance Win32_Process -Filter \"Name='bedrock_server.exe'\" | Select-Object -ExpandProperty ExecutablePath"],text=True)
assert str(root/'.local/server/bedrock_server.exe').lower() not in processes.lower(),'Stop this lab first'
stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S');backup=root/'.local/backups'/('past-before-atmosphere-'+stamp)
shutil.copytree(world,backup)
assert team.hashes(world)==team.hashes(backup)
stage=Path(tempfile.mkdtemp(prefix='past-packs-',dir=root/'.local'))
namespace=team.read(root/'.local/identity.json')['namespace']
team.isolated_packs(root,stage,namespace)
for kind in team.KINDS:
 shutil.copytree(stage/kind,world/kind,dirs_exist_ok=True)
 shutil.copy2(stage/('world_'+kind+'.json'),world/('world_'+kind+'.json'))
assert all(team.sha(world/rel)==digest for rel,digest in team.hashes(stage).items())
team.write(root/'.local/past-pack-update.json',{'backup':str(backup),'stage':str(stage),'verified':True})
print('Updated own lab with verified backup:',backup)
