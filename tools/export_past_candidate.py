"""Export only bounded Past terrain from a CLOSED laboratory backup.

The artifact is independent of the laboratory dimension id. An installer must
resolve the destination id after registering the dimension, refuse existing
terrain collisions, and verify a complete backup. No installer is run here.
"""
from pathlib import Path
import argparse, json, shutil, struct, zipfile
import past_terrain as terrain
import team

R = team.ROOT


def export(backup, output):
    backup, output = backup.resolve(), output.resolve()
    if not backup.is_relative_to((R / '.local/backups').resolve()):
        raise ValueError('Only a closed backup of this lab is allowed')
    if not output.is_relative_to((R / '.local').resolve()) or output.exists():
        raise ValueError('Use a fresh .local output')
    output.mkdir(parents=True)
    copy = output / 'source-copy/db'
    shutil.copytree(backup / 'db', copy)
    db = terrain.load_leveldb(R.parents[1])(str(copy))
    try:
        _, table = terrain.NBT(db.get(b'DimensionNameIdTable')).root()
        ident = table['entries'][1][terrain.DIMENSION][1]
        if ident < 1000:
            raise ValueError('Expected a custom dimension')
        records, chunks, replaced = {}, set(), 0
        for key, value in db.items():
            if len(key) not in (13,14):
                continue
            x,z,dim = struct.unpack('<iii',key[:12])
            tag = key[12]
            if dim != ident or tag not in terrain.SAFE_CHUNK_TAGS:
                continue
            phase = 'ruins' if 8 <= x <= 31 else 'intact' if 72 <= x <= 95 else None
            if phase is None or not -60 <= z <= -37:
                continue
            # Chunk tags only: never actors, player data or ticking areas.
            if tag == 49:
                value = terrain.block_entities(value,0)
            if tag == 47:
                value, count = terrain.sanitize_subchunk(value)
                replaced += count
                chunks.add((x,z))
            records[key[:8] + key[12:]] = value
    finally:
        db.close()
    # The original archive contains five ungenerated perimeter chunks; require
    # the entire playable zone plus its existing buffer, not an invented border.
    expected = {(x,z) for start in [12,76] for x in range(start,start+16) for z in range(-57,-40)}
    perimeter = {(x,z) for start in [8,72] for x in range(start,start+24) for z in range(-60,-36)}
    if not expected.issubset(chunks):
        raise ValueError('Terrain coverage missing: ' + str(sorted(expected-chunks)))
    with zipfile.ZipFile(output/'terrain.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for key in sorted(records):
            z.writestr(key.hex(),records[key])
    with zipfile.ZipFile(output/'terrain.zip') as z:
        verify = {bytes.fromhex(name):z.read(name) for name in z.namelist()}
    assert verify == records
    report = {'dimension':terrain.DIMENSION,'sourceClosedBackup':str(backup),
        'sourceDimensionIdRemoved':True,'records':len(records),'chunks':len(chunks),
        'requiredPlayableAndBufferChunks':len(expected),'playableCoverageComplete':True,
        'missingSourcePerimeterChunks':sorted(perimeter-chunks),'sha256Records':terrain.digest_records(records),
        'zipSha256':team.sha(output/'terrain.zip'),'disabledPaletteEntries':replaced,
        'playersCopied':False,'actorsCopied':False,'inventoriesCopied':False,
        'tickingAreasCopied':False,'worldRulesCopied':False,'officialInstalled':False,
        'visualApprovalPending':True,'includes':['ruins','intact public preview','elevated flash set','skylight roof','foothold edits']}
    team.write(output/'terrain.json',report)
    print(json.dumps(report))


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--closed-backup',type=Path,required=True)
    parser.add_argument('--out',type=Path,required=True)
    args=parser.parse_args()
    export(args.closed_backup,args.out)
