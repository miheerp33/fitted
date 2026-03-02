import { supabaseAdmin } from '../lib/supabase.js';

const WHITELISTED = (process.env.WHITELISTED_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

const TOTAL_LIMITS = {
  upload:     parseInt(process.env.TOTAL_LIMIT_UPLOAD      || '10'),
  generation: parseInt(process.env.TOTAL_LIMIT_GENERATION  || '10'),
};

// recommend and moodboard share the same 'generation' pool
const ENDPOINT_KEY = {
  upload:    'upload',
  recommend: 'generation',
  moodboard: 'generation',
};

export function usageLimitMiddleware(endpoint) {
  return async (req, res, next) => {
    const email = req.user?.email?.toLowerCase();

    // Whitelisted users are unlimited
    if (email && WHITELISTED.includes(email)) return next();

    if (!supabaseAdmin) return next();

    const userId = req.user?.id;
    if (!userId) return next();

    const key = ENDPOINT_KEY[endpoint];
    const limit = TOTAL_LIMITS[key];

    const { data: row } = await supabaseAdmin
      .from('api_usage')
      .select('count')
      .eq('user_id', userId)
      .eq('endpoint', key)
      .maybeSingle();

    const used = row?.count ?? 0;

    if (used >= limit) {
      return res.status(429).json({
        error: 'Usage limit reached',
        message: `You've used all ${limit} ${key} credits. Contact us for more access.`,
        limit,
        used,
      });
    }

    // Increment only after a successful response
    res.on('finish', () => {
      if (res.statusCode < 400) {
        Promise.resolve(
          supabaseAdmin.rpc('increment_api_usage', { p_user_id: userId, p_endpoint: key })
        ).catch(() => {});
      }
    });

    next();
  };
}
