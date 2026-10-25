// Turns a photo chosen from the device into a small, web-friendly data URL.
// The photo is resized (longest side max 1000 px) and compressed so the site stays fast
// and the browser storage does not fill up.
export function imageFileToDataURL(file, { maxSize = 1000, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !String(file.type).startsWith('image/')) {
      reject(new Error('Please choose an image file (JPG, PNG or WebP).'));
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      reject(new Error('This image is too large (maximum 15 MB).'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The file could not be read.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('This image could not be opened. Try a different file.'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        let out = canvas.toDataURL('image/webp', quality);
        if (!out.startsWith('data:image/webp')) out = canvas.toDataURL('image/jpeg', quality);
        resolve(out);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
