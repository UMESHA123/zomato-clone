import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'zomato-jwt-secret-change-in-production';

// Pad secret to match the Java service (HMAC-SHA256 needs >= 32 bytes)
function getKey(): string {
  let padded = JWT_SECRET;
  while (Buffer.byteLength(padded, 'utf8') < 32) {
    padded = padded + JWT_SECRET;
  }
  return padded;
}

const PUBLIC_PATHS = [
  '/api/users/health',
  '/api/users/register',
  '/api/users/login',
  '/api/restaurants/health',
  '/api/orders/health',
  '/api/delivery/health',
  '/api/payments/health',
  '/api/notifications/health',
  '/api/chat/health',
  '/health',
  '/api/health',
  '/metrics',
];

// Paths that allow unauthenticated access (public browsing)
const OPTIONAL_AUTH_PATHS = [
  '/api/restaurants',
  '/api/chat',
];

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const path = req.path;

  // Skip auth for public paths
  if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/'))) {
    return next();
  }

  // Skip auth for health actuator endpoints
  if (path.includes('/actuator')) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, getKey()) as jwt.JwtPayload;
      req.user = {
        userId: decoded.sub as string,
        email: decoded.email as string,
        name: decoded.name as string,
        role: decoded.role as string,
      };

      // Forward user info as headers to downstream services
      req.headers['x-user-id'] = decoded.sub as string;
      req.headers['x-user-email'] = decoded.email as string;
      req.headers['x-user-name'] = decoded.name as string;
      req.headers['x-user-role'] = decoded.role as string;
    } catch {
      // Token is invalid — fall through to check if path allows unauthenticated
    }
  }

  // For optional-auth paths, allow through even without valid token
  if (OPTIONAL_AUTH_PATHS.some((p) => path === p || path.startsWith(p + '/'))) {
    return next();
  }

  // Require auth for all other paths
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  next();
}
