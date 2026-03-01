import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

export const feedbackRouter = express.Router();

feedbackRouter.post('/', async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase not configured' });
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    const { occasion, weatherSummary, selectedIds, reason, rating } = req.body || {};
    const isThumbsUp = rating === 'up';
    const isThumbsDown = rating === 'down';
    if (isThumbsUp) {
      // Thumbs up: no reason required
      const { error } = await supabaseAdmin.from('outfit_feedback').insert({
        user_id: user.id,
        occasion: occasion || null,
        weather_summary: weatherSummary || null,
        selected_ids: Array.isArray(selectedIds) ? selectedIds : null,
        reason: null,
        rating: 'up',
      });
      if (error) return res.status(500).json({ error: 'Failed to save feedback', detail: error.message });
      return res.json({ ok: true });
    }
    // Thumbs down or legacy feedback: reason required
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ error: 'reason is required when thumbs down or sending feedback' });
    }
    const { error } = await supabaseAdmin.from('outfit_feedback').insert({
      user_id: user.id,
      occasion: occasion || null,
      weather_summary: weatherSummary || null,
      selected_ids: Array.isArray(selectedIds) ? selectedIds : null,
      reason: reason.trim().slice(0, 500),
      rating: isThumbsDown ? 'down' : null,
    });
    if (error) return res.status(500).json({ error: 'Failed to save feedback', detail: error.message });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Failed' });
  }
});
