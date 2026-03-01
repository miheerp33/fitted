import { supabaseAdmin } from '../lib/supabase.js';

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid authorization' });
  }
  req.supabaseToken = token;
  if (supabaseAdmin) {
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) return res.status(401).json({ error: 'Invalid token' });
      req.user = user;
    } catch (_) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
  next();
}
