import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { generateMoodBoardPrompt } from '../lib/modal.js';

export const moodboardRouter = express.Router();

moodboardRouter.post('/', async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase not configured' });
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    const { itemIds, weatherContext } = req.body || {};
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: 'itemIds array required' });
    }

    const { data: items, error: itemsError } = await supabaseAdmin
      .from('wardrobe_items')
      .select('id, tags')
      .eq('user_id', user.id)
      .in('id', itemIds);
    if (itemsError) return res.status(500).json({ error: 'Failed to load items', detail: itemsError.message });

    const prompt = await generateMoodBoardPrompt(items || [], weatherContext || 'neutral');
    const placeholderUrl = `https://picsum.photos/seed/${encodeURIComponent(prompt)}/1200/800`;

    res.json({
      prompt,
      backgroundImageUrl: placeholderUrl,
      itemIds,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Mood board failed' });
  }
});
