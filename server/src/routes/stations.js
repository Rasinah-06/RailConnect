import { Router } from 'express';
import { Station } from '../models/Station.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Autocomplete: GET /api/stations?q=che
router.get('/', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ stations: await Station.find().sort({ name: 1 }).limit(60).lean() });
  const rx = new RegExp(esc(q), 'i');
  const stations = await Station.find({ $or: [{ code: rx }, { name: rx }, { city: rx }] }).limit(10).lean();
  // exact code match first, then prefix matches
  stations.sort((a, b) => {
    const score = (s) => (s.code.toLowerCase() === q.toLowerCase() ? 0 : s.name.toLowerCase().startsWith(q.toLowerCase()) ? 1 : 2);
    return score(a) - score(b);
  });
  res.json({ stations });
}));

export default router;
