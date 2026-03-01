import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { getWeatherByCoords, getWeatherByCity } from '../lib/weather.js';
import { recommendOutfit } from '../lib/modal.js';

export const recommendRouter = express.Router();

recommendRouter.post('/', async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase not configured' });
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    const { lat, lon, city, occasion, style } = req.body || {};
    let weather;
    if (lat != null && lon != null) {
      weather = await getWeatherByCoords(lat, lon);
    } else if (city) {
      weather = await getWeatherByCity(city);
    } else {
      return res.status(400).json({ error: 'Provide lat/lon or city' });
    }

    const { data: allItems, error: itemsError } = await supabaseAdmin
      .from('wardrobe_items')
      .select('id, image_url, tags, category, is_available, pinned')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (itemsError) return res.status(500).json({ error: 'Failed to load wardrobe', detail: itemsError.message });
    const items = (allItems || []).filter((i) => i.is_available !== false);
    if (!items?.length) return res.status(400).json({ error: 'No available wardrobe items. Unmark "In laundry" on some items or add more clothes.' });

    const { data: recentFeedback } = await supabaseAdmin
      .from('outfit_feedback')
      .select('occasion, weather_summary, reason, rating, selected_ids, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(12);
    const recent_feedback = (recentFeedback || [])
      .filter((f) => f.rating === 'down' || (f.reason && f.reason.trim()))
      .slice(0, 8)
      .map((f) => ({
        occasion: f.occasion,
        reason: f.reason,
        when: f.created_at,
      }));
    const recentLikedItemIds = (recentFeedback || [])
      .filter((f) => f.rating === 'up' && Array.isArray(f.selected_ids))
      .flatMap((f) => f.selected_ids)
      .filter((id, i, arr) => arr.indexOf(id) === i)
      .slice(0, 20);

    const pinnedIds = items.filter((i) => i.pinned === true).map((i) => i.id);
    const result = await recommendOutfit(weather.summary, items, occasion || null, weather.city || null, style || null, recent_feedback, pinnedIds.length ? pinnedIds : null, recentLikedItemIds.length ? recentLikedItemIds : null);
    let selectedIds = result.selectedIds || [];
    if (!Array.isArray(selectedIds)) selectedIds = [];
    selectedIds = selectedIds.map((id) => String(id).trim()).filter(Boolean);
    const selectedItems = items.filter((i) => selectedIds.includes(i.id));

    res.json({
      weather,
      selectedIds,
      explanation: result.explanation || '',
      items: selectedItems,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Recommendation failed' });
  }
});
