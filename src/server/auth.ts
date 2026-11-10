import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from './db.js';

export const SESSION_COOKIE_NAME = 'kd_cms_session';
const SESSION_DURATION_DAYS = 7;

// Login attempt tracker for brute force protection
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

export function checkLoginAttempts(ip: string): { allowed: boolean; remainingAttempts: number; retryAfterSecs: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (record && record.lockedUntil > now) {
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSecs: Math.ceil((record.lockedUntil - now) / 1000),
    };
  }

  if (record && record.lockedUntil <= now) {
    loginAttempts.delete(ip);
  }

  const currentCount = (loginAttempts.get(ip)?.count || 0);
  return {
    allowed: true,
    remainingAttempts: Math.max(0, 5 - currentCount),
    retryAfterSecs: 0,
  };
}

export function recordFailedLogin(ip: string): void {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  record.count += 1;

  if (record.count >= 5) {
    record.lockedUntil = now + 5 * 60 * 1000; // Lock for 5 minutes
  }

  loginAttempts.set(ip, record);
}

export function clearFailedLogin(ip: string): void {
  loginAttempts.delete(ip);
}

// Session Helpers
export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
}

export async function destroySession(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { token },
  });
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  siteIds: string[];
}

export async function getSessionUser(req: Request): Promise<AuthenticatedUser | null> {
  const token = req.cookies?.[SESSION_COOKIE_NAME] || req.headers['x-admin-token'];
  if (!token || typeof token !== 'string') {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: { memberships: { select: { siteId: true } } } } },
  });

  if (!session) return null;

  if (new Date() > session.expiresAt) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    siteIds: session.user.memberships.map(membership => membership.siteId),
  };
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      res.status(401).json({
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'Sesi kedaluwarsa atau belum login' },
      });
      return;
    }

    (req as any).user = user;
    next();
  } catch (err: any) {
    res.status(500).json({
      data: null,
      error: { code: 'INTERNAL_ERROR', message: err.message },
    });
  }
}
