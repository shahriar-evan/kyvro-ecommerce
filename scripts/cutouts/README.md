# Home showcase cutouts (background-free product photos)

The Men rail and the Shoes wheel on the home page (`src/components/HomeShowcase.jsx`) use photos without a
background: `public/cutouts/<productId>.webp`, listed in `src/data/cutouts.js`. Made on Evan's Mac with
[rembg](https://github.com/danielgatis/rembg) (free, runs locally, photos are not sent anywhere).

Setup once: `brew install python@3.12`, `/opt/homebrew/bin/python3.12 -m venv ~/rembg-env`,
`~/rembg-env/bin/pip install "rembg[cpu,cli]" opencv-python-headless scipy`.

`W` = a scratch folder. Put the approved products query result in `W/cut/prods.json` (Firestore REST runQuery,
`status == approved`), then:

1. `dl.py W` downloads every in-stock Men / Winter / Women / Shoes photo (`W/cut/raw`).
2. `detect.py W` makes them JPEG (`W/cut/norm`).
3. `cut.py W isnet-general-use` removes the background (`W/cut/png`, numbers in `W/cut/cut.json`; `skin` = share of
   skin-coloured pixels, high = a model is in the photo).
4. `sheet.py W men 0.03` / `women 0.03` / `shoes 0.2` makes contact sheets (`W/cut/sheets`) to pick from by eye:
   long pieces (jackets, hoodies, hanging shirts, katua, polo), no folded shirts, no models, clean edges.
5. Put the picks in `MEN` / `SHOES` in `export.py`, then cut only those again with the better model:
   `recut.py W birefnet-general-lite png2` (fills holes inside the garment, e.g. white stripes, from the original
   photo; keeps white shoe soles). Then (`hanger` 1 = the photo shows its own hanger), run
   `export.py W <repo>` (reads `W/cut/png2`): it cleans loose bits, writes `public/cutouts/*.webp` and `W/cut/chosen.json`.
6. Copy `chosen.json` into `src/data/cutouts.js` and bump `CUTOUT_VERSION`.

A product that is deleted or sold out is skipped on the site; with fewer than 6 cutouts a rail falls back to photo cards.
