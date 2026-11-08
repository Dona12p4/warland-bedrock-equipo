"""Deterministic pixel-art pass for the claw-machine UV atlas."""
import hashlib
import base64
import json
import sys
from pathlib import Path

from PIL import Image

SKILL_SCRIPTS = Path.home() / ".codex/skills/entertainment-machine-models/scripts"
sys.path.insert(0, str(SKILL_SCRIPTS))
from texture_helpers import Tex, ramp  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
GEO = ROOT / "resource_packs/models/entity/claw_machine.geo.json"
PNG = ROOT / "resource_packs/textures/entity/claw_machine.png"
MODEL = ROOT / "models_src/claw_machine.bbmodel"

def main():
    geo = json.loads(GEO.read_text())["minecraft:geometry"][0]
    model = json.loads(MODEL.read_text())
    source = Image.open(PNG).convert("RGBA")
    tex = Tex(*source.size)
    tex.img = source.copy()
    tex.px = tex.img.load()
    regions = {}

    for bone in geo["bones"]:
        name = bone["name"]
        for cube in bone.get("cubes", []):
            for face, uv in cube.get("uv", {}).items():
                pos, size = uv.get("uv", []), uv.get("uv_size", [])
                if len(pos) != 2 or len(size) != 2:
                    continue
                x, y = round(min(pos[0], pos[0] + size[0])), round(min(pos[1], pos[1] + size[1]))
                w, h = round(abs(size[0])), round(abs(size[1]))
                if w < 1 or h < 1 or x < 0 or y < 0 or x + w > source.width or y + h > source.height:
                    continue
                regions.setdefault((x, y, w, h), set()).add(name)

    # Also cover source-model UV islands; the Blockbench model is the source of truth.
    for element in model.get("elements", []):
        name = element.get("name", "")
        for face in element.get("faces", {}).values():
            uv = face.get("uv", [])
            if len(uv) != 4:
                continue
            x, y = round(min(uv[0], uv[2])), round(min(uv[1], uv[3]))
            w, h = round(abs(uv[2] - uv[0])), round(abs(uv[3] - uv[1]))
            if w < 1 or h < 1 or x < 0 or y < 0 or x + w > source.width or y + h > source.height:
                continue
            regions.setdefault((x, y, w, h), set()).add(name)

    plush_colors = {
        "plush_rabbit": (225, 157, 177), "plush_cat": (226, 171, 126),
        "plush_dog": (190, 145, 108), "plush_hamster": (237, 182, 82),
        "plush_horse": (157, 111, 72), "plush_rat": (151, 174, 188),
    }
    for index, ((x, y, w, h), owners) in enumerate(sorted(regions.items())):
        owner = " ".join(sorted(owners))
        lower_owner = owner.lower()
        if "glass" in lower_owner:
            continue
        crop = source.crop((x, y, x + w, y + h))
        opaque = [p[:3] for p in crop.getdata() if p[3] > 200]
        if not opaque:
            if any(token in lower_owner for token in ("oak", "wood", "gift_box", "plush", "bunny", "puppy", "cat_head")):
                avg = (174, 132, 83)
            elif "button" in lower_owner:
                avg = (210, 56, 63) if "red" in lower_owner else (69, 177, 69) if "green" in lower_owner else (226, 91, 159) if "pink" in lower_owner else (54, 121, 201)
            else:
                avg = (167, 176, 184)
        else:
            avg = tuple(sum(p[c] for p in opaque) // len(opaque) for c in range(3))

        if any(name in plush_colors for name in owners):
            plush = next(name for name in sorted(owners) if name in plush_colors)
            colors = ramp(plush_colors[plush], n=5)
            tex.rect(x, y, w, h, colors[2])
            tex.bevel(x, y, w, h, colors)
            if w >= 6 and h >= 6:
                tex.pixel(x + max(1, w // 4), y + max(1, h // 3), (48, 40, 42))
                tex.pixel(x + min(w - 2, 3 * w // 4), y + max(1, h // 3), (48, 40, 42))
                tex.pixel(x + w // 2, y + 2 * h // 3, colors[0])
            continue

        r, g, b = avg
        hues = sorted(owners)
        seed = int(hashlib.sha1((str(x) + ":" + str(y) + ":" + "|".join(hues)).encode()).hexdigest()[:8], 16)
        if r > g * 1.12 and g > b * 1.08:
            colors = ramp((174, 132, 83), n=5)
            if w >= 4 and h >= 4:
                tex.wood(x, y, w, h, colors, plank_h=4, seed=seed)
            else:
                tex.rect(x, y, w, h, colors[2])
            tex.bevel(x, y, w, h, colors)
        elif max(r, g, b) - min(r, g, b) < 34:
            colors = ramp((167, 176, 184), n=5)
            tex.metal(x, y, w, h, colors, seed=seed)
            if w >= 12 and h >= 12:
                tex.rivet(x + 1, y + 1, colors)
                tex.rivet(x + w - 3, y + 1, colors)
        else:
            colors = ramp(avg, n=5)
            tex.rect(x, y, w, h, colors[2])
            tex.bevel(x, y, w, h, colors)
            if w >= 8 and h >= 8:
                tex.pixel(x + 1, y + 1, colors[-1])

    # The raised joystick cap has a half-pixel front UV row; paint both tiny islands.
    metal = ramp((167, 176, 184), n=5)
    tex.rect(88, 128, 3, 1, metal[2])
    tex.rect(92, 107, 3, 3, metal[2])
    tex.bevel(92, 107, 3, 3, metal)

    # Interior prizes use the same six source textures as the placed plush blocks.
    plush_tiles = {
        "conejo": (256, 0), "gato": (288, 0), "perro": (320, 0),
        "hamster": (352, 0), "caballo": (384, 0), "rata": (416, 0),
    }
    for plush, (x, y) in plush_tiles.items():
        image = Image.open(ROOT / f"resource_packs/textures/entity/peluches/peluche_{plush}.png")
        image = image.convert("RGBA").resize((32, 32), Image.Resampling.NEAREST)
        tex.img.paste(image, (x, y))
    tex.px = tex.img.load()
    tex.save(PNG)
    texture = model["textures"][0]
    texture.update(
        width=tex.img.width,
        height=tex.img.height,
        uv_width=tex.img.width,
        uv_height=tex.img.height,
        source="data:image/png;base64," + base64.b64encode(PNG.read_bytes()).decode("ascii"),
    )
    model["resolution"] = {"width": tex.img.width, "height": tex.img.height}
    MODEL.write_text(json.dumps(model, indent=2) + "\n")

if __name__ == "__main__":
    main()
