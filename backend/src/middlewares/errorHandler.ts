import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../config/logger';
import { env } from '../config/env';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const code = isAppError ? err.code : 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected internal error occurred';
  const details = isAppError ? err.details : undefined;

  // Log error with appropriate severity
  if (statusCode >= 500) {
    logger.error(
      {
        err,
        method: req.method,
        url: req.originalUrl,
        statusCode,
      },
      `[Unhandled Error] ${message}`
    );
  } else {
    logger.warn(
      {
        code,
        method: req.method,
        url: req.originalUrl,
        statusCode,
        details,
      },
      `[Client Error] ${message}`
    );
  }

  res.status(statusCode).json({
    success: false,
    message, // Backwards-compatible field
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(env.NODE_ENV === 'development' && statusCode >= 500 ? { stack: err.stack } : {}),
    },
  });
};
