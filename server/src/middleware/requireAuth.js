import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import { env } from '../config/env.js';

export function tokenFromRequest(req) {
  const cookieToken = parseCookie(req.headers.cookie ?? '')[env.cookieName];
  const header = req.headers.authorization;
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null;
  return cookieToken || bearer;
}

export function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch {
    return null;
  }
}

export function requireAuth(req, res, next) {
  const payload = verifyToken(tokenFromRequest(req));
  if (!payload?.sub) return res.status(401).json({ message: 'Please log in to continue.' });
  req.userId = payload.sub;
  next();
}
