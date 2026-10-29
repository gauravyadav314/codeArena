import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('Route Integration Tests - Health Endpoints', () => {
  it('GET /health returns 200 with service status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.environment).toBeDefined();
  });

  it('GET /api/health returns health probe', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.uptime).toBeDefined();
  });
});

describe('Route Integration Tests - Problems Endpoints', () => {
  it('GET /api/problems returns problem catalog list', async () => {
    const res = await request(app).get('/api/problems');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/problems/:slug returns problem details without leaking full test cases', async () => {
    const res = await request(app).get('/api/problems/two-sum');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slug).toBe('two-sum');

    // Verify hidden test cases are sanitized
    const parsed = JSON.parse(res.body.data.testCases);
    expect(parsed.length).toBeLessThanOrEqual(2);
  });

  it('POST /api/problems/two-sum/run executes sample code and returns verdict', async () => {
    const res = await request(app)
      .post('/api/problems/two-sum/run')
      .send({
        code: `function twoSum(nums, target) {
          const map = new Map();
          for (let i = 0; i < nums.length; i++) {
            const diff = target - nums[i];
            if (map.has(diff)) return [map.get(diff), i];
            map.set(nums[i], i);
          }
          return [];
        }`,
        language: 'javascript',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ACCEPTED');
  });
});

describe('Route Integration Tests - Auth & Matches Flow', () => {
  const testUsername = `user_${Date.now()}`;
  const testEmail = `${testUsername}@example.com`;
  let accessToken = '';

  it('POST /api/auth/register registers user and returns tokens & cookies', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: testUsername,
        email: testEmail,
        password: 'password123',
        name: 'Integration Test User',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.username).toBe(testUsername);
    expect(res.body.data.accessToken).toBeDefined();

    accessToken = res.body.data.accessToken;

    // Verify Set-Cookie header contains refresh token
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
  });

  it('GET /api/auth/me returns 401 without auth header', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me returns 200 with valid Bearer token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe(testUsername);
  });

  it('POST /api/matches/create generates 6-character room code', async () => {
    // Get problem ID for Two Sum
    const probRes = await request(app).get('/api/problems/two-sum');
    const problemId = probRes.body.data.id;

    const res = await request(app)
      .post('/api/matches/create')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        problemId,
        player1Username: testUsername,
        durationSeconds: 900,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toMatch(/^ARENA-[A-Z0-9]{6}$/);
  });
});

