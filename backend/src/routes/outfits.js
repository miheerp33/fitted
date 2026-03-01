import express from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../lib/supabase.js';

export const outfitsRouter = express.Router();

function generateShareId() {
  return crypto.randomBytes(8).toString('base64url');
}

outfitsRouter.post('/', async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase not configured' });
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    const { selectedIds, weatherSummary, city, occasion, explanation, items } = req.body || {};
    if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
      return res.status(400).json({ error: 'selectedIds array required' });
    }
    const itemsSnapshot = Array.isArray(items)
      ? items.map((i) => ({
          id: i.id,
          image_url: i.image_url,
          itemType: i.tags?.itemType || i.itemType || 'item',
        }))
      : [];

    const shareId = generateShareId();
    const { data, error } = await supabaseAdmin.from('saved_outfits').insert({
      user_id: user.id,
      share_id: shareId,
      selected_ids: selectedIds,
      items_snapshot: itemsSnapshot,
      weather_summary: weatherSummary ?? null,
      city: city ?? null,
      occasion: occasion ?? null,
      explanation: explanation ?? null,
    }).select('id, share_id, created_at').single();

    if (error) return res.status(500).json({ error: 'Failed to save outfit', detail: error.message });
    res.status(201).json({
      id: data.id,
      shareId: data.share_id,
      createdAt: data.created_at,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Save failed' });
  }
});

outfitsRouter.get('/', async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase not configured' });
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    const { data, error } = await supabaseAdmin
      .from('saved_outfits')
      .select('id, share_id, weather_summary, city, occasion, explanation, items_snapshot, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: 'Failed to load outfits', detail: error.message });
    res.json({ outfits: data || [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'List failed' });
  }
});

outfitsRouter.delete('/:id', async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase not configured' });
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Outfit id required' });

    const { error } = await supabaseAdmin
      .from('saved_outfits')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return res.status(500).json({ error: 'Failed to delete outfit', detail: error.message });
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Delete failed' });
  }
});
