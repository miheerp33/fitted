import { supabaseAdmin } from '../lib/supabase.js';

const WHITELISTED = (process.env.WHITELISTED_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

const DAILY_LIMITS = {
  upload:    parseInt(process.env.DAILY_LIMIT_UPLOAD    || '3'),
  recommend: parseInt(process.env.DAILY_LIMIT_RECOMMEND || '5'),
  moodboard: parseInt(process.env.DAILY_LIMIT_MOODBOARD || '5'),
};

export function usageLimitMiddleware(endpoint) {
  return async (req, res, next) => {
    const email = req.user?.email?.toLowerCase();

    // Whitelisted users are unlimited
    if (email && WHITELISTED.includes(email)) return next();

    if (!supabaseAdmin) return next(); // fail open if DB not configured

    const userId = req.user?.id;
    if (!userId) return next();

    const limit = DAILY_LIMITS[endpoint];
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD UTC

    const { data: row } = await supabaseAdmin
      .from('api_usage')
      .select('count')
      .eq('user_id', userId)
      .eq('date', today)
      .eq('endpoint', endpoint)
      .maybeSingle();

    const used = row?.count ?? 0;

    if (used >= limit) {
      return res.status(429).json({
        error: 'Daily limit reached',
        message: `You've used all ${limit} ${endpoint} calls for today. Resets at midnight UTC.`,
        limit,
        used,
      });
    }

    // Increment only after a successful response
    res.on('finish', () => {
      if (res.statusCode < 400) {
        supabaseAdmin
          .rpc('increment_api_usage', { p_user_id: userId, p_date: today, p_endpoint: endpoint })
          .catch(() => {});
      }
    });

    next();
  };
}
