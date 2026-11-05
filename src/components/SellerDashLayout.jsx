import React, { useState } from 'react';
import { ChevronDown, Lock, Menu, X } from 'lucide-react';

// Seller dashboard frame: a menu on the left (desktop) or a drop-down menu (phone), the chosen page on the right.
// nav = [{ title, items: [{ key, label, icon, badge, children: [{ key, label }] }] }]
// badge: 'Pro' / 'Premium' (locked on this plan) or 'Soon'; a locked item still opens (it shows the upgrade page).
// count: a red number (things waiting, e.g. new orders).
export default function SellerDashLayout({ nav, active, onSelect, isDarkMode, head, children, label = 'Seller dashboard' }) {
  const [open, setOpen] = useState(false); // phone menu
  const [expanded, setExpanded] = useState(() => new Set());
  const all = nav.flatMap((g) => g.items.flatMap((it) => [it, ...(it.children || [])]));
  const current = all.find((x) => x.key === active) || all[0];
  const parentOf = (key) => nav.flatMap((g) => g.items).find((it) => (it.children || []).some((c) => c.key === key));
  const pick = (key) => { onSelect(key); setOpen(false); try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { /* old browser */ } };

  const badge = (b) => b && (
    <span className={`ml-auto shrink-0 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${b === 'Soon' ? 'bg-gray-500/15 text-gray-500' : 'bg-[#D4AF37]/15 text-[#B8921F]'}`}>
      {b !== 'Soon' && <Lock size={9} />}{b}
    </span>
  );
  const itemCls = (on) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition ${on ? 'bg-[#D4AF37]/15 text-[#B8921F]' : isDarkMode ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'}`;

  const menu = (
    <nav aria-label={label} className="space-y-5">
      {nav.map((g) => (
        <div key={g.title || 'main'}>
          {g.title && <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{g.title}</p>}
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const Icon = it.icon;
              const kids = it.children || [];
              const isOpen = kids.length > 0 && (expanded.has(it.key) || kids.some((c) => c.key === active));
              const on = active === it.key;
              return (
                <li key={it.key}>
                  <button type="button" aria-current={on ? 'page' : undefined} aria-expanded={kids.length ? isOpen : undefined}
                    onClick={() => {
                      if (!kids.length) { pick(it.key); return; }
                      setExpanded((s) => { const n = new Set(s); if (n.has(it.key)) n.delete(it.key); else n.add(it.key); return n; });
                      if (!isOpen) onSelect(kids[0].key); // opening the group shows its first page (the phone menu stays open)
                    }}
                    className={itemCls(on || (kids.length > 0 && kids.some((c) => c.key === active)))}>
                    {Icon && <Icon size={18} className="shrink-0" />}
                    <span className="truncate">{it.label}</span>
                    {it.count > 0 && <span className="ml-auto shrink-0 min-w-[1.25rem] px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold text-center">{it.count}</span>}
                    {badge(it.badge)}
                    {kids.length > 0 && <ChevronDown size={16} className={`shrink-0 transition-transform ${it.badge ? '' : 'ml-auto'} ${isOpen ? 'rotate-180' : ''}`} />}
                  </button>
                  {isOpen && (
                    <ul className={`ml-6 mt-0.5 pl-3 border-l space-y-0.5 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                      {kids.map((c) => (
                        <li key={c.key}>
                          <button type="button" aria-current={active === c.key ? 'page' : undefined} onClick={() => pick(c.key)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${active === c.key ? 'text-[#B8921F] font-bold' : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'}`}>
                            {c.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
  const panel = `rounded-2xl border ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  const parent = parentOf(active);

  return (
    <div className="lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-6 items-start">
      {/* desktop: the menu stays on the left */}
      <aside className={`hidden lg:block sticky top-24 p-3 max-h-[calc(100vh-7rem)] overflow-y-auto ${panel}`}>
        {head && <div className="px-3 pt-1 pb-4">{head}</div>}
        {menu}
      </aside>
      {/* phone / tablet: a menu button with the page name */}
      <div className="lg:hidden mb-4">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold ${panel}`}>
          {open ? <X size={18} /> : <Menu size={18} />}
          <span className="truncate">{parent ? `${parent.label} · ` : ''}{current ? current.label : ''}</span>
          <ChevronDown size={16} className={`ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && <div className={`mt-2 p-3 ${panel}`}>{head && <div className="px-3 pt-1 pb-4">{head}</div>}{menu}</div>}
      </div>
      <main className="min-w-0 space-y-5">{children}</main>
    </div>
  );
}
