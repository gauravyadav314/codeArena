import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../errors/AppError';

export interface AuthTokenPayload {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });
}

export function generateRefreshToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, {
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as any,
  });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): AuthTokenPayload {
  try {
    return jwt.verify(token, env.REFRESH_TOKEN_SECRET) as AuthTokenPayload;
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}

export async function register(data: {
  username: string;
  email: string;
  password?: string;
  name?: string;
  bio?: string;
  avatarUrl?: string;
}): Promise<{ user: any; tokens: AuthTokens }> {
  const cleanUsername = data.username.trim().toLowerCase();
  const cleanEmail = data.email.trim().toLowerCase();

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ username: cleanUsername }, { email: cleanEmail }],
    },
  });

  if (existing) {
    const field = existing.username === cleanUsername ? 'Username' : 'Email';
    throw new ConflictError(`${field} is already registered`);
  }

  const passwordHash = data.password ? await hashPassword(data.password) : null;

  const user = await prisma.user.create({
    data: {
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      name: data.name ? data.name.trim() : cleanUsername,
      bio: data.bio ? data.bio.trim() : 'Competitive programmer on CodeArena',
      avatarUrl: data.avatarUrl ? data.avatarUrl.trim() : null,
      arenaRating: 1200,
      ratingTier: 'Novice',
      role: 'USER',
      profile: {
        create: {
          compositeScore: 1200,
        },
      },
    },
    include: {
      profile: true,
    },
  });

  const payload: AuthTokenPayload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Store hashed refresh token in database
  const refreshTokenHash = await hashPassword(refreshToken);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash },
  });

  const { passwordHash: _, refreshTokenHash: __, ...safeUser } = user;
  return { user: safeUser, tokens: { accessToken, refreshToken } };
}

export async function login(identifier: string, password: string): Promise<{ user: any; tokens: AuthTokens }> {
  const cleanIdentifier = identifier.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: cleanIdentifier }, { email: cleanIdentifier }],
    },
    include: {
      profile: true,
    },
  });

  if (!user || !user.passwordHash) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const payload: AuthTokenPayload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const refreshTokenHash = await hashPassword(refreshToken);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash },
  });

  const { passwordHash: _, refreshTokenHash: __, ...safeUser } = user;
  return { user: safeUser, tokens: { accessToken, refreshToken } };
}

export async function refresh(token: string): Promise<AuthTokens> {
  const payload = verifyRefreshToken(token);

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
  });

  if (!user || !user.refreshTokenHash) {
    throw new UnauthorizedError('Session revoked or user not found');
  }

  const isTokenMatching = await comparePassword(token, user.refreshTokenHash);
  if (!isTokenMatching) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const newPayload: AuthTokenPayload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };

  const newAccessToken = generateAccessToken(newPayload);
  const newRefreshToken = generateRefreshToken(newPayload);

  const newRefreshTokenHash = await hashPassword(newRefreshToken);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash: newRefreshTokenHash },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logout(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshTokenHash: null },
  });
}

export async function getCurrentUser(userId: string): Promise<any> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const { passwordHash: _, refreshTokenHash: __, ...safeUser } = user;
  return safeUser;
}
