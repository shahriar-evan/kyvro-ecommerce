import React, { useState, useEffect } from 'react';
import { OWNER_EMAILS, ownerName } from '../adminEmails';
import { listAdmins, listPrivateDetails, createAdminAccount, updateAdminProfile, setAdminRole, setAdminActive, removeAdmin, sendAdminPasswordReset, ROLES, ROLE_LABELS } from '../adminAuth';

const randomPassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const friendlyError = (err) => {
  const c = err?.code || '';
  if (c === 'auth/weak-password') return 'Password must be at least 6 characters.';
  if (c === 'auth/invalid-email') return 'That email address is not valid.';
  if (c === 'auth/operation-not-allowed') return 'Email/Password sign-in is not enabled in the Firebase Console.';
  if (c === 'permission-denied' || c === 'firestore/permission-denied') return 'Permission denied. This email may already be on the team, or the latest Firestore rules have not been published yet.';
  return err?.message || 'Something went wrong.';
};

const formatDate = (ts) => {
  try {
    const d = ts && ts.toDate ? ts.toDate() : null;
    return d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  } catch (e) { return ''; }
};

const OWNER_WARNING = 'The Owner role lets this person do everything, including adding and removing team members, changing roles and turning access ON/OFF. Are you sure?';

// Permission matrix shown in the Roles section: [label, owner, manager, admin]
const PERMISSIONS = [
  ['Add new products', true, true, true],
  ['Edit any product', true, true, true],
  ['Delete products they added themselves', true, true, false],
  ['Delete products added by someone else', true, false, false],
  ['View customer orders and customer details', true, true, true],
  ['Confirm orders and move them to Processing, Shipped, Delivered', true, true, true],
  ['Cancel an order or mark an online payment as received', true, true, true],
  ['View the team list (names and emails)', true, true, false],
  ['Add a new Admin', true, true, false],
  ['Add a new Manager or Owner', true, false, false],
  ['Edit a member\'s name, phone and note', true, false, false],
  ['See a member\'s phone, note and saved password', true, false, false],
  ['Change a team member\'s role', true, false, false],
  ['Turn a team member\'s access ON / OFF', true, false, false],
  ['Reset a team member\'s password', true, false, false],
  ['Remove a team member', true, false, false],
];

const ROLE_CARDS = [
  {
    key: 'owner',
    title: 'Owner',
    summary: 'Full control of the admin panel.',
    can: [
      'Add, edit and delete every product',
      'See customer orders, confirm them and move them through Processing, Shipped and Delivered',
      'Add team members with any role (Owner, Manager or Admin)',
      'Edit names, phone numbers and notes, and change anyone\'s role',
      'Turn anyone\'s access ON or OFF',
      'See each member\'s phone, note and the password set when they were added',
      'Reset passwords and remove team members',
    ],
    cannot: [
      'Change their own role, switch off their own access or remove themselves (a safety lock so nobody gets locked out)',
    ],
  },
  {
    key: 'manager',
    title: 'Manager',
    summary: 'Runs the product catalog and can bring in new Admins.',
    can: [
      'Add new products and edit any product',
      'See customer orders, confirm them and move them through Processing, Shipped and Delivered',
      'Delete only the products they added themselves',
      'Add new team members, but only with the Admin role',
      'View the team list (names and emails, read-only)',
    ],
    cannot: [
      'Delete products added by an Admin, another Manager, an Owner, or the default store products',
      'Create Managers or Owners',
      'See phone numbers, notes or passwords',
      'Change roles, turn access ON/OFF, reset passwords or remove anyone',
    ],
  },
  {
    key: 'admin',
    title: 'Admin',
    summary: 'Day-to-day product entry.',
    can: [
      'Add new products',
      'Edit any product',
      'See customer orders, confirm them and move them through Processing, Shipped and Delivered',
    ],
    cannot: [
      'Delete any product (the Delete button is hidden)',
      'See or manage the team (no team tab)',
    ],
  },
];

export default function AdminManager({ isDarkMode, currentEmail, currentName, adminRole }) {
  const isOwner = adminRole === 'owner';
  const [admins, setAdmins] = useState([]);
  const [privateInfo, setPrivateInfo] = useState({}); // email -> { phone, note, password } (Owner only)
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [role, setRole] = useState('admin');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'ok' | 'err', text }
  const [showPw, setShowPw] = useState({});      // email -> true when the password is revealed
  const [editing, setEditing] = useState(null);  // email of the member being edited
  const [draft, setDraft] = useState({ name: '', phone: '', note: '' });

  const me = (currentEmail || '').toLowerCase();
  const inputClass = `w-full border p-3 text-xs rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`;
  const smallInput = `w-full border p-2 text-xs rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`;
  const cardClass = `p-6 sm:p-8 rounded-lg border ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const innerCardClass = `p-5 rounded-lg border ${isDarkMode ? 'bg-[#121212] border-gray-800' : 'bg-gray-50 border-gray-200'}`;
  const selectClass = `border p-2 text-xs rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`;
  const mutedClass = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  const chipBtn = 'px-2 py-1 rounded text-[11px] bg-gray-200 dark:bg-gray-800 text-gray-600 hover:text-black dark:hover:text-white';

  const lockedOwners = OWNER_EMAILS.map((o) => o.toLowerCase());
  const extraAdmins = admins.filter((a) => !lockedOwners.includes(a.email));

  // Who is this email? Name if we know it, otherwise the email itself
  const nameOf = (mail) => {
    const m = (mail || '').toLowerCase();
    const found = admins.find((a) => a.email === m);
    return (found && found.name) || ownerName(m) || mail || '';
  };

  const load = async () => {
    setLoading(true);
    try {
      setAdmins(await listAdmins());
      setPrivateInfo(isOwner ? await listPrivateDetails() : {});
    } catch (err) {
      setMessage({ type: 'err', text: friendlyError(err) });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (!name.trim() || !email.trim() || !password) return;
    const newRole = isOwner ? role : 'admin'; // Managers can only add Admins
    if (newRole === 'owner' && !confirm(OWNER_WARNING)) return;
    setBusy(true);
    try {
      const { accountCreated } = await createAdminAccount(email, password, newRole, {
        name, phone, note, addedByName: currentName || currentEmail,
      });
      setMessage({
        type: 'ok',
        text: accountCreated
          ? `${name.trim()} (${email.trim()}) was added as ${ROLE_LABELS[newRole]}. Share the email and password with them so they can log in.`
          : `${email.trim()} already had a Firebase account, so ${name.trim()} was added to the team as ${ROLE_LABELS[newRole]} (their existing password was not changed and is not saved).`
      });
      setName(''); setEmail(''); setPassword(''); setPhone(''); setNote(''); setRole('admin');
      await load();
    } catch (err) {
      setMessage({ type: 'err', text: friendlyError(err) });
    }
    setBusy(false);
  };

  const startEdit = (a) => {
    const pv = privateInfo[a.email] || {};
    setEditing(a.email);
    setDraft({ name: a.name || '', phone: pv.phone || '', note: pv.note || '' });
  };

  const saveEdit = async () => {
    if (!draft.name.trim()) { setMessage({ type: 'err', text: 'Name cannot be empty.' }); return; }
    setMessage(null);
    try {
      await updateAdminProfile(editing, draft);
      setMessage({ type: 'ok', text: `Details for ${draft.name.trim()} were saved.` });
      setEditing(null);
      await load();
    } catch (err) {
      setMessage({ type: 'err', text: friendlyError(err) });
    }
  };

  const handleRoleChange = async (a, newRole) => {
    setMessage(null);
    if (newRole === 'owner' && !confirm(OWNER_WARNING)) return;
    try {
      await setAdminRole(a.email, newRole);
      setMessage({ type: 'ok', text: `${a.name || a.email} is now ${ROLE_LABELS[newRole]}.` });
      await load();
    } catch (err) {
      setMessage({ type: 'err', text: friendlyError(err) });
    }
  };

  const handleToggleActive = async (a) => {
    setMessage(null);
    const next = !a.active;
    try {
      await setAdminActive(a.email, next);
      setMessage({
        type: 'ok',
        text: next
          ? `Access for ${a.name || a.email} was turned ON. They can log in again.`
          : `Access for ${a.name || a.email} was turned OFF. If they are logged in, they will be signed out right away.`
      });
      await load();
    } catch (err) {
      setMessage({ type: 'err', text: friendlyError(err) });
    }
  };

  const handleRemove = async (a) => {
    if (!confirm(`Permanently remove ${a.name || a.email} from the team? (To block access temporarily, turn the Access switch OFF instead.)`)) return;
    setMessage(null);
    try {
      await removeAdmin(a.email);
      setMessage({ type: 'ok', text: `${a.name || a.email} was removed from the team.` });
      await load();
    } catch (err) {
      setMessage({ type: 'err', text: friendlyError(err) });
    }
  };

  const handleReset = async (a) => {
    setMessage(null);
    try {
      await sendAdminPasswordReset(a.email);
      setMessage({ type: 'ok', text: `A password reset email was sent to ${a.email}. The saved password was cleared because it is no longer valid.` });
      await load();
    } catch (err) {
      setMessage({ type: 'err', text: friendlyError(err) });
    }
  };

  const copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); setMessage({ type: 'ok', text: 'Copied to clipboard.' }); } catch (e) { /* ignore */ }
  };

  const Tick = ({ yes }) => (
    <span className={yes ? 'text-green-600 font-bold' : 'text-red-400 font-bold'}>{yes ? '✓' : '✗'}</span>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ROLES & PERMISSIONS */}
      <div className={`${cardClass} space-y-6`}>
        <div>
          <h3 className="text-2xl font-serif font-bold">Roles &amp; Permissions</h3>
          <p className={`text-sm mt-1 ${mutedClass}`}>
            Every team member has exactly one role. The role decides what they can see and do in this Admin Portal.
            {adminRole && <> You are logged in as <strong className="text-[#D4AF37]">{ROLE_LABELS[adminRole]}</strong>.</>}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ROLE_CARDS.map((r) => (
            <div key={r.key} className={`${innerCardClass} space-y-3`}>
              <div>
                <h4 className="text-lg font-serif font-bold text-[#D4AF37]">{r.title}</h4>
                <p className={`text-xs mt-0.5 ${mutedClass}`}>{r.summary}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-green-600 mb-1">Can</p>
                <ul className="space-y-1 text-xs list-disc pl-4">
                  {r.can.map((t) => <li key={t}>{t}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-red-400 mb-1">Cannot</p>
                <ul className="space-y-1 text-xs list-disc pl-4">
                  {r.cannot.map((t) => <li key={t}>{t}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className={`uppercase tracking-wider border-b ${isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-600'}`}>
                <th className="py-2 pr-4">Permission</th>
                <th className="py-2 px-3 text-center">Owner</th>
                <th className="py-2 px-3 text-center">Manager</th>
                <th className="py-2 px-3 text-center">Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {PERMISSIONS.map(([label, o, m, a]) => (
                <tr key={label}>
                  <td className="py-2 pr-4">{label}</td>
                  <td className="py-2 px-3 text-center"><Tick yes={o} /></td>
                  <td className="py-2 px-3 text-center"><Tick yes={m} /></td>
                  <td className="py-2 px-3 text-center"><Tick yes={a} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={`text-xs space-y-1.5 ${mutedClass}`}>
          <p className={`font-bold uppercase tracking-wider text-[11px] ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>Good to know</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Each product shows who added it (&quot;Added by&quot;). Managers can only delete products that show their own name.</li>
            <li>The default products that came with the store have no &quot;Added by&quot; and can only be deleted by an Owner.</li>
            <li>Turning a person&apos;s <strong>Access OFF</strong> blocks their login straight away and signs them out if they are logged in. Turning it back ON restores their role and password, nothing is lost.</li>
            <li><strong>Remove</strong> deletes the person from the team list permanently (their Firebase login account is not deleted, but it no longer works for the Admin Portal).</li>
            <li>The fixed Owner email is stored in the code, so it cannot be removed, demoted or turned OFF from this screen.</li>
            <li>Phone numbers, notes and saved passwords are kept in an Owner-only area. Managers and Admins cannot read them, even by looking at the site&apos;s data.</li>
          </ul>
        </div>
      </div>

      {/* ADD FORM */}
      <form onSubmit={handleAdd} className={`${cardClass} space-y-4 max-w-3xl`}>
        <div>
          <h3 className="text-lg font-serif font-bold">{isOwner ? 'Add New Team Member' : 'Add New Admin'}</h3>
          <p className={`text-xs mt-1 ${mutedClass}`}>
            Enter the person&apos;s name, email and a password{isOwner ? ' and choose a role' : ''}. The account is created right away and they can log in to the Admin Portal with these details.
            {!isOwner && ' As a Manager you can only add people with the Admin role.'}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Name *</label>
            <input type="text" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahim Uddin" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Email *</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="newadmin@example.com" className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Password * (minimum 6 characters)</label>
          <div className="flex gap-2">
            <input type="text" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className={inputClass} />
            <button type="button" onClick={() => setPassword(randomPassword())} className={`px-4 text-xs font-bold rounded border whitespace-nowrap ${isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-[#222]' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}>
              Generate
            </button>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">This password is saved in the Owner-only area so the Owner can look it up later. It is never shown to anyone else.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Phone (optional, Owner only)</label>
            <input type="tel" maxLength={25} value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+\-\s()]/g, ''))} placeholder="01XXXXXXXXX" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Note / position (optional, Owner only)</label>
            <input type="text" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Warehouse manager" className={inputClass} />
          </div>
        </div>
        {isOwner && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Role *</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
              {ROLES.slice().reverse().map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
        )}
        <button type="submit" disabled={busy} className="bg-[#D4AF37] text-black font-bold px-6 py-3 rounded text-xs uppercase tracking-widest hover:opacity-90 transition disabled:opacity-50">
          {busy ? 'Adding...' : (isOwner ? 'Add Member' : 'Add Admin')}
        </button>
        {message && (
          <p className={`text-xs p-3 rounded border ${message.type === 'ok' ? 'border-green-500/40 text-green-600 bg-green-500/10' : 'border-red-500/40 text-red-500 bg-red-500/10'}`}>
            {message.text}
          </p>
        )}
      </form>

      {/* TEAM LIST */}
      <div className={`${cardClass} space-y-4 max-w-3xl`}>
        <h3 className="text-lg font-serif font-bold">Team ({OWNER_EMAILS.length + extraAdmins.length})</h3>
        <div className="divide-y text-xs">
          {OWNER_EMAILS.map((o) => (
            <div key={o} className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{ownerName(o) || o}</p>
                {ownerName(o) && <p className="text-gray-500 break-all">{o}</p>}
              </div>
              <span className="text-[#D4AF37] font-bold uppercase tracking-wider">Owner (fixed)</span>
            </div>
          ))}
          {loading && <p className="py-3 text-gray-500">Loading...</p>}
          {!loading && extraAdmins.length === 0 && <p className="py-3 text-gray-500">No other team members yet.</p>}

          {extraAdmins.map((a) => {
            const isMe = a.email === me;
            const pv = privateInfo[a.email] || {};
            const addedByText = a.addedByName || (a.addedBy ? nameOf(a.addedBy) : '');
            const dateText = formatDate(a.createdAt);
            const revealed = !!showPw[a.email];
            return (
              <div key={a.email} className={`py-4 space-y-3 ${a.active ? '' : 'opacity-60'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {a.name || <span className="text-gray-500 font-normal">(no name yet)</span>}
                      {isMe && <span className="text-gray-500 font-normal"> (you)</span>}
                      {!a.active && <span className="ml-2 text-red-500 font-bold uppercase">Access OFF</span>}
                    </p>
                    <p className="text-gray-500 break-all">{a.email}</p>
                    {(addedByText || dateText) && (
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Added{addedByText ? ` by ${addedByText}` : ''}{dateText ? ` on ${dateText}` : ''}
                      </p>
                    )}
                  </div>

                  {isOwner ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={a.role}
                        disabled={isMe}
                        onChange={(e) => handleRoleChange(a, e.target.value)}
                        className={`${selectClass} ${isMe ? 'opacity-60' : ''}`}
                        title={isMe ? 'You cannot change your own role' : 'Change role'}
                      >
                        {ROLES.slice().reverse().map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                      {!isMe && (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={a.active}
                          onClick={() => handleToggleActive(a)}
                          title={a.active ? 'Access is ON. Click to turn OFF' : 'Access is OFF. Click to turn ON'}
                          className={`relative w-11 h-6 rounded-full transition ${a.active ? 'bg-green-500' : 'bg-gray-400'}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${a.active ? 'translate-x-5' : ''}`} />
                        </button>
                      )}
                      <button onClick={() => startEdit(a)} className={chipBtn}>Edit</button>
                      <button onClick={() => handleReset(a)} className={chipBtn}>Reset password</button>
                      {!isMe && <button onClick={() => handleRemove(a)} className="text-red-400 hover:text-red-300 px-2 py-1 bg-red-950/40 rounded text-[11px]">Remove</button>}
                    </div>
                  ) : (
                    <span className="text-[#D4AF37] font-bold uppercase tracking-wider">{ROLE_LABELS[a.role]}</span>
                  )}
                </div>

                {/* Owner-only details */}
                {isOwner && editing !== a.email && (
                  <div className={`${innerCardClass} !p-3 space-y-1`}>
                    <p><span className="text-gray-500">Phone:</span> {pv.phone || <span className="text-gray-500">not added</span>}</p>
                    <p><span className="text-gray-500">Note:</span> {pv.note || <span className="text-gray-500">not added</span>}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-gray-500">Password:</span>
                      {pv.password ? (
                        <>
                          <span className="font-mono">{revealed ? pv.password : '••••••••••'}</span>
                          <button onClick={() => setShowPw({ ...showPw, [a.email]: !revealed })} className={chipBtn}>{revealed ? 'Hide' : 'Show'}</button>
                          {revealed && <button onClick={() => copyText(pv.password)} className={chipBtn}>Copy</button>}
                        </>
                      ) : (
                        <span className="text-gray-500">not saved (added earlier, already existed, or was reset)</span>
                      )}
                    </div>
                    {pv.password && <p className="text-[10px] text-gray-500">This is the password set when they were added. If they changed it themselves, it may be out of date.</p>}
                  </div>
                )}

                {/* Edit form (Owner) */}
                {isOwner && editing === a.email && (
                  <div className={`${innerCardClass} !p-3 space-y-3`}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-gray-500 mb-1">Name *</label>
                        <input type="text" maxLength={60} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={smallInput} />
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-500 mb-1">Phone</label>
                        <input type="tel" maxLength={25} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value.replace(/[^0-9+\-\s()]/g, '') })} className={smallInput} />
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-500 mb-1">Note / position</label>
                        <input type="text" maxLength={120} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} className={smallInput} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className="bg-[#D4AF37] text-black font-bold px-4 py-2 rounded text-[11px] uppercase tracking-wider">Save</button>
                      <button onClick={() => setEditing(null)} className={chipBtn}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {isOwner && (
          <p className="text-[11px] text-gray-500">
            Access switch: green = ON (can log in), grey = OFF (blocked). Use it to give or take away access temporarily without deleting the person.
          </p>
        )}
      </div>
    </div>
  );
}
