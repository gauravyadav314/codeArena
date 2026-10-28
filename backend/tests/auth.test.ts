import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  AuthTokenPayload,
} from '../src/services/auth.service';

test('Auth Service - Password Hashing & Comparison', async (t) => {
  await t.test('hashes password and verifies match correctly', async () => {
    const rawPassword = 'SecurePassword123!';
    const hash = await hashPassword(rawPassword);

    assert.notEqual(rawPassword, hash);
    const matches = await comparePassword(rawPassword, hash);
    assert.equal(matches, true);
  });

  await t.test('rejects incorrect password comparison', async () => {
    const rawPassword = 'CorrectPassword';
    const hash = await hashPassword(rawPassword);

    const matches = await comparePassword('WrongPassword', hash);
    assert.equal(matches, false);
  });
});

test('Auth Service - JWT Token Lifecycle', async (t) => {
  const payload: AuthTokenPayload = {
    id: 'user-uuid-1234',
    username: 'tourist',
    email: 'tourist@codearena.dev',
    role: 'USER',
  };

  await t.test('signs and verifies valid access token', () => {
    const token = generateAccessToken(payload);
    assert.equal(typeof token, 'string');

    const decoded = verifyAccessToken(token);
    assert.equal(decoded.id, payload.id);
    assert.equal(decoded.username, payload.username);
    assert.equal(decoded.email, payload.email);
    assert.equal(decoded.role, payload.role);
  });

  await t.test('signs and verifies valid refresh token', () => {
    const refreshToken = generateRefreshToken(payload);
    assert.equal(typeof refreshToken, 'string');

    const decoded = verifyRefreshToken(refreshToken);
    assert.equal(decoded.id, payload.id);
    assert.equal(decoded.username, payload.username);
  });

  await t.test('rejects tampered or malformed tokens', () => {
    assert.throws(() => {
      verifyAccessToken('malformed.bogus.token');
    });
  });
});
