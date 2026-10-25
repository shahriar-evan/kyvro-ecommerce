// OWNER email: ei email gulo shobsomoy admin, ar shudhu ei gulo Admin Portal theke
// onno admin add/remove korte pare. Eta code e rakha hoyeche jate tumi kokhono lock out na hou.
// Onno admin der list Admin Portal -> "Manage Admins" tab theke control hoy (Firestore e save hoy).
export const OWNER_EMAILS = [
  "shahriarevan545@gmail.com",
];

export const isOwnerEmail = (email) =>
  !!email && OWNER_EMAILS.map((e) => e.trim().toLowerCase()).includes(email.trim().toLowerCase());
