"""WARLAND team workflow. Python standard library; no credentials stored here."""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
import uuid
import zipfile
from contextlib import contextmanager

ROOT = Path(__file__).resolve().parents[1]
KINDS = ('behavior_packs', 'resource_packs')

def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))

def write(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    tmp.replace(path)

def sha(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()

def hashes(folder):
    folder = Path(folder)
    return {p.relative_to(folder).as_posix(): sha(p) for p in sorted(folder.rglob('*')) if p.is_file()}

def run(args, cwd=ROOT, capture=True):
    result = subprocess.run([str(a) for a in args], cwd=cwd, text=True,
                            encoding='utf-8', errors='replace', capture_output=capture)
    if result.returncode:
        raise RuntimeError((result.stderr or result.stdout or str(args)).strip())
    return result.stdout.strip() if capture else ''

def git(*args, root=ROOT):
    return run(['git', *args], root)

def cfg(root=ROOT):
    return read(root / 'config/toolchain.json')

@contextmanager
def local_lock(root):
    folder = root / '.local'
    folder.mkdir(exist_ok=True)
    path = folder / 'mutation.lock'
    try:
        fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        raise RuntimeError('Otra operacion usa este laboratorio. Si hubo un cierre anormal, comprobar el PID del lock antes de retirarlo.')
    with os.fdopen(fd, 'w') as f:
        f.write(str(os.getpid()))
    try:
        yield
    finally:
        path.unlink()

def safe_child(root, name):
    root = Path(root).resolve()
    name = str(name)
    rel = PurePosixPath(name)
    if not name or '\\' in name or ':' in name or rel.is_absolute() or '..' in rel.parts:
        raise RuntimeError('Ruta no permitida: ' + name)
    target = (root / name).resolve()
    if not target.is_relative_to(root) or target == root:
        raise RuntimeError('Ruta fuera de destino: ' + name)
    return target

def extract(archive, target):
    target = Path(target)
    with zipfile.ZipFile(archive) as z:
        if sum(i.file_size for i in z.infolist()) > 8 * 1024**3:
            raise RuntimeError('Archivo demasiado grande para este instalador')
        for item in z.infolist():
            safe_child(target, item.filename.rstrip('/'))
            if (item.external_attr >> 16) & 0o170000 == 0o120000:
                raise RuntimeError('El ZIP contiene enlaces simbolicos')
        z.extractall(target)

def processes():
    if os.name != 'nt':
        return ''
    return run(['tasklist', '/FO', 'CSV', '/NH']).lower()

def closed(client=False):
    state = processes()
    if 'bedrock_server.exe' in state or (client and 'minecraft.windows.exe' in state):
        raise RuntimeError('Guardar/cerrar Minecraft y detener BDS con stop antes de copiar. No se forzara el cierre.')

def archive_tree(source, dest):
    source, dest = Path(source), Path(dest)
    before = hashes(source)
    dest.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(dest, 'w', zipfile.ZIP_DEFLATED) as z:
        for rel in before:
            p = safe_child(source, rel)
            if p.is_symlink():
                raise RuntimeError('No se incluyen enlaces')
            z.write(p, rel)
    if before != hashes(source):
        dest.unlink(missing_ok=True)
        raise RuntimeError('El mundo cambio mientras se copiaba; copia cancelada')
    with zipfile.ZipFile(dest) as z:
        assert before == {n: hashlib.sha256(z.read(n)).hexdigest() for n in z.namelist()}
    return before

def fetch(root=ROOT):
    git('fetch', '--prune', 'origin', root=root)

def fresh(root=ROOT):
    fetch(root)
    branch = 'origin/' + cfg(root)['mainBranch']
    try:
        git('merge-base', '--is-ancestor', branch, 'HEAD', root=root)
    except RuntimeError:
        raise RuntimeError('Hay cambios nuevos en main. Guarda un commit en tu rama y ejecuta sync antes de probar/publicar.')
    return git('rev-parse', branch, root=root)

def sync(root=ROOT):
    if git('status', '--porcelain', root=root):
        raise RuntimeError('Cambios locales pendientes. Revisar y guardar en tu rama antes de sync; no se descartan.')
    fetch(root)
    git('merge', '--no-edit', 'origin/' + cfg(root)['mainBranch'], root=root)
    print('Actualizado; se conservan los commits propios. ' + git('rev-parse', '--short', 'HEAD', root=root))

def begin(task, root=ROOT):
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{1,60}', task):
        raise RuntimeError('Usa un nombre breve: sol-quieto, nuevo-mob...')
    sync(root)
    git('switch', '-c', 'codex/' + task, root=root)

def check(root=ROOT):
    manifests, ids, files = {}, set(), 0
    for kind in KINDS:
        for path in sorted((root / 'packs' / kind).glob('*/manifest.json')):
            m = read(path)
            ident = m['header']['uuid']
            uuid.UUID(ident)
            if ident in ids:
                raise RuntimeError('UUID de paquete duplicado: ' + ident)
            ids.add(ident)
            manifests[ident] = (kind, m)
            for module in m['modules']:
                uuid.UUID(module['uuid'])
                if module['uuid'] in ids:
                    raise RuntimeError('UUID de modulo duplicado')
                ids.add(module['uuid'])
                if 'entry' in module and not safe_child(path.parent, module['entry']).is_file():
                    raise RuntimeError('Falta entrada del script: ' + str(path))
            for f in path.parent.rglob('*'):
                if not f.is_file():
                    continue
                if f.is_symlink():
                    raise RuntimeError('No se admiten symlinks en packs')
                if f.suffix.lower() in ('.json', '.mcmeta'):
                    read(f)
                files += 1
    if not manifests:
        raise RuntimeError('No hay paquetes')
    for kind in KINDS:
        registry = read(root / 'pack-order' / ('world_' + kind + '.json'))
        seen = set()
        for ref in registry:
            ident = ref['pack_id']
            if ident in seen or ident not in manifests:
                raise RuntimeError('Registro de packs duplicado/incompleto')
            seen.add(ident)
            k, m = manifests[ident]
            if k != kind or ref['version'] != m['header']['version']:
                raise RuntimeError('Version/orden no coincide para ' + ident)
        if seen != {ident for ident, (k, _) in manifests.items() if k == kind}:
            raise RuntimeError('Hay packs que no estan activos en pack-order')
    for kind, m in manifests.values():
        for dep in m.get('dependencies', []):
            if 'uuid' in dep:
                if dep['uuid'] not in manifests or dep['version'] != manifests[dep['uuid']][1]['header']['version']:
                    raise RuntimeError('Dependencia ausente/version distinta: ' + m['header']['name'])
            if dep.get('module_name') == '@minecraft/server':
                version = dep['version']
                if version != cfg(root)['stableScriptApi']:
                    base = root / 'packs/behavior_packs/WARLAND_BP/manifest.json'
                    if version != cfg(root)['baseBetaException'] or m['header']['uuid'] != read(base)['header']['uuid']:
                        raise RuntimeError('API fuera de la politica acordada')
    # Scan only tracked names; no auth/session content is ever read.
    try:
        names = git('ls-files', root=root).splitlines()
    except RuntimeError:
        names = []
    for name in names:
        parts = PurePosixPath(name).parts
        if any(p in ('.local', 'db', 'node_modules', 'backups') for p in parts) or Path(name).suffix.lower() in ('.exe', '.dll', '.mcworld', '.zip') or Path(name).name in ('auth.json', '.env'):
            raise RuntimeError('Archivo privado/binario no permitido en Git: ' + name)
    result = {'passed': True, 'packs': len(manifests), 'files': files}
    print(json.dumps(result))
    return result

def baseline(root=ROOT):
    inventory = []
    for kind in KINDS:
        for p in sorted((root / 'packs' / kind).glob('*/manifest.json')):
            m = read(p)
            inventory.append({'folder': p.parent.relative_to(root).as_posix(), 'uuid': m['header']['uuid'],
                              'version': m['header']['version'], 'dependencies': m.get('dependencies', [])})
    write(root / 'baseline.json', {'schema': 1, 'capturedUtc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
          'packs': inventory, 'sha256': hashes(root / 'packs'), 'note': 'Base instalada capturada. Comparar cambios con Git; no regenerar sobre trabajo ajeno.'})

def setup_server(archive=None, root=ROOT):
    conf = cfg(root)
    local = root / '.local'
    local.mkdir(exist_ok=True)
    dest = local / 'server'
    if (dest / 'bedrock_server.exe').exists():
        if read(local / 'server-version.json')['version'] != conf['serverVersion']:
            raise RuntimeError('Version BDS distinta; no se actualiza automaticamente')
        return
    if archive is None:
        archive = local / ('bedrock-' + conf['serverVersion'] + '.zip')
        if not archive.exists():
            print('Descargando BDS oficial fijado: ' + conf['serverVersion'], flush=True)
            urllib.request.urlretrieve(conf['serverUrl'], archive)
    if sha(archive) != conf['serverSha256']:
        raise RuntimeError('SHA256 del servidor incorrecto')
    closed()
    extract(archive, dest)
    write(local / 'server-version.json', {'version': conf['serverVersion'], 'sha256': sha(archive)})

def isolated_packs(source, dest, namespace):
    """Isolate RESOURCE identities only. BP dynamic-property namespaces stay intact."""
    source, dest = Path(source), Path(dest)
    for kind in KINDS:
        shutil.copytree(source / 'packs' / kind, dest / kind)
        shutil.copy2(source / 'pack-order' / ('world_' + kind + '.json'), dest / ('world_' + kind + '.json'))
    mapping, versions = {}, {}
    for p in (dest / 'resource_packs').glob('*/manifest.json'):
        m = read(p)
        digest = hashlib.sha256(json.dumps(hashes(p.parent), sort_keys=True).encode()).hexdigest()
        new_version = [90, int(digest[:4], 16), int(digest[4:8], 16)]
        ident = m['header']['uuid']
        versions[ident] = new_version
        for uid in [ident] + [x['uuid'] for x in m['modules']]:
            mapping[uid] = str(uuid.uuid5(uuid.NAMESPACE_URL, 'warland-team/' + namespace + '/' + uid))
    def replace(obj):
        if isinstance(obj, list):
            return [replace(x) for x in obj]
        if isinstance(obj, dict):
            out = {k: replace(v) for k, v in obj.items()}
            uid = obj.get('uuid', obj.get('pack_id'))
            if uid in versions and 'version' in out:
                out['version'] = versions[uid]
            return out
        return mapping.get(obj, obj) if isinstance(obj, str) else obj
    for kind in KINDS:
        for p in (dest / kind).glob('*/manifest.json'):
            m = replace(read(p))
            if kind == 'resource_packs':
                for module in m['modules']:
                    module['version'] = m['header']['version']
            write(p, m)
        p = dest / ('world_' + kind + '.json')
        write(p, replace(read(p)))
    return mapping

def world_archive(root=ROOT):
    pointer = read(root / 'world-release.json')
    if not pointer.get('tag'):
        raise RuntimeError('Aun falta publicar el snapshot del mundo cerrado')
    if not re.fullmatch(r'world-[0-9]{8}-[0-9]{6}', pointer['tag']):
        raise RuntimeError('Identificador de release invalido')
    local = root / '.local/downloads' / pointer['tag']
    local.mkdir(parents=True, exist_ok=True)
    path = safe_child(local, pointer['asset'])
    if not path.exists():
        run(['gh', 'release', 'download', pointer['tag'], '--repo', cfg(root)['repository'],
             '--pattern', pointer['asset'], '--dir', local])
    if sha(path) != pointer['sha256']:
        raise RuntimeError('El mundo descargado no coincide con el SHA256 publicado')
    return path, pointer

def server_config(root, server):
    user = read(root / '.local/user.json') if (root / '.local/user.json').exists() else {}
    conf = cfg(root)
    port = int(user.get('port', conf['port']))
    properties = {'server-name': 'WARLAND - LABORATORIO DE EQUIPO', 'gamemode': 'survival',
        'difficulty': 'normal', 'allow-cheats': 'true', 'online-mode': 'true', 'allow-list': 'true',
        'default-player-permission-level': 'member', 'server-ip': '127.0.0.1', 'transport': conf['transport'],
        'server-port': port, 'server-portv6': port + 1, 'server-udp-ports': port,
        'enable-lan-visibility': 'false', 'level-name': 'WARLAND_LAB', 'max-players': 2,
        'view-distance': 12, 'tick-distance': 4, 'texturepack-required': 'true',
        'content-log-file-enabled': 'true', 'content-log-console-output-enabled': 'true'}
    (server / 'server.properties').write_text(''.join(f'{k}={v}\n' for k,v in properties.items()), encoding='utf-8')
    names = set(['DanielGamerSC', 'Hatsudemiku'] + ([user['gamertag']] if user.get('gamertag') else []))
    write(server / 'allowlist.json', [{'name': n, 'ignoresPlayerLimit': False} for n in sorted(names)])
    # Operator is a LAB permission only; base admin rules stay unchanged.
    write(server / 'permissions.json', [])

def prepare_lab(root=ROOT, *, online=True, archive=None, pointer=None):
    with local_lock(root):
        return _prepare_lab(root, online=online, archive=archive, pointer=pointer)

def _prepare_lab(root=ROOT, *, online=True, archive=None, pointer=None):
    if online:
        fresh(root)
    check(root)
    closed()
    if archive is None:
        archive, pointer = world_archive(root)
    setup_server(root=root)
    server = root / '.local/server'
    target = server / 'worlds/WARLAND_LAB'
    marker = root / '.local/lab.json'
    old = read(marker) if marker.exists() else {}
    if target.exists() and old.get('managed') != 'warland-team-v1':
        raise RuntimeError('El destino existe y no es nuestro laboratorio; no se toca')
    if target.exists() and old.get('installedPacks') != pack_hashes(target):
        raise RuntimeError('Paquetes del laboratorio modificados fuera de packs/; revisar antes de reemplazar')
    archive_sha = sha(archive)
    current_packs = hashes(root / 'packs')
    if target.exists() and old.get('worldSha256') == archive_sha and old.get('sourcePacks') == current_packs:
        if old.get('installedPacks') != pack_hashes(target):
            raise RuntimeError('Paquetes del laboratorio cambiaron fuera de la fuente; revisar antes de sobrescribir')
        server_config(root, server)
        print('Laboratorio ya actualizado. DB conservada.')
        return target
    stage = Path(tempfile.mkdtemp(prefix='prepare-', dir=root / '.local'))
    staged_world = stage / 'world'
    if target.exists():
        backup = root / '.local/backups' / (time.strftime('%Y%m%d-%H%M%S') + '-' + uuid.uuid4().hex[:6] + '.zip')
        archive_tree(target, backup)
    if target.exists() and old.get('worldSha256') == archive_sha:
        shutil.copytree(target, staged_world)
    else:
        staged_world.mkdir()
        extract(archive, staged_world)
    if not (staged_world / 'level.dat').is_file() or not (staged_world / 'db').is_dir():
        raise RuntimeError('Snapshot sin level.dat o DB')
    preserved = {k:v for k,v in hashes(staged_world).items() if k.startswith('db/') or k == 'level.dat'}
    for kind in KINDS:
        p = safe_child(stage, 'world/' + kind)
        if p.exists():
            shutil.rmtree(p)
    namespace_file = root / '.local/identity.json'
    if not namespace_file.exists():
        write(namespace_file, {'namespace': uuid.uuid4().hex})
    isolated_packs(root, staged_world, read(namespace_file)['namespace'])
    (staged_world / 'levelname.txt').write_text('WARLAND - PRUEBAS EQUIPO', encoding='utf-8')
    assert preserved == {k:v for k,v in hashes(staged_world).items() if k.startswith('db/') or k == 'level.dat'}
    # Reversible swap of a verified, managed lab only. Never a user-supplied world path.
    target.parent.mkdir(parents=True, exist_ok=True)
    rollback = stage / 'previous'
    if target.exists():
        target.replace(rollback)
    try:
        staged_world.replace(target)
        write(marker, {'managed': 'warland-team-v1', 'worldSha256': archive_sha,
                      'worldTag': pointer.get('tag'), 'sourcePacks': current_packs,
                      'installedPacks': pack_hashes(target), 'snapshotDataPreserved': True,
                      'previousLabMapReplaced': bool(old and old.get('worldSha256') != archive_sha)})
        server_config(root, server)
    except Exception:
        if target.exists():
            target.replace(stage / 'failed')
        if rollback.exists():
            rollback.replace(target)
        if old:
            write(marker, old)
        else:
            marker.unlink(missing_ok=True)
        raise
    print('Laboratorio preparado: 127.0.0.1:' + str(cfg(root)['port']))
    return target

def pack_hashes(world):
    return {kind + '/' + name: value for kind in KINDS for name, value in hashes(world / kind).items()}

def snapshot(source, label, root=ROOT, offline=False):
    source = Path(source).resolve()
    if offline and ('minecraftworlds' in str(source).lower() or '.runtime' not in source.parts):
        raise RuntimeError('Offline solo permite copias previamente guardadas en .runtime, no el cliente')
    closed(client=not offline)
    if not (source / 'db').is_dir() or not (source / 'level.dat').is_file():
        raise RuntimeError('No es un mundo Bedrock guardado')
    # The map may lag behind, but it MUST contain the exact currently published pack baseline.
    if pack_hashes(source) != hashes(root / 'packs'):
        raise RuntimeError('El mundo tiene otros paquetes. Consolidar primero los cambios instalados en packs/.')
    check(root)
    tag = 'world-' + time.strftime('%Y%m%d-%H%M%S', time.gmtime())
    out = root / '.local/releases' / tag
    out.mkdir(parents=True, exist_ok=False)
    dest = out / 'WARLAND-world.zip'
    contents = archive_tree(source, dest)
    pointer = {'schema': 1, 'tag': tag, 'asset': dest.name, 'sha256': sha(dest),
        'label': label, 'offlineBaseline': offline,
        'codeCommit': git('rev-parse', 'HEAD', root=root), 'files': len(contents),
        'note': 'Copia offline: no contiene progreso reciente del cliente.' if offline else 'Snapshot del cliente guardado y cerrado.'}
    write(out / 'release.json', pointer)
    print('Snapshot verificado: ' + str(out))
    return out

def publish_world(folder, root=ROOT):
    folder = Path(folder).resolve()
    if not folder.is_relative_to((root / '.local/releases').resolve()):
        raise RuntimeError('Solo publicar snapshots preparados por este proyecto')
    fresh(root)
    if git('branch', '--show-current', root=root) != cfg(root)['mainBranch'] or git('status', '--porcelain', root=root):
        raise RuntimeError('Publicar snapshot requiere main limpia y revisada')
    pointer = read(folder / 'release.json')
    if sha(folder / pointer['asset']) != pointer['sha256']:
        raise RuntimeError('Snapshot alterado')
    if pointer['codeCommit'] != git('rev-parse', 'HEAD', root=root):
        raise RuntimeError('El codigo cambio desde la captura; crear otro snapshot')
    repo = read_json_command(['gh', 'repo', 'view', cfg(root)['repository'], '--json', 'isPrivate'])
    if not repo['isPrivate']:
        raise RuntimeError('No se publican mundos en repositorios publicos')
    notes = folder / 'NOTAS.txt'
    notes.write_text(pointer['label'] + '\n' + pointer['note'] + '\nSHA256: ' + pointer['sha256'], encoding='utf-8')
    run(['gh', 'release', 'create', pointer['tag'], folder / pointer['asset'], folder / 'release.json',
         '--repo', cfg(root)['repository'], '--target', pointer['codeCommit'], '--title', pointer['label'], '--notes-file', notes])
    write(root / 'world-release.json', pointer)
    print('Release privada publicada. Revisar y commitear world-release.json para anunciarla al equipo.')

def capture_installed(source, root=ROOT):
    source = Path(source).resolve()
    closed(client=True)
    fresh(root)
    if git('status', '--porcelain', root=root) or git('branch', '--show-current', root=root) != cfg(root)['mainBranch']:
        raise RuntimeError('Capturar requiere main limpia y actualizada; no se pisa una tarea en curso.')
    if read(root / 'baseline.json')['sha256'] != hashes(root / 'packs'):
        raise RuntimeError('El repositorio tiene cambios posteriores a la ultima captura instalada. Integrarlos/instalarlos antes de volver a capturar; no se sobrescriben.')
    with local_lock(root):
        staged = Path(tempfile.mkdtemp(prefix='capture-', dir=root / '.local'))
        shutil.copytree(root / 'config', staged / 'config')
        (staged / 'pack-order').mkdir()
        before = pack_hashes(source)
        for kind in KINDS:
            shutil.copytree(source / kind, staged / 'packs' / kind)
            shutil.copy2(source / ('world_' + kind + '.json'), staged / 'pack-order' / ('world_' + kind + '.json'))
        if before != hashes(staged / 'packs') or before != pack_hashes(source):
            raise RuntimeError('Los paquetes fuente cambiaron durante la captura')
        check(staged)
        moved = []
        try:
            for name in ('packs', 'pack-order'):
                (root / name).replace(staged / ('old-' + name))
                moved.append(name)
                (staged / name).replace(root / name)
            baseline(root)
        except Exception:
            for name in reversed(moved):
                if (root / name).exists():
                    (root / name).replace(staged / ('failed-' + name))
                (staged / ('old-' + name)).replace(root / name)
            raise
    print('Captura lista para revisar/commitear. No se publico ni cambio el mundo.')

def read_json_command(args):
    return json.loads(run(args))

def proposal(root=ROOT):
    latest = fresh(root)
    check(root)
    if git('branch', '--show-current', root=root) == cfg(root)['mainBranch']:
        raise RuntimeError('La propuesta debe salir de una rama codex/...')
    if git('status', '--porcelain', root=root):
        raise RuntimeError('Guardar los cambios en un commit antes de preparar la propuesta')
    out = root / '.local/proposals' / (time.strftime('%Y%m%d-%H%M%S') + '.json')
    write(out, {'base': latest, 'head': git('rev-parse', 'HEAD', root=root),
                'branch': git('branch', '--show-current', root=root),
                'files': git('diff', '--name-status', latest + '...HEAD', root=root).splitlines(),
                'officialInstalled': False, 'nativeValidation': 'Adjuntar resultado real; no se infiere de check.'})
    print('Propuesta preparada sin instalar oficial: ' + str(out))

def smoke(seconds, root=ROOT):
    closed()
    server = root / '.local/server'
    if not (root / '.local/lab.json').exists():
        raise RuntimeError('Preparar laboratorio primero')
    proc = subprocess.Popen([str(server / 'bedrock_server.exe')], cwd=server, stdin=subprocess.PIPE,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8', errors='replace')
    time.sleep(min(45, seconds))
    try:
        output, _ = proc.communicate('stop\n', timeout=45)
    except subprocess.TimeoutExpired:
        raise RuntimeError('BDS no confirmo cierre; no copiar nada ni forzarlo. Revisar proceso activo.')
    log = root / '.local/smoke.log'
    log.write_text(output, encoding='utf-8')
    errors = [line for line in output.splitlines() if re.search(r'\[(?:Scripting|Json|Animation|Texture|Geometry|Item|Blocks)\]\[error\]|\bSyntaxError\b|\bReferenceError\b', line, re.I)]
    result = {'started': 'Server started.' in output, 'quitCorrectly': 'Quit correctly' in output,
              'errors': errors, 'exitCode': proc.returncode, 'clientVisualTest': False}
    result['passed'] = result['started'] and result['quitCorrectly'] and not errors and proc.returncode == 0
    write(root / '.local/smoke.json', result)
    print(json.dumps(result, ensure_ascii=False))
    if not result['passed']:
        raise RuntimeError('Revisar .local/smoke.log')

def install_hooks(root=ROOT):
    folder = root / '.local/hooks'
    folder.mkdir(parents=True, exist_ok=True)
    hook = folder / 'pre-push'
    hook.write_text('#!/bin/sh\nif [ "$WARLAND_OWNER_PUSH" != "1" ]; then\n  branch=$(git branch --show-current)\n  if [ "$branch" = "main" ]; then echo "Usa una propuesta; main requiere revision del propietario."; exit 1; fi\nfi\npython tools/team.py pre-push || exit 1\n', encoding='utf-8')
    git('config', 'core.hooksPath', str(folder), root=root)

def main():
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest='command', required=True)
    for command in ('sync', 'check', 'baseline', 'prepare-lab', 'play', 'proposal', 'hooks', 'pre-push', 'status'):
        sub.add_parser(command)
    sub.add_parser('begin').add_argument('task')
    s = sub.add_parser('setup-server'); s.add_argument('--archive')
    s = sub.add_parser('snapshot'); s.add_argument('world'); s.add_argument('--label', required=True); s.add_argument('--offline', action='store_true')
    sub.add_parser('publish-world').add_argument('folder')
    sub.add_parser('capture-installed').add_argument('world')
    s = sub.add_parser('smoke'); s.add_argument('--seconds', type=int, default=20)
    args = p.parse_args()
    if args.command == 'sync': sync()
    elif args.command == 'begin': begin(args.task)
    elif args.command == 'check': check()
    elif args.command == 'baseline': baseline()
    elif args.command == 'setup-server': setup_server(args.archive)
    elif args.command == 'prepare-lab': prepare_lab()
    elif args.command == 'snapshot': snapshot(args.world, args.label, offline=args.offline)
    elif args.command == 'publish-world': publish_world(args.folder)
    elif args.command == 'capture-installed': capture_installed(args.world)
    elif args.command == 'proposal': proposal()
    elif args.command == 'hooks': install_hooks()
    elif args.command == 'pre-push': fresh(); check()
    elif args.command == 'smoke': smoke(args.seconds)
    elif args.command == 'status':
        fresh()
        print(git('status', '--short', '--branch'))
        print(json.dumps(read(ROOT / 'world-release.json'), ensure_ascii=False))
    elif args.command == 'play':
        if not git('status', '--porcelain'): sync()
        prepare_lab()
        print('Abrir Minecraft Bedrock > Servidores > 127.0.0.1:19152. Escribir stop aqui para guardar y cerrar.', flush=True)
        run([ROOT / '.local/server/bedrock_server.exe'], ROOT / '.local/server', capture=False)

if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, AssertionError, ValueError, OSError) as exc:
        print('NO SE APLICO: ' + str(exc), file=sys.stderr)
        sys.exit(1)
