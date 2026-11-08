"""Package the local behavior and resource packs for Minecraft PE testing."""

from io import BytesIO
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT.parent / "warland3_claw_machine.mcaddon"


def add_file(archive, name, data):
    entry = ZipInfo(name, date_time=(2024, 1, 1, 0, 0, 0))
    entry.compress_type = ZIP_DEFLATED
    archive.writestr(entry, data)


def pack(folder):
    output = BytesIO()
    with ZipFile(output, "w") as archive:
        for path in sorted(folder.rglob("*")):
            if path.is_file() and "__pycache__" not in path.parts:
                add_file(archive, path.relative_to(folder).as_posix(), path.read_bytes())
    return output.getvalue()


def main():
    with ZipFile(OUTPUT, "w") as addon:
        add_file(addon, "warland3_claw_machine_bp.mcpack", pack(ROOT / "behavior_packs"))
        add_file(addon, "warland3_claw_machine_rp.mcpack", pack(ROOT / "resource_packs"))
    print(f"Created {OUTPUT} ({OUTPUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
