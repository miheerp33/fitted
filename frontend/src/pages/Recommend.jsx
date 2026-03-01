import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getRecommendation, getMoodBoard, submitOutfitFeedback, saveOutfit } from '../lib/api';

const FEEDBACK_REASONS = [
  { value: 'wrong_occasion', label: "Wrong occasion (e.g. wanted workout, got casual)" },
  { value: 'too_warm', label: 'Too warm for the weather' },
  { value: 'too_cold', label: 'Too cold for the weather' },
  { value: 'dont_like_style', label: "Don't like the style / not my vibe" },
  { value: 'missing_piece', label: "Missing a piece (e.g. no outerwear when needed)" },
  { value: 'other', label: 'Other' },
];

export default function Recommend() {
  const { accessToken } = useAuth();
  const [location, setLocation] = useState({ city: '' });
  const [occasion, setOccasion] = useState('');
  const [style, setStyle] = useState('');
  const [weather, setWeather] = useState(null);
  const [result, setResult] = useState(null);
  const [moodBoard, setMoodBoard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState('');
  const [feedbackOther, setFeedbackOther] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [ratingSent, setRatingSent] = useState(null);
  const [savedShareId, setSavedShareId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copiedShareId, setCopiedShareId] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setLocation({ city: 'Champaign' })
    );
  }, []);

  async function handleSaveOutfit() {
    if (!result?.selectedIds?.length || saving) return;
    setError('');
    setSaving(true);
    setSavedShareId(null);
    try {
      const { shareId } = await saveOutfit(accessToken, {
        selectedIds: result.selectedIds,
        weatherSummary: weather?.summary,
        city: weather?.city || location.city,
        occasion: occasion || undefined,
        explanation: result.explanation,
        items: result.items,
      });
      setSavedShareId(shareId);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

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

  async function handleGetOutfit() {
    setError('');
    setLoading(true);
    setResult(null);
    setMoodBoard(null);
    setFeedbackSent(false);
    setRatingSent(null);
    setFeedbackOpen(false);
    try {
      const payload = location.lat != null ? { lat: location.lat, lon: location.lon } : { city: location.city || 'Champaign' };
      if (occasion) payload.occasion = occasion;
      if (style) payload.style = style;
      const data = await getRecommendation(accessToken, payload);
      setWeather(data.weather);
      setResult(data);

      if (data.selectedIds?.length) {
        const mood = await getMoodBoard(accessToken, {
          itemIds: data.selectedIds,
          weatherContext: data.weather?.summary || '',
        });
        setMoodBoard(mood);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleThumbsUp() {
    if (!result?.selectedIds?.length) return;
    setError('');
    try {
      await submitOutfitFeedback(accessToken, {
        occasion,
        weatherSummary: weather?.summary,
        selectedIds: result.selectedIds,
        rating: 'up',
      });
      setRatingSent('up');
      setFeedbackSent(true);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleThumbsDown() {
    setFeedbackOpen(true);
  }

  async function handleSubmitFeedback(e) {
    e.preventDefault();
    const reasonText = feedbackReason === 'other' ? feedbackOther.trim() : FEEDBACK_REASONS.find((r) => r.value === feedbackReason)?.label;
    if (!reasonText) return;
    setError('');
    try {
      await submitOutfitFeedback(accessToken, {
        occasion,
        weatherSummary: weather?.summary,
        selectedIds: result?.selectedIds,
        reason: reasonText,
        rating: 'down',
      });
      setFeedbackSent(true);
      setRatingSent('down');
      setFeedbackOpen(false);
      setFeedbackReason('');
      setFeedbackOther('');
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">
          Today's Outfit
        </h1>
        <p className="text-stone-500 mt-1 text-sm">Set your location and vibe — we’ll pick the fit.</p>
      </div>

      {/* Controls */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap gap-4 sm:gap-5 items-end">
          <div className="min-w-[140px]">
            <label className="block text-sm font-medium text-warm-800 mb-1.5">City</label>
            <input
              type="text"
              value={location.city || ''}
              onChange={(e) => setLocation((p) => ({ ...p, city: e.target.value }))}
              placeholder="e.g. Champaign"
              className="input-field"
            />
          </div>
          <div className="min-w-[140px]">
            <label className="block text-sm font-medium text-warm-800 mb-1.5">Occasion</label>
            <select
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              className="input-field"
            >
              <option value="">Any</option>
              <option value="class">Class</option>
              <option value="interview">Interview</option>
              <option value="casual">Casual</option>
              <option value="date">Date night</option>
              <option value="workout">Workout</option>
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className="block text-sm font-medium text-warm-800 mb-1.5">Style</label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="input-field"
            >
              <option value="">No preference</option>
              <option value="gen-z-college">Gen-Z College</option>
              <option value="frat-prep">Frat / Prep</option>
              <option value="alt-indie">Alt / Indie</option>
              <option value="streetwear">Streetwear</option>
              <option value="smart-casual">Smart Casual</option>
              <option value="athleisure">Athleisure</option>
              <option value="classic">Classic / Minimal</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleGetOutfit}
            disabled={loading}
            className="btn-primary px-6 py-2.5"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              "Get today's outfit"
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 rounded-xl p-4 border border-red-100">
          {error}
        </div>
      )}

      {loading && (
        <div className="card p-12 sm:p-16 text-center">
          <div className="inline-block w-12 h-12 border-2 border-accent/30 border-t-accent rounded-full animate-spin mb-4" />
          <p className="text-warm-800 font-medium">Checking weather & picking your outfit…</p>
          <p className="text-stone-500 text-sm mt-1">AI is styling you.</p>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-6 animate-slide-up">
          {weather && (
            <div className="card p-4 sm:p-5 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🌡️</span>
                <div>
                  <p className="font-display font-semibold text-warm-900 text-xl">
                    {weather.temp}°F · {weather.condition}
                  </p>
                  <p className="text-sm text-stone-500">High {weather.high}°F · Low {weather.low}°F</p>
                </div>
              </div>
            </div>
          )}

          <div className="card overflow-hidden shadow-card">
            <div className="relative min-h-[320px] bg-cream-200">
              {moodBoard?.backgroundImageUrl && (
                <img
                  src={moodBoard.backgroundImageUrl}
                  alt="Mood board"
                  className="absolute inset-0 w-full h-full object-cover opacity-90"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-warm-900/70 via-transparent to-transparent" />
              <div className="relative p-6 flex flex-wrap gap-4 sm:gap-6 items-end justify-center min-h-[280px]">
                {result.items?.map((item) => (
                  <div
                    key={item.id}
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-white shadow-card bg-white"
                  >
                    <img
                      src={item.image_url}
                      alt={item.tags?.itemType}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 sm:p-8 border-t border-cream-200">
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <button
                  type="button"
                  onClick={handleSaveOutfit}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Saving…' : 'Save as outfit of the day'}
                </button>
                {savedShareId && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(savedShareId)}
                      className="btn-secondary text-sm"
                    >
                      {copiedShareId === savedShareId ? 'Copied!' : 'Copy share link'}
                    </button>
                    <a
                      href={getShareUrl(savedShareId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-accent hover:text-accent-dark"
                    >
                      Open card →
                    </a>
                  </div>
                )}
              </div>
              <h3 className="font-display font-semibold text-warm-900 mb-2">Why this outfit</h3>
              <p className="text-stone-600 leading-relaxed">{result.explanation}</p>
              {!feedbackSent ? (
                <>
                  <div className="flex items-center gap-2 mt-4">
                    <span className="text-sm text-stone-500">Rate this fit:</span>
                    <button
                      type="button"
                      onClick={handleThumbsUp}
                      className="p-2.5 rounded-xl border border-cream-300 hover:bg-green-50 hover:border-green-200 text-stone-600 hover:text-green-700 transition-all"
                      title="Good fit"
                      aria-label="Thumbs up"
                    >
                      👍
                    </button>
                    <button
                      type="button"
                      onClick={handleThumbsDown}
                      className="p-2.5 rounded-xl border border-cream-300 hover:bg-red-50 hover:border-red-200 text-stone-600 hover:text-red-700 transition-all"
                      title="Not for me — send feedback"
                      aria-label="Thumbs down"
                    >
                      👎
                    </button>
                  </div>
                  {feedbackOpen && (
                    <form onSubmit={handleSubmitFeedback} className="mt-5 pt-5 border-t border-cream-200">
                      <p className="text-sm font-medium text-warm-800 mb-2">Why doesn’t it fit?</p>
                      <select
                        value={feedbackReason}
                        onChange={(e) => setFeedbackReason(e.target.value)}
                        className="input-field max-w-md mb-3"
                        required
                      >
                        <option value="">Select a reason…</option>
                        {FEEDBACK_REASONS.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      {feedbackReason === 'other' && (
                        <input
                          type="text"
                          value={feedbackOther}
                          onChange={(e) => setFeedbackOther(e.target.value)}
                          placeholder="Tell us more…"
                          className="input-field max-w-md mb-3"
                        />
                      )}
                      <div className="flex gap-2">
                        <button type="submit" className="btn-primary text-sm py-2 px-4">
                          Send feedback
                        </button>
                        <button
                          type="button"
                          onClick={() => { setFeedbackOpen(false); setFeedbackReason(''); setFeedbackOther(''); }}
                          className="btn-secondary text-sm py-2 px-4"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </>
              ) : (
                <p className="mt-4 text-sm text-stone-600">
                  {ratingSent === 'up' ? "Thanks! We'll use this to generate better fits for you." : "Thanks for your feedback — we'll do better next time."}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
