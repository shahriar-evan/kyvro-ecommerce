// OWNER emails: these emails are always Owners and can never be removed, turned off or demoted.
// This is kept in code so you can never be locked out.
// Other team members are managed from Admin Portal -> "Manage Admins" (saved in Firestore).
export const OWNER_EMAILS = [
  "shahriarevan545@gmail.com",
];

// Display name for each fixed owner (shown in the team list and dashboard header)
export const OWNER_NAMES = {
  "shahriarevan545@gmail.com": "Shahriar Nafiz Evan",
};

export const isOwnerEmail = (email) =>
  !!email && OWNER_EMAILS.map((e) => e.trim().toLowerCase()).includes(email.trim().toLowerCase());

export const ownerName = (email) => (email && OWNER_NAMES[email.trim().toLowerCase()]) || "";
