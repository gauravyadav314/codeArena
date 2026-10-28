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

export function rateLimiter(maxPerMinute: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
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
        message: `Rate limit exceeded. Max ${maxPerMinute} code submissions per minute.`,
      });
      return;
    }

    entry.count++;
    next();
  };
}
