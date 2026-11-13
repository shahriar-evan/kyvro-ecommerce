// Gets an uploaded background-free product photo ready for the home showcase:
// checks it really is transparent, cuts off the empty edges, makes it at most 800 x 800 and saves it as
// WebP (PNG where the browser cannot make WebP). Each photo stays under 190 KB so front + side + 3 more
// fit in one Firestore document (1 MB; rules: front under 450 KB, side / more under 250 KB each).
const MAX_SIDE = 800;
const MAX_CHARS = 190000;

const loadImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This file could not be opened as a picture.')); };
  img.src = url;
});

export async function prepareShowcaseImage(file, { maxSide = MAX_SIDE, maxChars = MAX_CHARS } = {}) {
  if (!file || !/^image\/(png|webp)$/.test(file.type)) {
    throw new Error('Please upload a PNG or WebP picture with a transparent background.');
  }
  const img = await loadImage(file);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const { data, width, height } = g.getImageData(0, 0, c.width, c.height);

  // transparent share + the box around the visible part
  let clear = 0, minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const a = data[(y * width + x) * 4 + 3];
      if (a < 20) clear += 1;
      else if (a > 40) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
  }
  if (clear / (width * height) < 0.03 || maxX < 0) {
    throw new Error('This picture still has its background. Remove the background first (Mac: right-click the photo in Finder → Quick Actions → Remove Background), then upload the new PNG.');
  }

  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  let scale = Math.min(1, maxSide / Math.max(cw, ch));
  for (let i = 0; i < 6; i += 1) {
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(cw * scale)); out.height = Math.max(1, Math.round(ch * scale));
    const og = out.getContext('2d');
    og.imageSmoothingQuality = 'high';
    og.drawImage(c, minX, minY, cw, ch, 0, 0, out.width, out.height);
    let url = out.toDataURL('image/webp', 0.85);
    if (!url.startsWith('data:image/webp')) url = out.toDataURL('image/png');
    if (url.length <= maxChars) return url;
    scale *= 0.8;
  }
  throw new Error('This picture is too big even after making it smaller. Try a smaller file.');
}

// A built-in picture (/cutouts/<id>.webp) as a data URL, so it can be saved together with new photos
export async function urlToShowcaseImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not load the built-in picture.');
  const blob = await res.blob();
  return prepareShowcaseImage(new File([blob], 'photo.webp', { type: blob.type || 'image/webp' }));
}

// For the main / colour / more photo uploads: the home page version when the file is a transparent PNG / WebP, else null
export async function transparentShowcase(file) {
  if (!file || !/^image\/(png|webp)$/.test(file.type)) return null;
  try { return await prepareShowcaseImage(file); } catch (e) { return null; }
}

// An AI picture on one flat background colour (chroma-key green / magenta / blue, or white) -> the home page version
// without background. The background colour is read from the picture's edges.
//  - a strong key colour (green / magenta / blue): every pixel close to it is removed, also between arm and body,
//    and the colour fringe on the edges is toned down;
//  - white: only the white that touches the edges is removed, so white parts of the product stay.
// Then it is trimmed / resized like an upload.
export async function keyBgToShowcase(dataUrl) {
  const img = await new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('The AI picture could not be opened. Try again.'));
    im.src = dataUrl;
  });
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const id = g.getImageData(0, 0, c.width, c.height);
  const { data, width: w, height: h } = id;
  const border = [];
  for (let x = 0; x < w; x += 1) border.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y += 1) border.push(y * w, y * w + w - 1);
  const med = (k) => { const v = border.map((p) => data[p * 4 + k]).sort((x, y) => x - y); return v[v.length >> 1]; };
  const bg = [med(0), med(1), med(2)];
  const strong = Math.max(...bg) - Math.min(...bg) > 100; // a saturated key colour, not white / grey
  const dist = (i) => Math.max(Math.abs(data[i] - bg[0]), Math.abs(data[i + 1] - bg[1]), Math.abs(data[i + 2] - bg[2]));
  const NEAR = strong ? 70 : 22;
  const SOFT = strong ? 120 : 48;
  const n = w * h;
  const gone = new Uint8Array(n); // 1 = background
  if (strong) {
    for (let p = 0; p < n; p += 1) {
      const d = dist(p * 4);
      if (d <= NEAR) { gone[p] = 1; data[p * 4 + 3] = 0; }
      else if (d <= SOFT) data[p * 4 + 3] = Math.min(data[p * 4 + 3], Math.round(((d - NEAR) / (SOFT - NEAR)) * 255));
    }
  } else {
    const stack = [];
    for (const p of border) if (!gone[p] && dist(p * 4) <= NEAR) { gone[p] = 1; stack.push(p); }
    while (stack.length) {
      const p = stack.pop();
      data[p * 4 + 3] = 0;
      const x = p % w, y = (p / w) | 0;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q < 0 || gone[q]) continue;
        const d = dist(q * 4);
        if (d <= NEAR) { gone[q] = 1; stack.push(q); }
        else if (d <= SOFT) { gone[q] = 2; data[q * 4 + 3] = Math.round(((d - NEAR) / (SOFT - NEAR)) * 255); }
      }
    }
  }
  if (strong) {
    // tone down the key colour that bleeds onto the edges (green / magenta / blue fringe)
    const hi = bg.indexOf(Math.max(...bg));
    for (let p = 0; p < n; p += 1) {
      const i = p * 4;
      if (data[i + 3] === 0) continue;
      const x = p % w, y = (p / w) | 0;
      let near = data[i + 3] < 255;
      for (let dy = -2; !near && dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < w && yy < h && gone[yy * w + xx]) { near = true; break; }
      }
      if (!near) continue;
      if (bg[0] > 150 && bg[2] > 150 && bg[1] < 100) { // magenta: red + blue
        const cap = data[i + 1] + 25;
        data[i] = Math.min(data[i], Math.max(cap, data[i + 2] - 60)); data[i + 2] = Math.min(data[i + 2], cap + 30);
      } else {
        const others = [0, 1, 2].filter((k) => k !== hi).map((k) => data[i + k]);
        data[i + hi] = Math.min(data[i + hi], Math.max(...others) + 10);
      }
    }
  }
  g.putImageData(id, 0, 0);
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  return prepareShowcaseImage(new File([blob], 'ai.png', { type: 'image/png' }));
}
export const whiteBgToShowcase = keyBgToShowcase;

// The same background-free picture mirrored left <-> right (Admin "Flip" on the side photo)
export async function mirrorShowcaseImage(src) {
  const img = await new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('This picture could not be opened.'));
    im.src = src;
  });
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d');
  g.translate(c.width, 0); g.scale(-1, 1);
  g.drawImage(img, 0, 0);
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  return prepareShowcaseImage(new File([blob], 'side.png', { type: 'image/png' }));
}

// Which flat background to ask the AI for, far from the product's colour: looks at the middle of the photo
// (when the browser may read it), else at the colour name ("Bottle Green" -> magenta), else green.
const KEYS = { green: [0, 255, 0], magenta: [255, 0, 255], blue: [0, 0, 255] };
export async function pickKeyColour(src, colourName = '') {
  try {
    // load with a time limit (a photo from another site may never answer)
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      const t = setTimeout(() => reject(new Error('slow')), 4000);
      im.crossOrigin = 'anonymous';
      im.onload = () => { clearTimeout(t); resolve(im); };
      im.onerror = () => { clearTimeout(t); reject(new Error('blocked')); };
      im.src = src;
    });
    const c = document.createElement('canvas');
    c.width = 40; c.height = 40;
    const g = c.getContext('2d');
    g.drawImage(img, img.naturalWidth * 0.25, img.naturalHeight * 0.2, img.naturalWidth * 0.5, img.naturalHeight * 0.6, 0, 0, 40, 40);
    const d = g.getImageData(0, 0, 40, 40).data; // throws when the photo's site does not allow reading it
    // the share of pixels close to each key colour: pick the key the product uses least
    const score = { green: 0, magenta: 0, blue: 0 };
    for (let i = 0; i < d.length; i += 4) {
      const [r, gg, b] = [d[i], d[i + 1], d[i + 2]];
      if (gg > r + 25 && gg > b + 10) score.green += 1;
      if (r > gg + 30 && b > gg + 30) score.magenta += 1;
      if (b > r + 40 && b > gg + 20) score.blue += 1;
    }
    return Object.keys(KEYS).sort((a, b) => score[a] - score[b])[0];
  } catch (e) {
    const n = String(colourName).toLowerCase();
    if (/green|olive|khaki|army|mint|lime|teal|sage|bottle/.test(n)) return 'magenta';
    return 'green';
  }
}

// Shop the Look: a full-body model picture (transparent PNG / WebP file or data URL) -> a 2:3 transparent frame (the shape
// the AI makes and the home page shows), the person bottom-aligned with a little space above the head, at most 1100 px
// tall and under 450 KB. The same frame is sent to the AI for colour try-on, so the person keeps their size and place.
const LOOK_TOP = 0.04, LOOK_BOTTOM = 0.02, LOOK_SIDE = 0.04;
const blobImage = async (src) => {
  if (typeof src !== 'string') return loadImage(src);
  const blob = await (await fetch(src)).blob();
  return loadImage(new File([blob], 'look.png', { type: blob.type || 'image/png' }));
};
// the visible part (alpha) of a picture: { c (canvas), x, y, w, h }
function visibleBox(img) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const { data, width, height } = g.getImageData(0, 0, c.width, c.height);
  let clear = 0, minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const a = data[(y * width + x) * 4 + 3];
      if (a < 20) clear += 1;
      else if (a > 40) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
  }
  if (clear / (width * height) < 0.03 || maxX < 0) {
    throw new Error('This picture still has its background. Remove the background first (Mac: right-click the photo in Finder → Quick Actions → Remove Background), then upload the new PNG.');
  }
  return { c, x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
// draws the visible part into a 2:3 frame; returns { url, rect } (rect = where the person sits, as fractions of the frame)
function frame(b) {
  for (let H = 1100; H >= 500; H = Math.round(H * 0.85)) {
    const W = Math.round((H * 2) / 3);
    const s = Math.min((H * (1 - LOOK_TOP - LOOK_BOTTOM)) / b.h, (W * (1 - 2 * LOOK_SIDE)) / b.w);
    const dw = b.w * s, dh = b.h * s;
    const dx = (W - dw) / 2, dy = H * (1 - LOOK_BOTTOM) - dh;
    const out = document.createElement('canvas');
    out.width = W; out.height = H;
    const g = out.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(b.c, b.x, b.y, b.w, b.h, dx, dy, dw, dh);
    let url = out.toDataURL('image/webp', 0.85);
    if (!url.startsWith('data:image/webp')) url = out.toDataURL('image/png');
    if (url.length <= 450000) return { url, rect: { x: dx / W, y: dy / H, w: dw / W, h: dh / H } };
  }
  throw new Error('This picture is too big even after making it smaller. Try a smaller file.');
}
export async function prepareLookImage(fileOrDataUrl) {
  if (fileOrDataUrl instanceof File && !/^image\/(png|webp)$/.test(fileOrDataUrl.type)) throw new Error('Please upload a PNG or WebP picture with a transparent background.');
  return frame(visibleBox(await blobImage(fileOrDataUrl))).url;
}
// is a saved look picture already in the 2:3 frame?
export async function lookFramed(src) {
  const img = await blobImage(src);
  return Math.abs(img.naturalWidth / img.naturalHeight - 2 / 3) < 0.02;
}
// an older look picture (cut tight around the person) -> the 2:3 frame, with its pins moved so they stay on the same clothes.
// On the page the old picture sat in a 2:3 box, fitted (contain) and bottom-aligned.
export async function reframeLook(src, items) {
  const img = await blobImage(src);
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const k = Math.min((2 / 3) / (iw / ih), 1); // the old picture's width in the box (as a fraction), height fills when tall
  const old = iw / ih <= 2 / 3 ? { x: (1 - k) / 2, y: 0, w: k, h: 1 } : { x: 0, y: 1 - ((2 / 3) / (iw / ih)), w: 1, h: (2 / 3) / (iw / ih) };
  const b = visibleBox(img);
  const { url, rect } = frame(b);
  const moved = (items || []).map((it) => {
    const px = ((it.x / 100 - old.x) / old.w) * iw, py = ((it.y / 100 - old.y) / old.h) * ih; // pixel in the old picture
    const fx = (px - b.x) / b.w, fy = (py - b.y) / b.h; // place on the person
    const c = (v) => Math.max(0, Math.min(100, Math.round(v * 100)));
    return { ...it, x: c(rect.x + fx * rect.w), y: c(rect.y + fy * rect.h) };
  });
  return { image: url, items: moved };
}
