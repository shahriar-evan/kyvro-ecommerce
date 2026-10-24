// Ei email gulo diyei shudhu Admin Portal e login kora jabe.
// Notun email dite chaile nicher list e ekta kore line add koro (comma diye).
const ADMIN_EMAILS = [
  "shahriarevan545@gmail.com",
  // "arekta-email@gmail.com",
];

export const isAdminEmail = (email) =>
  !!email && ADMIN_EMAILS.map((e) => e.trim().toLowerCase()).includes(email.trim().toLowerCase());
