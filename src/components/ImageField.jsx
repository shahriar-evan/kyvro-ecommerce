import React, { useRef, useState } from 'react';
import { imageFileToDataURL } from '../utils/imageUpload';

// Product photo: paste an image link OR upload a photo from your device
export default function ImageField({ value, onChange, isDarkMode }) {
  const fileInput = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isUploaded = !!value && value.startsWith('data:');
  const inputClass = `w-full border p-3 text-xs rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`;

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // allows choosing the same file again later
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      onChange(await imageFileToDataURL(file));
    } catch (err) {
      setError(err.message || 'Upload failed.');
    }
    setBusy(false);
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">Product Image * (paste a link or upload a photo)</label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={isUploaded ? '' : (value || '')}
          onChange={(e) => { setError(''); onChange(e.target.value); }}
          className={inputClass}
          placeholder={isUploaded ? 'Photo uploaded. Paste a link here to replace it' : 'Option 1: image link, e.g. https://images.unsplash.com/...'}
        />
        <input ref={fileInput} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInput.current && fileInput.current.click()}
          className={`px-4 py-3 text-xs font-bold rounded border whitespace-nowrap transition disabled:opacity-50 ${isDarkMode ? 'border-gray-700 text-gray-200 hover:bg-[#222]' : 'border-gray-300 text-gray-800 hover:bg-gray-100'}`}
        >
          {busy ? 'Processing...' : 'Option 2: Upload from device'}
        </button>
      </div>

      {value && (
        <div className="mt-3 flex items-center gap-3">
          <img
            src={value}
            alt="Product preview"
            className="w-20 h-20 object-cover rounded border border-gray-300"
            onError={(e) => { e.currentTarget.style.opacity = '0.3'; }}
          />
          <div className="text-xs text-gray-500 space-y-1">
            <p>{isUploaded ? 'Uploaded photo (resized automatically)' : 'Image link'}</p>
            <button type="button" onClick={() => { setError(''); onChange(''); }} className="text-red-400 hover:text-red-300 underline">Remove image</button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <p className="mt-2 text-[11px] text-gray-500">Uploaded photos are resized to a maximum of 1000 px to keep the website fast.</p>
    </div>
  );
}
