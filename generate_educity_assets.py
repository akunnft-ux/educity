#!/usr/bin/env python3
"""
EduCity Asset Generator v2 (siap development)

Menghasilkan:
  - SVG (sumber vektor) + PNG (siap import engine) untuk semua aset
  - Spritesheet karakter (4 arah x 4 frame), tileset atlas, item, VFX
  - Audio WAV (SFX + BGM loop) dibuat dari nol, tanpa dependensi
  - assets.json (manifest), README.md, dan ZIP akhir

Grid dasar: 32 px. Karakter 32x32, tile 32x32, bangunan 64x64, pohon 32x64.

Pemakaian:
  pip install cairosvg pillow
  python generate_educity_assets.py                # PNG 1x
  python generate_educity_assets.py --scale 2      # PNG 2x (tajam di layar HiDPI)
  python generate_educity_assets.py --no-png       # hanya SVG
"""
import argparse
import json
import math
import os
import shutil
import struct
import wave
import zipfile

try:
    import cairosvg
    from PIL import Image
    HAS_RASTER = True
except ImportError:
    HAS_RASTER = False

PAL = dict(
    grass="#4caf50", grass_d="#3d8b40",
    path="#d9a05b", path_d="#b9803f",
    water="#3b8fd9", water_l="#9fd0f5", water_d="#2a6db0",
    sand="#f2d98d", sand_d="#d9bf6e",
    wood="#8d5a2b", wood_d="#6b4220", wood_l="#a9753f",
    outline="#2c3e50",
)

ASSETS = {}  # "kategori/nama" -> (w, h, svg)


def svg(w, h, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
            f'viewBox="0 0 {w} {h}">{body}</svg>')


def add(path, w, h, body):
    ASSETS[path] = (w, h, svg(w, h, body))


def star_pts(cx, cy, R, r, n=5):
    pts = []
    for i in range(n * 2):
        a = -math.pi / 2 + i * math.pi / n
        rad = R if i % 2 == 0 else r
        pts.append(f"{cx + rad * math.cos(a):.1f},{cy + rad * math.sin(a):.1f}")
    return " ".join(pts)


# ------------------------------------------------------------------ KARAKTER
DIRS = ["down", "left", "right", "up"]  # urutan baris spritesheet
CHARS = {
    "player": dict(shirt="#3498db", skin="#f1c27d", hair="#3b2a1a", pants="#2c3e50", extra=""),
    "npc_teacher": dict(shirt="#95a5a6", skin="#e0ac69", hair="#2c3e50", pants="#34495e",
                        extra='<rect x="8" y="1" width="16" height="3" fill="#222"/>'
                              '<rect x="13" y="3" width="6" height="3" fill="#222"/>'),
    "npc_student": dict(shirt="#27ae60", skin="#f1c27d", hair="#8d5a2b", pants="#2c3e50", extra=""),
    "npc_merchant": dict(shirt="#e67e22", skin="#c68642", hair="#222222", pants="#6b4220",
                         extra='<rect x="9" y="2" width="14" height="4" rx="2" fill="#8d5a2b"/>'),
}


def character(d, f, shirt, skin, hair, pants, extra):
    s = (0, 2, 0, -2)[f]
    bob = -1 if f in (1, 3) else 0
    y = 9 + bob
    p = ['<ellipse cx="16" cy="30" rx="8" ry="2" fill="#000" opacity=".18"/>']
    if d in ("down", "up"):
        lh, rh = 6 - max(s, 0), 6 - max(-s, 0)
        p.append(f'<rect x="11" y="24" width="4" height="{lh}" fill="{pants}"/>'
                 f'<rect x="17" y="24" width="4" height="{rh}" fill="{pants}"/>')
        p.append(f'<rect x="7" y="{15 + bob + (1 if s > 0 else 0)}" width="3" height="8" rx="1.5" fill="{skin}"/>'
                 f'<rect x="22" y="{15 + bob + (1 if s < 0 else 0)}" width="3" height="8" rx="1.5" fill="{skin}"/>')
    else:
        p.append(f'<rect x="{14 + s}" y="24" width="4" height="6" fill="{pants}"/>'
                 f'<rect x="{14 - s}" y="24" width="4" height="6" fill="{pants}"/>')
    p.append(f'<rect x="10" y="{14 + bob}" width="12" height="11" rx="3" fill="{shirt}"/>')
    if d in ("left", "right"):
        p.append(f'<rect x="{14 - s // 2}" y="{15 + bob}" width="4" height="8" rx="2" fill="{skin}"/>')
    p.append(f'<circle cx="16" cy="{y}" r="6" fill="{skin}"/>')
    if d == "up":
        p.append(f'<circle cx="16" cy="{y}" r="6.2" fill="{hair}"/>')
    else:
        p.append(f'<path d="M10 {y - 1}A6 6 0 0 1 22 {y - 1}Z" fill="{hair}"/>')
        if d == "right":
            p.append(f'<path d="M16 {y - 6}A6 6 0 0 0 16 {y + 6}Z" fill="{hair}"/>'
                     f'<circle cx="19.5" cy="{y + 1}" r="1" fill="#222"/>')
        elif d == "left":
            p.append(f'<path d="M16 {y - 6}A6 6 0 0 1 16 {y + 6}Z" fill="{hair}"/>'
                     f'<circle cx="12.5" cy="{y + 1}" r="1" fill="#222"/>')
        else:
            p.append(f'<circle cx="13.5" cy="{y + 1}" r="1" fill="#222"/>'
                     f'<circle cx="18.5" cy="{y + 1}" r="1" fill="#222"/>')
    p.append(extra)
    return "".join(p)


def build_characters():
    for name, c in CHARS.items():
        for d in DIRS:
            for f in range(4):
                add(f"characters/{name}_{d}_{f}", 32, 32,
                    character(d, f, c["shirt"], c["skin"], c["hair"], c["pants"], c["extra"]))


# ------------------------------------------------------------------ TILE
def grass_body(v=0):
    spots = [(8, 8), (24, 20), (14, 26)] if v == 0 else [(22, 6), (6, 22), (26, 28)]
    s = f'<rect width="32" height="32" fill="{PAL["grass"]}"/>'
    for x, y in spots:
        s += (f'<path d="M{x} {y}l2 -4 2 4zM{x + 4} {y}l2 -3 2 3z" fill="{PAL["grass_d"]}"/>')
    return s


def water_body(f):
    x0 = -16 + f * 4
    wave1 = f'M{x0} 10q4 -4 8 0t8 0t8 0t8 0t8 0t8 0t8 0t8 0'
    wave2 = f'M{x0 - 8} 24q4 -4 8 0t8 0t8 0t8 0t8 0t8 0t8 0t8 0'
    return (f'<rect width="32" height="32" fill="{PAL["water"]}"/>'
            f'<path d="{wave1}" fill="none" stroke="{PAL["water_l"]}" stroke-width="2"/>'
            f'<path d="{wave2}" fill="none" stroke="{PAL["water_d"]}" stroke-width="2"/>')


EDGE = "M0 0H32V10Q24 15 16 10T0 10Z"
EDGE_B = "M32 10Q24 15 16 10T0 10"
OUTER = "M0 0H14Q14 14 0 14Z"
OUTER_B = "M14 0Q14 14 0 14"
INNER = "M0 0H12Q12 12 0 12Z"


def blob_tiles(name, over, border):
    g = grass_body(0)
    for side, ang in zip("nesw", (0, 90, 180, 270)):
        add(f"tiles/{name}_edge_{side}", 32, 32,
            f'{g}<g transform="rotate({ang} 16 16)"><path d="{EDGE}" fill="{over}"/>'
            f'<path d="{EDGE_B}" fill="none" stroke="{border}" stroke-width="2"/></g>')
    for c, ang in zip(("nw", "ne", "se", "sw"), (0, 90, 180, 270)):
        add(f"tiles/{name}_outer_{c}", 32, 32,
            f'{g}<g transform="rotate({ang} 16 16)"><path d="{OUTER}" fill="{over}"/>'
            f'<path d="{OUTER_B}" fill="none" stroke="{border}" stroke-width="2"/></g>')
        add(f"tiles/{name}_inner_{c}", 32, 32,
            f'<rect width="32" height="32" fill="{over}"/>'
            f'<g transform="rotate({ang} 16 16)"><path d="{INNER}" fill="{PAL["grass"]}"/></g>')


def build_tiles():
    add("tiles/grass_a", 32, 32, grass_body(0))
    add("tiles/grass_b", 32, 32, grass_body(1))
    add("tiles/path", 32, 32,
        f'<rect width="32" height="32" fill="{PAL["path"]}"/>'
        f'<ellipse cx="7" cy="7" rx="3" ry="2" fill="{PAL["path_d"]}"/>'
        f'<ellipse cx="22" cy="17" rx="4" ry="2" fill="{PAL["path_d"]}"/>'
        f'<ellipse cx="11" cy="26" rx="3" ry="1.5" fill="{PAL["path_d"]}"/>')
    add("tiles/sand", 32, 32,
        f'<rect width="32" height="32" fill="{PAL["sand"]}"/>'
        f'<circle cx="8" cy="9" r="1.2" fill="{PAL["sand_d"]}"/><circle cx="23" cy="14" r="1.2" fill="{PAL["sand_d"]}"/>'
        f'<circle cx="14" cy="25" r="1.2" fill="{PAL["sand_d"]}"/>')
    for f in range(4):
        add(f"tiles/water_{f}", 32, 32, water_body(f))
    blob_tiles("path", PAL["path"], PAL["path_d"])
    blob_tiles("water", PAL["water"], PAL["water_l"])
    # interior floor
    add("tiles/floor_wood", 32, 32,
        '<rect width="32" height="32" fill="#c68b4f"/>'
        '<path d="M0 8H32M0 16H32M0 24H32" stroke="#a9753f" stroke-width="1.5"/>'
        '<path d="M10 0V8M24 8V16M8 16V24M20 24V32" stroke="#a9753f" stroke-width="1.5"/>')
    add("tiles/floor_tile", 32, 32,
        '<rect width="32" height="32" fill="#ecf0f1"/><rect width="16" height="16" fill="#dfe6e9"/>'
        '<rect x="16" y="16" width="16" height="16" fill="#dfe6e9"/>')
    add("tiles/wall_interior", 32, 32,
        '<rect width="32" height="32" fill="#f3e5ab"/><rect y="24" width="32" height="8" fill="#b08968"/>'
        '<rect y="23" width="32" height="2" fill="#8d6e63"/>')
    add("tiles/carpet", 32, 32,
        '<rect width="32" height="32" fill="#c0392b"/><rect x="3" y="3" width="26" height="26" fill="none" '
        'stroke="#f1c40f" stroke-width="2"/>')


# ------------------------------------------------------------------ DEKORASI
def build_environment():
    add("environment/tree", 32, 64, (
        '<ellipse cx="16" cy="60" rx="10" ry="3" fill="#000" opacity=".2"/>'
        f'<rect x="13" y="36" width="6" height="24" fill="{PAL["wood"]}"/>'
        '<circle cx="16" cy="22" r="14" fill="#2e8b57"/><circle cx="9" cy="28" r="8" fill="#3cb371"/>'
        '<circle cx="23" cy="28" r="8" fill="#3cb371"/><circle cx="16" cy="16" r="8" fill="#4cc27f"/>'))
    add("environment/bush", 32, 32,
        '<ellipse cx="16" cy="28" rx="11" ry="3" fill="#000" opacity=".18"/>'
        '<circle cx="10" cy="20" r="8" fill="#2e8b57"/><circle cx="22" cy="20" r="8" fill="#2e8b57"/>'
        '<circle cx="16" cy="15" r="9" fill="#3cb371"/>')
    for n, col in (("red", "#e74c3c"), ("yellow", "#f1c40f")):
        add(f"environment/flower_{n}", 32, 32,
            '<rect x="15" y="16" width="2" height="10" fill="#2e8b57"/>'
            f'<circle cx="16" cy="13" r="3" fill="{col}"/><circle cx="12" cy="15" r="3" fill="{col}"/>'
            f'<circle cx="20" cy="15" r="3" fill="{col}"/><circle cx="16" cy="12" r="2" fill="#fff"/>')
    add("environment/rock", 32, 32,
        '<ellipse cx="16" cy="27" rx="11" ry="3" fill="#000" opacity=".18"/>'
        '<path d="M5 26L8 14L16 8L25 12L28 26Z" fill="#95a5a6"/><path d="M8 14L16 8L16 26H5Z" fill="#b2bec3"/>')
    add("environment/fence_h", 32, 32,
        f'<rect x="2" y="12" width="4" height="16" fill="{PAL["wood"]}"/><rect x="26" y="12" width="4" height="16" fill="{PAL["wood"]}"/>'
        f'<rect x="0" y="15" width="32" height="3" fill="{PAL["wood_l"]}"/><rect x="0" y="22" width="32" height="3" fill="{PAL["wood_l"]}"/>')
    add("environment/fence_v", 32, 32,
        f'<rect x="13" y="0" width="6" height="32" fill="{PAL["wood"]}"/>'
        f'<rect x="11" y="4" width="10" height="3" fill="{PAL["wood_l"]}"/><rect x="11" y="14" width="10" height="3" fill="{PAL["wood_l"]}"/>'
        f'<rect x="11" y="24" width="10" height="3" fill="{PAL["wood_l"]}"/>')
    add("environment/bench", 32, 32,
        f'<rect x="3" y="14" width="26" height="5" rx="1" fill="{PAL["wood_l"]}"/>'
        f'<rect x="3" y="8" width="26" height="4" rx="1" fill="{PAL["wood"]}"/>'
        f'<rect x="6" y="19" width="3" height="8" fill="{PAL["wood_d"]}"/><rect x="23" y="19" width="3" height="8" fill="{PAL["wood_d"]}"/>')
    add("environment/signpost", 32, 32,
        f'<rect x="14" y="10" width="4" height="20" fill="{PAL["wood_d"]}"/>'
        f'<rect x="4" y="4" width="24" height="12" rx="2" fill="{PAL["wood_l"]}" stroke="{PAL["wood_d"]}" stroke-width="2"/>'
        '<path d="M9 10H23" stroke="#fff" stroke-width="2"/>')
    add("environment/lamppost", 32, 64,
        '<rect x="14" y="14" width="4" height="46" fill="#34495e"/><rect x="10" y="58" width="12" height="4" fill="#2c3e50"/>'
        '<rect x="9" y="4" width="14" height="12" rx="3" fill="#f9e79f" stroke="#34495e" stroke-width="2"/>')


# ------------------------------------------------------------------ BANGUNAN
EMBLEMS = {
    "knowledge": '<rect x="26" y="15" width="6" height="10" fill="#1565c0"/><rect x="32" y="15" width="6" height="10" fill="#42a5f5"/>',
    "challenge": ('<path d="M27 15L37 25M37 15L27 25" stroke="#444" stroke-width="2.5"/>'
                  '<path d="M26 17L29 14M35 14L38 17" stroke="#b9770e" stroke-width="2"/>'),
    "shop": '<circle cx="32" cy="20" r="5.5" fill="#f1c40f" stroke="#d68910" stroke-width="1.5"/>',
    "school": '<rect x="29" y="14" width="1.5" height="12" fill="#444"/><polygon points="30.5,14 39,17.5 30.5,21" fill="#e74c3c"/>',
    "house": "",
}
BUILDINGS = {
    "knowledge": ("#2ecc71", "#27ae60"),
    "challenge": ("#e74c3c", "#c0392b"),
    "shop": ("#f39c12", "#d35400"),
    "school": ("#3498db", "#2471a3"),
    "house": ("#ecf0f1", "#a04000"),
}


def build_buildings():
    for n, (wall, roof) in BUILDINGS.items():
        add(f"buildings/{n}", 64, 64, (
            '<ellipse cx="32" cy="62" rx="28" ry="3" fill="#000" opacity=".2"/>'
            f'<rect x="8" y="26" width="48" height="36" fill="{wall}"/>'
            f'<polygon points="2,28 32,4 62,28" fill="{roof}"/>'
            '<circle cx="32" cy="20" r="8" fill="#fff" opacity=".9"/>' + EMBLEMS[n] +
            f'<rect x="26" y="44" width="12" height="18" rx="2" fill="{PAL["wood"]}"/><circle cx="35" cy="53" r="1.2" fill="#f1c40f"/>'
            '<rect x="12" y="34" width="10" height="10" fill="#aed6f1" stroke="#2c3e50" stroke-width="1.5"/>'
            '<rect x="42" y="34" width="10" height="10" fill="#aed6f1" stroke="#2c3e50" stroke-width="1.5"/>'))


def build_interior():
    add("interior/desk", 64, 32,
        f'<rect x="2" y="8" width="60" height="8" rx="2" fill="{PAL["wood_l"]}"/><rect x="6" y="16" width="4" height="14" fill="{PAL["wood_d"]}"/>'
        f'<rect x="54" y="16" width="4" height="14" fill="{PAL["wood_d"]}"/>')
    add("interior/chair", 32, 32,
        f'<rect x="9" y="4" width="14" height="12" rx="2" fill="{PAL["wood"]}"/><rect x="8" y="16" width="16" height="5" rx="2" fill="{PAL["wood_l"]}"/>'
        f'<rect x="10" y="21" width="3" height="8" fill="{PAL["wood_d"]}"/><rect x="19" y="21" width="3" height="8" fill="{PAL["wood_d"]}"/>')
    add("interior/chalkboard", 64, 32,
        f'<rect x="2" y="2" width="60" height="24" rx="2" fill="{PAL["wood"]}"/><rect x="5" y="5" width="54" height="18" fill="#1e6b52"/>'
        '<path d="M10 11H30M10 17H22M38 12L46 12M42 8V16" stroke="#ecf0f1" stroke-width="1.5"/>'
        f'<rect x="8" y="26" width="48" height="3" fill="{PAL["wood_d"]}"/>')
    books = ["#e74c3c", "#3498db", "#f1c40f", "#9b59b6", "#2ecc71"]
    shelf = f'<rect x="2" y="2" width="28" height="60" fill="{PAL["wood"]}"/>'
    for row in range(3):
        shelf += f'<rect x="4" y="{20 + row * 18}" width="24" height="2" fill="{PAL["wood_d"]}"/>'
        for i, c in enumerate(books):
            shelf += f'<rect x="{5 + i * 4.6:.1f}" y="{6 + row * 18}" width="4" height="14" fill="{c}"/>'
    add("interior/bookshelf", 32, 64, shelf)


# ------------------------------------------------------------------ ITEM
def build_items():
    for f, rx in enumerate((14, 9, 3, 9)):
        add(f"items/coin_{f}", 32, 32,
            f'<ellipse cx="16" cy="16" rx="{rx}" ry="14" fill="#f1c40f" stroke="#d68910" stroke-width="2"/>'
            f'<ellipse cx="16" cy="16" rx="{max(rx - 5, 1)}" ry="9" fill="none" stroke="#d68910" stroke-width="1.5"/>')
    add("items/book", 32, 32,
        '<rect x="6" y="4" width="20" height="24" fill="#34495e" rx="2"/><rect x="8" y="6" width="16" height="20" fill="#ecf0f1"/>'
        '<path d="M10 10H22M10 16H22M10 21H18" stroke="#bdc3c7" stroke-width="2"/>')
    add("items/key", 32, 32,
        '<circle cx="10" cy="16" r="6" fill="none" stroke="#f1c40f" stroke-width="3"/>'
        '<path d="M16 16H28M24 16V21M28 16V21" stroke="#f1c40f" stroke-width="3"/>')
    add("items/star", 32, 32,
        f'<polygon points="{star_pts(16, 17, 14, 6)}" fill="#f1c40f" stroke="#d68910" stroke-width="1.5" stroke-linejoin="round"/>')
    add("items/gem", 32, 32,
        '<polygon points="16,4 28,13 16,28 4,13" fill="#48c9b0" stroke="#148f77" stroke-width="2"/>'
        '<polygon points="16,4 22,13 16,28 10,13" fill="#76d7c4"/>')
    add("items/potion", 32, 32,
        '<rect x="13" y="3" width="6" height="6" fill="#bdc3c7"/><path d="M13 9H19L26 24Q26 29 21 29H11Q6 29 6 24Z" fill="#ecf0f1" stroke="#95a5a6" stroke-width="2"/>'
        '<path d="M8 20H24L26 24Q26 27 21 27H11Q6 27 8 24Z" fill="#9b59b6"/>')
    add("items/chest_closed", 32, 32,
        f'<rect x="3" y="12" width="26" height="16" rx="2" fill="{PAL["wood"]}"/><path d="M3 14Q16 2 29 14Z" fill="{PAL["wood_l"]}"/>'
        '<rect x="14" y="16" width="4" height="6" fill="#f1c40f"/>')
    add("items/chest_open", 32, 32,
        f'<rect x="3" y="14" width="26" height="14" rx="2" fill="{PAL["wood"]}"/><path d="M3 14L7 3H25L29 14Z" fill="{PAL["wood_l"]}"/>'
        '<rect x="5" y="14" width="22" height="4" fill="#f1c40f"/>')
    add("items/scroll", 32, 32,
        '<rect x="6" y="6" width="20" height="20" fill="#f5e6b8"/><rect x="4" y="4" width="24" height="4" rx="2" fill="#d4a95a"/>'
        '<rect x="4" y="24" width="24" height="4" rx="2" fill="#d4a95a"/><path d="M10 12H22M10 17H22" stroke="#a9753f" stroke-width="2"/>')


# ------------------------------------------------------------------ UI
def btn(name, face, shadow, border, pressed=False, w=128, h=40):
    fy = 3 if pressed else 0
    s = ''
    if not pressed:
        s += f'<rect x="1" y="4" width="{w - 2}" height="{h - 5}" rx="8" fill="{shadow}"/>'
    s += (f'<rect x="1" y="{1 + fy}" width="{w - 2}" height="{h - 6}" rx="8" fill="{face}" stroke="{border}" stroke-width="2"/>'
          f'<rect x="6" y="{4 + fy}" width="{w - 12}" height="4" rx="2" fill="#fff" opacity=".25"/>')
    add(f"ui/{name}", w, h, s)


def build_ui():
    btn("button_normal", "#4a90e2", "#2e5f9e", "#2e5f9e")
    btn("button_hover", "#6aa9f0", "#2e5f9e", "#2e5f9e")
    btn("button_pressed", "#3a78c4", "#2e5f9e", "#2e5f9e", pressed=True)
    btn("button_disabled", "#b0b7c0", "#8a919a", "#8a919a")
    for st, face, border in (("normal", "#ffffff", "#8e9aaf"), ("hover", "#e3f2fd", "#4a90e2"),
                             ("selected", "#fff8d6", "#f1c40f"), ("correct", "#c8f7c5", "#27ae60"),
                             ("wrong", "#fadbd8", "#e74c3c")):
        add(f"ui/answer_{st}", 160, 48,
            f'<rect x="2" y="2" width="156" height="44" rx="10" fill="{face}" stroke="{border}" stroke-width="3"/>')
    add("ui/panel", 192, 160,
        '<rect x="3" y="3" width="186" height="154" rx="14" fill="#fffaf0" stroke="#8d6e63" stroke-width="4"/>'
        '<rect x="9" y="9" width="174" height="142" rx="9" fill="none" stroke="#d7ccc8" stroke-width="2"/>')
    add("ui/dialog_box", 480, 112,
        '<rect x="3" y="3" width="474" height="106" rx="14" fill="#fffaf0" stroke="#5d4037" stroke-width="4"/>'
        '<rect x="9" y="9" width="462" height="94" rx="9" fill="none" stroke="#d7ccc8" stroke-width="2"/>')
    add("ui/name_tag", 96, 28,
        '<rect x="2" y="2" width="92" height="24" rx="8" fill="#5d4037" stroke="#3e2723" stroke-width="2"/>')
    add("ui/progress_bg", 200, 16, '<rect x="1" y="1" width="198" height="14" rx="7" fill="#37474f" stroke="#263238" stroke-width="2"/>')
    add("ui/progress_fill", 200, 16, '<rect x="2" y="2" width="196" height="12" rx="6" fill="#2ecc71"/><rect x="6" y="4" width="188" height="3" rx="1.5" fill="#fff" opacity=".35"/>')
    add("ui/xp_fill", 200, 16, '<rect x="2" y="2" width="196" height="12" rx="6" fill="#f1c40f"/><rect x="6" y="4" width="188" height="3" rx="1.5" fill="#fff" opacity=".35"/>')

    heart = "M16 28C16 28 4 18 4 10C4 5 10 3 16 10C22 3 28 5 28 10C28 18 16 28 16 28Z"
    add("ui/heart_full", 32, 32, f'<path d="{heart}" fill="#e74c3c" stroke="#a93226" stroke-width="1.5"/>')
    add("ui/heart_half", 32, 32,
        f'<defs><clipPath id="h"><rect width="16" height="32"/></clipPath></defs>'
        f'<path d="{heart}" fill="#cfd8dc" stroke="#90a4ae" stroke-width="1.5"/>'
        f'<path d="{heart}" fill="#e74c3c" clip-path="url(#h)"/>')
    add("ui/heart_empty", 32, 32, f'<path d="{heart}" fill="#cfd8dc" stroke="#90a4ae" stroke-width="1.5"/>')

    gear = "".join(f'<rect x="14" y="2" width="4" height="6" fill="#7f8c8d" transform="rotate({a} 16 16)"/>' for a in range(0, 360, 45))
    icons = {
        "icon_coin": '<circle cx="16" cy="16" r="13" fill="#f1c40f" stroke="#d68910" stroke-width="2"/><circle cx="16" cy="16" r="8" fill="none" stroke="#d68910" stroke-width="1.5"/><rect x="15" y="10" width="2" height="12" fill="#d68910"/>',
        "icon_star": f'<polygon points="{star_pts(16, 17, 14, 6)}" fill="#f1c40f" stroke="#d68910" stroke-width="1.5" stroke-linejoin="round"/>',
        "icon_timer": '<rect x="13" y="1" width="6" height="4" fill="#7f8c8d"/><circle cx="16" cy="18" r="12" fill="#fff" stroke="#34495e" stroke-width="2.5"/><path d="M16 18V10M16 18L22 21" stroke="#e74c3c" stroke-width="2.5" stroke-linecap="round"/>',
        "icon_settings": gear + '<circle cx="16" cy="16" r="10" fill="#95a5a6" stroke="#7f8c8d" stroke-width="2"/><circle cx="16" cy="16" r="4" fill="#ecf0f1"/>',
        "icon_close": '<circle cx="16" cy="16" r="13" fill="#e74c3c"/><path d="M10 10L22 22M22 10L10 22" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
        "icon_check": '<circle cx="16" cy="16" r="13" fill="#2ecc71"/><path d="M9 16L14 21L23 11" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>',
        "icon_pause": '<circle cx="16" cy="16" r="13" fill="#3498db"/><rect x="10" y="9" width="4" height="14" fill="#fff"/><rect x="18" y="9" width="4" height="14" fill="#fff"/>',
        "icon_play": '<circle cx="16" cy="16" r="13" fill="#3498db"/><polygon points="13,9 24,16 13,23" fill="#fff"/>',
        "icon_hint": '<circle cx="16" cy="13" r="9" fill="#f9e79f" stroke="#f1c40f" stroke-width="2"/><rect x="12" y="22" width="8" height="5" rx="1.5" fill="#95a5a6"/><path d="M13 13Q16 9 19 13" fill="none" stroke="#f1c40f" stroke-width="2"/>',
        "icon_sound_on": '<polygon points="4,12 10,12 17,6 17,26 10,20 4,20" fill="#34495e"/><path d="M21 11Q25 16 21 21M24 8Q31 16 24 24" fill="none" stroke="#34495e" stroke-width="2.5" stroke-linecap="round"/>',
        "icon_sound_off": '<polygon points="4,12 10,12 17,6 17,26 10,20 4,20" fill="#7f8c8d"/><path d="M21 12L29 20M29 12L21 20" stroke="#e74c3c" stroke-width="3" stroke-linecap="round"/>',
        "icon_arrow_left": '<polygon points="22,5 8,16 22,27" fill="#34495e"/>',
        "icon_arrow_right": '<polygon points="10,5 24,16 10,27" fill="#34495e"/>',
        "icon_lock": '<path d="M10 14V10A6 6 0 0 1 22 10V14" fill="none" stroke="#7f8c8d" stroke-width="3"/><rect x="6" y="14" width="20" height="14" rx="3" fill="#95a5a6"/><circle cx="16" cy="21" r="2.5" fill="#34495e"/>',
        "icon_trophy": '<path d="M9 4H23V12A7 7 0 0 1 9 12Z" fill="#f1c40f" stroke="#d68910" stroke-width="2"/><path d="M9 7H4Q4 14 10 14M23 7H28Q28 14 22 14" fill="none" stroke="#d68910" stroke-width="2"/><rect x="14" y="19" width="4" height="5" fill="#d68910"/><rect x="9" y="24" width="14" height="4" rx="1" fill="#b9770e"/>',
        "icon_home": '<polygon points="16,4 29,16 25,16 25,27 7,27 7,16 3,16" fill="#e67e22" stroke="#a04000" stroke-width="2" stroke-linejoin="round"/><rect x="13" y="18" width="6" height="9" fill="#6b4220"/>',
    }
    for n, body in icons.items():
        add(f"ui/{n}", 32, 32, body)


# ------------------------------------------------------------------ VFX
def build_vfx():
    for f, (R, op) in enumerate(((4, 1), (8, 1), (13, .8), (7, .4))):
        add(f"vfx/sparkle_{f}", 32, 32,
            f'<polygon points="{star_pts(16, 16, R, R / 2.5, 4)}" fill="#fff59d" stroke="#f1c40f" stroke-width="1" opacity="{op}"/>')
    for f, (r, op) in enumerate(((4, 1), (8, .8), (12, .55), (15, .25))):
        add(f"vfx/ring_correct_{f}", 32, 32,
            f'<circle cx="16" cy="16" r="{r}" fill="none" stroke="#2ecc71" stroke-width="3" opacity="{op}"/>')
    for f, op in enumerate((1, .6, .3)):
        add(f"vfx/flash_wrong_{f}", 32, 32,
            f'<path d="M7 7L25 25M25 7L7 25" stroke="#e74c3c" stroke-width="4" stroke-linecap="round" opacity="{op}"/>')


# ------------------------------------------------------------------ AUDIO
SR = 22050
NOTE = dict(F2=87.31, G2=98.0, A2=110.0, C3=130.81, D4=293.66, E4=329.63, F4=349.23, G4=392.0,
            A4=440.0, B4=493.88, C5=523.25, E5=659.25, G5=783.99, C6=1046.5, B5=987.77, E6=1318.5)


def tone(freq, dur, kind="sine", vol=.5, attack=.005, release=.08):
    out = []
    for i in range(int(SR * dur)):
        t = i / SR
        ph = 2 * math.pi * freq * t
        if kind == "square":
            s = .6 if math.sin(ph) >= 0 else -.6
        elif kind == "tri":
            s = 2 / math.pi * math.asin(math.sin(ph))
        elif kind == "saw":
            s = 2 * ((freq * t) % 1) - 1
        else:
            s = math.sin(ph)
        env = min(1, t / attack) * min(1, max(0, (dur - t) / release))
        out.append(s * env * vol)
    return out


def mix(a, b):
    n = max(len(a), len(b))
    a = a + [0] * (n - len(a))
    b = b + [0] * (n - len(b))
    return [x + y for x, y in zip(a, b)]


def write_wav(path, samples):
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, s)) * 32767)) for s in samples))


def build_audio(out):
    d = os.path.join(out, "audio")
    os.makedirs(d, exist_ok=True)
    N = NOTE
    sfx = {
        "sfx_click": tone(880, .05, "square", .25, release=.03),
        "sfx_correct": tone(N["C5"], .1, "tri", .5) + tone(N["E5"], .1, "tri", .5) + tone(N["G5"], .25, "tri", .5),
        "sfx_wrong": tone(220, .15, "saw", .3) + tone(165, .3, "saw", .3),
        "sfx_coin": tone(N["B5"], .07, "square", .25) + tone(N["E6"], .22, "square", .25),
        "sfx_levelup": tone(N["C5"], .12, "tri", .5) + tone(N["E5"], .12, "tri", .5) + tone(N["G5"], .12, "tri", .5) + tone(N["C6"], .4, "tri", .5),
    }
    for n, s in sfx.items():
        write_wav(os.path.join(d, n + ".wav"), s)
    bars = [("C3", ["E4", "G4", "C5", "G4"]), ("A2", ["E4", "A4", "C5", "A4"]),
            ("F2", ["F4", "A4", "C5", "A4"]), ("G2", ["D4", "G4", "B4", "G4"])]
    bgm = []
    for root, mel in bars * 2:
        melody = []
        for m in mel:
            melody += tone(N[m], .6, "tri", .22, release=.15)
        bgm += mix(tone(N[root], 2.4, "sine", .3, attack=.02, release=.3), melody)
    write_wav(os.path.join(d, "bgm_town_loop.wav"), bgm)
    return sorted(list(sfx) + ["bgm_town_loop"])


# ------------------------------------------------------------------ OUTPUT
def png_path(out, rel, scale):
    return os.path.join(out, "png", rel + ".png")


def make_sheet(out, names, cols, cell, scale, fname):
    rows = math.ceil(len(names) / cols)
    cw, ch = cell[0] * scale, cell[1] * scale
    img = Image.new("RGBA", (cols * cw, rows * ch), (0, 0, 0, 0))
    for i, n in enumerate(names):
        im = Image.open(png_path(out, n, scale)).convert("RGBA")
        img.paste(im, ((i % cols) * cw, (i // cols) * ch + (ch - im.height)), im)
    os.makedirs(os.path.join(out, "sheets"), exist_ok=True)
    img.save(os.path.join(out, "sheets", fname))
    return dict(image=f"sheets/{fname}", cell=[cw, ch], cols=cols, frames={n.split("/")[-1]: i for i, n in enumerate(names)})


COLLIDERS = ("tree", "bush", "rock", "fence", "bench", "lamppost", "buildings/", "desk", "bookshelf", "chalkboard", "water_")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="EduCity_Assets")
    ap.add_argument("--scale", type=int, default=1)
    ap.add_argument("--no-png", action="store_true")
    ap.add_argument("--no-audio", action="store_true")
    a = ap.parse_args()
    out, scale = a.out, a.scale
    do_png = HAS_RASTER and not a.no_png
    if not HAS_RASTER and not a.no_png:
        print("! cairosvg/pillow tidak ada -> hanya SVG. Jalankan: pip install cairosvg pillow")

    shutil.rmtree(out, ignore_errors=True)
    build_characters(); build_tiles(); build_environment(); build_buildings()
    build_interior(); build_items(); build_ui(); build_vfx()

    manifest = dict(version=2, grid=32, png_scale=scale if do_png else None, assets={}, sheets={}, audio=[])
    for rel, (w, h, s) in ASSETS.items():
        p = os.path.join(out, "svg", rel + ".svg")
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write(s)
        if do_png:
            q = png_path(out, rel, scale)
            os.makedirs(os.path.dirname(q), exist_ok=True)
            cairosvg.svg2png(bytestring=s.encode(), write_to=q, output_width=w * scale, output_height=h * scale)
        manifest["assets"][rel] = dict(size=[w, h], collider=any(k in rel for k in COLLIDERS))
    print(f"{len(ASSETS)} aset dibuat")

    if do_png:
        sheets = manifest["sheets"]
        for name in CHARS:  # baris: down, left, right, up | kolom: frame jalan 0-3
            names = [f"characters/{name}_{d}_{f}" for d in DIRS for f in range(4)]
            sheets[name] = make_sheet(out, names, 4, (32, 32), scale, f"{name}_sheet.png")
        tnames = (["tiles/grass_a", "tiles/grass_b", "tiles/path", "tiles/sand"] + [f"tiles/water_{i}" for i in range(4)]
                  + [k for k in ASSETS if k.startswith("tiles/path_")] + [k for k in ASSETS if k.startswith("tiles/water_") and "_" in k[12:]]
                  + ["tiles/floor_wood", "tiles/floor_tile", "tiles/wall_interior", "tiles/carpet"])
        sheets["tileset_terrain"] = make_sheet(out, tnames, 8, (32, 32), scale, "tileset_terrain.png")
        sheets["items"] = make_sheet(out, [k for k in ASSETS if k.startswith("items/") and "coin_" not in k], 8, (32, 32), scale, "items.png")
        sheets["coin_spin"] = make_sheet(out, [f"items/coin_{i}" for i in range(4)], 4, (32, 32), scale, "coin_spin.png")
        vfx = [k for k in ASSETS if k.startswith("vfx/")]
        sheets["vfx"] = make_sheet(out, vfx, 4, (32, 32), scale, "vfx.png")

    if not a.no_audio:
        manifest["audio"] = build_audio(out)

    with open(os.path.join(out, "assets.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    with open(os.path.join(out, "README.md"), "w", encoding="utf-8") as f:
        f.write(README)

    zname = "EduCity_Full_Assets.zip"
    with zipfile.ZipFile(zname, "w", zipfile.ZIP_DEFLATED) as z:
        for root, _, files in os.walk(out):
            for fn in files:
                fp = os.path.join(root, fn)
                z.write(fp, arcname=os.path.relpath(fp, os.path.dirname(out) or "."))
    print(f"Selesai: {zname}")


README = """# EduCity Assets v2

Grid 32 px. Karakter 32x32, tile 32x32, bangunan 64x64, pohon/lampu/rak 32x64.

## Struktur
- svg/      sumber vektor (edit di Inkscape/Figma)
- png/      siap import engine (ukuran = SVG x --scale)
- sheets/   spritesheet: karakter (baris down,left,right,up; kolom frame 0-3), tileset_terrain, items, coin_spin, vfx
- audio/    sfx_*.wav + bgm_town_loop.wav (loop)
- assets.json  manifest: ukuran, flag collider, indeks frame tiap sheet

## Godot 4
- Import PNG, Filter = Nearest bila ingin gaya pixel; Linear bila tetap halus.
- TileSet: tile size 32x32, atlas tileset_terrain.png (urutan di assets.json).
- Animasi karakter: AnimatedSprite2D / Sprite2D hframes=4 vframes=4, baris 0=down, 1=left, 2=right, 3=up.
- Air beranimasi: tiles/water_0..3 (4 frame, ~6 fps).
- UI panel/dialog/progress: pakai NinePatchRect (margin ~14 px).

## Phaser / web
this.load.spritesheet('player','sheets/player_sheet.png',{frameWidth:32,frameHeight:32});

## Catatan
- Teks (huruf A/B/C/D, nominal koin) sengaja tidak dimasukkan ke gambar; render via font engine agar bisa dilokalkan.
- Audio dibuat prosedural (placeholder yang layak). Ganti dengan aset final sesuai kebutuhan.
"""

if __name__ == "__main__":
    main()
