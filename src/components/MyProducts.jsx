import React from 'react';

// The products this team member added (shown in their own "My Products" tab)
export default function MyProducts({ products, loggedInUserEmail, isDarkMode, formatPrice, startEditProduct, canEditProduct }) {
  const me = String(loggedInUserEmail || '').toLowerCase();
  const mine = (products || []).filter((p) => p.addedBy && String(p.addedBy).toLowerCase() === me);
  const card = `p-5 sm:p-6 rounded-lg border space-y-4 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`;
  return (
    <div className={card}>
      <div>
        <h3 className="text-lg font-bold">My Products ({mine.length})</h3>
        <p className="text-xs text-gray-500 mt-1">The products you added. You (and the Owner) can edit them.</p>
      </div>
      {mine.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">You have not added any product yet. Use &quot;+ Add Product&quot; to add one.</p>
      ) : (
        <div className="divide-y text-sm">
          {mine.map((p) => (
            <div key={p.id} className="py-3 flex flex-wrap items-center gap-3">
              {p.image && <img src={p.image} alt="" className="w-12 h-12 object-cover rounded border shrink-0" />}
              <div className="flex-1 min-w-[10rem]">
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs text-gray-500">{[p.gender, p.category].filter(Boolean).join(' / ')}</p>
              </div>
              <div className="text-xs text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-bold text-[#D4AF37] text-sm">{formatPrice(p.price)}</span>
                <span>Stock {parseInt(p.stock, 10) || 0}</span>
                <span>Sold {parseInt(p.sold, 10) || 0}</span>
                <span className={p.status === 'pending' ? 'text-amber-600 font-semibold' : 'text-green-600 font-semibold'}>{p.status === 'pending' ? 'Waiting for approval' : 'Live'}</span>
              </div>
              {canEditProduct && startEditProduct && canEditProduct(p) && (
                <button type="button" onClick={() => startEditProduct(p)} className="px-3 py-1.5 rounded text-xs font-semibold border border-gray-400 hover:bg-gray-100 dark:hover:bg-[#222] transition">Edit</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
