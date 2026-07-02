import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'lodga-super-secret-key-12345';

export interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    email?: string;
    phone: string;
    full_name: string;
    user_type: 'student' | 'caretaker' | 'landlord' | 'admin';
  };
}

/**
 * Main authentication middleware to verify JWT signatures
 */
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Authentication token is required' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      res.status(403).json({ error: 'Invalid or expired authentication token' });
      return;
    }

    req.user = decoded as AuthenticatedRequest['user'];
    next();
  });
}

/**
 * Identity role guard helper
 */
export function requireRole(allowedRoles: ('student' | 'caretaker' | 'landlord' | 'admin')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: User session missing' });
      return;
    }

    if (!allowedRoles.includes(req.user.user_type)) {
      res.status(403).json({ error: `Forbidden: Access restricted to [${allowedRoles.join(', ')}]` });
      return;
    }

    next();
  };
}

/**
 * Signs a JWT for a user
 */
export function signUserToken(payload: {
  user_id: string;
  email?: string;
  phone: string;
  full_name: string;
  user_type: string;
}): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
