import {readFileSync,writeFileSync,cpSync,mkdirSync,existsSync,unlinkSync} from 'node:fs';
import {resolve,join} from 'node:path';import {spawn,execFileSync} from 'node:child_process';
const R=resolve(import.meta.dirname,'..'),server=join(R,'.local/server'),world=join(server,'worlds/WARLAND_LAB');
const O=join(R,'.local/arrival-review');mkdirSync(O,{recursive:true});
// Other chats can have independent BDS labs. Guard THIS server and its ports;
// never stop another test or copy any world it owns.
const running=JSON.parse(execFileSync('powershell',['-NoProfile','-Command',"@(Get-CimInstance Win32_Process -Filter \"Name = 'bedrock_server.exe'\" | Select-Object ExecutablePath) | ConvertTo-Json -Compress"],{encoding:'utf8'})||'[]');
if([].concat(running).some(p=>p?.ExecutablePath?.toLowerCase()===join(server,'bedrock_server.exe').toLowerCase())||existsSync(join(R,'.local/mutation.lock')))throw Error('This lab is still running or being prepared');
execFileSync('powershell',['-NoProfile','-Command',"if(Get-NetTCPConnection -LocalPort 19152 -State Listen -ErrorAction SilentlyContinue){exit 1}"],{stdio:'pipe'});
execFileSync('python',['-c',"import sys;sys.path.insert(0,'tools');import team;assert team.read(team.ROOT/'.local/lab.json')['managed']=='warland-team-v1';team.archive_tree(team.ROOT/'.local/server/worlds/WARLAND_LAB',team.ROOT/'.local/arrival-review/before-native.zip')"],{cwd:R});
const bp=join(world,'behavior_packs/WARLAND_Lobby_BP'),manifest=join(bp,'manifest.json'),probe=join(bp,'scripts/arrival-native-probe.js');
if(existsSync(probe))throw Error('A previous probe needs recovery first');
const original=readFileSync(manifest),config=join(server,'config/default/permissions.json'),originalConfig=readFileSync(config);
writeFileSync(join(O,'manifest-before.json'),original);writeFileSync(join(O,'permissions-before.json'),originalConfig);
const m=JSON.parse(original);m.modules.find(x=>x.type==='script').entry='scripts/arrival-native-probe.js';m.dependencies.push({module_name:'@minecraft/server-gametest',version:'1.0.0-beta'});
writeFileSync(manifest,JSON.stringify(m));cpSync(join(R,'tools/arrival-native-probe.js'),probe);
const permissions=JSON.parse(originalConfig);permissions.allowed_modules=[...new Set([...(permissions.allowed_modules??[]),'@minecraft/server','@minecraft/server-ui','@minecraft/server-gametest'])];writeFileSync(config,JSON.stringify(permissions));
let output='',pending='',result,stopping=false;const child=spawn(join(server,'bedrock_server.exe'),[],{cwd:server,windowsHide:true,stdio:['pipe','pipe','pipe']});
const stop=()=>{if(!stopping){stopping=true;child.stdin.write('stop\n');}};
const timer=setTimeout(()=>{result??={passed:false,error:'Native test timeout'};stop();},180000);
const consume=b=>{
 const text=String(b);output+=text;pending+=text;
 const lines=pending.split(/\r?\n/);pending=lines.pop();
 for(const line of lines){
  const hit=line.match(/\[ARRIVAL_NATIVE_RESULT\] (\{.*\})/);
  if(hit&&!result){
   try{result=JSON.parse(hit[1]);}catch(e){result={passed:false,error:'Invalid native report: '+String(e)};}
   stop();
  }
 }
};
child.stdout.on('data',consume);child.stderr.on('data',consume);
child.on('close',code=>{
 clearTimeout(timer);writeFileSync(manifest,original);writeFileSync(config,originalConfig);unlinkSync(probe);
 const errors=output.split(/\r?\n/).filter(x=>/\[ERROR\]|\[.*?error\]|"action":"(?:particle_error|start_error|sequence_error|request_error|spawn_error|recovery_deferred)"/i.test(x));
 const report={passed:!!result?.passed&&code===0&&output.includes('Quit correctly')&&!errors.length,result,errors,quitCorrectly:output.includes('Quit correctly'),exitCode:code,serverVersion:output.match(/Version: ([\d.]+)/)?.[1],productionApi:'2.10.0',probeOnlyGameTest:true,probeRemoved:true};
 writeFileSync(join(O,'native.json'),JSON.stringify(report,null,2));writeFileSync(join(O,'native.log'),output);
 console.log(JSON.stringify({passed:report.passed,checks:result?.checks?.length,failed:result?.checks?.filter(c=>!c.passed),error:result?.error,errors,quitCorrectly:report.quitCorrectly,report:join(O,'native.json')}));process.exitCode=report.passed?0:1;
});
