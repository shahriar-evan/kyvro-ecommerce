import React from 'react';
import { Zap, Rocket, Gem, Check, Clock } from 'lucide-react';
import { normalizePlans, planPrice } from '../data/priceCheck';
import { PLAN_TEXT, fill } from '../data/planText';

// The three seller plans side by side (Free / Pro / Premium), in the Kyvro gold / dark style.
//   mode 'apply'   : before applying (every button says Get started)
//   mode 'upgrade' : an approved shop owner's plan (Current plan / Upgrade / Renew)
// Prices, discounts and the period come from settings/plans. "Coming soon" features are shown greyed out, never as available.
export default function PlanCards({ plans: rawPlans, formatPrice, isDarkMode, mode = 'apply', currentTier = 'free', busy = '', onChoose, lang = 'en' }) {
  const T = PLAN_TEXT[lang] || PLAN_TEXT.en;
  const plans = normalizePlans(rawPlans);
  const tiers = [
    { key: 'free', name: T.free, icon: Zap, blurb: T.blurbFree, features: T.featFree.map((f) => fill(f, plans.freeLimit, lang)) },
    { key: 'pro', name: T.pro, icon: Rocket, blurb: T.blurbPro, badge: T.mostPopular, features: T.featPro },
    { key: 'premium', name: T.premium, icon: Gem, blurb: T.blurbPremium, badge: T.bestValue, features: T.featPremium, soon: T.soonPremium },
  ];

  const button = (t) => {
    if (mode === 'apply') return { label: t.key === 'pro' ? T.btnPro : t.key === 'premium' ? T.btnPremium : T.btnFree, disabled: false };
    if (t.key === 'free') return { label: currentTier === 'free' ? 'Current plan' : 'Included', disabled: true };
    if (t.key === 'pro') {
      if (currentTier === 'premium') return { label: 'Included in Premium', disabled: true };
      return { label: currentTier === 'pro' ? 'Renew Pro' : 'Upgrade to Pro', disabled: false };
    }
    return { label: currentTier === 'premium' ? 'Renew Premium' : 'Go Premium', disabled: false };
  };

  const surface = isDarkMode ? 'bg-[#161616] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900';
  const muted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const line = isDarkMode ? 'border-gray-800' : 'border-gray-200';

  return (
    <div className={`space-y-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 items-stretch md:pt-4">
        {tiers.map((t) => {
          const pro = t.key === 'pro';
          const premium = t.key === 'premium';
          const cfg = t.key === 'free' ? null : plans[t.key];
          const price = t.key === 'free' ? 0 : planPrice(plans, t.key);
          const b = button(t);
          const current = mode === 'upgrade' && currentTier === t.key;
          const Icon = t.icon;
          return (
            <div key={t.key} className={`relative flex flex-col rounded-2xl border p-6 sm:p-7 transition ${surface} ${pro ? `border-2 !border-[#D4AF37] shadow-[0_0_45px_-12px_rgba(212,175,55,0.65)] md:-translate-y-3 md:scale-[1.03] ${isDarkMode ? '!bg-[#0f0f0f]' : '!bg-gradient-to-b from-[#fffaf0] to-white'}` : 'shadow-sm'} ${premium ? (isDarkMode ? '!border-[#D4AF37]/40' : '!border-[#D4AF37]/50') : ''}`}>
              {t.badge && (
                <span className={`absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap inline-flex items-center gap-1 px-4 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shadow ${pro ? 'bg-[#D4AF37] text-black' : 'bg-black text-[#D4AF37] border border-[#D4AF37]/60'}`}>
                  {premium ? <Gem size={12} /> : <Rocket size={12} />}{t.badge}
                </span>
              )}
              <p className={`flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] ${pro || premium ? 'text-[#D4AF37]' : muted}`}><Icon size={16} />{t.name}{current && <span className="ml-auto normal-case tracking-normal text-[10px] px-2 py-0.5 rounded-full bg-green-600 text-white">{T.current}</span>}</p>
              <p className={`text-xs mt-1 ${muted}`}>{t.blurb}</p>

              <div className="mt-5 min-h-[5.5rem]">
                {cfg && cfg.discount > 0 && (
                  <p className="flex items-center gap-2">
                    <span className={`text-base line-through ${muted}`}>{formatPrice(cfg.price)}</span>
                    <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">{fill(T.off, cfg.discount, lang)}</span>
                  </p>
                )}
                <p className="mt-1 text-4xl font-bold tracking-tight">{formatPrice(price)}</p>
                <p className={`text-xs mt-1 ${muted}`}>{t.key === 'free' ? T.forever : fill(T.perDays, plans.periodDays, lang)}</p>
              </div>

              <ul className={`mt-5 pt-5 border-t space-y-3 text-sm ${line}`}>
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-[#D4AF37] text-black"><Check size={11} strokeWidth={3} /></span>
                    <span className={f === T.featPro[T.featPro.length - 1] || f === T.featPremium[0] ? 'font-semibold' : ''}>{f}</span>
                  </li>
                ))}
                {(t.soon || []).map((f) => (
                  <li key={f} className={`flex items-start gap-2.5 ${muted} opacity-70`}>
                    <Clock size={16} className="shrink-0 mt-0.5" />
                    <span>{f} <span className="ml-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-current">{T.soon}</span></span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-7">
              <button type="button" disabled={b.disabled || !!busy} onClick={() => onChoose && onChoose(t.key)}
                className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition disabled:opacity-50 disabled:cursor-not-allowed ${pro ? 'bg-gradient-to-b from-[#E9CB6B] via-[#D4AF37] to-[#B8921F] text-black shadow hover:opacity-90' : premium ? 'bg-black text-[#D4AF37] border border-[#D4AF37] hover:bg-[#D4AF37] hover:text-black' : `border-2 ${isDarkMode ? 'border-gray-600 text-white hover:border-[#D4AF37]' : 'border-gray-300 text-gray-900 hover:border-[#D4AF37]'}`}`}>
                {busy === t.key ? 'Opening...' : b.label}
              </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        {T.pills.map((p) => (
          <span key={p} className={`px-4 py-2 rounded-full border text-xs ${isDarkMode ? 'border-gray-800 text-gray-300 bg-[#121212]' : 'border-gray-200 text-gray-600 bg-white'}`}>{p}</span>
        ))}
      </div>
    </div>
  );
}
