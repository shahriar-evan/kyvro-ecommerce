import React, { useEffect, useState } from 'react';
import PlanCards from './PlanCards';
import { PlanCompare, PlanFaq } from './PlanCompareFaq';
import { PLAN_TEXT, BN_FONT } from '../data/planText';
import { watchPlans } from '../storeSettings';
import { normalizePlans } from '../data/priceCheck';

// The seller plan page (Free / Pro / Premium cards, Compare Plans, FAQ) with the EN / Bangla toggle.
// Public: "Start selling" opens it without a login; choosing a plan asks for Google sign-in (App) and then opens the
// application form. SellerDashboard shows the same page to a signed-in customer who has not applied yet.
export default function SellPricing({ formatPrice, isDarkMode, onChoose, busy = '' }) {
  // language: remembered on this device; first time, Bangla when the browser is in Bangla
  const [lang, setLangState] = useState(() => {
    try { const v = localStorage.getItem('kyvro_plan_lang'); if (v === 'en' || v === 'bn') return v; } catch (e) { /* no storage */ }
    return /^bn/i.test((typeof navigator !== 'undefined' && navigator.language) || '') ? 'bn' : 'en';
  });
  const setLang = (v) => { setLangState(v); try { localStorage.setItem('kyvro_plan_lang', v); } catch (e) { /* no storage */ } };
  const [plans, setPlans] = useState(() => normalizePlans(null));
  useEffect(() => watchPlans(setPlans), []);
  const T = PLAN_TEXT[lang];

  return (
    <div className="space-y-12" lang={lang} style={lang === 'bn' ? { fontFamily: BN_FONT, lineHeight: 1.7 } : undefined}>
      <div className="flex justify-end">
        <div className={`inline-flex rounded-full border p-0.5 text-xs font-semibold ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`} role="group" aria-label="Language">
          {[['en', 'EN'], ['bn', 'বাংলা']].map(([k, l]) => (
            <button key={k} type="button" aria-pressed={lang === k} onClick={() => setLang(k)} className={`px-3 py-1 rounded-full transition ${lang === k ? 'bg-[#D4AF37] text-black' : 'text-gray-500'}`}>{l}</button>
          ))}
        </div>
      </div>
      <div className="text-center -mt-8">
        <h3 className="text-2xl sm:text-3xl font-bold">{T.heading} <span className="text-[#D4AF37]">{T.headingBrand}</span>{T.headingEnd}</h3>
        <p className="text-sm text-gray-500 mt-2">{T.subtitle}</p>
      </div>
      <PlanCards plans={plans} formatPrice={formatPrice} isDarkMode={isDarkMode} mode="apply" onChoose={onChoose} busy={busy} lang={lang} />
      <PlanCompare lang={lang} isDarkMode={isDarkMode} freeLimit={plans.freeLimit} shopLimits={plans.shopLimits} />
      <PlanFaq lang={lang} isDarkMode={isDarkMode} />
    </div>
  );
}
