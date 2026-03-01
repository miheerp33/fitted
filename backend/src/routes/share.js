import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

export const shareRouter = express.Router();

shareRouter.get('/:shareId', async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });
    const { shareId } = req.params;
    if (!shareId) return res.status(400).json({ error: 'Share ID required' });

    const { data, error } = await supabaseAdmin
      .from('saved_outfits')
      .select('id, share_id, items_snapshot, weather_summary, city, occasion, explanation, created_at')
      .eq('share_id', shareId)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Outfit not found' });
    res.json({
      shareId: data.share_id,
      items: data.items_snapshot || [],
      weatherSummary: data.weather_summary,
      city: data.city,
      occasion: data.occasion,
      explanation: data.explanation,
      createdAt: data.created_at,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Failed' });
  }
});
