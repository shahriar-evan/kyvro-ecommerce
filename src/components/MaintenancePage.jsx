import React from 'react';
import logoImg from '../assets/logo.png';

// Shown to every visitor while the Owner has "Website maintenance" switched ON in Admin > Store Settings.
// Team members never see this page: they keep using the real website and the admin panel.
export default function MaintenancePage({ message, isDarkMode, onTeamLogin }) {
  const text = (message || '').trim();
  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-6 text-center ${isDarkMode ? 'bg-[#0f0f0f] text-gray-100' : 'bg-white text-gray-900'}`}>
      <img src={logoImg} alt="Kyvro" className="h-14 w-auto object-contain mb-8" />
      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-6 ${isDarkMode ? 'bg-indigo-500/15' : 'bg-indigo-50'}`} aria-hidden="true">🛠️</div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-wide mb-3">We'll be back soon</h1>
      <p className={`text-base mb-1 max-w-md ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        {text || 'Our website is being improved right now. Sorry for the trouble — please visit us again in a little while.'}
      </p>
      {!text && (
        <p className={`text-base max-w-md ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          ওয়েবসাইটে এখন কাজ চলছে। সাময়িক অসুবিধার জন্য আমরা দুঃখিত। কিছুক্ষণ পর আবার আসুন।
        </p>
      )}
      <p className={`mt-8 text-xs tracking-[0.3em] uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Kyvro · Wear Your Story</p>
      <button type="button" onClick={onTeamLogin} className={`mt-10 text-[11px] underline underline-offset-4 ${isDarkMode ? 'text-gray-600 hover:text-gray-400' : 'text-gray-300 hover:text-gray-500'}`}>Team login</button>
    </div>
  );
}
