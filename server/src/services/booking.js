import mongoose from 'mongoose';
import crypto from 'crypto';
import { Train } from '../models/Train.js';
import { Station } from '../models/Station.js';
import { Inventory } from '../models/Inventory.js';
import { Hold } from '../models/Hold.js';
import { Booking } from '../models/Booking.js';
import { SeatAssignment } from '../models/SeatAssignment.js';
import { HttpError } from '../middleware/error.js';
import { env } from '../config/env.js';
import { CLASSES, CHART_HOURS } from '../config/constants.js';
import { addDays, todayIST, istHour } from './dates.js';
import { stopIndex, runDateFor, runsOnRunDate, stopArr, stopDep } from './trainUtils.js';
import { computeFare, isSenior } from './fare.js';
import { refundFor } from './refund.js';
import { getInventory, broadcastAvailability } from './availability.js';
import { assignSeats } from './seats.js';
import { notify } from './notify.js';

const ObjectId = mongoose.Types.ObjectId;
const hasRoom = (n) => ({ $lte: [{ $add: ['$confirmed', '$held', n] }, '$total'] });

/* ---------------------------------------------------------------- hold */

export async function createHold({ user, input }) {
  const { trainNumber, from, to, date, classType, quota, passengers, contact } = input;

  const train = await Train.findOne({ number: trainNumber, isActive: true }).lean();
  if (!train) throw new HttpError(404, 'Train not found');
  const fi = stopIndex(train, from);
  const ti = stopIndex(train, to);
  if (fi < 0 || ti < 0 || fi >= ti) throw new HttpError(400, 'This train does not run between the selected stations');
  if (!train.classes.some((c) => c.type === classType)) throw new HttpError(400, `Class ${classType} is not available on this train`);

  const runDate = runDateFor(train, date, fi);
  if (!runsOnRunDate(train, runDate)) throw new HttpError(400, 'This train does not run on the selected date');

  const today = todayIST();
  if (date > addDays(today, env.advanceDays)) throw new HttpError(400, `Booking opens ${env.advanceDays} days before the journey`);
  const depAt = stopDep(train, fi, runDate);
  if (depAt.getTime() - Date.now() < 30 * 60000) throw new HttpError(400, 'Booking for this train has closed');

  // ---- quota rules
  if (quota === 'TQ') {
    if (!CLASSES[classType].tatkal) throw new HttpError(400, 'Tatkal is not available for this class');
    if (env.enforceTatkalWindow) {
      if (date !== addDays(today, 1)) throw new HttpError(400, 'Tatkal opens one day before the journey');
      const openHour = CLASSES[classType].ac ? 10 : 11;
      if (istHour() < openHour) throw new HttpError(400, `Tatkal for ${classType} opens at ${openHour}:00 AM IST`);
    }
  }
  if (quota === 'LD' && !passengers.some((p) => p.gender === 'F')) throw new HttpError(400, 'Ladies quota needs at least one woman passenger');
  if (quota === 'SS' && !passengers.some(isSenior)) throw new HttpError(400, 'Senior citizen quota needs a passenger aged 60+ (58+ for women)');

  const activeHolds = await Hold.countDocuments({ user: user._id, status: 'active', expiresAt: { $gt: new Date() } });
  if (activeHolds >= 3) throw new HttpError(429, 'You already have 3 bookings waiting for payment. Complete or cancel one first');

  const distanceKm = train.route[ti].km - train.route[fi].km;
  const fare = computeFare({ classType, distanceKm, trainType: train.type, fareMultiplier: train.fareMultiplier, quota, passengers });

  // ---- atomic seat lock
  const n = passengers.length;
  const inv = await getInventory(train, runDate, classType);
  const locked = await Inventory.findOneAndUpdate({ _id: inv._id, $expr: hasRoom(n) }, { $inc: { held: n } }, { new: true });
  let kind = 'CNF';
  if (!locked) {
    const fresh = await Inventory.findById(inv._id);
    if (fresh.wl + n > fresh.wlCap) throw new HttpError(409, 'Regret: no seats left and the waiting list is full', 'REGRET');
    kind = 'WL';
  }

  const stations = await Station.find({ code: { $in: [from, to] } }).lean();
  const nameOf = (c) => stations.find((s) => s.code === c)?.name || c;

  const data = {
    train: { number: train.number, name: train.name, type: train.type },
    from: { code: from, name: nameOf(from), dep: depAt },
    to: { code: to, name: nameOf(to), arr: stopArr(train, ti, runDate) },
    boardingDate: date,
    distanceKm,
    quota,
    passengers,
    contact,
    fare,
  };

  try {
    const hold = await Hold.create({
      user: user._id,
      inventory: inv._id,
      trainNumber,
      runDate,
      classType,
      kind,
      count: n,
      expiresAt: new Date(Date.now() + env.holdMinutes * 60000),
      data,
    });
    if (kind === 'CNF') broadcastAvailability(trainNumber, runDate).catch(() => {});
    return hold;
  } catch (e) {
    if (kind === 'CNF') await Inventory.updateOne({ _id: inv._id }, { $inc: { held: -n } });
    throw e;
  }
}

export async function releaseHold(hold, newStatus = 'released') {
  const h = await Hold.findOneAndUpdate({ _id: hold._id, status: 'active' }, { status: newStatus });
  if (h && h.kind === 'CNF') {
    await Inventory.updateOne({ _id: h.inventory }, { $inc: { held: -h.count } });
    broadcastAvailability(h.trainNumber, h.runDate).catch(() => {});
  }
  return !!h;
}

export async function sweepExpiredHolds() {
  const stale = await Hold.find({ status: 'active', expiresAt: { $lte: new Date() } }).limit(200);
  let released = 0;
  for (const h of stale) if (await releaseHold(h, 'expired')) released++;
  return released;
}

/* ------------------------------------------------------------- payment */

// Simulated payment gateway. Replace with Razorpay/Stripe test mode for a real gateway.
async function mockPayment({ amount, method, simulateFailure }) {
  await new Promise((r) => setTimeout(r, 600));
  if (simulateFailure) return { ok: false, message: 'Payment failed at the bank. No money was deducted' };
  return { ok: true, txnId: `TXN${Date.now()}${crypto.randomInt(1000, 9999)}`, method, amount };
}

async function newPnr() {
  for (let i = 0; i < 8; i++) {
    const pnr = String(crypto.randomInt(1_000_000_000, 10_000_000_000));
    if (!(await Booking.exists({ pnr }))) return pnr;
  }
  throw new Error('Could not generate PNR');
}

/* ------------------------------------------------------------- confirm */

export async function confirmHold({ user, holdId, payment }) {
  const hold = await Hold.findOne({ _id: holdId, user: user._id });
  if (!hold) throw new HttpError(404, 'Booking session not found');
  if (hold.status !== 'active') throw new HttpError(410, `This booking session is ${hold.status}. Please search again`);
  if (hold.expiresAt <= new Date()) {
    await releaseHold(hold, 'expired');
    throw new HttpError(410, 'Your session timed out and the seats were released. Please search again');
  }

  const d = hold.data;
  const pay = await mockPayment({ amount: d.fare.grandTotal, method: payment.method, simulateFailure: payment.simulateFailure });
  if (!pay.ok) throw new HttpError(402, pay.message, 'PAYMENT_FAILED');

  const consumed = await Hold.findOneAndUpdate(
    { _id: hold._id, status: 'active', expiresAt: { $gt: new Date() } },
    { status: 'consumed' }
  );
  if (!consumed) throw new HttpError(410, 'Your session timed out while paying. The amount will be refunded to your account');

  const n = hold.count;
  let inv;
  let kind = hold.kind;
  if (kind === 'CNF') {
    inv = await Inventory.findOneAndUpdate({ _id: hold.inventory }, { $inc: { held: -n, confirmed: n } }, { new: true });
  } else {
    // seats may have been freed while the user was filling the form
    inv = await Inventory.findOneAndUpdate({ _id: hold.inventory, $expr: hasRoom(n) }, { $inc: { confirmed: n } }, { new: true });
    if (inv) kind = 'CNF';
    else {
      inv = await Inventory.findOneAndUpdate(
        { _id: hold.inventory, $expr: { $lte: [{ $add: ['$wl', n] }, '$wlCap'] } },
        { $inc: { wl: n, wlSeq: n } },
        { new: true }
      );
      if (!inv) throw new HttpError(409, 'Waiting list filled up just now. The amount will be refunded to your account', 'REGRET');
    }
  }

  const bookingId = new ObjectId();
  const passengers = d.passengers.map((p) => ({ ...p, _id: new ObjectId() }));
  const fares = d.fare.perPassenger;

  try {
    if (kind === 'CNF') {
      const seats = await assignSeats(inv, bookingId, passengers, hold.classType);
      passengers.forEach((p, i) => {
        const s = seats.find((x) => x.passengerId === String(p._id));
        Object.assign(p, { status: 'CNF', bookingStatus: 'CNF', seatIndex: s.seatIndex, coach: s.coach, seat: s.seat, berth: s.berth, fare: fares[i] });
      });
    } else {
      passengers.forEach((p, i) => {
        const pos = inv.wl - n + 1 + i;
        Object.assign(p, { status: 'WL', wlSeq: inv.wlSeq - n + 1 + i, bookingStatus: `WL ${pos}`, fare: fares[i] });
      });
    }
  } catch (e) {
    await Inventory.updateOne({ _id: hold.inventory }, { $inc: kind === 'CNF' ? { confirmed: -n } : { wl: -n } });
    throw e;
  }

  let booking;
  for (let attempt = 0; attempt < 3 && !booking; attempt++) {
    try {
      booking = await Booking.create({
        _id: bookingId,
        pnr: await newPnr(),
        user: user._id,
        inventoryId: hold.inventory,
        trainNumber: d.train.number,
        trainName: d.train.name,
        runDate: hold.runDate,
        classType: hold.classType,
        quota: d.quota,
        from: { ...d.from, dep: new Date(d.from.dep) },
        to: { ...d.to, arr: new Date(d.to.arr) },
        distanceKm: d.distanceKm,
        departureAt: new Date(d.from.dep),
        contact: d.contact,
        passengers,
        status: kind === 'CNF' ? 'CONFIRMED' : 'WAITLISTED',
        fare: { passengersTotal: d.fare.passengersTotal, convenienceFee: d.fare.convenienceFee, grandTotal: d.fare.grandTotal },
        payment: { txnId: pay.txnId, method: pay.method, amount: pay.amount, status: 'SUCCESS', paidAt: new Date() },
      });
    } catch (e) {
      if (e.code !== 11000 || attempt === 2) throw e;
    }
  }

  const when = booking.from.dep.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  await notify(user._id, kind === 'CNF'
    ? { type: 'BOOKING_CONFIRMED', title: 'Ticket confirmed', body: `PNR ${booking.pnr}: ${booking.trainName} (${booking.trainNumber}), ${booking.from.code} to ${booking.to.code}, departs ${when}.`, pnr: booking.pnr }
    : { type: 'BOOKING_WAITLISTED', title: 'Ticket waitlisted', body: `PNR ${booking.pnr}: ${booking.trainName} is waitlisted (${passengers[0].bookingStatus}). We will confirm automatically if seats free up.`, pnr: booking.pnr });

  broadcastAvailability(hold.trainNumber, hold.runDate).catch(() => {});
  return booking;
}

/* -------------------------------------------------------- cancellation */

export function previewRefund(booking, passengerIds = []) {
  const hoursToDeparture = (booking.departureAt.getTime() - Date.now()) / 3600000;
  const targets = booking.passengers.filter(
    (p) => p.status !== 'CAN' && (!passengerIds.length || passengerIds.includes(String(p._id)))
  );
  const items = targets.map((p) => ({
    passengerId: String(p._id),
    name: p.name,
    status: p.status,
    fare: p.fare.total,
    ...refundFor({ status: p.status, classType: booking.classType, quota: booking.quota, fareTotal: p.fare.total, hoursToDeparture }),
  }));
  return { hoursToDeparture: Math.round(hoursToDeparture * 10) / 10, items, totalRefund: items.reduce((s, i) => s + i.refund, 0) };
}

export async function cancelPassengers({ user, pnr, passengerIds = [], isAdmin = false }) {
  const booking = await Booking.findOne({ pnr });
  if (!booking || (!isAdmin && !booking.user.equals(user._id))) throw new HttpError(404, 'Ticket not found');
  const hours = (booking.departureAt.getTime() - Date.now()) / 3600000;
  if (hours < CHART_HOURS) {
    throw new HttpError(400, 'Online cancellation closes 4 hours before departure (chart preparation). Please file a TDR on the official portal');
  }

  const targets = booking.passengers.filter((p) => p.status !== 'CAN' && (!passengerIds.length || passengerIds.includes(String(p._id))));
  if (!targets.length) throw new HttpError(400, 'No active passengers selected for cancellation');

  let refundSum = 0;
  let freedSeats = 0;
  for (const p of targets) {
    const r = refundFor({ status: p.status, classType: booking.classType, quota: booking.quota, fareTotal: p.fare.total, hoursToDeparture: hours });
    if (p.status === 'CNF') {
      await SeatAssignment.deleteOne({ passenger: p._id });
      await Inventory.updateOne({ _id: booking.inventoryId }, { $inc: { confirmed: -1 } });
      freedSeats++;
    } else {
      await Inventory.updateOne({ _id: booking.inventoryId }, { $inc: { wl: -1 } });
    }
    p.status = 'CAN';
    p.refund = r.refund;
    p.cancelledAt = new Date();
    refundSum += r.refund;
  }
  booking.refundTotal += refundSum;
  booking.recomputeStatus();
  await booking.save();

  await notify(booking.user, {
    type: 'CANCELLED',
    title: 'Ticket cancelled',
    body: `PNR ${pnr}: ${targets.length} passenger(s) cancelled. Refund of Rs.${refundSum} will reach your original payment method in 5-7 working days.`,
    pnr,
  });

  if (freedSeats) await promoteWaitlist(booking.inventoryId);
  broadcastAvailability(booking.trainNumber, booking.runDate).catch(() => {});
  return { booking, refund: refundSum };
}

/* ------------------------------------------------- waiting-list promotion */

export async function promoteWaitlist(inventoryId) {
  for (let guard = 0; guard < 60; guard++) {
    const inv = await Inventory.findById(inventoryId);
    if (!inv || inv.wl <= 0 || inv.total - inv.confirmed - inv.held <= 0) return;

    const bookings = await Booking.find({ inventoryId, 'passengers.status': 'WL' });
    let next = null;
    for (const b of bookings) {
      for (const p of b.passengers) {
        if (p.status === 'WL' && (!next || p.wlSeq < next.p.wlSeq)) next = { b, p };
      }
    }
    if (!next) return;

    const updated = await Inventory.findOneAndUpdate(
      { _id: inventoryId, $expr: hasRoom(1) },
      { $inc: { confirmed: 1, wl: -1 } },
      { new: true }
    );
    if (!updated) return;

    const [seat] = await assignSeats(updated, next.b._id, [{ _id: next.p._id, berthPref: next.p.berthPref }], next.b.classType);
    const res = await Booking.updateOne(
      { _id: next.b._id, passengers: { $elemMatch: { _id: next.p._id, status: 'WL' } } },
      { $set: { 'passengers.$.status': 'CNF', 'passengers.$.seatIndex': seat.seatIndex, 'passengers.$.coach': seat.coach, 'passengers.$.seat': seat.seat, 'passengers.$.berth': seat.berth } }
    );
    if (!res.modifiedCount) {
      // passenger cancelled concurrently - undo and try the next one
      await SeatAssignment.deleteOne({ passenger: next.p._id });
      await Inventory.updateOne({ _id: inventoryId }, { $inc: { confirmed: -1, wl: 1 } });
      continue;
    }
    const fresh = await Booking.findById(next.b._id);
    fresh.recomputeStatus();
    await fresh.save();
    await notify(fresh.user, {
      type: 'WL_PROMOTED',
      title: 'Waitlist cleared',
      body: `PNR ${fresh.pnr}: ${next.p.name} is now confirmed in ${seat.coach}, seat ${seat.seat} (${seat.berth}).`,
      pnr: fresh.pnr,
    });
  }
}

/* ----------------------------------------------------------- chart job */

// ~4 hours before departure the chart is prepared: unconfirmed waitlist
// passengers are auto-cancelled with a full fare refund, others are told it's final.
export async function runChartJob() {
  const cutoff = new Date(Date.now() + CHART_HOURS * 3600000);
  const floor = new Date(Date.now() - 12 * 3600000);
  const due = await Booking.find({ chartPrepared: false, status: { $ne: 'CANCELLED' }, departureAt: { $lte: cutoff, $gte: floor } }).limit(200);
  for (const b of due) {
    let refund = 0;
    let autoCancelled = 0;
    for (const p of b.passengers) {
      if (p.status === 'WL') {
        await Inventory.updateOne({ _id: b.inventoryId }, { $inc: { wl: -1 } });
        p.status = 'CAN';
        p.refund = p.fare.total;
        p.cancelledAt = new Date();
        refund += p.fare.total;
        autoCancelled++;
      }
    }
    b.refundTotal += refund;
    b.chartPrepared = true;
    b.recomputeStatus();
    await b.save();
    if (autoCancelled) {
      await notify(b.user, { type: 'WL_AUTO_CANCELLED', title: 'Waitlisted ticket cancelled', body: `PNR ${b.pnr}: chart is prepared and ${autoCancelled} waitlisted passenger(s) did not get a berth. Rs.${refund} will be refunded.`, pnr: b.pnr });
      broadcastAvailability(b.trainNumber, b.runDate).catch(() => {});
    }
    if (b.status !== 'CANCELLED') {
      await notify(b.user, { type: 'CHART_PREPARED', title: 'Chart prepared', body: `PNR ${b.pnr}: the reservation chart for ${b.trainName} is ready. Have a safe journey!`, pnr: b.pnr });
    }
  }
  return due.length;
}
