'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, password }),
    });

    if (res.ok) {
      router.push('/');
      router.refresh();
    } else {
      const data = await res.json() as { error?: string };
      setError(data.error ?? 'שגיאה בהתחברות');
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at center, #0a0a14 0%, #050510 100%)' }}
    >
      <div className="w-full max-w-sm px-6">
        {/* Logo / title */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🤖</div>
          <h1 className="text-2xl font-semibold text-white/90 tracking-wide">אלברט</h1>
          <p className="text-sm text-white/30 mt-1">עוזר הבית החכם</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
          <div>
            <input
              type="text"
              placeholder="שם משתמש"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm text-white
                bg-white/5 border border-white/10 placeholder-white/25
                focus:outline-none focus:border-indigo-400/50 focus:bg-white/8
                transition-all duration-150"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="סיסמה"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm text-white
                bg-white/5 border border-white/10 placeholder-white/25
                focus:outline-none focus:border-indigo-400/50 focus:bg-white/8
                transition-all duration-150"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400/80 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-medium
              bg-indigo-500/20 border border-indigo-400/30 text-indigo-300
              hover:bg-indigo-500/30 active:scale-98
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-150"
          >
            {loading ? 'מתחבר...' : 'כניסה'}
          </button>
        </form>
      </div>
    </main>
  );
}
