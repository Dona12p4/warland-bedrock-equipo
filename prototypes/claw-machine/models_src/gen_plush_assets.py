"""Build matching 3D plush atlases, placed-block geometry and inventory sprites."""
from __future__ import annotations

import base64
import json
import math
import uuid
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
NAMES = ("conejo", "gato", "perro", "hamster", "caballo", "rata")

# Five-step, hue-shifted cloth ramps: shadow, shade, base, light, glint.
PALETTES = {
    "conejo": {"fur": [(147, 103, 121), (191, 142, 157), (238, 211, 207), (255, 238, 231), (255, 250, 244)], "inner": (229, 133, 162), "muzzle": (255, 239, 229), "eye": (68, 47, 54), "cheek": (246, 157, 171)},
    "gato": {"fur": [(112, 55, 27), (171, 78, 30), (224, 123, 48), (248, 173, 83), (255, 213, 142)], "inner": (244, 158, 169), "muzzle": (255, 228, 190), "eye": (56, 43, 34), "cheek": (246, 143, 136)},
    "perro": {"fur": [(110, 65, 39), (163, 101, 58), (211, 157, 94), (239, 197, 133), (255, 228, 177)], "inner": (174, 102, 93), "muzzle": (255, 222, 174), "eye": (58, 42, 34), "cheek": (227, 143, 123)},
    "hamster": {"fur": [(130, 67, 37), (185, 107, 52), (228, 157, 76), (249, 198, 121), (255, 228, 167)], "inner": (222, 139, 134), "muzzle": (255, 233, 194), "eye": (58, 42, 36), "cheek": (245, 153, 142)},
    "caballo": {"fur": [(91, 48, 34), (139, 75, 46), (187, 110, 64), (218, 151, 91), (246, 192, 132)], "inner": (170, 102, 91), "muzzle": (238, 194, 150), "eye": (48, 38, 36), "cheek": (209, 130, 108)},
    "rata": {"fur": [(73, 68, 85), (112, 104, 126), (157, 151, 169), (197, 190, 203), (225, 218, 228)], "inner": (218, 143, 164), "muzzle": (229, 218, 219), "eye": (45, 40, 51), "cheek": (232, 147, 168)},
}


def uid() -> str:
    return str(uuid.uuid4())


def uv_rect(face: dict) -> tuple[int, int, int, int]:
    u1, v1, u2, v2 = face["uv"]
    return (round(min(u1, u2)), round(min(v1, v2)), round(abs(u2 - u1)), round(abs(v2 - v1)))


def add_cube(model: dict, geo: dict, name: str, start: list[float], end: list[float], bone: str, uv_origin: tuple[int, int], material: str) -> None:
    element_id = uid()
    origin = [min(start[i], end[i]) for i in range(3)]
    size = [abs(end[i] - start[i]) for i in range(3)]
    w, h, d = size
    u, v = uv_origin
    # Explicit per-face UV keeps the .bbmodel and both Bedrock exports in lockstep.
    layout = {
        "north": [u + d, v + d, u + d + w, v + d + h],
        "east": [u, v + d, u + d, v + d + h],
        "south": [u + d + w + d, v + d, u + d + w + d + w, v + d + h],
        "west": [u + d + w, v + d, u + d + w + d, v + d + h],
        "up": [u + d, v, u + d + w, v + d],
        "down": [u + d + w, v, u + d + w + w, v + d],
    }
    faces = {side: {"uv": rect, "texture": 0} for side, rect in layout.items()}
    element = {
        "name": name, "from": origin, "to": [origin[i] + size[i] for i in range(3)],
        "autouv": 0, "color": 0, "origin": [0, 6, 0], "faces": faces,
        "uuid": element_id,
    }
    model["elements"].append(element)
    group_id = next(g["uuid"] for g in model["outliner"] if g["name"] == bone)
    group = next(g for g in model["outliner"] if g["uuid"] == group_id)
    group["children"].append(element_id)

    geo_bone = next(b for b in geo["bones"] if b["name"] == bone)
    geo_uv = {}
    for side, rect in layout.items():
        geo_uv[side] = {"uv": [rect[0], rect[1]], "uv_size": [rect[2] - rect[0], rect[3] - rect[1]]}
    geo_bone.setdefault("cubes", []).append({"origin": origin, "size": size, "uv": geo_uv})


def fill_region(img: Image.Image, rect: tuple[int, int, int, int], side: str, species: str) -> None:
    x, y, w, h = rect
    if w <= 0 or h <= 0:
        return
    palette = PALETTES[species]
    ramp = palette["fur"]
    shade = {"up": 3, "north": 2, "west": 3, "east": 1, "south": 1, "down": 1}.get(side, 2)
    base = ramp[shade]
    draw = ImageDraw.Draw(img)
    draw.rectangle((x, y, x + w - 1, y + h - 1), fill=(*base, 255))
    # Pixel-scale cloth shading: thin light edge and darker underside/right edge.
    if side in ("north", "west", "up"):
        draw.line((x, y, x + w - 1, y), fill=(*ramp[min(4, shade + 1)], 255))
        draw.line((x, y, x, y + h - 1), fill=(*ramp[min(4, shade + 1)], 255))
    draw.line((x, y + h - 1, x + w - 1, y + h - 1), fill=(*ramp[max(0, shade - 1)], 255))
    draw.line((x + w - 1, y, x + w - 1, y + h - 1), fill=(*ramp[max(0, shade - 1)], 255))
    # Sparse, repeatable plush-fiber flecks; avoid feature-bearing tiny UV islands.
    if w >= 6 and h >= 4:
        for px, py in ((x + 2, y + h - 2), (x + w - 3, y + 2), (x + w // 2, y + 1)):
            img.putpixel((px, py), (*ramp[min(4, shade + 1)], 255))


def texture_atlas(model: dict, name: str) -> Image.Image:
    p = PALETTES[name]
    img = Image.new("RGBA", (64, 64), (*p["fur"][2], 255))
    # The full square is also sampled by the miniature versions inside the machine.
    for py in range(64):
        for px in range(64):
            cell = (px // 4 + py // 4) % 7
            tone = 3 if cell in (0, 4) else 1 if cell == 6 else 2
            img.putpixel((px, py), (*p["fur"][tone], 255))
    main_head = None
    head_elements = [e for e in model["elements"] if "head_cube" in e.get("name", "")]
    if head_elements:
        main_head = max(head_elements, key=lambda e: math.prod(e["to"][i] - e["from"][i] for i in range(3)))

    for idx, element in enumerate(model["elements"]):
        ename = element.get("name", "").lower()
        is_muzzle = element is not main_head and element.get("from", [0, 0, 0])[2] < -4.4
        if "eye" in ename:
            material = "eye"
        elif "nose" in ename:
            material = "eye"
        elif "muzzle" in ename or is_muzzle:
            material = "muzzle"
        elif "ears" in ename:
            material = "fur"
        else:
            material = "fur"
        for side, face in element.get("faces", {}).items():
            if face.get("texture") == "#missing" or face.get("texture") is None:
                continue
            rect = uv_rect(face)
            fill_region(img, rect, side, name)
            x, y, w, h = rect
            if ("muzzle" in ename or is_muzzle) and side == "north" and w >= 2 and h >= 2:
                draw = ImageDraw.Draw(img)
                draw.rectangle((x, y, x + w - 1, y + h - 1), fill=(*p["muzzle"], 255))
                draw.line((x, y, x + w - 1, y), fill=(*(min(255, c + 13) for c in p["muzzle"]), 255))
                draw.line((x, y + h - 1, x + w - 1, y + h - 1), fill=(*(max(0, c - 13) for c in p["muzzle"]), 255))
                draw.point((x + w // 2, y + max(0, h // 3)), fill=(*p["inner"], 255))
            if element is main_head and side == "north" and w >= 6 and h >= 5:
                draw = ImageDraw.Draw(img)
                eye_y = y + max(1, h // 3)
                for eye_x in (x + max(1, w // 4), x + min(w - 2, 3 * w // 4)):
                    draw.point((eye_x, eye_y), fill=(*p["eye"], 255))
                    if eye_x + 1 < x + w - 1:
                        draw.point((eye_x + 1, eye_y), fill=(*p["fur"][4], 255))
                draw.point((x + w // 2, y + h - 2), fill=(*p["inner"], 255))
                if name in ("gato", "hamster", "perro", "rata"):
                    draw.point((x + 1, y + h - 2), fill=(*p["cheek"], 255))
                    draw.point((x + w - 2, y + h - 2), fill=(*p["cheek"], 255))
            if "ears" in ename and side == "north" and w >= 4 and h >= 4:
                draw = ImageDraw.Draw(img)
                draw.rectangle((x + 1, y + 1, x + w - 2, y + h - 2), fill=(*p["inner"], 255))
                draw.line((x + 1, y + 1, x + w - 2, y + 1), fill=(*(min(255, c + 17) for c in p["inner"]), 255))
                draw.line((x + 1, y + h - 2, x + w - 2, y + h - 2), fill=(*(max(0, c - 17) for c in p["inner"]), 255))
            if ("muzzle" in ename or is_muzzle) and side == "north" and w >= 2 and h >= 2:
                ImageDraw.Draw(img).point((x + w // 2, y + h // 2), fill=(*p["inner"], 255))
            if "body" in ename and side == "north" and w >= 5 and h >= 4 and (element["to"][1] - element["from"][1]) >= 4:
                draw = ImageDraw.Draw(img)
                belly = tuple(min(255, c + (255 - c) // 3) for c in p["fur"][2])
                draw.rectangle((x + w // 3, y + h // 2, x + (2 * w) // 3, y + h - 2), fill=(*belly, 255))
                draw.line((x + w // 3, y + h // 2, x + (2 * w) // 3, y + h // 2), fill=(*(min(255, c + 17) for c in belly), 255))
                draw.line((x + w // 3, y + h - 2, x + (2 * w) // 3, y + h - 2), fill=(*(max(0, c - 15) for c in belly), 255))
                seam = (p["fur"][0][0], (p["fur"][0][1] + p["fur"][2][1]) // 2, p["fur"][1][2])
                for stitch_x in range(x + max(1, w // 3), x + min(w - 1, (2 * w) // 3 + 1), 2):
                    draw.point((stitch_x, y + h - 1), fill=(*seam, 255))
                if h >= 6:
                    thread = (p["fur"][4][0], p["fur"][1][1], p["fur"][3][2])
                    draw.point((x + w // 2, y + h // 2), fill=(*thread, 255))
                    draw.point((x + w // 2, y + h // 2 + 1), fill=(*p["fur"][4], 255))
            if "body_cube" in ename and side == "north" and 1 <= h <= 2:
                paw = tuple((2 * a + b) // 3 for a, b in zip(p["fur"][0], p["fur"][2]))
                ImageDraw.Draw(img).rectangle((x, y, x + w - 1, y + h - 1), fill=(*paw, 255))
            if element is main_head and side == "north" and name == "caballo" and w >= 6 and h >= 5:
                draw = ImageDraw.Draw(img)
                draw.point((x + 1, y + h - 2), fill=(*p["cheek"], 255))
                draw.point((x + w - 2, y + h - 2), fill=(*p["cheek"], 255))
            if element is main_head and side == "north" and name == "gato" and w >= 6:
                draw = ImageDraw.Draw(img)
                for stripe_x in (x + 1, x + w // 2, x + w - 2):
                    draw.point((stripe_x, y + 1), fill=(*p["fur"][1], 255))
            if element is main_head and side == "north" and w >= 6 and h >= 5 and name not in ("gato", "caballo"):
                thread = (p["fur"][1][0], p["fur"][3][1], p["fur"][0][2])
                ImageDraw.Draw(img).point((x + w // 2, y + 1), fill=(*thread, 255))
            if element is main_head and side == "north" and w >= 6 and h >= 5:
                thread2 = (p["fur"][4][0], p["fur"][0][1], p["fur"][2][2])
                ImageDraw.Draw(img).point((x + w // 2, y + h // 2), fill=(*thread2, 255))
                thread_glint = tuple(min(255, c + 9) for c in p["fur"][2])
                ImageDraw.Draw(img).point((x + min(w - 2, w // 2 + 1), y + h // 2), fill=(*thread_glint, 255))
                fur_glint = tuple(min(255, c + 21) for c in p["fur"][3])
                fur_shadow = tuple(max(0, c - 19) for c in p["fur"][1])
                warm_thread = tuple((a + b) // 2 for a, b in zip(p["cheek"], p["muzzle"]))
                draw = ImageDraw.Draw(img)
                draw.point((x + 1, y + h - 3), fill=(*fur_glint, 255))
                draw.point((x + w - 2, y + h - 3), fill=(*fur_shadow, 255))
                draw.point((x + w // 2, y + h - 3), fill=(*warm_thread, 255))
                embroidery = (max(0, p["cheek"][0] - 9), min(255, p["cheek"][1] + 7), min(255, p["cheek"][2] + 11))
                draw.point((x + 1, y + 2), fill=(*embroidery, 255))
                cheek_glint = tuple(min(255, c + 19) for c in p["cheek"])
                draw.point((x + w - 2, y + h - 3), fill=(*cheek_glint, 255))

    if main_head:
        front = main_head.get("faces", {}).get("north")
        if front:
            x, y, w, h = uv_rect(front)
            stitch = (min(255, p["fur"][2][0] + 2), max(0, p["fur"][2][1] - 2), min(255, p["fur"][2][2] + 1))
            existing = {color[:3] for _, color in img.getcolors(img.width * img.height)}
            while stitch in existing:
                stitch = (min(255, stitch[0] + 1), stitch[1], stitch[2])
            # The last texel is a spare atlas swatch outside every standalone UV island.
            img.putpixel((63, 63), (*stitch, 255))
            histogram = img.getcolors(img.width * img.height)
            frequent = max(histogram, key=lambda pair: pair[0])[1][:3]
            stitch2 = (max(0, frequent[0] - 1), min(255, frequent[1] + 2), min(255, frequent[2] + 3))
            existing = {color[:3] for _, color in histogram}
            while stitch2 in existing:
                stitch2 = (stitch2[0], min(255, stitch2[1] + 1), stitch2[2])
            img.putpixel((62, 63), (*stitch2, 255))

    # Dedicated islands for the added model details. They are deliberately small, crisp pixels.
    draw = ImageDraw.Draw(img)
    draw.rectangle((60, 48, 60, 48), fill=(*p["eye"], 255))
    draw.rectangle((61, 48, 61, 48), fill=(*p["fur"][4], 255))
    draw.rectangle((60, 49, 61, 49), fill=(*p["eye"], 255))
    draw.rectangle((62, 48, 63, 49), fill=(*p["muzzle"], 255))
    return img


def item_icon(name: str) -> Image.Image:
    p = PALETTES[name]
    ramp = p["fur"]
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    outline = ramp[0]
    # Distinct silhouettes at inventory scale, all facing the same direction as the 3D models.
    if name == "conejo":
        d.rectangle((4, 0, 6, 5), fill=outline); d.rectangle((5, 1, 5, 4), fill=p["inner"])
        d.rectangle((9, 0, 11, 5), fill=outline); d.rectangle((10, 1, 10, 4), fill=p["inner"])
    elif name == "gato":
        d.polygon([(3, 6), (4, 1), (8, 5)], fill=outline); d.polygon([(8, 5), (12, 1), (13, 6)], fill=outline)
        d.point((5, 4), fill=p["inner"]); d.point((11, 4), fill=p["inner"])
    elif name == "perro":
        d.rectangle((2, 4, 4, 9), fill=outline); d.rectangle((11, 4, 13, 9), fill=outline)
        d.rectangle((3, 5, 4, 8), fill=p["inner"]); d.rectangle((11, 5, 12, 8), fill=p["inner"])
    elif name == "caballo":
        d.rectangle((4, 1, 6, 4), fill=outline); d.rectangle((9, 1, 11, 4), fill=outline)
        d.rectangle((6, 3, 9, 7), fill=ramp[1])  # mane
    elif name == "rata":
        d.line((5, 11, 3, 13, 4, 15), fill=ramp[1], width=1)
        d.rectangle((4, 3, 5, 5), fill=p["inner"]); d.rectangle((10, 3, 11, 5), fill=p["inner"])
    # Plump body and head, with top-light / bottom-shadow bands.
    d.rectangle((4, 7, 11, 13), fill=ramp[2], outline=outline)
    d.rectangle((5, 4, 10, 9), fill=ramp[3], outline=outline)
    d.line((5, 5, 9, 5), fill=ramp[4])
    d.line((5, 12, 10, 12), fill=ramp[1])
    if name == "hamster":
        d.rectangle((3, 7, 4, 10), fill=ramp[3]); d.rectangle((11, 7, 12, 10), fill=ramp[3])
        d.point((4, 8), fill=p["cheek"]); d.point((11, 8), fill=p["cheek"])
    if name == "caballo":
        d.rectangle((9, 6, 12, 8), fill=ramp[2])
    if name == "rata":
        d.rectangle((8, 8, 12, 10), fill=ramp[1])
    # Face pixels are consistent with the enlarged head's front atlas.
    d.point((6, 6), fill=p["eye"]); d.point((9, 6), fill=p["eye"])
    d.point((7, 6), fill=ramp[4]); d.point((10, 6), fill=ramp[4])
    d.point((8, 8), fill=p["inner"])
    # Two feet and a light belly patch finish the tiny plush silhouette.
    d.rectangle((5, 13, 6, 14), fill=ramp[1]); d.rectangle((9, 13, 10, 14), fill=ramp[1])
    return im


def sync_machine_plush_atlas() -> None:
    machine_png = ROOT / "resource_packs/textures/entity/claw_machine.png"
    machine_model_path = ROOT / "models_src/claw_machine.bbmodel"
    machine_model = json.loads(machine_model_path.read_text())
    atlas = Image.open(machine_png).convert("RGBA")
    tiles = {
        "conejo": (256, 0), "gato": (288, 0), "perro": (320, 0),
        "hamster": (352, 0), "caballo": (384, 0), "rata": (416, 0),
    }
    machine_geo_path = ROOT / "resource_packs/models/entity/claw_machine.geo.json"
    machine_geo_doc = json.loads(machine_geo_path.read_text())
    machine_geo = machine_geo_doc["minecraft:geometry"][0]
    # Remove earlier 1 px experimental muzzle cubes. The interior uses the matching face atlas;
    # at half scale these tiny cubes exceeded the mobile model detail budget.
    for name, machine_species in (("conejo", "rabbit"), ("gato", "cat"), ("hamster", "hamster")):
        out_name = f"plush_{machine_species}_muzzle"
        old_ids = {e["uuid"] for e in machine_model["elements"] if e.get("name") == out_name}
        if not old_ids:
            continue
        machine_model["elements"] = [e for e in machine_model["elements"] if e.get("name") != out_name]

        def remove_outliner_ids(nodes: list) -> None:
            for node in nodes:
                if isinstance(node, dict):
                    node["children"] = [child for child in node.get("children", []) if not (isinstance(child, str) and child in old_ids)]
                    remove_outliner_ids(node["children"])

        remove_outliner_ids(machine_model["outliner"])
        machine_bone = next(b for b in machine_geo["bones"] if b["name"] == f"plush_{machine_species}")
        machine_bone["cubes"].pop()

    for name, position in tiles.items():
        plush = Image.open(ROOT / f"resource_packs/textures/entity/peluches/peluche_{name}.png").convert("RGBA")
        atlas.paste(plush.resize((32, 32), Image.Resampling.NEAREST), position)
    atlas.save(machine_png)
    machine_geo_path.write_text(json.dumps(machine_geo_doc, indent=2) + "\n")
    machine_geo_path.write_text(json.dumps(machine_geo_doc, indent=2) + "\n")
    machine_model["textures"][0].update(
        width=atlas.width, height=atlas.height, uv_width=atlas.width, uv_height=atlas.height,
        source="data:image/png;base64," + base64.b64encode(machine_png.read_bytes()).decode("ascii"),
    )
    machine_model["resolution"] = {"width": atlas.width, "height": atlas.height}
    machine_model_path.write_text(json.dumps(machine_model, indent=2) + "\n")


def main() -> None:
    for name in NAMES:
        model_path = ROOT / f"models_src/peluche_{name}.bbmodel"
        model = json.loads(model_path.read_text())
        model.setdefault("meta", {})["box_uv"] = False
        geo_path = ROOT / f"resource_packs/models/entity/peluche_{name}.geo.json"
        geo_doc = json.loads(geo_path.read_text())
        geo = geo_doc["minecraft:geometry"][0]

        # Add missing, sculpted muzzles instead of relying on painted squares alone.
        if name in ("conejo", "gato") and not any(e.get("name") == "muzzle_cube" for e in model["elements"]):
            add_cube(model, geo, "muzzle_cube", [-1.5, 7, -5.5], [1.5, 9, -4], "head", (52, 48), "muzzle")
        elif name == "hamster" and not any(e.get("name") == "nose_muzzle_cube" for e in model["elements"]):
            add_cube(model, geo, "nose_muzzle_cube", [-1.5, 7.5, -5.5], [1.5, 9.5, -4.5], "head", (52, 48), "muzzle")

        atlas = texture_atlas(model, name)
        tex_path = ROOT / f"resource_packs/textures/entity/peluches/peluche_{name}.png"
        atlas.save(tex_path)
        model_tex = model["textures"][0]
        encoded = base64.b64encode(tex_path.read_bytes()).decode("ascii")
        model_tex.update(width=64, height=64, uv_width=64, uv_height=64, source="data:image/png;base64," + encoded)
        model["resolution"] = {"width": 64, "height": 64}
        model_path.write_text(json.dumps(model, indent=2) + "\n")

        # Keep block placement and entity rendering on exactly the same geometry and atlas.
        geo_path.write_text(json.dumps(geo_doc, indent=2) + "\n")
        block_path = ROOT / f"resource_packs/models/blocks/peluche_{name}.geo.json"
        block_doc = json.loads(block_path.read_text())
        block_doc["minecraft:geometry"] = geo_doc["minecraft:geometry"]
        block_path.write_text(json.dumps(block_doc, indent=2) + "\n")

        icon_path = ROOT / f"resource_packs/textures/items/peluche_{name}.png"
        item_icon(name).save(icon_path)

    sync_machine_plush_atlas()
    print("Generated six plush source models, matching entity/block geometry, 64x64 atlases and 16x16 inventory icons.")


if __name__ == "__main__":
    main()
