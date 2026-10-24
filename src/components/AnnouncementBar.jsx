import React from 'react';

export default function AnnouncementBar({ announcementText, isDarkMode }) {
  return (
    <>
      <div className={`text-[11px] sm:text-xs font-semibold py-2 overflow-hidden whitespace-nowrap border-b tracking-wider ${isDarkMode ? 'bg-[#1a1a1a] text-[#D4AF37] border-gray-800' : 'bg-gray-100 text-black border-gray-200'}`}>
        <div className="animate-ticker inline-block px-4">
          {announcementText} &nbsp;&nbsp;&nbsp;&nbsp;&bull;&nbsp;&nbsp;&nbsp;&nbsp; 24/7 VIP Customer Support: kyvrofashion@gmail.com &nbsp;&nbsp;&nbsp;&nbsp;&bull;&nbsp;&nbsp;&nbsp;&nbsp; {announcementText}
        </div>
      </div>
    </>
  );
}
