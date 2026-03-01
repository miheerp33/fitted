import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { session, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) navigate('/wardrobe', { replace: true });
  }, [session, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) await signUp(email, password);
      else await signIn(email, password);
      navigate('/wardrobe', { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const configMissing = !isSupabaseConfigured;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cream-100 via-cream-50 to-accent/5" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/8 rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/6 rounded-full blur-3xl translate-y-1/2" />
      <div className="relative w-full max-w-md animate-fade-in">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/15 text-accent mb-4 text-3xl shadow-soft">
            ☀
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-warm-900 tracking-tight">
            Fitted
          </h1>
          <p className="text-stone-600 mt-2 text-sm sm:text-base">
            AI-powered outfit recommendations for any weather
          </p>
        </div>
        {configMissing && (
          <div className="mb-6 p-4 rounded-xl bg-amber-100/80 text-amber-900 text-sm border border-amber-200/60">
            Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env — see README.
          </div>
        )}
        <div className="card shadow-card p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="text-sm text-red-700 bg-red-50 rounded-xl p-3 border border-red-100">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-warm-800 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-warm-800 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="input-field"
                placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? (
                <span className="inline-block w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                isSignUp ? 'Create account' : 'Sign in'
              )}
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp((v) => !v); setError(''); }}
              className="w-full text-sm text-stone-500 hover:text-warm-900 transition-colors py-1"
            >
              {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
