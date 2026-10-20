import { Router } from 'express';
import { Train } from '../models/Train.js';
import { Station } from '../models/Station.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { getLiveStatus } from '../services/liveService.js';
import { isDateStr } from '../services/dates.js';

const router = Router();

export async function liveWithNames(train, opts) {
  const status = getLiveStatus(train, opts);
  if (!status) return null;
  const names = await Station.find({ code: { $in: train.route.map((s) => s.station) } }).lean();
  const nm = (c) => names.find((s) => s.code === c)?.name || c;
  return { ...status, stops: status.stops.map((s) => ({ ...s, name: nm(s.code) })), currentStationName: status.currentStation && nm(status.currentStation), nextStationName: status.nextStation && nm(status.nextStation) };
}

// GET /api/live/12007?mode=real|demo&date=YYYY-MM-DD
router.get('/:number', asyncHandler(async (req, res) => {
  const train = await Train.findOne({ number: req.params.number }).lean();
  if (!train) throw new HttpError(404, 'Train not found');
  const mode = req.query.mode === 'demo' ? 'demo' : 'real';
  const date = isDateStr(req.query.date) ? req.query.date : undefined;
  const status = await liveWithNames(train, { mode, date });
  if (!status) throw new HttpError(404, 'This train has no scheduled run around today');
  res.json({ status });
}));

export default router;
