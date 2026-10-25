import React, { useState } from 'react';
import { Lock } from 'lucide-react';

export default function AdminLogin({ isDarkMode, handleEmailSignIn, handleGoogleSignIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    await handleEmailSignIn(email, password);
    setBusy(false);
    setPassword('');
  };

  return (
            <div className={`max-w-md mx-auto p-8 rounded-xl border shadow-2xl space-y-6 ${isDarkMode ? 'bg-[#161616] border-gray-800' : 'bg-white border-gray-200'}`}>
              <div className="text-center space-y-2">
                <Lock size={40} className="mx-auto text-[#D4AF37]" />
                <h2 className="text-2xl font-serif font-bold">KYVRO ADMIN PORTAL</h2>
                <p className="text-xs text-gray-500">Sign in with your admin email and password, or Google.</p>
              </div>

              {/* Email + Password Login Form */}
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Admin Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter admin email"
                    className={`w-full border p-3 text-xs rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className={`w-full border p-3 text-xs rounded focus:outline-none focus:border-[#D4AF37] ${isDarkMode ? 'bg-[#121212] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
                  />
                </div>
                <button type="submit" disabled={busy} className="w-full bg-[#D4AF37] text-black font-bold py-3.5 rounded text-xs uppercase tracking-widest hover:opacity-90 transition disabled:opacity-50">
                  {busy ? 'Signing in...' : 'Sign in'}
                </button>
              </form>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
                <span className="flex-shrink mx-4 text-gray-400 text-xs uppercase">Or</span>
                <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
              </div>

              {/* Google Sign-In Button */}
              <button 
                onClick={handleGoogleSignIn}
                className="w-full bg-white hover:bg-gray-100 text-black border border-gray-300 font-bold py-3.5 rounded text-xs uppercase tracking-wider flex items-center justify-center gap-3 shadow transition"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Sign in with Google
              </button>
            </div>
  );
}
