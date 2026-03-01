import express from 'express';
import multer from 'multer';
import { supabaseAdmin } from '../lib/supabase.js';
import { analyzeClothing } from '../lib/modal.js';
import { randomUUID } from 'crypto';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
export const uploadRouter = express.Router();

function categorizeItem(itemType = '') {
  const t = itemType.toLowerCase();
  if (/jacket|coat|puffer|parka|blazer|windbreaker|overcoat|trench|vest/.test(t)) return 'outerwear';
  if (/pants|jeans|shorts|chinos|trousers|skirt|joggers|sweatpants|leggings|slacks|denim|cargo|khaki|corduroy/.test(t)) return 'bottom';
  if (/shoe|sneaker|boot|loafer|sandal|slipper|heel|oxford|mule|clog/.test(t)) return 'shoes';
  return 'top';
}

uploadRouter.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file' });
    if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase not configured' });
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    const tags = await analyzeClothing(req.file.buffer, req.file.mimetype);
    const ext = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
    const path = `${user.id}/${randomUUID()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage.from('wardrobe').upload(path, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });
    if (uploadError) return res.status(500).json({ error: 'Storage upload failed', detail: uploadError.message });

    const { data: urlData } = supabaseAdmin.storage.from('wardrobe').getPublicUrl(path);
    const imageUrl = urlData.publicUrl;

    const category = categorizeItem(tags?.itemType);
    const { data: row, error: insertError } = await supabaseAdmin
      .from('wardrobe_items')
      .insert({ user_id: user.id, image_url: imageUrl, tags, category })
      .select('id, image_url, tags, category, created_at')
      .single();
    if (insertError) return res.status(500).json({ error: 'DB insert failed', detail: insertError.message });

    res.json({ item: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Upload failed' });
  }
});
