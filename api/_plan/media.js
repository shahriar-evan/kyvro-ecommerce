// Product media kit: extra photos and videos of a product that sellers and the team download for Facebook / Instagram.
// The files live in Vercel Blob (Firebase Storage needs the paid Blaze plan); the list of files is productMedia/{productId}
// in Firestore (team writes, team + sellers read, firestore.rules).
//   POST /api/plan?action=media-upload  team: a short-lived token so the browser uploads the file straight to Vercel Blob
//                                       (the file never passes through this function, so big videos are fine)
//   POST /api/plan?action=media-delete  team: delete one uploaded file from Vercel Blob
// Needs BLOB_READ_WRITE_TOKEN (Vercel → Storage → Blob store connected to the project).
import { handleUpload } from '@vercel/blob/client';
import { del } from '@vercel/blob';
import { teamCaller } from './aiphoto.js';

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_PHOTO = 25 * 1024 * 1024; // 25 MB: full quality phone / camera photo
const MAX_VIDEO = 500 * 1024 * 1024; // 500 MB
// product-media/<productId>/<photo|video>/<file name>
const PATH_RE = /^product-media\/[A-Za-z0-9_-]{1,60}\/(photo|video)\/[^/]{1,140}$/;

const noStore = () => !process.env.BLOB_READ_WRITE_TOKEN;
const STORE_MSG = 'Video / photo storage is not set up yet (Vercel Blob store, BLOB_READ_WRITE_TOKEN).';

export async function mediaUpload(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });
  if (noStore()) return res.status(503).json({ error: STORE_MSG });
  const body = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
  // only token requests from the browser (no upload-completed webhook is used)
  if (body.type !== 'blob.generate-client-token') return res.status(400).json({ error: 'Bad request.' });
  const who = await teamCaller(req);
  if (who.error) return res.status(who.status).json({ error: who.error });
  try {
    const out = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const m = PATH_RE.exec(String(pathname || ''));
        if (!m) throw new Error('Bad file name.');
        const video = m[1] === 'video';
        return {
          allowedContentTypes: video ? VIDEO_TYPES : PHOTO_TYPES,
          maximumSizeInBytes: video ? MAX_VIDEO : MAX_PHOTO,
          addRandomSuffix: true,
          cacheControlMaxAge: 60 * 60 * 24 * 365,
          tokenPayload: JSON.stringify({ by: who.email }),
        };
      },
    });
    return res.status(200).json(out);
  } catch (e) {
    return res.status(400).json({ error: String((e && e.message) || 'Upload failed.') });
  }
}

export async function mediaDelete(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });
  if (noStore()) return res.status(503).json({ error: STORE_MSG });
  const who = await teamCaller(req);
  if (who.error) return res.status(who.status).json({ error: who.error });
  const body = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
  let u;
  try { u = new URL(String(body.url || '')); } catch (e) { return res.status(400).json({ error: 'Bad link.' }); }
  // only our own product-media files in a Vercel Blob store
  if (u.protocol !== 'https:' || !u.hostname.endsWith('.public.blob.vercel-storage.com') || !PATH_RE.test(decodeURIComponent(u.pathname.slice(1)))) {
    return res.status(400).json({ error: 'Not a product media file.' });
  }
  try {
    await del(u.origin + u.pathname);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Could not delete the file.' });
  }
}
