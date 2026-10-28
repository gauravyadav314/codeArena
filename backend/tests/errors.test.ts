import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  RateLimitError,
} from '../src/errors/AppError';
import { getRatingTolerance } from '../src/services/matchmaking.service';

test('Typed Error System', async (t) => {
  await t.test('AppError sets correct statusCode and code', () => {
    const err = new AppError('Something broke', 503, 'SERVICE_UNAVAILABLE');
    assert.equal(err.statusCode, 503);
    assert.equal(err.code, 'SERVICE_UNAVAILABLE');
    assert.equal(err.isOperational, true);
  });

  await t.test('BadRequestError defaults to 400', () => {
    const err = new BadRequestError('Invalid payload');
    assert.equal(err.statusCode, 400);
    assert.equal(err.code, 'BAD_REQUEST');
  });

  await t.test('UnauthorizedError defaults to 401', () => {
    const err = new UnauthorizedError();
    assert.equal(err.statusCode, 401);
    assert.equal(err.code, 'UNAUTHORIZED');
  });

  await t.test('ForbiddenError defaults to 403', () => {
    const err = new ForbiddenError();
    assert.equal(err.statusCode, 403);
    assert.equal(err.code, 'FORBIDDEN');
  });

  await t.test('NotFoundError defaults to 404', () => {
    const err = new NotFoundError('Item missing');
    assert.equal(err.statusCode, 404);
    assert.equal(err.code, 'NOT_FOUND');
  });

  await t.test('ValidationError defaults to 422 with structured details', () => {
    const details = [{ path: 'email', message: 'Invalid email' }];
    const err = new ValidationError('Validation failed', details);
    assert.equal(err.statusCode, 422);
    assert.equal(err.code, 'VALIDATION_ERROR');
    assert.deepEqual(err.details, details);
  });

  await t.test('RateLimitError defaults to 429', () => {
    const err = new RateLimitError();
    assert.equal(err.statusCode, 429);
    assert.equal(err.code, 'RATE_LIMIT_EXCEEDED');
  });
});

test('Matchmaking Queue - Tolerance Window Widening', async (t) => {
  await t.test('widens tolerance strictly by elapsed waiting time', () => {
    assert.equal(getRatingTolerance(0), 100);
    assert.equal(getRatingTolerance(10), 100);
    assert.equal(getRatingTolerance(15), 250);
    assert.equal(getRatingTolerance(25), 250);
    assert.equal(getRatingTolerance(30), 500);
    assert.equal(getRatingTolerance(60), 500);
  });
});

