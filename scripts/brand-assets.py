"""Make the Kyvro logo files (round badge with the hexagon K: solid hexagon, cut K, gold notch).

Run from the project root:  python3 scripts/brand-assets.py
Writes public/brand/*.svg, public/favicon.svg and the PNG icons. Needs Pillow (macOS: fonts from /System/Library).
The same drawing is in src/components/KyvroMark.jsx; change both together.
"""
import os
from PIL import Image, ImageDraw, ImageFont

HEX = [(50, 6), (88, 28), (88, 72), (50, 94), (12, 72), (12, 28)]
NOTCH = [(88, 28), (60, 50), (88, 72)]
CUTS = [[(37.5, 0), (44.5, 0), (44.5, 100), (37.5, 100)], [(44.5, 0), (66, 0), (44.5, 40)], [(44.5, 100), (66, 100), (44.5, 60)]]
LINE = [(40.1, 11.73), (41.9, 10.69), (41.9, 89.31), (40.1, 88.27)]  # solid line in the middle of the straight cut, ends on the hexagon edge
BLACK, WHITE, GOLD = '#000000', '#ffffff', '#C9A24B'
pts = lambda p: ' '.join(f'{x},{y}' for x, y in p)

PUB = os.path.join(os.path.dirname(__file__), '..', 'public')
os.makedirs(os.path.join(PUB, 'brand'), exist_ok=True)


def mark(f, a, mid='k', dx=0, dy=0):
    """SVG elements of the mark; cuts are a mask so the background shows through."""
    cuts = ''.join(f'<polygon points="{pts(c)}" fill="#000"/>' for c in CUTS)
    return (f'<g transform="translate({dx} {dy})"><mask id="{mid}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">'
            f'<polygon points="{pts(HEX)}" fill="#fff"/>{cuts}<polygon points="{pts(LINE)}" fill="#fff"/><polygon points="{pts(NOTCH)}" fill="#000"/></mask>'
            f'<polygon points="{pts(HEX)}" fill="{f}" mask="url(#{mid})"/><polygon points="{pts(NOTCH)}" fill="{a}"/></g>')


def write(name, body):
    with open(os.path.join(PUB, name), 'w') as fh:
        fh.write(body + '\n')


svg = lambda vb, inner, extra='': f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"{extra}>{inner}</svg>'

BADGE_SCALE = 0.9  # hexagon size inside the round badge (KyvroMark BADGE_SCALE)


def badge(bg, f, a, mid):
    """Round badge with the mark inside."""
    return (f'<circle cx="50" cy="50" r="50" fill="{bg}"/>'
            f'<g transform="translate(50 50) scale({BADGE_SCALE}) translate(-50 -50)">{mark(f, a, mid)}</g>')


# badges: black (light pages), white (dark pages), gold (Minimal / Bold / Boutique themes)
write('brand/kyvro-badge-black.svg', svg('0 0 100 100', badge(BLACK, WHITE, GOLD, 'b')))
write('brand/kyvro-badge-white.svg', svg('0 0 100 100', badge(WHITE, BLACK, GOLD, 'w')))
write('brand/kyvro-badge-gold.svg', svg('0 0 100 100', badge(BLACK, GOLD, WHITE, 'g')))

# favicon: the black badge (shows on light and dark browser tabs)
write('favicon.svg', svg('0 0 100 100', badge(BLACK, WHITE, GOLD, 'k')))

# horizontal lockup: icon + KYVRO + gold dot + কাইভ্রো (text uses the site's fonts; measured with Georgia Bold)
SERIF = "Georgia, 'Times New Roman', serif"
BN = "'Hind Siliguri', 'Kohinoor Bangla', 'Noto Sans Bengali', sans-serif"
FS, LS, BASE = 52, 2, 68
geo = ImageFont.truetype('/System/Library/Fonts/Supplemental/Georgia Bold.ttf', FS)
tx = 106
kw = geo.getlength('KYVRO') + LS * 4
dot = tx + kw + 16
bx = dot + 16
bw = 150  # কাইভ্রো at 46px is about 150 wide
W = round(bx + bw + 4)


def lockup(f, bg, hexf, mid):
    return svg(f'0 0 {W} 100', f'<g transform="translate(0 4) scale(.92)">{badge(bg, hexf, GOLD, mid)}</g>'
               + f'<text x="{tx}" y="{BASE}" font-family="{SERIF}" font-weight="700" font-size="{FS}" letter-spacing="{LS}" fill="{f}">KYVRO</text>'
               + f'<circle cx="{dot:.1f}" cy="{BASE - 18}" r="5" fill="{GOLD}"/>'
               + f'<text x="{bx:.1f}" y="{BASE}" font-family="{BN}" font-weight="700" font-size="46" fill="{f}" lang="bn">কাইভ্রো</text>')


write('brand/kyvro-lockup.svg', lockup(BLACK, BLACK, WHITE, 'kl'))  # for light backgrounds
write('brand/kyvro-lockup-white.svg', lockup(WHITE, WHITE, BLACK, 'kd'))  # for dark backgrounds


# PNGs (drawn big, then shrunk for smooth edges)
def png(size, bg, f, a, circle=True):
    """circle=True: round badge on a clear background; False: full square (iPhone icon, share image)."""
    S = 4
    big = size * S
    im = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if circle:
        d.ellipse([0, 0, big - 1, big - 1], fill=bg)
    else:
        d.rectangle([0, 0, big, big], fill=bg)
    span = 100 / BADGE_SCALE
    o = 50 - span / 2
    k = big / span
    tr = lambda p: [((x - o) * k, (y - o) * k) for x, y in p]
    layer = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.polygon(tr(HEX), fill=f)
    for c in CUTS + [NOTCH]:
        ld.polygon(tr(c), fill=(0, 0, 0, 0))
    ld.polygon(tr(LINE), fill=f)
    ld.polygon(tr(NOTCH), fill=a)
    im.alpha_composite(layer)
    return im.resize((size, size), Image.LANCZOS)


png(16, BLACK, WHITE, GOLD).save(os.path.join(PUB, 'favicon-16.png'))
png(32, BLACK, WHITE, GOLD).save(os.path.join(PUB, 'favicon-32.png'))
# iPhone icon and the share / push icon: black square, white hexagon, gold notch (same as the Facebook picture)
png(180, BLACK, WHITE, GOLD, circle=False).convert('RGB').save(os.path.join(PUB, 'apple-touch-icon.png'))
png(1024, BLACK, WHITE, GOLD, circle=False).convert('RGB').save(os.path.join(PUB, 'kyvro-icon.png'))
print('done, lockup width', W)
