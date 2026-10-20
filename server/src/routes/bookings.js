import { Router } from 'express';
import { z } from 'zod';
import { Booking } from '../models/Booking.js';
import { Hold } from '../models/Hold.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { isDateStr } from '../services/dates.js';
import { MAX_PASSENGERS } from '../config/constants.js';
import { createHold, releaseHold, confirmHold, cancelPassengers, previewRefund } from '../services/booking.js';

const router = Router();
router.use(requireAuth);

const holdSchema = z.object({
  trainNumber: z.string(),
  from: z.string().toUpperCase(),
  to: z.string().toUpperCase(),
  date: z.string().refine(isDateStr, 'Invalid date'),
  classType: z.enum(['2S', 'SL', 'CC', '3A', '2A', '1A']),
  quota: z.enum(['GN', 'TQ', 'LD', 'SS']).default('GN'),
  passengers: z.array(z.object({
    name: z.string().trim().min(2, 'Enter passenger name').max(60).regex(/^[A-Za-z .'-]+$/, 'Name can only have letters'),
    age: z.coerce.number().int().min(5, 'Children under 5 travel free without a berth').max(125),
    gender: z.enum(['M', 'F', 'T']),
    berthPref: z.string().default('NP'),
  })).min(1, 'Add at least one passenger').max(MAX_PASSENGERS, `Maximum ${MAX_PASSENGERS} passengers per ticket`),
  contact: z.object({
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a 10-digit mobile number'),
    email: z.string().email().optional().or(z.literal('')),
  }),
});

const holdView = (h) => ({
  id: h._id, status: h.status, kind: h.kind, expiresAt: h.expiresAt, classType: h.classType, runDate: h.runDate,
  ...h.data,
});

router.post('/hold', asyncHandler(async (req, res) => {
  const hold = await createHold({ user: req.user, input: holdSchema.parse(req.body) });
  res.status(201).json({ hold: holdView(hold) });
}));

router.get('/hold/:id', asyncHandler(async (req, res) => {
  const hold = await Hold.findOne({ _id: req.params.id, user: req.user._id });
  if (!hold) throw new HttpError(404, 'Booking session not found');
  res.json({ hold: holdView(hold) });
}));

router.delete('/hold/:id', asyncHandler(async (req, res) => {
  const hold = await Hold.findOne({ _id: req.params.id, user: req.user._id });
  if (!hold) throw new HttpError(404, 'Booking session not found');
  await releaseHold(hold, 'released');
  res.json({ ok: true });
}));

router.post('/confirm', asyncHandler(async (req, res) => {
  const body = z.object({
    holdId: z.string(),
    payment: z.object({ method: z.enum(['UPI', 'CARD', 'NETBANKING', 'WALLET']), simulateFailure: z.boolean().optional() }),
  }).parse(req.body);
  const booking = await confirmHold({ user: req.user, holdId: body.holdId, payment: body.payment });
  res.status(201).json({ booking });
}));

router.get('/mine', asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id }).sort({ departureAt: -1 }).limit(100).lean();
  res.json({ bookings });
}));

router.get('/:pnr', asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' ? { pnr: req.params.pnr } : { pnr: req.params.pnr, user: req.user._id };
  const booking = await Booking.findOne(filter).lean();
  if (!booking) throw new HttpError(404, 'Ticket not found');
  res.json({ booking });
}));

router.post('/:pnr/refund-preview', asyncHandler(async (req, res) => {
  const { passengerIds = [] } = z.object({ passengerIds: z.array(z.string()).optional() }).parse(req.body);
  const booking = await Booking.findOne({ pnr: req.params.pnr, user: req.user._id });
  if (!booking) throw new HttpError(404, 'Ticket not found');
  res.json(previewRefund(booking, passengerIds));
}));

router.post('/:pnr/cancel', asyncHandler(async (req, res) => {
  const { passengerIds = [] } = z.object({ passengerIds: z.array(z.string()).optional() }).parse(req.body);
  const { booking, refund } = await cancelPassengers({ user: req.user, pnr: req.params.pnr, passengerIds, isAdmin: req.user.role === 'admin' });
  res.json({ booking, refund });
}));

export default router;
