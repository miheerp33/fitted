import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getWardrobe, uploadItem, deleteWardrobeItem, updateWardrobeItem } from '../lib/api';

export default function Wardrobe() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { items: list } = await getWardrobe(accessToken);
      setItems(list || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [accessToken]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;
    setUploading(true);
    setError('');
    try {
      const { item } = await uploadItem(accessToken, file);
      setItems((prev) => [item, ...prev]);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!accessToken) return;
    try {
      await deleteWardrobeItem(accessToken, id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleToggleAvailable(item) {
    if (!accessToken || updatingId) return;
    const next = !(item.is_available !== false);
    setUpdatingId(item.id);
    setError('');
    try {
      const { item: updated } = await updateWardrobeItem(accessToken, item.id, { is_available: next });
      if (updated) setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...updated } : i)));
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleTogglePinned(item) {
    if (!accessToken || updatingId) return;
    const next = !(item.pinned === true);
    setUpdatingId(item.id);
    setError('');
    try {
      const { item: updated } = await updateWardrobeItem(accessToken, item.id, { pinned: next });
      if (updated) setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...updated } : i)));
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdatingId(null);
    }
  }

  const tagsLabel = (tags) => {
    if (!tags) return '';
    const parts = [tags.itemType, ...(tags.styleTags || []), `Warmth ${tags.warmthLevel || '?'}`].filter(Boolean);
    return parts.join(' · ');
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">
            Your Wardrobe
          </h1>
          <p className="text-stone-500 mt-1 text-sm">Add pieces and we’ll recommend outfits for the weather.</p>
        </div>
        <label className="btn-primary cursor-pointer shrink-0">
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleUpload}
            disabled={uploading}
          />
          {uploading ? (
            <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <span>+ Add item</span>
          )}
        </label>
      </div>

      {error && (
        <div className="mb-6 text-sm text-red-700 bg-red-50 rounded-xl p-4 border border-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-cream-200 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card text-center py-16 px-6 border-2 border-dashed border-cream-300">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent text-2xl flex items-center justify-center mx-auto mb-4">
            👕
          </div>
          <p className="font-display font-semibold text-warm-800 text-lg">No items yet</p>
          <p className="text-stone-500 mt-1 text-sm max-w-sm mx-auto">
            Upload photos of your clothes and we’ll tag them with AI. Then get outfit ideas for any weather.
          </p>
          <label className="mt-6 btn-primary cursor-pointer inline-flex">
            <input type="file" accept="image/*" className="sr-only" onChange={handleUpload} />
            Add your first item
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
          {items.map((item, i) => (
            <div
              key={item.id}
              className={`group card-hover animate-slide-up ${
                item.is_available === false ? 'opacity-65' : ''
              } ${item.pinned ? 'ring-2 ring-accent/50' : ''}`}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="aspect-[3/4] bg-cream-200 relative overflow-hidden">
                <img
                  src={item.image_url}
                  alt={item.tags?.itemType || 'Clothing'}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                />
                {item.pinned && (
                  <span className="absolute top-2 left-2 px-2 py-1 rounded-lg text-xs font-medium bg-accent text-white shadow-soft">
                    Pinned
                  </span>
                )}
                {item.is_available === false && (
                  <span className={`absolute left-2 px-2 py-1 rounded-lg text-xs font-medium bg-warm-800/90 text-white ${item.pinned ? 'top-10' : 'top-2'}`}>
                    In laundry
                  </span>
                )}
                <div className={`absolute top-2 right-2 flex gap-1.5 transition ${item.pinned || item.is_available === false ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  <button
                    type="button"
                    onClick={() => handleTogglePinned(item)}
                    disabled={updatingId === item.id}
                    className="w-8 h-8 rounded-full bg-white/95 text-warm-800 shadow-soft hover:bg-accent hover:text-white disabled:opacity-50 transition-all"
                    title={item.pinned ? 'Unpin' : 'Pin for next outfit'}
                    aria-label={item.pinned ? 'Unpin' : 'Pin'}
                  >
                    📌
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleAvailable(item)}
                    disabled={updatingId === item.id}
                    className={`w-8 h-8 rounded-full text-white text-xs font-medium shadow-soft disabled:opacity-50 transition-all ${
                      item.is_available === false ? 'bg-accent' : 'bg-warm-800/90 hover:bg-warm-800'
                    }`}
                    title={item.is_available === false ? 'Mark available' : 'Mark in laundry'}
                    aria-label={item.is_available === false ? 'Mark available' : 'In laundry'}
                  >
                    {item.is_available === false ? '✓' : '🧺'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="w-8 h-8 rounded-full bg-red-500/90 text-white shadow-soft hover:bg-red-600 transition-colors"
                    aria-label="Delete"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="p-3 sm:p-4">
                <p className="font-medium text-warm-900 truncate text-sm">
                  {item.tags?.itemType || 'Clothing'}
                </p>
                <p className="text-xs text-stone-500 truncate mt-0.5">{tagsLabel(item.tags)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
