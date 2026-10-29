import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  AuthTokenPayload,
} from '../src/services/auth.service';

describe('Auth Service - Password Hashing & Comparison', () => {
  it('hashes password and verifies match correctly', async () => {
    const rawPassword = 'SecurePassword123!';
    const hash = await hashPassword(rawPassword);

    expect(hash).not.toBe(rawPassword);
    const matches = await comparePassword(rawPassword, hash);
    expect(matches).toBe(true);
  });

  it('rejects incorrect password comparison', async () => {
    const rawPassword = 'CorrectPassword';
    const hash = await hashPassword(rawPassword);

    const matches = await comparePassword('WrongPassword', hash);
    expect(matches).toBe(false);
  });
});

describe('Auth Service - JWT Token Lifecycle', () => {
  const payload: AuthTokenPayload = {
    id: 'user-uuid-1234',
    username: 'tourist',
    email: 'tourist@codearena.dev',
    role: 'USER',
  };

  it('signs and verifies valid access token', () => {
    const token = generateAccessToken(payload);
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded.id).toBe(payload.id);
    expect(decoded.username).toBe(payload.username);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
  });

  it('signs and verifies valid refresh token', () => {
    const refreshToken = generateRefreshToken(payload);
    expect(typeof refreshToken).toBe('string');

    const decoded = verifyRefreshToken(refreshToken);
    expect(decoded.id).toBe(payload.id);
    expect(decoded.username).toBe(payload.username);
  });

  it('rejects tampered or malformed tokens', () => {
    expect(() => {
      verifyAccessToken('malformed.bogus.token');
    }).toThrow();
  });
});
