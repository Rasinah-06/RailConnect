import { Router } from 'express';
import { Booking } from '../models/Booking.js';
import { Inventory } from '../models/Inventory.js';
import { asyncHandler, HttpError } from '../middleware/error.js';

const router = Router();

// Public PNR status (like the IRCTC / Indian Railways PNR enquiry). Passenger names are not exposed.
router.get('/:pnr', asyncHandler(async (req, res) => {
  if (!/^\d{10}$/.test(req.params.pnr)) throw new HttpError(400, 'PNR must be 10 digits');
  const b = await Booking.findOne({ pnr: req.params.pnr }).lean();
  if (!b) throw new HttpError(404, 'PNR not found');

  // current WL position = how many WL passengers are still ahead of (or at) this one
  const wlAhead = async (seq) => {
    const others = await Booking.find({ inventoryId: b.inventoryId, 'passengers.status': 'WL' }).select('passengers').lean();
    let c = 0;
    for (const o of others) for (const p of o.passengers) if (p.status === 'WL' && p.wlSeq <= seq) c++;
    return c;
  };

  const passengers = [];
  for (const [i, p] of b.passengers.entries()) {
    passengers.push({
      no: i + 1,
      bookingStatus: p.bookingStatus,
      currentStatus: p.status === 'CNF' ? `CNF ${p.coach}/${p.seat}/${p.berth}` : p.status === 'WL' ? `WL ${await wlAhead(p.wlSeq)}` : 'CANCELLED',
    });
  }
  const inv = await Inventory.findById(b.inventoryId).lean();
  res.json({
    pnr: b.pnr,
    train: { number: b.trainNumber, name: b.trainName },
    journeyDate: b.runDate,
    from: b.from, to: b.to, classType: b.classType, quota: b.quota,
    chartPrepared: b.chartPrepared,
    status: b.status,
    passengers,
    totalFare: b.fare.grandTotal,
    waitlistSize: inv?.wl ?? 0,
  });
}));

export default router;
