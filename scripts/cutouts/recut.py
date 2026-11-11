# re-cut the chosen photos: model mask -> fill holes inside the garment (not in the hanger area) -> original pixels
import sys, os, re
import numpy as np
from PIL import Image
from scipy import ndimage
from rembg import remove, new_session
S, model, out_dir = sys.argv[1], sys.argv[2], sys.argv[3]
keys = re.findall(r"'(\d{13}_\d+)'", open(f'{S}/scripts/export.py').read())
os.makedirs(f'{S}/cut/{out_dir}', exist_ok=True)
sess = new_session(model)
for n, k in enumerate(keys):
    out = f'{S}/cut/{out_dir}/{k}.png'
    if os.path.exists(out): continue
    img = Image.open(f'{S}/cut/norm/{k}.jpg').convert('RGB')
    m = np.array(remove(img, session=sess, only_mask=True)).astype(np.uint8)
    solid = m > 128
    rows = np.where(solid.any(axis=1))[0]
    if len(rows):
        top, bot = rows[0], rows[-1]
        filled = ndimage.binary_fill_holes(solid)
        holes = filled & ~solid
        holes[: top + int((bot - top) * 0.18)] = False   # keep the hanger hook loop open
        m = np.where(holes, 255, m)
    rgba = img.copy(); rgba.putalpha(Image.fromarray(m))
    bb = Image.fromarray(m).point(lambda v: 255 if v > 40 else 0).getbbox()
    (rgba.crop(bb) if bb else rgba).save(out)
    print(n, k, flush=True)
print('done', len(keys))
