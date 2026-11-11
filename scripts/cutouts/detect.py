# normalise photos + mark the ones with a face (model photos)
import json, sys, os
from PIL import Image
import cv2, numpy as np
S = sys.argv[1]
items = json.load(open(f'{S}/cut/items.json'))
os.makedirs(f'{S}/cut/norm', exist_ok=True)
out = {}
for it in items:
    for fn in it['files']:
        key = os.path.basename(fn)[:-4]
        try:
            im = Image.open(fn); im.load(); im = im.convert('RGB')
        except Exception as e:
            out[key] = {'bad': True}; continue
        im.thumbnail((1000, 1000))
        npth = f'{S}/cut/norm/{key}.jpg'
        im.save(npth, quality=92)
        out[key] = {'face': 0, 'w': im.width, 'h': im.height}
json.dump(out, open(f'{S}/cut/detect.json', 'w'))
print(sum(1 for v in out.values() if v.get('face')), 'with face of', len(out))
