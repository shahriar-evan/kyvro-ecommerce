// Gets an uploaded background-free product photo ready for the home showcase:
// checks it really is transparent, cuts off the empty edges, makes it at most 800 x 800 and saves it as
// WebP (PNG where the browser cannot make WebP). Each photo stays under 230 KB so the main photo + 3 more
// fit in one Firestore document (1 MB; rules: main under 450 KB, more under 250 KB each).
const MAX_SIDE = 800;
const MAX_CHARS = 230000;

const loadImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This file could not be opened as a picture.')); };
  img.src = url;
});

export async function prepareShowcaseImage(file) {
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
  let scale = Math.min(1, MAX_SIDE / Math.max(cw, ch));
  for (let i = 0; i < 6; i += 1) {
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(cw * scale)); out.height = Math.max(1, Math.round(ch * scale));
    const og = out.getContext('2d');
    og.imageSmoothingQuality = 'high';
    og.drawImage(c, minX, minY, cw, ch, 0, 0, out.width, out.height);
    let url = out.toDataURL('image/webp', 0.85);
    if (!url.startsWith('data:image/webp')) url = out.toDataURL('image/png');
    if (url.length <= MAX_CHARS) return url;
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
