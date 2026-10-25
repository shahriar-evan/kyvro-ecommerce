// OWNER emails: these emails are always Owners and can never be removed, turned off or demoted.
// This is kept in code so you can never be locked out.
// Other team members are managed from Admin Portal -> "Manage Admins" (saved in Firestore).
export const OWNER_EMAILS = [
  "shahriarevan545@gmail.com",
];

export const isOwnerEmail = (email) =>
  !!email && OWNER_EMAILS.map((e) => e.trim().toLowerCase()).includes(email.trim().toLowerCase());
