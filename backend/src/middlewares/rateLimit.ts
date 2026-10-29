import { Request, Response, NextFunction } from 'express';

const requestCounts = new Map<string, { count: number; resetAt: number }>();

// Sweep expired entries every 2 minutes to keep memory footprint minimal
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of requestCounts.entries()) {
    if (entry.resetAt < now) {
      requestCounts.delete(ip);
    }
  }
}, 2 * 60 * 1000).unref();

function applyRateLimit(req: Request, res: Response, next: NextFunction, maxPerMinute: number): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = requestCounts.get(ip);

  if (!entry || entry.resetAt < now) {
    requestCounts.set(ip, { count: 1, resetAt: now + 60000 });
    next();
    return;
  }

  if (entry.count >= maxPerMinute) {
    res.status(429).json({
      success: false,
      message: `Rate limit exceeded. Max ${maxPerMinute} submissions per minute.`,
    });
    return;
  }

  entry.count++;
  next();
}

/**
 * Flexible rate limiter: works directly as middleware with default 60 req/min,
 * or as a factory: rateLimiter(30).
 */
export function rateLimiter(
  reqOrMax: Request | number = 60,
  res?: Response,
  next?: NextFunction
): any {
  if (typeof reqOrMax === 'number') {
    const max = reqOrMax;
    return (req: Request, r: Response, n: NextFunction) => applyRateLimit(req, r, n, max);
  }
  return applyRateLimit(reqOrMax, res!, next!, 60);
}
