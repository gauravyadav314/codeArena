import { Request, Response, NextFunction } from 'express';
import { AuthTokenPayload, verifyAccessToken } from '../services/auth.service';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError';

// Augment Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  if (req.cookies && req.cookies.codearena_access_token) {
    return req.cookies.codearena_access_token;
  }
  return null;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }

    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = extractToken(req);
    if (token) {
      req.user = verifyAccessToken(token);
    }
    next();
  } catch {
    // Optional auth silently ignores invalid tokens
    next();
  }
}

export function requireOwnership(paramKey: string = 'username') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const targetValue = req.params[paramKey] || req.body[paramKey];
    const isOwner =
      req.user.username.toLowerCase() === (targetValue ?? '').toLowerCase() ||
      req.user.id === targetValue ||
      req.user.role === 'ADMIN';

    if (!isOwner) {
      return next(new ForbiddenError('You do not have permission to perform this action'));
    }

    next();
  };
}
