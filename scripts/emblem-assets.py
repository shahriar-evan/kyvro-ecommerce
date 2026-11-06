"""Make the website logo PNGs from the emblem (the gold K emblem, cut out of Evan's logo picture).

Run from the project root:  python3 scripts/emblem-assets.py
Input:  scripts/emblem-source.png (gold emblem with a clear background; the brushed-metal look stays in the gold file)
Output: public/brand/kyvro-emblem-{black,white,gold}.png (192px high, for the header / footer / dashboards),
        public/apple-touch-icon.png and public/kyvro-icon.png (gold emblem on black, iPhone icon + share / push icon).
The edges are smoothed: the outline is drawn 4x bigger, softened and cut again, so the black and white versions are
clean shapes without the metal texture. The favicon stays the hexagon (scripts/brand-assets.py): the emblem is too
detailed for 16 / 32 px.
"""
import os
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), '..')
src = Image.open(os.path.join(ROOT, 'scripts', 'emblem-source.png'))
alpha = src.getchannel('A')
rgb = src.convert('RGB')

S = 4
up = alpha.resize((alpha.width * S, alpha.height * S), Image.LANCZOS).filter(ImageFilter.GaussianBlur(S * 0.9))


def smooth(v, lo=80, hi=150):
    if v <= lo:
        return 0
    if v >= hi:
        return 255
    t = (v - lo) / (hi - lo)
    return int(255 * t * t * (3 - 2 * t))


up = up.point(smooth)
rgb_up = rgb.resize(up.size, Image.LANCZOS)


def emblem(height, kind):
    w = int(up.width * height / up.height)
    a = up.resize((w, height), Image.LANCZOS)
    if kind == 'gold':
        im = rgb_up.resize((w, height), Image.LANCZOS).convert('RGBA')
    else:
        im = Image.new('RGBA', (w, height), (0, 0, 0, 255) if kind == 'black' else (255, 255, 255, 255))
    im.putalpha(a)
    return im


os.makedirs(os.path.join(ROOT, 'public', 'brand'), exist_ok=True)
for kind in ('black', 'white', 'gold'):
    emblem(192, kind).save(os.path.join(ROOT, 'public', 'brand', f'kyvro-emblem-{kind}.png'), optimize=True)


def square(size, scale=0.74):
    bg = Image.new('RGBA', (size, size), (0, 0, 0, 255))
    e = emblem(int(size * scale * 0.86), 'gold')
    if e.width > size * scale:
        e = e.resize((int(size * scale), int(e.height * size * scale / e.width)), Image.LANCZOS)
    bg.alpha_composite(e, ((size - e.width) // 2, (size - e.height) // 2))
    return bg.convert('RGB')


square(180).save(os.path.join(ROOT, 'public', 'apple-touch-icon.png'), optimize=True)
square(1024).save(os.path.join(ROOT, 'public', 'kyvro-icon.png'), optimize=True)
print('done')
