import React, { useState } from 'react';
import { Check, Minus, Clock, Plus } from 'lucide-react';
import { PLAN_TEXT, COMPARE, fill } from '../data/planText';

// Under the plan cards: "Compare Plans" (tier defaults, not a shop's overrides) and the FAQ. Texts in src/data/planText.js.
export function PlanCompare({ lang = 'en', isDarkMode, freeLimit = 10, shopLimits = { free: 1, pro: 2, premium: 3 } }) {
  const T = PLAN_TEXT[lang] || PLAN_TEXT.en;
  const line = isDarkMode ? 'border-gray-800' : 'border-gray-200';
  const proCol = isDarkMode ? 'bg-[#D4AF37]/[0.07]' : 'bg-[#D4AF37]/[0.08]';
  const stickyBg = isDarkMode ? 'bg-[#161616]' : 'bg-white';
  const cell = (v, soonRow) => {
    if (v === true) return <Check size={16} className="inline text-green-600" strokeWidth={3} aria-label="yes" />;
    if (v === false) return <Minus size={16} className="inline text-gray-400" aria-label="no" />;
    if (typeof v === 'string' && v.startsWith('shops:')) return <span className="text-xs font-semibold">{fill(T.cell.cellShops, shopLimits[v.slice(6)] || 1, lang)}</span>;
    if (v === 'soon') return <span className="inline-flex items-center gap-1 text-[11px] text-gray-500"><Clock size={13} />{T.cell.soonCell}</span>;
    return <span className={`text-xs font-semibold ${soonRow ? 'text-gray-500' : ''}`}>{fill(T.cell[v] || v, freeLimit, lang)}</span>;
  };
  return (
    <section className={`space-y-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
      <div className="text-center">
        <h3 className="text-2xl font-bold">{T.compareTitle}</h3>
        <p className="text-sm text-gray-500 mt-1">{T.compareSub}</p>
      </div>
      {/* the table scrolls inside its box on small screens; the feature column stays in place */}
      <div className={`max-w-5xl mx-auto overflow-x-auto rounded-2xl border ${line} ${isDarkMode ? 'bg-[#161616]' : 'bg-white shadow-sm'}`}>
        <table className="w-full min-w-[560px] text-sm border-collapse">
          <thead>
            <tr className={`border-b ${line}`}>
              <th className={`sticky left-0 z-10 ${stickyBg} text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500`}>{T.feature}</th>
              <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">{T.free}</th>
              <th className={`px-3 py-3 text-xs font-bold uppercase tracking-wider text-[#D4AF37] border-b-2 border-[#D4AF37] ${proCol}`}>{T.pro}</th>
              <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider">{T.premium}</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE.map((g) => (
              <React.Fragment key={g.group}>
                <tr className={`border-b ${line} ${isDarkMode ? 'bg-black/30' : 'bg-gray-50'}`}>
                  <td colSpan={4} className={`sticky left-0 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 ${g.soon ? '' : ''}`}>
                    {g.soon && <Clock size={12} className="inline mr-1 -mt-0.5" />}{T.groups[g.group]}
                  </td>
                </tr>
                {g.rows.map(([key, f, p, pr]) => (
                  <tr key={key} className={`border-b last:border-0 ${line}`}>
                    <td className={`sticky left-0 z-10 ${stickyBg} px-4 py-3 ${g.soon ? 'text-gray-500' : ''}`}>{g.soon && <Clock size={13} className="inline mr-1.5 -mt-0.5 text-gray-400" />}{T.rows[key]}</td>
                    <td className="px-3 py-3 text-center">{cell(f, g.soon)}</td>
                    <td className={`px-3 py-3 text-center ${proCol}`}>{cell(p, g.soon)}</td>
                    <td className="px-3 py-3 text-center">{cell(pr, g.soon)}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function PlanFaq({ lang = 'en', isDarkMode }) {
  const T = PLAN_TEXT[lang] || PLAN_TEXT.en;
  const [open, setOpen] = useState(-1);
  const line = isDarkMode ? 'border-gray-800' : 'border-gray-200';
  return (
    <section className={`space-y-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
      <h3 className="text-2xl font-bold text-center">{T.faqTitle}</h3>
      <div className={`max-w-3xl mx-auto rounded-2xl border divide-y ${line} ${isDarkMode ? 'bg-[#161616] divide-gray-800' : 'bg-white shadow-sm divide-gray-200'}`}>
        {T.faq.map(([q, a], i) => {
          const on = open === i;
          return (
            <div key={i}>
              <button type="button" aria-expanded={on} onClick={() => setOpen(on ? -1 : i)} className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-sm">
                <span>{q}</span>
                {on ? <Minus size={16} className="shrink-0 text-[#D4AF37]" /> : <Plus size={16} className="shrink-0 text-gray-500" />}
              </button>
              {on && <p className="px-5 pb-4 -mt-1 text-sm text-gray-500">{a}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
