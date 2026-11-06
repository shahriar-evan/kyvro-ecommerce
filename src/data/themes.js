// Storefront themes: the main site (settings/theme, Owner) and every shop link (shops/{slug}.theme / .themeMode).
// Free shops: Classic only (any mode). Pro / Premium: every theme (feature "themes", rules: paidFeatOn('themes', true)).
// The same keys are listed in firestore.rules (two lists: shops and settings/theme). A preview never saves: ?themePreview=<key>&themeMode=<mode> on any page.
export const THEMES = [
  { key: 'classic', label: 'Classic', desc: 'Gold and serif, photo slider on top, the Kyvro look.', free: true },
  { key: 'minimal', label: 'Minimal', desc: 'Clean and white, no big banners, products first.' },
  { key: 'bold', label: 'Bold', desc: 'Big headline, large category tiles, strong buttons.' },
  { key: 'boutique', label: 'Boutique', desc: 'Soft cream, round category icons, tall product photos.' },
  { key: 'editorial', label: 'Editorial', desc: 'Magazine style: big serif words, numbered category list.' },
  { key: 'street', label: 'Street', desc: 'Black and gold, a moving text band, square tiles.' },
  { key: 'fresh', label: 'Fresh', desc: 'Soft mint, rounded cards, light and friendly.' },
  { key: 'luxe', label: 'Luxe', desc: 'Deep black with thin gold lines, arched categories.' },
];
export const THEME_KEYS = THEMES.map((t) => t.key);
// auto = the visitor's own light / dark switch (starts light); light / dark = the page opens in that mode
export const THEME_MODES = [
  { key: 'auto', label: 'Visitor chooses' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];
export const MODE_KEYS = THEME_MODES.map((m) => m.key);
export const cleanTheme = (t) => (THEME_KEYS.includes(t) ? t : 'classic');
export const cleanMode = (m) => (MODE_KEYS.includes(m) ? m : 'auto');
export const themeLabel = (t) => (THEMES.find((x) => x.key === cleanTheme(t)) || THEMES[0]).label;

// the preview override from the address bar (used inside the preview frame of the theme picker)
export function themePreviewFromUrl() {
  try {
    const q = new URLSearchParams(window.location.search);
    const t = q.get('themePreview');
    if (!t) return null;
    return { theme: cleanTheme(t), mode: cleanMode(q.get('themeMode')) };
  } catch (e) { return null; }
}
