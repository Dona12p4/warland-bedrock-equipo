"""Publish only the current catalog and its source assets, never local worlds."""
from pathlib import Path
import json
import shutil
import tempfile
from catalog import generate


def build_site(root):
    root = Path(root).resolve()
    report = generate(root)
    data = json.loads((root/'catalogo/data.js').read_text(encoding='utf-8').split('=', 1)[1].rstrip(';\n'))
    local = root/'.local'
    local.mkdir(exist_ok=True)
    dest = local/'site'
    # Refuse redirected output before replacing this generated directory.
    if local.resolve() != local or dest.is_symlink() or dest.resolve() != dest:
        raise RuntimeError('La salida del sitio debe permanecer dentro de .local/site.')
    with tempfile.TemporaryDirectory(prefix='site-build-', dir=local) as temporary:
        stage = Path(temporary)
        shutil.copytree(root/'packs', stage/'packs')
        (stage/'catalogo/models').mkdir(parents=True)
        for name in ('index.html','style.css','app.js','viewer.js','THREE-LICENSE.txt','data.js','coverage.json'):
            shutil.copy2(root/'catalogo'/name, stage/'catalogo'/name)
        # Ignore obsolete model blobs left by previous local generations.
        for model in data['models'].values():
            shutil.copy2(root/'catalogo'/model['asset'], stage/'catalogo'/model['asset'])
        (stage/'docs').mkdir()
        for name in ('ESTADO.md','DECISIONES.md'):
            shutil.copy2(root/'docs'/name, stage/'docs'/name)
        (stage/'index.html').write_text('<!doctype html><html lang="es"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=catalogo/"><title>WARLAND 3</title><a href="catalogo/">Abrir atlas de WARLAND 3</a></html>', encoding='utf-8')
        (stage/'.nojekyll').write_text('')
        # This exact resolved path is generated output, never a world or a source.
        if dest.exists(): shutil.rmtree(dest)
        shutil.copytree(stage, dest)
    return report


if __name__ == '__main__':
    report = build_site(Path(__file__).resolve().parents[1])
    print('Sitio construido: '+str(report['coverage']['indexed'])+' archivos inventariados.')
