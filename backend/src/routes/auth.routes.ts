import { Router, Request, Response, NextFunction } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  getCurrentUser,
} from '../services/auth.service';
import { validateRequest } from '../middlewares/validate';
import { loginSchema, registerSchema } from '../validators/auth.validator';
import { requireAuth } from '../middlewares/auth';
import { env } from '../config/env';

const router = Router();

const REFRESH_COOKIE_NAME = 'codearena_refresh_token';
const ACCESS_COOKIE_NAME = 'codearena_access_token';

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const isProduction = env.NODE_ENV === 'production';

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth',
  });

  res.cookie(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 mins
    path: '/',
  });
}

function clearAuthCookies(res: Response) {
  const isProduction = env.NODE_ENV === 'production';
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth', secure: isProduction, sameSite: isProduction ? 'strict' : 'lax' });
  res.clearCookie(ACCESS_COOKIE_NAME, { path: '/', secure: isProduction, sameSite: isProduction ? 'strict' : 'lax' });
}

// POST /api/auth/register
router.post(
  '/register',
  validateRequest({ body: registerSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user, tokens } = await register(req.body);
      setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user,
          accessToken: tokens.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  validateRequest({ body: loginSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { identifier, password } = req.body;
      const { user, tokens } = await login(identifier, password);
      setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        data: {
          user,
          accessToken: tokens.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
    if (!token) {
      res.status(401).json({ success: false, message: 'Refresh token is missing' });
      return;
    }

    const tokens = await refresh(token);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    res.status(200).json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        accessToken: tokens.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.id) {
      await logout(req.user.id);
    }
    clearAuthCookies(res);
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getCurrentUser(req.user!.id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

export const authRoutes = router;

