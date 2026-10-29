import { getApp } from "firebase/app";
import {
  getFirestore, doc, getDoc, getDocs, where, setDoc, updateDoc, runTransaction, writeBatch, collection, query, orderBy, onSnapshot, serverTimestamp, arrayUnion, deleteField,
} from "firebase/firestore";
import "./firebase"; // makes sure the default Firebase app exists

const db = getFirestore(getApp());

// e.g. KYV-261026-4821 (date + 4 random digits)
const makeOrderNumber = () => {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `KYV-${yy}${mm}${dd}-${Math.floor(1000 + Math.random() * 9000)}`;
};

// Customers do not log in. Anyone can create an order; only the team can read or change it
// (enforced by Firestore rules). Retries with a new number in the very unlikely case of a clash.
export async function placeOrder(order) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    const orderNumber = makeOrderNumber();
    try {
      await setDoc(doc(db, "orders", orderNumber), { ...order, orderNumber, createdAt: serverTimestamp() });
      return { orderNumber };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

// Live list of all orders, newest first (team members only)
export function watchOrders(onData, onError) {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError && onError(err)
  );
}

const historyEntry = (label, staff) => ({
  status: label,
  by: staff.email || "",
  byName: staff.name || staff.email || "",
  at: new Date().toISOString(),
});

// Moves an order to a new status and records who did it and when.
// Stock is handled here too:
//   * Pending -> Processing (confirm): the ordered quantities are taken off each product's stock (per size)
//   * Cancel after it was confirmed: the stock is put back
// Everything happens in one transaction, so two people confirming at once cannot double-count.
// Returns { skipped: [...] } with products whose stock could not be changed (e.g. not in Firestore).
export async function updateOrderStatus(orderId, status, staff) {
  const orderRef = doc(db, "orders", orderId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists()) throw new Error("Order not found.");
    const order = snap.data();
    const wasDeducted = order.stockDeducted === true;
    const deduct = status === "Processing" && !wasDeducted;
    const restore = status === "Cancelled" && wasDeducted;
    const skipped = [];
    const productWrites = [];

    if (deduct || restore) {
      const dir = deduct ? -1 : 1;
      const items = Array.isArray(order.items) ? order.items : [];
      const ids = [...new Set(items.map((it) => String(it.id)))];
      // all reads first (a Firestore transaction rule)
      const docs = {};
      for (const id of ids) docs[id] = await tx.get(doc(db, "products", id));

      const shortages = [];
      for (const id of ids) {
        const pSnap = docs[id];
        const lines = items.filter((it) => String(it.id) === id);
        if (!pSnap.exists()) { skipped.push(lines[0].name); continue; }
        const p = pSnap.data();
        const sized = p.sizeStock && Object.keys(p.sizeStock).length > 0;
        const colored = p.colorStock && Object.keys(p.colorStock).length > 0;
        const sizeStock = sized ? { ...p.sizeStock } : null;
        const colorStock = colored ? { ...p.colorStock } : null;
        let stock = parseInt(p.stock, 10) || 0;
        let touched = false;
        for (const it of lines) {
          const qty = parseInt(it.quantity, 10) || 0;
          if (colored) {
            // stock is kept per size AND color: 'M|White'
            const key = `${sized ? it.size || '' : ''}|${it.color || ''}`;
            if (colorStock[key] === undefined) { skipped.push(`${it.name} (${[it.size, it.color].filter(Boolean).join(', ')})`); continue; }
            const cur = parseInt(colorStock[key], 10) || 0;
            const next = cur + dir * qty;
            if (next < 0) shortages.push(`${it.name} (${[sized ? `size ${it.size}` : '', it.color].filter(Boolean).join(', ')}): only ${cur} left, order needs ${qty}`);
            colorStock[key] = Math.max(0, next);
            touched = true;
          } else if (sized) {
            if (sizeStock[it.size] === undefined) { skipped.push(`${it.name} (${it.size})`); continue; }
            const next = (parseInt(sizeStock[it.size], 10) || 0) + dir * qty;
            if (next < 0) shortages.push(`${it.name} (size ${it.size}): only ${parseInt(sizeStock[it.size], 10) || 0} left, order needs ${qty}`);
            sizeStock[it.size] = Math.max(0, next);
            touched = true;
          } else {
            const next = stock + dir * qty;
            if (next < 0) shortages.push(`${it.name}: only ${stock} left, order needs ${qty}`);
            stock = Math.max(0, next);
            touched = true;
          }
        }
        if (touched) {
          let patch;
          if (colored) {
            // sizeStock and stock are the totals of the size x color numbers
            const sums = {};
            for (const [k, n] of Object.entries(colorStock)) { const sz = k.split('|')[0]; sums[sz] = (sums[sz] || 0) + (parseInt(n, 10) || 0); }
            const total = Object.values(sums).reduce((a, n) => a + n, 0);
            patch = sized ? { colorStock, sizeStock: Object.fromEntries(Object.keys(sizeStock).map((sz) => [sz, sums[sz] || 0])), stock: total } : { colorStock, stock: total };
          } else {
            patch = sized
              ? { sizeStock, stock: Object.values(sizeStock).reduce((a, n) => a + (parseInt(n, 10) || 0), 0) }
              : { stock };
          }
          // pieces sold (for the "best selling first" order of the shop): +qty when confirmed, -qty when a confirmed order is cancelled
          const qtyTotal = lines.reduce((a, it) => a + (parseInt(it.quantity, 10) || 0), 0);
          patch.sold = Math.max(0, (parseInt(p.sold, 10) || 0) + (deduct ? qtyTotal : -qtyTotal));
          productWrites.push([doc(db, "products", id), patch]);
        }
      }
      if (shortages.length) {
        throw new Error("Not enough stock to confirm this order:\n" + shortages.join("\n") + "\nUpdate the stock first, or cancel the order.");
      }
    }

    for (const [ref, patch] of productWrites) tx.update(ref, patch);

    const patch = {
      status,
      updatedAt: serverTimestamp(),
      history: arrayUnion(historyEntry(status, staff)),
    };
    if (status === "Processing") {
      patch.confirmedBy = staff.email || "";
      patch.confirmedByName = staff.name || staff.email || "";
    }
    if (deduct) patch.stockDeducted = true;
    if (restore) patch.stockDeducted = false;
    tx.update(orderRef, patch);
    return { skipped };
  });
}

// A customer can cancel their OWN order, but only while it is still Pending and within 30 minutes of ordering.
// Firestore rules enforce this too (so it cannot be bypassed). A Pending order has not touched the stock yet.
export const CANCEL_WINDOW_MINUTES = 30;
export async function cancelMyOrder(orderId, customer) {
  await updateDoc(doc(db, "orders", orderId), {
    status: "Cancelled",
    updatedAt: serverTimestamp(),
    history: arrayUnion({ status: "Cancelled", by: customer.email || "", byName: "Customer (cancelled own order)", at: new Date().toISOString() }),
  });
}

export async function markOrderPaid(orderId, staff) {
  await updateDoc(doc(db, "orders", orderId), {
    paymentStatus: "Paid",
    updatedAt: serverTimestamp(),
    history: arrayUnion(historyEntry("Payment received", staff)),
  });
}

// ---- Supplier orders (dropshipping): PRIVATE ----
// "orderSupply/{orderId}" remembers which supplier shops this order was already placed at. Only team members can read it
// (never the customer, who can read the order itself). placed = { <shopKey>: { supplierName, orderNo, cost, at, by, byName } }
export function watchOrderSupply(onData, onError) {
  return onSnapshot(
    collection(db, "orderSupply"),
    (snap) => {
      const map = {};
      snap.docs.forEach((d) => { map[d.id] = d.data(); });
      onData(map);
    },
    (err) => onError && onError(err)
  );
}
export const supplierKey = (name) => String(name || "supplier").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "supplier";

export async function markSupplierOrdered(orderId, group, orderNo, staff) {
  const entry = {
    supplierName: group.name,
    orderNo: String(orderNo || "").trim().slice(0, 80),
    cost: Number(group.cost) || 0,
    at: new Date().toISOString(),
    by: staff.email || "",
    byName: staff.name || staff.email || "",
  };
  await setDoc(doc(db, "orderSupply", orderId), { placed: { [supplierKey(group.name)]: entry }, updatedAt: new Date().toISOString() }, { merge: true });
}
export async function unmarkSupplierOrdered(orderId, name) {
  await updateDoc(doc(db, "orderSupply", orderId), { [`placed.${supplierKey(name)}`]: deleteField(), updatedAt: new Date().toISOString() });
}

// Owner only (the Firestore rules check it too): permanently deletes finished orders (Delivered / Cancelled)
export async function deleteOrders(ids) {
  for (let i = 0; i < ids.length; i += 400) {
    const batch = writeBatch(db);
    ids.slice(i, i + 400).forEach((id) => batch.delete(doc(db, "orders", id)));
    await batch.commit();
  }
  return ids.length;
}

// ---- Order tracking (signed-in customers) ----
// A guest order has no account on it, so the customer proves it is theirs with the tracking code + the phone number
// used on the order. Firestore rules compare the phone with the order and then save a "claim" for this account.
const normPhone = (p) => String(p || '').replace(/[\s-]/g, '');

export async function claimOrder(user, orderNumber, phone) {
  const code = String(orderNumber || '').trim().toUpperCase();
  const ph = normPhone(phone);
  if (!/^KYV-[0-9]{6}-[0-9]{4}$/.test(code)) throw new Error('bad-code');
  if (!/^[+]?[0-9]{7,15}$/.test(ph)) throw new Error('bad-phone');
  try {
    await setDoc(doc(db, 'orderClaims', `${user.uid}_${code}`), { uid: user.uid, orderNumber: code, phone: ph, claimedAt: serverTimestamp() });
  } catch (e) {
    // already claimed before (the claim cannot be written twice)? then the order is readable anyway
    try {
      const again = await getDoc(doc(db, 'orders', code));
      if (again.exists()) return { id: again.id, ...again.data() };
    } catch (e2) { /* not claimed */ }
    throw new Error('no-match');
  }
  const snap = await getDoc(doc(db, 'orders', code));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Every order this account has tracked or placed (newest first)
export async function loadTrackedOrders(user) {
  const out = new Map();
  const claims = await getDocs(query(collection(db, 'orderClaims'), where('uid', '==', user.uid)));
  await Promise.all(claims.docs.map(async (c) => {
    try {
      const o = await getDoc(doc(db, 'orders', c.data().orderNumber));
      if (o.exists()) out.set(o.id, { id: o.id, ...o.data() });
    } catch (e) { /* order was deleted */ }
  }));
  return [...out.values()].sort((a, b) => ((b.createdAt && b.createdAt.seconds) || 0) - ((a.createdAt && a.createdAt.seconds) || 0));
}
