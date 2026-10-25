import React, { useState, useEffect } from 'react';
import { OWNER_EMAILS } from '../adminEmails';
import { listAdmins, createAdminAccount, removeAdmin, sendAdminPasswordReset } from '../adminAuth';

const randomPassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const friendlyError = (err) => {
  const c = err?.code || '';
  if (c === 'auth/weak-password') return 'Password kom pokkhe 6 character hote hobe.';
  if (c === 'auth/invalid-email') return 'Email ta thik na.';
  if (c === 'auth/operation-not-allowed') return 'Firebase Console e Email/Password sign-in enable kora nai.';
  if (c === 'permission-denied' || c === 'firestore/permission-denied') return 'Firestore rules publish kora nai ba tumi owner na.';
  return err?.message || 'Something went wrong.';
};

export default function AdminManager({ isDarkMode }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'ok' | 'err', text }

  const inputClass = `w-full border p-3 text-xs rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`;
  const cardClass = `p-6 sm:p-8 rounded-lg border ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;

  const load = async () => {
    setLoading(true);
    try {
      setAdmins(await listAdmins());
    } catch (err) {
      setMessage({ type: 'err', text: friendlyError(err) });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (!email.trim() || !password) return;
    setBusy(true);
    try {
      const { accountCreated } = await createAdminAccount(email, password);
      setMessage({
        type: 'ok',
        text: accountCreated
          ? `${email.trim()} admin hishebe add hoyeche. Ei email ar password ta oi manush ke dao.`
          : `${email.trim()} er Firebase account age thekei chilo, tai allowed list e add kora hoyeche (password change hoy nai). Password bhule gele "Reset password" email pathao.`
      });
      setEmail('');
      setPassword('');
      await load();
    } catch (err) {
      setMessage({ type: 'err', text: friendlyError(err) });
    }
    setBusy(false);
  };

  const handleRemove = async (adminEmail) => {
    if (!confirm(`${adminEmail} er admin access remove korbe?`)) return;
    setMessage(null);
    try {
      await removeAdmin(adminEmail);
      setMessage({ type: 'ok', text: `${adminEmail} er admin access remove kora hoyeche.` });
      await load();
    } catch (err) {
      setMessage({ type: 'err', text: friendlyError(err) });
    }
  };

  const handleReset = async (adminEmail) => {
    setMessage(null);
    try {
      await sendAdminPasswordReset(adminEmail);
      setMessage({ type: 'ok', text: `${adminEmail} e password reset email pathano hoyeche.` });
    } catch (err) {
      setMessage({ type: 'err', text: friendlyError(err) });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <form onSubmit={handleAdd} className={`${cardClass} space-y-4`}>
        <div>
          <h3 className="text-lg font-serif font-bold">Add New Admin</h3>
          <p className="text-xs text-gray-500 mt-1">Email ar password dao. Account toiri hobe ar oi email diye Admin Portal e login kora jabe.</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Email *</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="newadmin@example.com" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Password * (minimum 6 characters)</label>
          <div className="flex gap-2">
            <input type="text" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className={inputClass} />
            <button type="button" onClick={() => setPassword(randomPassword())} className={`px-4 text-xs font-bold rounded border whitespace-nowrap ${isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-[#222]' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}>
              Generate
            </button>
          </div>
        </div>
        <button type="submit" disabled={busy} className="bg-[#D4AF37] text-black font-bold px-6 py-3 rounded text-xs uppercase tracking-widest hover:opacity-90 transition disabled:opacity-50">
          {busy ? 'Adding...' : 'Add Admin'}
        </button>
        {message && (
          <p className={`text-xs p-3 rounded border ${message.type === 'ok' ? 'border-green-500/40 text-green-600 bg-green-500/10' : 'border-red-500/40 text-red-500 bg-red-500/10'}`}>
            {message.text}
          </p>
        )}
      </form>

      <div className={`${cardClass} space-y-4`}>
        <h3 className="text-lg font-serif font-bold">Admins ({OWNER_EMAILS.length + admins.length})</h3>
        <div className="divide-y text-xs">
          {OWNER_EMAILS.map((o) => (
            <div key={o} className="py-3 flex items-center justify-between gap-3">
              <span className="font-semibold break-all">{o}</span>
              <span className="text-[#D4AF37] font-bold uppercase tracking-wider">Owner</span>
            </div>
          ))}
          {loading && <p className="py-3 text-gray-500">Loading...</p>}
          {!loading && admins.length === 0 && <p className="py-3 text-gray-500">Ekhono kono extra admin add kora hoy nai.</p>}
          {admins.map((a) => (
            <div key={a.email} className="py-3 flex flex-wrap items-center justify-between gap-3">
              <span className="font-semibold break-all">{a.email}</span>
              <div className="flex gap-2">
                <button onClick={() => handleReset(a.email)} className="text-gray-500 hover:text-black dark:hover:text-white px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded">Reset password</button>
                <button onClick={() => handleRemove(a.email)} className="text-red-400 hover:text-red-300 px-2 py-1 bg-red-950/40 rounded">Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
