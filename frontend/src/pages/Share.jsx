import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSharedOutfit } from '../lib/api';

export default function Share() {
  const { shareId } = useParams();
  const [outfit, setOutfit] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shareId) {
      setLoading(false);
      setError('Invalid share link');
      return;
    }
    let cancelled = false;
    getSharedOutfit(shareId)
      .then((data) => {
        if (!cancelled) setOutfit(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Outfit not found');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream-100 px-4">
        <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        <p className="text-stone-500 mt-4 text-sm">Loading outfit…</p>
      </div>
    );
  }

  if (error || !outfit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream-100 px-4">
        <div className="card p-8 text-center max-w-sm">
          <p className="text-stone-600 mb-4">{error || 'Outfit not found'}</p>
          <Link to="/" className="btn-primary">
            Go to Fitted
          </Link>
        </div>
      </div>
    );
  }

  const dateStr = outfit.createdAt
    ? new Date(outfit.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })
    : '';

  return (
    <div className="min-h-screen bg-cream-100 py-10 px-4">
      <div className="max-w-lg mx-auto animate-slide-up">
        <div className="card shadow-card overflow-hidden">
          <div className="bg-accent/10 border-b border-cream-200 px-6 py-5">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/20 text-accent">☀</span>
              <p className="font-display font-semibold text-warm-900">Fitted · Shared outfit</p>
            </div>
            {(outfit.city || dateStr) && (
              <p className="text-stone-600 text-sm mt-2">
                {[outfit.city, outfit.occasion, dateStr].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          {outfit.weatherSummary && (
            <div className="px-6 py-3 bg-cream-50 border-b border-cream-100">
              <p className="text-sm text-stone-600">{outfit.weatherSummary}</p>
            </div>
          )}
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap gap-4 sm:gap-5 justify-center">
              {(outfit.items || []).map((item) => (
                <div
                  key={item.id}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-cream-200 shadow-soft bg-white"
                >
                  <img
                    src={item.image_url}
                    alt={item.itemType || 'Item'}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            {outfit.explanation && (
              <p className="mt-6 text-stone-600 text-sm leading-relaxed">{outfit.explanation}</p>
            )}
          </div>
        </div>
        <p className="text-center mt-8">
          <Link to="/" className="font-medium text-accent hover:text-accent-dark transition-colors">
            Get your own outfit → Fitted
          </Link>
        </p>
      </div>
    </div>
  );
}
