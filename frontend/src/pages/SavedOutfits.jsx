import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSavedOutfits, deleteSavedOutfit } from '../lib/api';

export default function SavedOutfits() {
  const { accessToken } = useAuth();
  const [outfits, setOutfits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedShareId, setCopiedShareId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSavedOutfits(accessToken)
      .then(({ outfits: list }) => {
        if (!cancelled) setOutfits(list || []);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [accessToken]);

  function getShareUrl(shareId) {
    return `${window.location.origin}/share/${shareId}`;
  }

  async function handleCopyLink(shareId) {
    try {
      await navigator.clipboard.writeText(getShareUrl(shareId));
      setCopiedShareId(shareId);
      setTimeout(() => setCopiedShareId(null), 2000);
    } catch (_) {
      setError('Could not copy to clipboard');
    }
  }

  async function handleDelete(outfitId) {
    if (deletingId) return;
    setError('');
    setDeletingId(outfitId);
    try {
      await deleteSavedOutfit(accessToken, outfitId);
      setOutfits((prev) => prev.filter((o) => o.id !== outfitId));
    } catch (e) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(createdAt) {
    const d = new Date(createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        <p className="text-stone-500 mt-4 text-sm">Loading your outfits…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">
          Saved outfits
        </h1>
        <p className="text-stone-500 mt-1 text-sm">Outfits you've saved. Copy a link to share with friends.</p>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 rounded-xl p-4 border border-red-100">{error}</div>
      )}

      {outfits.length === 0 ? (
        <div className="card text-center py-16 px-6 border-2 border-dashed border-cream-300">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent text-2xl flex items-center justify-center mx-auto mb-4">
            📅
          </div>
          <p className="font-display font-semibold text-warm-800 text-lg">No saved outfits yet</p>
          <p className="text-stone-500 mt-1 text-sm max-w-sm mx-auto">Get a recommendation on Today’s Outfit and tap “Save as outfit of the day” to see it here.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {outfits.map((o, i) => (
            <article
              key={o.id}
              className="card-hover animate-slide-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="p-4 sm:p-5 border-b border-cream-100">
                <p className="font-display font-semibold text-warm-900">{formatDate(o.created_at)}</p>
                <p className="text-sm text-stone-500 mt-0.5">
                  {[o.city, o.occasion].filter(Boolean).join(' · ') || 'No location'}
                </p>
              </div>
              {o.items_snapshot?.length > 0 && (
                <div className="p-4 flex flex-wrap gap-2 justify-center bg-stone-50/50">
                  {o.items_snapshot.map((item) => (
                    <div
                      key={item.id}
                      className="w-14 h-14 rounded-xl overflow-hidden border border-cream-200 bg-white shrink-0"
                    >
                      <img
                        src={item.image_url}
                        alt={item.itemType || 'Item'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
              {o.weather_summary && (
                <p className="px-4 py-2 text-xs text-stone-500 truncate" title={o.weather_summary}>
                  {o.weather_summary}
                </p>
              )}
              <div className="p-4 flex flex-wrap items-center gap-2 border-t border-cream-100">
                <button
                  type="button"
                  onClick={() => handleCopyLink(o.share_id)}
                  className="btn-secondary text-sm py-1.5 px-3"
                >
                  {copiedShareId === o.share_id ? 'Copied!' : 'Copy link'}
                </button>
                <a
                  href={getShareUrl(o.share_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-sm py-1.5 px-3"
                >
                  View card
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(o.id)}
                  disabled={deletingId === o.id}
                  className="text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg py-1.5 px-3 transition-colors disabled:opacity-50 ml-auto"
                  title="Delete outfit"
                >
                  {deletingId === o.id ? '…' : 'Delete'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
