import { Request, Response, NextFunction } from 'express';

export function requireFields(...fields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing = fields.filter(f => !req.body[f]);
    if (missing.length > 0) {
      res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(', ')}` });
      return;
    }
    next();
  };
}
