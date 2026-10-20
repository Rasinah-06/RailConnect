import { Router } from 'express';
import { z } from 'zod';
import { Train } from '../models/Train.js';
import { Station } from '../models/Station.js';
import { Booking } from '../models/Booking.js';
import { User } from '../models/User.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { pickRun, setManualDelay } from '../services/liveService.js';
import { notify } from '../services/notify.js';
import { getIO } from '../socket.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/stats', asyncHandler(async (req, res) => {
  const [users, trains, stations, bookings, revenue, byStatus] = await Promise.all([
    User.countDocuments(), Train.countDocuments({ isActive: true }), Station.countDocuments(), Booking.countDocuments(),
    Booking.aggregate([{ $group: { _id: null, gross: { $sum: '$fare.grandTotal' }, refunds: { $sum: '$refundTotal' } } }]),
    Booking.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  res.json({
    users, trains, stations, bookings,
    grossRevenue: revenue[0]?.gross || 0,
    refunds: revenue[0]?.refunds || 0,
    byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.n])),
  });
}));

router.get('/trains', asyncHandler(async (req, res) => {
  res.json({ trains: await Train.find().sort({ number: 1 }).lean() });
}));

const trainSchema = z.object({
  number: z.string().regex(/^\d{5}$/, 'Train number must be 5 digits'),
  name: z.string().min(3),
  type: z.enum(['EXP', 'SF', 'MAIL', 'RAJ', 'SHATABDI', 'INTERCITY']).default('EXP'),
  runsOn: z.array(z.number().int().min(0).max(6)).min(1),
  fareMultiplier: z.number().positive().default(1),
  classes: z.array(z.object({ type: z.enum(['2S', 'SL', 'CC', '3A', '2A', '1A']), coaches: z.number().int().min(1).max(30) })).min(1),
  route: z.array(z.object({
    station: z.string().toUpperCase(), arr: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    dep: z.string().regex(/^\d{2}:\d{2}$/).nullable(), day: z.number().int().min(1), km: z.number().min(0),
  })).min(2),
});

router.post('/trains', asyncHandler(async (req, res) => {
  const body = trainSchema.parse(req.body);
  const codes = await Station.find({ code: { $in: body.route.map((s) => s.station) } }).distinct('code');
  const missing = body.route.filter((s) => !codes.includes(s.station)).map((s) => s.station);
  if (missing.length) throw new HttpError(400, `Unknown station code(s): ${missing.join(', ')}`);
  res.status(201).json({ train: await Train.create(body) });
}));

router.patch('/trains/:number', asyncHandler(async (req, res) => {
  const patch = trainSchema.partial().extend({ isActive: z.boolean().optional() }).parse(req.body);
  const train = await Train.findOneAndUpdate({ number: req.params.number }, patch, { new: true });
  if (!train) throw new HttpError(404, 'Train not found');
  res.json({ train });
}));

router.post('/stations', asyncHandler(async (req, res) => {
  const s = z.object({ code: z.string().min(2).max(6).toUpperCase(), name: z.string().min(2), city: z.string().optional(), state: z.string().optional() }).parse(req.body);
  res.status(201).json({ station: await Station.create(s) });
}));

// Announce a delay: updates the live board for everyone watching and notifies booked passengers.
router.post('/trains/:number/delay', asyncHandler(async (req, res) => {
  const { minutes, reason } = z.object({ minutes: z.coerce.number().int().min(0).max(720), reason: z.string().max(120).optional() }).parse(req.body);
  const train = await Train.findOne({ number: req.params.number }).lean();
  if (!train) throw new HttpError(404, 'Train not found');
  const runDate = pickRun(train);
  if (!runDate) throw new HttpError(400, 'No active run for this train');
  setManualDelay(train.number, runDate, minutes, reason);

  const userIds = await Booking.distinct('user', { trainNumber: train.number, runDate, status: { $ne: 'CANCELLED' } });
  const text = minutes
    ? `${train.name} (${train.number}) is running ${minutes} min late.${reason ? ` Reason: ${reason}.` : ''}`
    : `${train.name} (${train.number}) is now running on time.`;
  await Promise.all(userIds.map((u) => notify(u, { type: 'DELAY', title: minutes ? 'Train delayed' : 'Train on time', body: text })));
  getIO()?.emit('delay:announced', { trainNumber: train.number, minutes, reason });
  res.json({ ok: true, runDate, notified: userIds.length });
}));

router.get('/bookings', asyncHandler(async (req, res) => {
  const bookings = await Booking.find().sort({ createdAt: -1 }).limit(50).populate('user', 'name email').lean();
  res.json({ bookings });
}));

export default router;
