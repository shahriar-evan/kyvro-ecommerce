import json, sys, os
from PIL import Image
S, R = sys.argv[1], sys.argv[2]
# key = productId_photoIndex ; hanger = the photo already shows its own hanger
MEN = [('1794400040000_3', 1), ('1794100046000_4', 1), ('1794100039000_2', 1), ('1794400073000_3', 0), ('1794600023000_1', 1),
       ('1794400041000_1', 1), ('1793307041659_1', 1), ('1794400072000_4', 1), ('1794100041000_0', 0), ('1794600025000_1', 1),
       ('1794400044000_1', 1), ('1794600005000_1', 1), ('1794400043000_1', 1), ('1794400071000_1', 1), ('1794400063000_3', 0)]
SHOES = ['1793322608288_0', '1793322816247_0', '1793323455142_0', '1793366362530_0', '1794100019000_0', '1794100020000_0',
         '1794100021000_0', '1794100022000_0', '1794100028000_0', '1794100030000_0', '1794100032000_0', '1794100037000_0']
items = {i['id']: i for i in json.load(open(f'{S}/cut/items.json'))}
def color_of(key):
    pid, idx = key.rsplit('_', 1)
    return None, items[pid]['urls'][int(idx)]
prods = {}
for r in json.load(open(f'{S}/cut/prods.json')):
    f = r.get('document', {}).get('fields')
    if f: prods[f.get('id', {}).get('stringValue') or f.get('id', {}).get('integerValue') or r['document']['name'].split('/')[-1]] = f
def colour(pid, url):
    f = prods.get(pid) or {}
    ci = f.get('colorImages', {}).get('mapValue', {}).get('fields', {})
    for c, v in ci.items():
        if v.get('stringValue') == url: return c
    return None
import numpy as np
from scipy import ndimage
def clean(im):
    # drop small loose bits (pins, dust, stray labels): keep only pieces >= 1.5% of the biggest one
    a = np.array(im); m = a[..., 3] > 30
    lab, n = ndimage.label(m)
    if n > 1:
        sizes = ndimage.sum(m, lab, range(1, n + 1))
        keep = np.isin(lab, [i + 1 for i, v in enumerate(sizes) if v >= sizes.max() * 0.015])
        a[..., 3] = np.where(keep, a[..., 3], 0)
    im = Image.fromarray(a); bb = im.split()[3].point(lambda v: 255 if v > 30 else 0).getbbox()
    return im.crop(bb) if bb else im
out = {'men': [], 'shoes': []}
total = 0
for group, keys, box in (('men', MEN, (560, 700)), ('shoes', [(k, 0) for k in SHOES], (800, 560))):
    for key, hanger in keys:
        pid = key.rsplit('_', 1)[0]
        im = Image.open(f'{S}/cut/png/{key}.png').convert('RGBA')
        im = clean(im); im.thumbnail(box, Image.LANCZOS)
        fn = f'{R}/public/cutouts/{pid}.webp'
        im.save(fn, 'WEBP', quality=82, method=6)
        total += os.path.getsize(fn)
        e = {'id': pid}
        if hanger: e['hanger'] = True
        c = colour(pid, items[pid]['urls'][int(key.rsplit('_', 1)[1])])
        if c: e['color'] = c
        out[group].append(e)
json.dump(out, open(f'{S}/cut/chosen.json', 'w'), indent=1, ensure_ascii=False)
print('KB', total // 1024, len(out['men']), len(out['shoes']))
print(json.dumps(out, ensure_ascii=False)[:900])
