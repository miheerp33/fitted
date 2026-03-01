/**
 * AI inference via Modal. All Gemini calls go through the deployed Modal app.
 * Set MODAL_AI_URL in .env to your Modal app URL (e.g. from `modal deploy app.py`).
 */
import fetch from 'node-fetch';

function modalUrl(path) {
  const baseUrl = process.env.MODAL_AI_URL?.replace(/\/$/, '');
  if (!baseUrl) throw new Error('MODAL_AI_URL not set. Deploy the Modal app and set MODAL_AI_URL in backend/.env');
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

async function post(path, body) {
  const res = await fetch(modalUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Modal ${path}: ${res.status} ${text}`);
  }
  return res.json();
}

export async function analyzeClothing(imageBuffer, mimeType) {
  const image_base64 = imageBuffer.toString('base64');
  return post('/analyze_clothing', { image_base64, mime_type: mimeType || 'image/jpeg' });
}

export async function recommendOutfit(weatherSummary, wardrobeItems, occasion = null, location = null, style = null, recentFeedback = null, pinnedIds = null, recentLikedItemIds = null) {
  const wardrobe_list = wardrobeItems.map((i) => ({
    id: i.id,
    itemType: i.tags?.itemType,
    styleTags: i.tags?.styleTags,
    warmthLevel: i.tags?.warmthLevel,
    dominantColors: i.tags?.dominantColors,
  }));
  return post('/recommend_outfit', {
    weather_summary: weatherSummary,
    wardrobe_items: wardrobe_list,
    occasion: occasion || undefined,
    location: location || undefined,
    style: style || undefined,
    recent_feedback: Array.isArray(recentFeedback) ? recentFeedback : undefined,
    pinned_ids: Array.isArray(pinnedIds) && pinnedIds.length > 0 ? pinnedIds : undefined,
    recent_liked_item_ids: Array.isArray(recentLikedItemIds) && recentLikedItemIds.length > 0 ? recentLikedItemIds : undefined,
  });
}

export async function generateMoodBoardPrompt(outfitItems, weatherContext) {
  const outfit_items = outfitItems.map((i) => ({ id: i.id, tags: i.tags }));
  const out = await post('/moodboard_prompt', {
    outfit_items,
    weather_context: weatherContext || '',
  });
  return out.prompt || 'minimal fashion mood board background';
}
