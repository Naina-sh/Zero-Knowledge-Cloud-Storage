/**
 * Type declaration for express-rate-limit (no @types package needed).
 */
declare module 'express-rate-limit' {
  import type { Request, Response, NextFunction, RequestHandler } from 'express';

  interface RateLimitOptions {
    windowMs?: number;
    max?: number | ((req: Request, res: Response) => number);
    standardHeaders?: boolean;
    legacyHeaders?: boolean;
    message?: unknown;
    skip?: (req: Request, res: Response) => boolean;
    keyGenerator?: (req: Request, res: Response) => string;
    handler?: (req: Request, res: Response, next: NextFunction, options: RateLimitOptions) => void;
  }

  function rateLimit(options?: RateLimitOptions): RequestHandler;
  export = rateLimit;
}
