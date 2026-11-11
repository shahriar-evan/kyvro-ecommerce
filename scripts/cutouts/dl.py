import json, sys, os, hashlib, base64, urllib.request, concurrent.futures as cf
S = sys.argv[1]
def val(v):
    if v is None: return None
    for k in ('stringValue','integerValue','doubleValue','booleanValue'):
        if k in v: return v[k]
    if 'arrayValue' in v: return [val(x) for x in v['arrayValue'].get('values', [])]
    if 'mapValue' in v: return {k: val(x) for k, x in v['mapValue'].get('fields', {}).items()}
    return None
WANT = {'Men', 'Winter', 'Women', 'Shoes'}
SKIP_CAT = {'Borka', 'Hijab', 'Bags', 'Pant', 'Joggers & Sweats'}
items = []
for r in json.load(open(f'{S}/cut/prods.json')):
    f = r.get('document', {}).get('fields')
    if not f: continue
    p = {k: val(v) for k, v in f.items()}
    if p.get('gender') not in WANT or p.get('category') in SKIP_CAT: continue
    stock = sum(int(x or 0) for x in (p.get('sizeStock') or {}).values()) if p.get('sizeStock') else int(p.get('stock') or 0)
    if stock <= 0: continue
    urls = [p.get('image')] + list(p.get('images') or []) + list((p.get('colorImages') or {}).values())
    seen = []
    for u in urls:
        if u and u not in seen: seen.append(u)
    items.append({'id': str(p.get('id') or r['document']['name'].split('/')[-1]), 'name': p.get('name'), 'gender': p['gender'], 'category': p.get('category'), 'sold': int(p.get('sold') or 0), 'urls': seen[:8]})
jobs = []
for it in items:
    it['files'] = []
    for i, u in enumerate(it['urls']):
        fn = f"{S}/cut/raw/{it['id']}_{i}.img"
        it['files'].append(fn); jobs.append((u, fn))
def get(job):
    u, fn = job
    if os.path.exists(fn): return
    try:
        if u.startswith('data:'):
            data = base64.b64decode(u.split(',', 1)[1])
        else:
            req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
            data = urllib.request.urlopen(req, timeout=30).read()
        open(fn, 'wb').write(data)
    except Exception as e:
        print('fail', u[:80], e)
with cf.ThreadPoolExecutor(12) as ex: list(ex.map(get, jobs))
json.dump(items, open(f'{S}/cut/items.json', 'w'), indent=0)
from collections import Counter
print(len(items), 'products', len(jobs), 'photos', Counter(i['gender'] for i in items))
