// Products shown on the home showcase with their background removed (public/cutouts/<id>.webp).
// Made with rembg on Evan's Mac (scripts/cutouts/README.md). Order here = order on the rail.
// hanger: the photo already shows its own hanger (only a wire is drawn); color: the colour in the photo.
// A product that is gone or sold out is skipped; a rail with fewer than 4 falls back to photo cards.
// Photos uploaded in the Admin product form (Firestore "showcase") replace these or add more (HomeShowcase.jsx).
export const CUTOUT_VERSION = 6; // bump when the pictures change (browser cache)
export const cutoutSrc = (id) => `/cutouts/${id}.webp?v=${CUTOUT_VERSION}`;
// side: true = there is also a side-on picture (public/cutouts/<id>-side.webp); the piece hangs side-on and turns to the front on hover / tap
export const cutoutSideSrc = (id) => `/cutouts/${id}-side.webp?v=${CUTOUT_VERSION}`;

export const CUTOUTS = {
  men: [
    { id: '1794400040000', hanger: true, color: "Design 4" },
    { id: '1794100046000', hanger: true, side: true, color: "Bottle Green" },
    { id: '1794100039000', hanger: true, side: true, color: "Dark Blue" },
    { id: '1794400073000', color: "Rose" },
    { id: '1794600023000', hanger: true, color: "Navy" },
    { id: '1794400041000', hanger: true, color: "Design 2" },
    { id: '1793307041659', hanger: true, side: true, color: "Sky Blue" },
    { id: '1794400072000', hanger: true, side: true, color: "Design 5" },
    { id: '1794100041000', color: "Maroon" },
    { id: '1794600025000', hanger: true, color: "Navy" },
    { id: '1794400044000', hanger: true, color: "Design 2" },
    { id: '1794600005000', hanger: true, color: "Black" },
    { id: '1794400043000', hanger: true, color: "Design 2" },
    { id: '1794400071000', hanger: true, side: true, color: "Design 2" },
    { id: '1794400063000', color: "Design 4" },
    { id: '1794400023000', hanger: true, side: true }, // AI photo (front + side), Nov 2026
    { id: '1794100040000', hanger: true, side: true }, // AI photo (front + side), Nov 2026
    { id: '1794400026000', hanger: true, side: true }, // AI photo (front + side), Nov 2026
    { id: '1794400068000', hanger: true, side: true }, // AI photo (front + side), Nov 2026
    { id: '1794400025000', hanger: true, side: true }, // AI photo (front + side), Nov 2026
    { id: '1794100015000', hanger: true, side: true }, // AI photo (front + side), Nov 2026
    { id: '1794400069000', hanger: true, side: true }, // AI photo (front + side), Nov 2026
    { id: '1794100013000', hanger: true, side: true }, // AI photo (front + side), Nov 2026
    { id: '1794400024000', hanger: true, side: true }, // AI photo (front + side), Nov 2026
    { id: '1794400070000', hanger: true, side: true }, // AI photo (front + side), Nov 2026
    { id: '1794100014000', hanger: true, side: true }, // AI photo (front + side), Nov 2026
    { id: '1793207650749', hanger: true, side: true }, // AI photo (front + side), Nov 2026
  ],
  shoes: [
    { id: '1793322816247', color: "Khaki Tan & Dark Brown" },
    { id: '1793366362530', color: "Cream & Desert" },
    { id: '1794100019000', color: "Cream Oatmeal & Maroon" },
    { id: '1794100020000', color: "White & Black" },
    { id: '1794100021000', color: "White & Lime Green" },
    { id: '1794100022000', color: "Light Grey & Black" },
    { id: '1794100028000', color: "Core Black & White" },
    { id: '1794100030000', color: "Cool Grey & Ice Blue" },
    { id: '1794100032000', color: "Military Black & White" },
    { id: '1794100037000', color: "Valentine Crimson & White" },
  ],
};
