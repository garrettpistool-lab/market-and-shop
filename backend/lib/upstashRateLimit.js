const { Ratelimit } = require('@upstash/ratelimit');
const { Redis } = require('@upstash/redis');

let loginLimiter = null;
let apiLimiter = null;

function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function getLoginLimiter() {
  if (loginLimiter) return loginLimiter;
  const redis = getRedis();
  if (!redis) return null;
  loginLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(12, '15 m'),
    prefix: 'marketshop:login',
  });
  return loginLimiter;
}

function getApiLimiter() {
  if (apiLimiter) return apiLimiter;
  const redis = getRedis();
  if (!redis) return null;
  apiLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    prefix: 'marketshop:api',
  });
  return apiLimiter;
}

function createUpstashMiddleware(limiterFactory) {
  return async (req, res, next) => {
    const limiter = limiterFactory();
    if (!limiter) return next();

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'anonymous';
    try {
      const { success, remaining, reset } = await limiter.limit(ip);
      res.setHeader('X-RateLimit-Remaining', String(remaining));
      if (!success) {
        return res.status(429).json({
          error: 'Too many requests. Please slow down.',
          retryAfter: reset,
        });
      }
      return next();
    } catch (e) {
      console.warn('Upstash rate limit unavailable:', e.message);
      return next();
    }
  };
}

module.exports = { createUpstashMiddleware, getLoginLimiter, getApiLimiter, getRedis };