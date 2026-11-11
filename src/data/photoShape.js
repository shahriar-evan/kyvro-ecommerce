// Products whose main photo shows a FOLDED shirt (a near-square flat lay), found from the photo's cut-out shape
// (height / width <= 1.1; scripts/cutouts). In the Shirt and Formal Shirt lists they come after the long photos
// (hanging or worn), which look better at the top. A new product is not in this list, so it counts as a long photo.
export const FOLDED_PHOTO_IDS = new Set([
  '1794600011000',
  '1794600012000',
  '1794600013000',
  '1794600014000',
  '1794600015000',
  '1794600016000',
  '1794600017000',
  '1794600018000',
  '1794600019000'
]);
export const isFoldedPhoto = (p) => !!p && FOLDED_PHOTO_IDS.has(String(p.id));
