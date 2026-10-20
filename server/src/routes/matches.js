import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { Match } from '../models/Match.js';

export const matchesRouter = Router();
matchesRouter.use(requireAuth);

matchesRouter.get('/mine', async (req, res, next) => {
  try {
    const limitInput = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitInput) ? Math.min(Math.max(limitInput, 1), 50) : 20;
    const matches = await Match.find({ playerIds: req.userId })
      .sort({ completedAt: -1 })
      .limit(limit)
      .lean();
    res.json({ matches });
  } catch (error) {
    next(error);
  }
});
