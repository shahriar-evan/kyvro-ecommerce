// Accepts a Firestore Timestamp, a Date, an ISO string or nothing
export const toDate = (v) => {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const formatDateTime = (v) => {
  const d = toDate(v);
  return d
    ? d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    : 'Just now';
};
