import React, { useState, useEffect } from 'react';
import { OWNER_EMAILS } from '../adminEmails';
import { listAdmins, createAdminAccount, setAdminRole, setAdminActive, removeAdmin, sendAdminPasswordReset, ROLES, ROLE_LABELS } from '../adminAuth';

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

const OWNER_WARNING = 'The Owner role lets this person do everything, including adding and removing team members, changing roles and turning access ON/OFF. Are you sure?';

// Permission matrix shown in the Roles section: [label, owner, manager, admin]
const PERMISSIONS = [
  ['Add new products', true, true, true],
  ['Edit any product', true, true, true],
  ['Delete products they added themselves', true, true, false],
  ['Delete products added by someone else', true, false, false],
  ['View the team list', true, true, false],
  ['Add a new Admin', true, true, false],
  ['Add a new Manager or Owner', true, false, false],
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
      'Add team members with any role (Owner, Manager or Admin)',
      'Change anyone\'s role at any time',
      'Turn anyone\'s access ON or OFF',
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
      'Delete only the products they added themselves',
      'Add new team members, but only with the Admin role',
      'View the team list (read-only)',
    ],
    cannot: [
      'Delete products added by an Admin, another Manager, an Owner, or the default store products',
      'Create Managers or Owners',
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
    ],
    cannot: [
      'Delete any product (the Delete button is hidden)',
      'See or manage the team (no team tab)',
    ],
  },
];

export default function AdminManager({ isDarkMode, currentEmail, adminRole }) {
  const isOwner = adminRole === 'owner';
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'ok' | 'err', text }

  const me = (currentEmail || '').toLowerCase();
  const inputClass = `w-full border p-3 text-xs rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`;
  const cardClass = `p-6 sm:p-8 rounded-lg border ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const innerCardClass = `p-5 rounded-lg border ${isDarkMode ? 'bg-[#121212] border-gray-800' : 'bg-gray-50 border-gray-200'}`;
  const selectClass = `border p-2 text-xs rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`;
  const mutedClass = isDarkMode ? 'text-gray-400' : 'text-gray-600';

  const lockedOwners = OWNER_EMAILS.map((o) => o.toLowerCase());
  const extraAdmins = admins.filter((a) => !lockedOwners.includes(a.email));

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
    const newRole = isOwner ? role : 'admin'; // Managers can only add Admins
    if (newRole === 'owner' && !confirm(OWNER_WARNING)) return;
    setBusy(true);
    try {
      const { accountCreated } = await createAdminAccount(email, password, newRole);
      setMessage({
        type: 'ok',
        text: accountCreated
          ? `${email.trim()} was added as ${ROLE_LABELS[newRole]}. Share this email and password with them so they can log in.`
          : `${email.trim()} already had a Firebase account, so they were added to the team as ${ROLE_LABELS[newRole]} (their existing password was not changed).`
      });
      setEmail('');
      setPassword('');
      setRole('admin');
      await load();
    } catch (err) {
      setMessage({ type: 'err', text: friendlyError(err) });
    }
    setBusy(false);
  };

  const handleRoleChange = async (adminEmail, newRole) => {
    setMessage(null);
    if (newRole === 'owner' && !confirm(OWNER_WARNING)) return;
    try {
      await setAdminRole(adminEmail, newRole);
      setMessage({ type: 'ok', text: `${adminEmail} is now ${ROLE_LABELS[newRole]}.` });
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
          ? `Access for ${a.email} was turned ON. They can log in again.`
          : `Access for ${a.email} was turned OFF. If they are logged in, they will be signed out right away.`
      });
      await load();
    } catch (err) {
      setMessage({ type: 'err', text: friendlyError(err) });
    }
  };

  const handleRemove = async (adminEmail) => {
    if (!confirm(`Permanently remove ${adminEmail} from the team? (To block access temporarily, turn the Access switch OFF instead.)`)) return;
    setMessage(null);
    try {
      await removeAdmin(adminEmail);
      setMessage({ type: 'ok', text: `${adminEmail} was removed from the team.` });
      await load();
    } catch (err) {
      setMessage({ type: 'err', text: friendlyError(err) });
    }
  };

  const handleReset = async (adminEmail) => {
    setMessage(null);
    try {
      await sendAdminPasswordReset(adminEmail);
      setMessage({ type: 'ok', text: `A password reset email was sent to ${adminEmail}.` });
    } catch (err) {
      setMessage({ type: 'err', text: friendlyError(err) });
    }
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
            <li>Each product shows who added it (&quot;Added by&quot;). Managers can only delete products that show their own email.</li>
            <li>The default products that came with the store have no &quot;Added by&quot; and can only be deleted by an Owner.</li>
            <li>Turning a person&apos;s <strong>Access OFF</strong> blocks their login straight away and signs them out if they are logged in. Turning it back ON restores their role and password, nothing is lost.</li>
            <li><strong>Remove</strong> deletes the person from the team list permanently (their Firebase login account is not deleted, but it no longer works for the Admin Portal).</li>
            <li>The fixed Owner email is stored in the code, so it cannot be removed, demoted or turned OFF from this screen.</li>
          </ul>
        </div>
      </div>

      {/* ADD FORM */}
      <form onSubmit={handleAdd} className={`${cardClass} space-y-4 max-w-3xl`}>
        <div>
          <h3 className="text-lg font-serif font-bold">{isOwner ? 'Add New Team Member' : 'Add New Admin'}</h3>
          <p className={`text-xs mt-1 ${mutedClass}`}>
            Enter an email, a password{isOwner ? ' and a role' : ''}. The account is created right away and the person can log in to the Admin Portal with these details.
            {!isOwner && ' As a Manager you can only add people with the Admin role.'}
          </p>
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
              <span className="font-semibold break-all">{o}</span>
              <span className="text-[#D4AF37] font-bold uppercase tracking-wider">Owner (fixed)</span>
            </div>
          ))}
          {loading && <p className="py-3 text-gray-500">Loading...</p>}
          {!loading && extraAdmins.length === 0 && <p className="py-3 text-gray-500">No other team members yet.</p>}
          {extraAdmins.map((a) => {
            const isMe = a.email === me;
            return (
              <div key={a.email} className={`py-3 flex flex-wrap items-center justify-between gap-3 ${a.active ? '' : 'opacity-60'}`}>
                <span className="font-semibold break-all">
                  {a.email} {isMe && <span className="text-gray-500 font-normal">(you)</span>}
                  {!a.active && <span className="ml-2 text-red-500 font-bold uppercase">Access OFF</span>}
                </span>

                {isOwner ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={a.role}
                      disabled={isMe}
                      onChange={(e) => handleRoleChange(a.email, e.target.value)}
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
                    <button onClick={() => handleReset(a.email)} className="text-gray-500 hover:text-black dark:hover:text-white px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded">Reset password</button>
                    {!isMe && <button onClick={() => handleRemove(a.email)} className="text-red-400 hover:text-red-300 px-2 py-1 bg-red-950/40 rounded">Remove</button>}
                  </div>
                ) : (
                  <span className="text-[#D4AF37] font-bold uppercase tracking-wider">{ROLE_LABELS[a.role]}</span>
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
