import { getApp } from "firebase/app";
import { getFirestore, doc, setDoc, deleteDoc, collection, query, where, onSnapshot, serverTimestamp } from "firebase/firestore";
import "./firebase"; // makes sure the default Firebase app exists

const db = getFirestore(getApp());

// Customer reviews: reviews/{orderNumber}_{productId} = { productId, orderNumber, item (index in the order's items),
// uid, name (first name only), rating 1-5, text, createdAt }. Public read. Only a signed-in customer whose own order
// is Delivered and has that product can write one (firestore.rules checks the order). The Owner / a Manager can delete.
export const reviewId = (orderNumber, productId) => `${orderNumber}_${productId}`;
const firstName = (n) => String(n || "").trim().split(/\s+/)[0].slice(0, 30) || "Customer";
const toMs = (v) => (v && typeof v.toMillis === "function" ? v.toMillis() : Date.parse(v) || 0);

// every review of one product, newest first
export function watchProductReviews(productId, onData) {
  if (!productId) { onData([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "reviews"), where("productId", "==", String(productId))),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt))),
    () => onData([])
  );
}

// the signed-in customer's own reviews: { reviewId: review }
export function watchMyReviews(uid, onData) {
  if (!uid) { onData({}); return () => {}; }
  return onSnapshot(
    query(collection(db, "reviews"), where("uid", "==", uid)),
    (snap) => onData(Object.fromEntries(snap.docs.map((d) => [d.id, { id: d.id, ...d.data() }]))),
    () => onData({})
  );
}

export async function saveReview({ order, item, index, user, rating, text }) {
  const productId = String(item.id);
  await setDoc(doc(db, "reviews", reviewId(order.orderNumber, productId)), {
    productId,
    orderNumber: order.orderNumber,
    item: index,
    uid: user.uid,
    name: firstName(user.displayName),
    rating: Math.max(1, Math.min(5, parseInt(rating, 10) || 5)),
    text: String(text || "").trim().slice(0, 600),
    createdAt: serverTimestamp(),
  });
}

export const deleteReview = (id) => deleteDoc(doc(db, "reviews", id));

export const averageRating = (list) => (list.length ? list.reduce((n, r) => n + (Number(r.rating) || 0), 0) / list.length : 0);
