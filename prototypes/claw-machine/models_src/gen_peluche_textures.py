"""Paint the six plush UV sheets and refresh their in-machine atlas tiles."""

import base64
import colorsys
import hashlib
import json
import math
import random
from pathlib import Path

from PIL import Image


def ramp(base, n=5):
    """A small hue-shifted pixel-art ramp, darkest to lightest."""
    rgb = tuple(int(base[i:i + 2], 16) for i in (1, 3, 5))
    h, s, v = colorsys.rgb_to_hsv(*(c / 255 for c in rgb))
    result = []
    for i in range(n):
        centered = (i / (n - 1) - 0.5) * 2
        target = 0.70 if centered < 0 else 0.12
        amount = 0.12 * abs(centered)
        shifted_hue = (h + (((target - h + 0.5) % 1.0) - 0.5) * amount) % 1.0
        saturation = max(0, min(1, s + 0.08 * (1 - abs(centered)) - 0.10 * max(0, centered)))
        brightness = v * (1 + centered * 0.5) if centered < 0 else v + centered * 0.30
        channels = colorsys.hsv_to_rgb(shifted_hue, saturation, max(0.10, min(0.97, brightness)))
        result.append(tuple(round(c * 255) for c in channels))
    return result


class Tex:
    def __init__(self, width, height, fill):
        self.img = Image.new("RGBA", (width, height), fill)
        self.px = self.img.load()

    def pixel(self, x, y, color):
        if 0 <= x < self.img.width and 0 <= y < self.img.height:
            self.px[x, y] = (*color[:3], 255)

    def rect(self, x, y, width, height, color):
        for yy in range(y, y + height):
            for xx in range(x, x + width):
                self.pixel(xx, yy, color)

    def hline(self, x, y, length, color):
        self.rect(x, y, length, 1, color)

    def vline(self, x, y, length, color):
        self.rect(x, y, 1, length, color)

    def bevel(self, x, y, width, height, colors):
        for xx in range(x, x + width):
            self.pixel(xx, y, colors[-1])
            self.pixel(xx, y + height - 1, colors[0])
        for yy in range(y, y + height):
            self.pixel(x, yy, colors[-1])
            self.pixel(x + width - 1, yy, colors[0])
        self.pixel(x + width - 1, y, colors[len(colors) // 2])
        self.pixel(x, y + height - 1, colors[len(colors) // 2])

    def noise(self, x, y, width, height, colors, density, seed):
        rng = random.Random(seed)
        for yy in range(y, y + height):
            for xx in range(x, x + width):
                if rng.random() < density:
                    base = self.px[xx, yy][:3]
                    if base in colors:
                        index = colors.index(base)
                        self.pixel(xx, yy, colors[max(0, min(len(colors) - 1, index + rng.choice((-1, 1))))])

    def save(self, path):
        self.img.save(path, "PNG")
        print(f"saved {path} ({self.img.width}x{self.img.height})")

ROOT = Path(__file__).resolve().parents[1]
ANIMALS = {
    "conejo": {"fur": "#e4a5bb", "light": "#f6dbe4", "detail": "#c77799", "blush": "#ed8f9f", "tile": 256},
    "gato": {"fur": "#d68d51", "light": "#f2d3a6", "detail": "#a85e40", "blush": "#f1a977", "tile": 288},
    "perro": {"fur": "#bb8a63", "light": "#ead1ad", "detail": "#76563f", "blush": "#de9c91", "tile": 320},
    "hamster": {"fur": "#e8b65e", "light": "#f5dfae", "detail": "#d88971", "blush": "#f29e9a", "tile": 352},
    "caballo": {"fur": "#9f6d50", "light": "#d9b28d", "detail": "#64434a", "blush": "#ce947b", "tile": 384},
    "rata": {"fur": "#aeb9c9", "light": "#e1dce2", "detail": "#c38f9f", "blush": "#d99cac", "tile": 416},
}
EYE = (40, 38, 50)
GLINT = (250, 244, 236)


def uv_rect(face):
    u1, v1, u2, v2 = face["uv"]
    x = math.floor(min(u1, u2))
    y = math.floor(min(v1, v2))
    return x, y, math.ceil(max(u1, u2)) - x, math.ceil(max(v1, v2)) - y


def paint_face(tex, rect, colors, direction, seed):
    x, y, w, h = rect
    shade = {"north": 2, "east": 1, "south": 1, "west": 2, "up": 3, "down": 0}[direction]
    tex.rect(x, y, w, h, colors[shade])
    if w >= 3 and h >= 3:
        tex.bevel(x, y, w, h, colors)
        if w >= 5 and h >= 4:
            tex.noise(x + 1, y + 1, w - 2, h - 2, colors, density=0.12, seed=seed)
    elif h >= 2:
        tex.hline(x, y, w, colors[3])
        tex.hline(x, y + h - 1, w, colors[0])


def face_details(tex, animal, index, name, direction, rect, colors):
    x, y, w, h = rect
    if direction == "south" and name == "body_cube" and index == 0 and w >= 6 and h >= 5:
        for step in range(5):
            tex.pixel(x + w // 2, y + 1 + step, colors["thread"][step])
    if direction == "south" and name == "head_cube" and index == (3 if animal == "hamster" else 4):
        for step, color in enumerate((colors["light"][0], colors["light"][3], colors["detail"][4])):
            tex.pixel(x + 2 + step, y + 2, color)
    if direction != "north":
        return
    if name == "body_cube" and index == 0 and w >= 6 and h >= 5:
        tex.rect(x + 2, y + 2, w - 4, h - 3, colors["light"][2])
        tex.pixel(x + w // 2, y + h - 2, colors["fur"][0])
        for step in range(4):
            tex.pixel(x + 2 + step % 2, y + 2 + step // 2, colors["thread"][step + 1])
        tex.pixel(x + 2, y + 2, colors["light"][4])
        tex.pixel(x + w - 3, y + 2, colors["light"][1])
        tex.pixel(x + 2, y + h - 2, colors["light"][3])
    if name == "head_cube" and index == (3 if animal == "hamster" else 4):
        if w >= 7 and h >= 6:
            for eye_x in (x + 1, x + w - 3):
                tex.rect(eye_x, y + 2, 2, 2, EYE)
                tex.pixel(eye_x, y + 2, GLINT)
            if animal == "hamster":
                tex.pixel(x + 1, y + 4, colors["blush"][2])
                tex.pixel(x + w - 2, y + 4, colors["blush"][2])
                tex.pixel(x + 1, y + 5, (250, 225, 191))
                tex.pixel(x + w - 2, y + 5, (250, 225, 191))
            else:
                tex.pixel(x + 1, y + 5, colors["blush"][2])
                tex.pixel(x + w - 2, y + 5, colors["blush"][3])
            tex.pixel(x + w // 2, y + 5, colors["blush"][0])
            tex.pixel(x + w // 2 - 1, y + 4, colors["blush"][4])
            if animal == "gato":
                tex.pixel(x + 3, y + 1, colors["detail"][1])
                tex.pixel(x + 4, y + 1, colors["detail"][1])
                tex.pixel(x, y + 4, colors["detail"][1])
                tex.pixel(x + w - 1, y + 4, colors["detail"][1])
            if animal == "caballo":
                tex.vline(x + w // 2, y, 3, colors["light"][3])
    if name == "ears_cube" and not (animal == "perro" and index == 7):
        if h >= 2:
            tex.vline(x + max(0, w // 2), y + 1, h - 1, colors["blush"][1])
            tex.pixel(x + max(0, w // 2), y + h - 1, colors["blush"][3])
    if name in ("muzzle_cube", "nose_muzzle_cube") or (animal == "perro" and index == 7):
        tex.pixel(x + w // 2, y, EYE if animal != "conejo" else colors["blush"][0])
        if h >= 2:
            tex.pixel(x + w // 2, y + 1, colors["detail"][0])
    if animal == "caballo" and index == 5 and name == "head_cube" and w >= 4:
        tex.pixel(x + 1, y + h - 2, colors["detail"][0])
        tex.pixel(x + w - 2, y + h - 2, colors["detail"][0])
    if animal == "caballo" and index == 6 and name == "head_cube":
        tex.vline(x, y, h, colors["detail"][0])
    if animal == "rata" and index == 5 and name == "head_cube":
        tex.pixel(x + w // 2, y + h - 1, colors["detail"][3])


def embed(model_path, png_path):
    model = json.loads(model_path.read_text())
    texture = model["textures"][0]
    image = Image.open(png_path)
    texture.update(
        width=image.width,
        height=image.height,
        uv_width=image.width,
        uv_height=image.height,
        source="data:image/png;base64," + base64.b64encode(png_path.read_bytes()).decode("ascii"),
    )
    model["resolution"] = {"width": image.width, "height": image.height}
    model_path.write_text(json.dumps(model, indent=2) + "\n")


def main():
    atlas_path = ROOT / "resource_packs/textures/entity/claw_machine.png"
    atlas = Image.open(atlas_path).convert("RGBA")
    for animal, spec in ANIMALS.items():
        name = f"peluche_{animal}"
        model_path = ROOT / "models_src" / f"{name}.bbmodel"
        png_path = ROOT / "resource_packs/textures/entity/peluches" / f"{name}.png"
        model = json.loads(model_path.read_text())
        colors = {key: ramp(spec[key], n=5) for key in ("fur", "light", "detail", "blush")}
        colors["thread"] = ramp("#e8dec9", n=5)
        tex = Tex(64, 64, colors["fur"][0])
        for index, element in enumerate(model["elements"]):
            category = "fur"
            if element["name"] in ("muzzle_cube", "nose_muzzle_cube"):
                category = "light"
            elif element["name"] == "ears_cube":
                category = "detail" if animal == "perro" and index in (5, 6) else "fur"
            elif animal == "hamster" and index == 4:
                category = "light"
            elif animal == "caballo" and index == 6:
                category = "detail"
            elif animal == "rata" and index == 3:
                category = "detail"
            for direction, face in element["faces"].items():
                rect = uv_rect(face)
                seed = int.from_bytes(hashlib.sha1(f"{name}:{index}:{direction}".encode()).digest()[:4], "big")
                paint_face(tex, rect, colors[category], direction, seed)
                face_details(tex, animal, index, element["name"], direction, rect, colors)
        tex.save(png_path)
        embed(model_path, png_path)
        atlas.paste(tex.img.resize((32, 32), Image.Resampling.NEAREST), (spec["tile"], 0))
    atlas.save(atlas_path)
    embed(ROOT / "models_src/claw_machine.bbmodel", atlas_path)


if __name__ == "__main__":
    main()
