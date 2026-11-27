"""Check new Past assets in a separate BDS without stopping running servers.

The only world input allowed is a previously verified, closed lab backup. This
does not install into Minecraft, the official world or the live review server.
"""
from pathlib import Path
import argparse, json, queue, re, shutil, subprocess, threading, time, uuid
import team

R = team.ROOT


def run(backup, out):
    backup, out = backup.resolve(), out.resolve()
    if not backup.is_relative_to((R / '.local/backups').resolve()):
        raise ValueError('Only a closed backup in this worktree is allowed')
    if not out.is_relative_to((R / '.local').resolve()) or out.exists():
        raise ValueError('Use a new output under this worktree .local')
    template = R / '.local/server'
    version = subprocess.check_output(['powershell', '-NoProfile', '-Command',
        f"(Get-Item -LiteralPath '{template / 'bedrock_server.exe'}').VersionInfo.FileVersion"], text=True).strip()
    if version != '1.26.60.6':
        raise ValueError('Unexpected BDS version: ' + version)
    server = out / 'server'
    server.mkdir(parents=True)
    for name in ['bedrock_server.exe', 'config', 'data', 'definitions', 'resource_packs', 'behavior_packs', 'profanity_filter.wlist']:
        src = template / name
        if src.is_dir():
            shutil.copytree(src, server / name)
        elif src.is_file():
            shutil.copy2(src, server / name)
    world = server / 'worlds/WARLAND_LAB'
    world.mkdir(parents=True)
    for src in backup.iterdir():
        if src.name in team.KINDS or src.name in ['world_behavior_packs.json', 'world_resource_packs.json']:
            continue
        if src.is_dir():
            shutil.copytree(src, world / src.name)
        else:
            shutil.copy2(src, world / src.name)
    team.isolated_packs(R, world, uuid.uuid4().hex)
    bp = world / 'behavior_packs/WARLAND_BP'
    probe = (R / 'tools/past-film-probe.js').read_text(encoding='utf-8')
    (bp / 'scripts/past-lab-probe.js').write_text(probe, encoding='utf-8')
    with (bp / 'scripts/main.js').open('a', encoding='utf-8') as f:
        f.write("\nimport './past-lab-probe.js';\n")
    (server / 'server.properties').write_text('\n'.join([
        'server-name=WARLAND Past candidate check', 'level-name=WARLAND_LAB',
        'server-ip=127.0.0.1', 'server-port=19176', 'server-portv6=19177',
        'server-udp-ports=19176', 'transport=nethernet', 'enable-lan-visibility=false',
        'online-mode=true', 'allow-list=true', 'allow-cheats=true', 'gamemode=creative',
        'difficulty=peaceful', 'view-distance=4', 'tick-distance=4',
        'texturepack-required=true', 'content-log-console-output-enabled=true']) + '\n', encoding='utf-8')
    team.write(server / 'allowlist.json', [])
    team.write(server / 'permissions.json', [])
    child = subprocess.Popen([str(server / 'bedrock_server.exe')], cwd=server,
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        text=True, encoding='utf-8', errors='replace', creationflags=subprocess.CREATE_NO_WINDOW)
    events, lines = queue.Queue(), []
    def reader():
        for line in child.stdout:
            events.put(line)
    threading.Thread(target=reader, daemon=True).start()
    deadline, stopping = time.monotonic() + 100, False
    while child.poll() is None or not events.empty():
        try:
            line = events.get(timeout=.2)
        except queue.Empty:
            line = ''
        if line:
            lines.append(line)
        if child.poll() is None and not stopping and (
            '[PAST_TEST_DONE]' in line or '[PAST_TEST_FAIL]' in line or time.monotonic() > deadline):
            child.stdin.write('stop\n')
            child.stdin.flush()
            stopping = True
        if stopping and time.monotonic() > deadline + 40:
            raise RuntimeError('No graceful exit; preserve test process PID ' + str(child.pid))
    text = ''.join(lines)
    errors = [l for l in lines if re.search(r'\bERROR\]|\[PAST_TEST_FAIL\]', l, re.I)]
    report = {'passed':not errors and '[PAST_TEST_DONE]' in text and 'Quit correctly' in text and child.returncode == 0,
        'errors':errors, 'evidence':[l.strip() for l in lines if '[PAST_TEST_' in l],
        'serverVersion':version, 'closedBackup':str(backup), 'quitCorrectly':'Quit correctly' in text,
        'liveServersStopped':False, 'officialModified':False, 'clientVisualVerified':False,
        'sourcePacks':team.hashes(R / 'packs')}
    (out / 'native.log').write_text(text, encoding='utf-8')
    team.write(out / 'native.json', report)
    print(json.dumps({k:v for k,v in report.items() if k not in ['sourcePacks','evidence']}))
    if not report['passed']:
        raise RuntimeError('Past candidate native check failed')


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--closed-backup', type=Path, required=True)
    p.add_argument('--out', type=Path, required=True)
    a = p.parse_args()
    run(a.closed_backup, a.out)
