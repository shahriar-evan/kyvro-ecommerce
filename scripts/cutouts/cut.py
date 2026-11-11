# cut the background off every photo without a face; save trimmed RGBA PNG + shape numbers
import json, sys, os
from PIL import Image
from rembg import remove, new_session
S, model = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else 'isnet-general-use')
det = json.load(open(f'{S}/cut/detect.json'))
os.makedirs(f'{S}/cut/png', exist_ok=True)
sess = new_session(model)
meta = json.load(open(f'{S}/cut/cut.json')) if os.path.exists(f'{S}/cut/cut.json') else {}
todo = [k for k, v in det.items() if not v.get('bad') and not v.get('face') and k not in meta]
for n, k in enumerate(todo):
    im = Image.open(f'{S}/cut/norm/{k}.jpg')
    o = remove(im, session=sess, post_process_mask=True)
    a = o.split()[3]
    bb = a.point(lambda v: 255 if v > 40 else 0).getbbox()
    if not bb: meta[k] = {'empty': True}; continue
    o = o.crop(bb)
    import numpy as np
    arr = np.asarray(o).astype(int); fg = arr[..., 3] > 128
    cover = fg.mean()
    R, G, B = arr[..., 0], arr[..., 1], arr[..., 2]
    Y = 0.299*R + 0.587*G + 0.114*B; Cr = (R - Y)*0.713 + 128; Cb = (B - Y)*0.564 + 128
    skin = fg & (Cr > 138) & (Cr < 173) & (Cb > 77) & (Cb < 127) & (R > G) & (Y > 60)
    skinp = float(skin.sum() / max(1, fg.sum()))
    meta[k] = {'w': o.width, 'h': o.height, 'aspect': round(o.height / o.width, 2), 'fill': round(float(cover), 2), 'skin': round(skinp, 3),
               'share': round((bb[2]-bb[0])*(bb[3]-bb[1]) / (im.width*im.height), 2)}
    o.save(f'{S}/cut/png/{k}.png')
    if n % 25 == 0:
        json.dump(meta, open(f'{S}/cut/cut.json', 'w')); print(n, '/', len(todo), flush=True)
json.dump(meta, open(f'{S}/cut/cut.json', 'w')); print('done', len(meta))
