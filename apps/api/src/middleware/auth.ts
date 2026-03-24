import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@halal-map/shared';
import { prisma } from '../lib/prisma.js';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: UserRole;
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.warn('JWT_SECRET should be at least 32 characters for production');
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
      role: UserRole;
    };
    const userExists = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true },
    });
    if (!userExists) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId || !req.userRole) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.userRole)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
