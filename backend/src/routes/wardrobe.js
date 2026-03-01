import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

export const wardrobeRouter = express.Router();

wardrobeRouter.get('/', async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase not configured' });
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    const { data: items, error } = await supabaseAdmin
      .from('wardrobe_items')
      .select('id, image_url, tags, is_available, pinned, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: 'Failed to load wardrobe', detail: error.message });
    res.json({ items: items || [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Failed' });
  }
});

wardrobeRouter.delete('/:id', async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase not configured' });
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('wardrobe_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) return res.status(500).json({ error: 'Delete failed', detail: error.message });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Failed' });
  }
});

wardrobeRouter.patch('/:id', async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase not configured' });
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    const { id } = req.params;
    const { is_available, pinned } = req.body || {};
    const updates = {};
    if (typeof is_available === 'boolean') updates.is_available = is_available;
    if (typeof pinned === 'boolean') updates.pinned = pinned;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Provide is_available and/or pinned' });
    }
    const { data, error } = await supabaseAdmin
      .from('wardrobe_items')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, image_url, tags, is_available, pinned, created_at')
      .single();
    if (error) return res.status(500).json({ error: 'Update failed', detail: error.message });
    res.json({ item: data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Failed' });
  }
});
