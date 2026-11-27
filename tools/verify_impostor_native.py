"""Two native BDS passes in this worktree's independent lab. Never edits Shared."""
from pathlib import Path
import argparse, hashlib, json, queue, re, shutil, subprocess, threading, time

ROOT = Path(__file__).resolve().parents[1]

def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p, obj):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(obj, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

def prepare(source):
    server = ROOT / '.local/server'
    if server.exists(): raise RuntimeError('Este laboratorio ya existe. Conservarlo y revisar antes de repetir la preparacion.')
    actual = hashlib.sha256((source / 'bedrock_server.exe').read_bytes()).hexdigest()
    # The published hash is for the ZIP, not the executable. Check the actual version below.
    version = subprocess.check_output(['powershell', '-NoProfile', '-Command', f"(Get-Item -LiteralPath '{source / 'bedrock_server.exe'}').VersionInfo.FileVersion"], text=True).strip()
    if version != '1.26.60.6': raise RuntimeError('BDS distinto al aprobado: ' + version)
    if 'bedrock_server.exe' in subprocess.check_output(['tasklist', '/FO', 'CSV', '/NH'], text=True).lower():
        raise RuntimeError('Hay un servidor abierto; no copiar su plantilla mientras esta en uso.')
    server.mkdir(parents=True)
    for name in ['bedrock_server.exe', 'config', 'data', 'definitions', 'resource_packs', 'behavior_packs', 'profanity_filter.wlist']:
        src = source / name
        if src.is_dir(): shutil.copytree(src, server / name)
        elif src.is_file(): shutil.copy2(src, server / name)
    for binary in source.glob('*.dll'): shutil.copy2(binary, server / binary.name)
    world = server / 'worlds/WARLAND_LAB'
    world.mkdir(parents=True)
    # Reuse the existing lab's settings, including its already-approved experiment flags.
    # Generate fresh terrain; do not copy any official world or change experiment settings.
    template = source / 'worlds/WARLAND_LAB/level.dat'
    shutil.copy2(template, world / 'level.dat')
    (world / 'levelname.txt').write_text('WARLAND - Impostor - LAB', encoding='utf-8')
    for kind in ('behavior_packs', 'resource_packs'):
        shutil.copytree(ROOT / 'packs' / kind, server / kind, dirs_exist_ok=True)
        shutil.copy2(ROOT / 'pack-order' / f'world_{kind}.json', world / f'world_{kind}.json')
    bp = server / 'behavior_packs/WARLAND_Impostor_BP'
    shutil.copy2(ROOT / 'tools/impostor_native_probe.js', bp / 'scripts/probe.js')
    with (bp / 'scripts/main.js').open('a', encoding='utf-8') as stream: stream.write("\nimport './probe.js';\n")
    manifest = read(bp / 'manifest.json')
    manifest['dependencies'].append({'module_name': '@minecraft/server-gametest', 'version': '1.0.0-beta'})
    write(bp / 'manifest.json', manifest)
    (server / 'server.properties').write_text('\n'.join([
        'server-name=WARLAND Impostor LAB', 'level-name=WARLAND_LAB', 'server-ip=127.0.0.1',
        'server-port=19162', 'server-portv6=19163', 'server-udp-ports=19162', 'transport=nethernet',
        'enable-lan-visibility=false', 'online-mode=true', 'allow-list=true', 'allow-cheats=true',
        'gamemode=creative', 'difficulty=peaceful', 'content-log-console-output-enabled=true',
        'view-distance=4', 'tick-distance=4', 'max-players=5', 'texturepack-required=true']) + '\n', encoding='utf-8')
    write(server / 'allowlist.json', [])
    write(server / 'permissions.json', [])
    write(ROOT / '.local/impostor-lab.json', {'server': str(server), 'source': str(source), 'version': version, 'binarySha256': actual, 'templateSha256': hashlib.sha256(template.read_bytes()).hexdigest(), 'officialWorldModified': False})
    return server

def run_pass(server, phase):
    lines, events, result = [], queue.Queue(), None
    proc = subprocess.Popen([str(server / 'bedrock_server.exe')], cwd=server, stdin=subprocess.PIPE,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8', errors='replace',
                            creationflags=subprocess.CREATE_NO_WINDOW)
    def reader():
        for line in proc.stdout: events.put(line)
    threading.Thread(target=reader, daemon=True).start()
    deadline, stopping = time.monotonic() + 150, False
    while proc.poll() is None or not events.empty():
        try: line = events.get(timeout=.25)
        except queue.Empty: line = ''
        if line:
            lines.append(line)
            if '[IMPOSTOR_RESULT] ' in line:
                result = json.loads(line.split('[IMPOSTOR_RESULT] ', 1)[1])
                print(json.dumps({'phase': phase, **result}, ensure_ascii=False), flush=True)
            elif re.search(r'\bERROR\]', line, re.I): print(line.strip(), flush=True)
        if not stopping and (result is not None or time.monotonic() >= deadline):
            proc.stdin.write('stop\n'); proc.stdin.flush(); stopping = True
        if stopping and time.monotonic() > deadline + 40:
            raise RuntimeError('El servidor no confirma cierre. No forzar ni copiar su mundo. PID=' + str(proc.pid))
    text = ''.join(lines)
    errors = [l for l in text.splitlines() if re.search(r'\bERROR\]', l, re.I)]
    passed = bool(result and result.get('passed') and not errors and 'Quit correctly' in text and proc.returncode == 0)
    report = {'passed': passed, 'phase': phase, 'result': result, 'errors': errors, 'exitCode': proc.returncode, 'quitCorrectly': 'Quit correctly' in text, 'clientVisualVerified': False, 'androidVerified': False}
    (ROOT / f'.local/impostor-{phase}.log').write_text(text, encoding='utf-8')
    write(ROOT / f'.local/impostor-{phase}.json', report)
    if not passed: raise RuntimeError('Fallo la prueba nativa ' + phase)
    return report

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', required=True, type=Path)
    parser.add_argument('--resume', action='store_true')
    args = parser.parse_args()
    server = ROOT / '.local/server' if args.resume else prepare(args.source.resolve())
    reports = [run_pass(server, 'first'), run_pass(server, 'restart')]
    write(ROOT / '.local/impostor-native.json', {'passed': True, 'checks': sum(len(r['result']['checks']) for r in reports), 'passes': reports, 'officialWorldModified': False})
    print('Native validation passed and server closed correctly.', flush=True)
