import { Router } from 'express';
import { z } from 'zod';
import { Train } from '../models/Train.js';
import { Station } from '../models/Station.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { isDateStr, addDays, todayIST } from '../services/dates.js';
import { stopIndex, runDateFor, runsOnRunDate, stopArr, stopDep } from '../services/trainUtils.js';
import { computeFare } from '../services/fare.js';
import { bulkAvailability } from '../services/availability.js';
import { CLASSES } from '../config/constants.js';
import { env } from '../config/env.js';
import { berthOptions } from '../services/seatLayout.js';

const router = Router();

const searchSchema = z.object({
  from: z.string().trim().toUpperCase().min(1),
  to: z.string().trim().toUpperCase().min(1),
  date: z.string().refine(isDateStr, 'Date must be YYYY-MM-DD'),
  quota: z.enum(['GN', 'TQ', 'LD', 'SS']).default('GN'),
  class: z.string().optional(),
});

const fmtDuration = (a, b) => {
  const m = Math.round((b - a) / 60000);
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
};

// GET /api/trains/search?from=MAS&to=SBC&date=2026-10-05&quota=GN
router.get('/search', asyncHandler(async (req, res) => {
  const q = searchSchema.parse(req.query);
  if (q.from === q.to) throw new HttpError(400, 'Choose different origin and destination stations');
  const today = todayIST();
  if (q.date < today) throw new HttpError(400, 'Journey date cannot be in the past');
  if (q.date > addDays(today, env.advanceDays)) throw new HttpError(400, `Booking opens ${env.advanceDays} days before the journey`);

  const trains = await Train.find({ isActive: true, 'route.station': { $all: [q.from, q.to] } }).lean();
  const stations = await Station.find({ code: { $in: [q.from, q.to] } }).lean();
  const nameOf = (c) => stations.find((s) => s.code === c)?.name || c;

  const matches = [];
  for (const t of trains) {
    const fi = stopIndex(t, q.from);
    const ti = stopIndex(t, q.to);
    if (fi < 0 || ti < 0 || fi >= ti) continue;
    const runDate = runDateFor(t, q.date, fi);
    if (!runsOnRunDate(t, runDate)) continue;
    const dep = stopDep(t, fi, runDate);
    if (dep.getTime() < Date.now()) continue; // already left
    matches.push({ t, fi, ti, runDate, dep, arr: stopArr(t, ti, runDate) });
  }

  const avail = await bulkAvailability(matches.map((m) => ({ train: m.t, runDate: m.runDate })));

  const results = matches
    .map(({ t, fi, ti, runDate, dep, arr }) => {
      const distanceKm = t.route[ti].km - t.route[fi].km;
      const classes = t.classes
        .filter((c) => !q.class || c.type === q.class)
        .filter((c) => q.quota !== 'TQ' || CLASSES[c.type].tatkal)
        .map((c) => {
          const fare = computeFare({ classType: c.type, distanceKm, trainType: t.type, fareMultiplier: t.fareMultiplier, quota: q.quota, passengers: [{ age: 30, gender: 'M' }] });
          return { type: c.type, label: CLASSES[c.type].label, fare: fare.perPassenger[0].total, availability: avail.get(`${t.number}|${runDate}`)[c.type] };
        });
      return {
        number: t.number,
        name: t.name,
        type: t.type,
        runDate,
        runsOn: t.runsOn,
        from: { code: q.from, name: nameOf(q.from), dep },
        to: { code: q.to, name: nameOf(q.to), arr },
        duration: fmtDuration(dep, arr),
        distanceKm,
        classes,
      };
    })
    .filter((r) => r.classes.length)
    .sort((a, b) => new Date(a.from.dep) - new Date(b.from.dep));

  res.json({ query: q, count: results.length, trains: results });
}));

// GET /api/trains/availability?train=12007&from=MAS&to=MYS&class=CC&date=2026-10-05
// Seven-day availability strip shown when a class is clicked (like IRCTC).
router.get('/availability', asyncHandler(async (req, res) => {
  const q = z.object({
    train: z.string(), from: z.string().toUpperCase(), to: z.string().toUpperCase(),
    class: z.string(), date: z.string().refine(isDateStr),
  }).parse(req.query);
  const t = await Train.findOne({ number: q.train, isActive: true }).lean();
  if (!t) throw new HttpError(404, 'Train not found');
  const fi = stopIndex(t, q.from);
  const ti = stopIndex(t, q.to);
  if (fi < 0 || ti < 0 || fi >= ti) throw new HttpError(400, 'Invalid stations');

  const pairs = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(q.date, i);
    const runDate = runDateFor(t, date, fi);
    if (!runsOnRunDate(t, runDate) || stopDep(t, fi, runDate).getTime() < Date.now()) continue;
    pairs.push({ train: t, runDate, date });
  }
  const avail = await bulkAvailability(pairs);
  res.json({ days: pairs.map((p) => ({ date: p.date, runDate: p.runDate, availability: avail.get(`${t.number}|${p.runDate}`)[q.class] })) });
}));

// POST /api/trains/fare  - live fare preview while the passenger form is being filled
router.post('/fare', asyncHandler(async (req, res) => {
  const b = z.object({
    trainNumber: z.string(), from: z.string().toUpperCase(), to: z.string().toUpperCase(),
    classType: z.enum(['2S', 'SL', 'CC', '3A', '2A', '1A']), quota: z.enum(['GN', 'TQ', 'LD', 'SS']).default('GN'),
    passengers: z.array(z.object({ age: z.coerce.number().int().min(1).max(125).default(30), gender: z.enum(['M', 'F', 'T']).default('M') })).min(1).max(6),
  }).parse(req.body);
  const t = await Train.findOne({ number: b.trainNumber, isActive: true }).lean();
  if (!t) throw new HttpError(404, 'Train not found');
  const fi = stopIndex(t, b.from);
  const ti = stopIndex(t, b.to);
  if (fi < 0 || ti < 0 || fi >= ti) throw new HttpError(400, 'Invalid stations');
  res.json({ fare: computeFare({ classType: b.classType, distanceKm: t.route[ti].km - t.route[fi].km, trainType: t.type, fareMultiplier: t.fareMultiplier, quota: b.quota, passengers: b.passengers }) });
}));

// GET /api/trains/suggest?q=1200   (train number / name autocomplete for live status)
router.get('/suggest', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ trains: [] });
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const trains = await Train.find({ isActive: true, $or: [{ number: rx }, { name: rx }] }).select('number name type route').limit(8).lean();
  res.json({ trains: trains.map((t) => ({ number: t.number, name: t.name, type: t.type, origin: t.route[0].station, destination: t.route[t.route.length - 1].station })) });
}));

// GET /api/trains/:number  (schedule)
router.get('/:number', asyncHandler(async (req, res) => {
  const t = await Train.findOne({ number: req.params.number }).lean();
  if (!t) throw new HttpError(404, 'Train not found');
  const stations = await Station.find({ code: { $in: t.route.map((s) => s.station) } }).lean();
  res.json({
    train: {
      ...t,
      classes: t.classes.map((c) => ({ ...c, label: CLASSES[c.type].label, berthOptions: berthOptions(c.type) })),
      route: t.route.map((s) => ({ ...s, name: stations.find((x) => x.code === s.station)?.name || s.station })),
    },
  });
}));

export default router;
