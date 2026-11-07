import React, { useEffect, useState } from 'react';
import { watchSellerDash } from '../sellerDash';
import coverPhoto1Img from '../assets/cover_photo1.webp';
import menWomenImg from '../assets/men_women.webp';

// The slide banner on top of the seller dashboard. The Owner sets the slides (Admin > Settings > Seller dashboard banner);
// until then it shows the main site's first two banners.
const DEFAULT_SLIDES = [{ image: coverPhoto1Img, link: '' }, { image: menWomenImg, link: '' }];
const SECONDS = 6;

export default function SellerBanner({ isDarkMode }) {
  const [slides, setSlides] = useState(DEFAULT_SLIDES);
  const [i, setI] = useState(0);
  useEffect(() => watchSellerDash((d) => { setSlides(d.banners.length ? d.banners : DEFAULT_SLIDES); setI(0); }), []);
  useEffect(() => {
    if (slides.length < 2) return undefined;
    const t = setTimeout(() => setI((n) => (n + 1) % slides.length), SECONDS * 1000);
    return () => clearTimeout(t);
  }, [i, slides.length]);
  const s = slides[i] || slides[0];
  if (!s) return null;
  const img = <img src={s.image} alt="" className="w-full h-full object-cover" />;
  return (
    <div className={`relative overflow-hidden rounded-2xl border aspect-[16/7] sm:aspect-[3/1] ${isDarkMode ? 'border-gray-800 bg-[#121212]' : 'border-gray-200 bg-gray-100'}`}>
      {s.link ? <a href={s.link} target="_blank" rel="noopener noreferrer" className="block w-full h-full">{img}</a> : img}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1 rounded-full bg-black/35 backdrop-blur">
          {slides.map((_, k) => (
            <button key={k} type="button" aria-label={`Banner ${k + 1}`} aria-current={k === i} onClick={() => setI(k)}
              className={`h-2 rounded-full transition-all ${k === i ? 'w-6 bg-white' : 'w-2 bg-white/60'}`} />
          ))}
        </div>
      )}
    </div>
  );
}
