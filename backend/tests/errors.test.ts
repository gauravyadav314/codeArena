import { describe, it, expect } from 'vitest';
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

describe('Typed Error System', () => {
  it('AppError sets correct statusCode and code', () => {
    const err = new AppError('Something broke', 503, 'SERVICE_UNAVAILABLE');
    expect(err.statusCode).toBe(503);
    expect(err.code).toBe('SERVICE_UNAVAILABLE');
    expect(err.isOperational).toBe(true);
  });

  it('BadRequestError defaults to 400', () => {
    const err = new BadRequestError('Invalid payload');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
  });

  it('UnauthorizedError defaults to 401', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('ForbiddenError defaults to 403', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('NotFoundError defaults to 404', () => {
    const err = new NotFoundError('Item missing');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });

  it('ValidationError defaults to 422 with structured details', () => {
    const details = [{ path: 'email', message: 'Invalid email' }];
    const err = new ValidationError('Validation failed', details);
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details).toEqual(details);
  });

  it('RateLimitError defaults to 429', () => {
    const err = new RateLimitError();
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});

describe('Matchmaking Queue - Tolerance Window Widening', () => {
  it('widens tolerance strictly by elapsed waiting time', () => {
    expect(getRatingTolerance(0)).toBe(100);
    expect(getRatingTolerance(10)).toBe(100);
    expect(getRatingTolerance(15)).toBe(250);
    expect(getRatingTolerance(25)).toBe(250);
    expect(getRatingTolerance(30)).toBe(500);
    expect(getRatingTolerance(60)).toBe(500);
  });
});
