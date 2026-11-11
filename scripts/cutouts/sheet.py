# contact sheets of cutouts for review: python sheet.py S group maxskin
import json, sys, os
from PIL import Image, ImageDraw
S, group, maxskin = sys.argv[1], sys.argv[2], float(sys.argv[3])
items = {i['id']: i for i in json.load(open(f'{S}/cut/items.json'))}
meta = json.load(open(f'{S}/cut/cut.json'))
G = {'men': {'Men', 'Winter'}, 'women': {'Women'}, 'shoes': {'Shoes'}}[group]
rows = []
for k, m in meta.items():
    if m.get('empty'): continue
    pid = k.rsplit('_', 1)[0]
    it = items.get(pid)
    if not it or it['gender'] not in G: continue
    if m['skin'] > maxskin or m['share'] < 0.08: continue
    rows.append((k, m, it))
rows.sort(key=lambda r: (r[2]['category'], r[0]))
W, H, C = 170, 220, 8
os.makedirs(f'{S}/cut/sheets', exist_ok=True)
for page in range(0, len(rows), C * 5):
    chunk = rows[page:page + C * 5]
    sheet = Image.new('RGB', (W * C, H * ((len(chunk) + C - 1) // C)), (241, 241, 240))
    d = ImageDraw.Draw(sheet)
    for n, (k, m, it) in enumerate(chunk):
        x, y = (n % C) * W, (n // C) * H
        im = Image.open(f'{S}/cut/png/{k}.png'); im.thumbnail((W - 16, H - 40))
        sheet.paste(im, (x + (W - im.width) // 2, y + 6), im)
        d.text((x + 4, y + H - 30), f"{k}", fill=(0, 0, 0))
        d.text((x + 4, y + H - 17), f"{it['category'][:12]} a{m['aspect']} s{m['skin']}", fill=(90, 90, 90))
        d.rectangle([x, y, x + W - 1, y + H - 1], outline=(215, 215, 215))
    p = f'{S}/cut/sheets/{group}_{page // (C * 5) + 1}.jpg'; sheet.save(p, quality=80); print(p)
print(len(rows), 'shown')
