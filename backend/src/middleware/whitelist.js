const WHITELISTED = (process.env.WHITELISTED_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export function whitelistMiddleware(req, res, next) {
  const email = req.user?.email?.toLowerCase();
  if (!email || !WHITELISTED.includes(email)) {
    return res.status(403).json({ error: 'Access restricted' });
  }
  next();
}
