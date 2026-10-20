import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const authRouter = Router();

function userView(user) {
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    avatar: user.avatar ?? '',
    stats: user.stats,
    createdAt: user.createdAt,
  };
}

function setSessionCookie(res, user) {
  const token = jwt.sign({ sub: user._id.toString() }, env.jwtSecret, { expiresIn: '7d', issuer: 'hand-cricket' });
  const options = [
    `${env.cookieName}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${7 * 24 * 60 * 60}`,
  ];
  if (env.nodeEnv === 'production') options.push('Secure');
  res.setHeader('Set-Cookie', options.join('; '));
}

function clearSessionCookie(res) {
  const options = [`${env.cookieName}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (env.nodeEnv === 'production') options.push('Secure');
  res.setHeader('Set-Cookie', options.join('; '));
}

function validEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validUsername(username) {
  return typeof username === 'string' && /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

function validPassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 72;
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = req.body.password;
    if (!validUsername(username)) {
      return res.status(400).json({ message: 'Username must be 3–20 characters using letters, numbers, or underscores.' });
    }
    if (!validEmail(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (!validPassword(password)) return res.status(400).json({ message: 'Password must be between 8 and 72 characters.' });

    const [emailTaken, usernameTaken] = await Promise.all([
      User.exists({ email }),
      User.exists({ usernameLower: username.toLowerCase() }),
    ]);
    if (emailTaken) return res.status(409).json({ message: 'That email is already registered.' });
    if (usernameTaken) return res.status(409).json({ message: 'That username is already taken.' });

    const user = await User.create({
      username,
      usernameLower: username.toLowerCase(),
      email,
      passwordHash: await bcrypt.hash(password, 12),
    });
    setSessionCookie(res, user);
    return res.status(201).json({ user: userView(user) });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: 'Email or username already exists.' });
    next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = req.body.password;
    if (!validEmail(email) || typeof password !== 'string') {
      return res.status(400).json({ message: 'Enter your email and password.' });
    }
    const user = await User.findOne({ email }).select('+passwordHash');
    const passwordOk = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !passwordOk) return res.status(401).json({ message: 'Email or password is incorrect.' });
    setSessionCookie(res, user);
    return res.json({ user: userView(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ message: 'Account not found.' });
    return res.json({ user: userView(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ message: 'Logged out.' });
});
