import test from 'node:test';
import assert from 'node:assert/strict';
import { computeFare, passengerFare } from '../services/fare.js';
import { refundFor } from '../services/refund.js';
import { computeLiveStatus } from '../services/liveStatus.js';
import { availabilityFromCounts } from '../services/availability.js';
import { seatInfo } from '../services/seatLayout.js';
import { buildTrains } from '../seed/data.js';
import { stopArr, stopDep, runDateFor } from '../services/trainUtils.js';
import { addDays, weekday } from '../services/dates.js';

const trains = buildTrains();
const train = (n) => trains.find((t) => t.number === n);

test('fare: AC class has 5% GST, sleeper has none', () => {
  const sl = passengerFare({ classType: 'SL', distanceKm: 500, trainType: 'EXP', quota: 'GN', passenger: { age: 30, gender: 'M' } });
  const ac = passengerFare({ classType: '3A', distanceKm: 500, trainType: 'EXP', quota: 'GN', passenger: { age: 30, gender: 'M' } });
  assert.equal(sl.gst, 0);
  assert.equal(ac.gst, Math.round((ac.base + ac.reservation + ac.superfast) * 0.05));
});

test('fare: senior citizens get 40% (men) / 50% (women) off base fare', () => {
  const adult = passengerFare({ classType: 'SL', distanceKm: 800, trainType: 'EXP', quota: 'GN', passenger: { age: 30, gender: 'M' } });
  const man = passengerFare({ classType: 'SL', distanceKm: 800, trainType: 'EXP', quota: 'GN', passenger: { age: 61, gender: 'M' } });
  const woman = passengerFare({ classType: 'SL', distanceKm: 800, trainType: 'EXP', quota: 'GN', passenger: { age: 58, gender: 'F' } });
  assert.equal(man.base, Math.round(adult.base * 0.6));
  assert.equal(woman.base, Math.round(adult.base * 0.5));
});

test('fare: tatkal charge is clamped between min and max', () => {
  const f = passengerFare({ classType: 'SL', distanceKm: 100, trainType: 'EXP', quota: 'TQ', passenger: { age: 30, gender: 'M' } });
  assert.ok(f.tatkal >= 100 && f.tatkal <= 200);
  assert.equal(passengerFare({ classType: 'SL', distanceKm: 100, trainType: 'EXP', quota: 'GN', passenger: { age: 30, gender: 'M' } }).tatkal, 0);
});

test('fare: ticket total = passengers + convenience fee', () => {
  const f = computeFare({ classType: '3A', distanceKm: 1000, trainType: 'SF', quota: 'GN', passengers: [{ age: 30, gender: 'M' }, { age: 28, gender: 'F' }] });
  assert.equal(f.passengersTotal, f.perPassenger[0].total + f.perPassenger[1].total);
  assert.equal(f.convenienceFee, 35.4);
});

test('refund: tiers by hours before departure', () => {
  const base = { status: 'CNF', classType: 'SL', quota: 'GN', fareTotal: 1000 };
  assert.equal(refundFor({ ...base, hoursToDeparture: 72 }).refund, 880); // flat 120
  assert.equal(refundFor({ ...base, hoursToDeparture: 24 }).refund, 750); // 25%
  assert.equal(refundFor({ ...base, hoursToDeparture: 8 }).refund, 500); // 50%
  assert.equal(refundFor({ ...base, hoursToDeparture: 2 }).refund, 0);
  assert.equal(refundFor({ ...base, quota: 'TQ', hoursToDeparture: 72 }).refund, 0);
  assert.equal(refundFor({ ...base, status: 'WL', hoursToDeparture: 72 }).refund, 940); // Rs.60 clerkage
});

test('availability text follows IRCTC style', () => {
  assert.equal(availabilityFromCounts({ total: 72, confirmed: 10, held: 2, wlCap: 25 }).text, 'AVAILABLE-0060');
  assert.equal(availabilityFromCounts({ total: 72, confirmed: 72, wl: 4, wlCap: 25 }).text, 'WL 5');
  assert.equal(availabilityFromCounts({ total: 72, confirmed: 70, held: 2, wl: 25, wlCap: 25 }).text, 'REGRET');
});

test('seat layout maps seat numbers to coach / berth', () => {
  assert.deepEqual(seatInfo('SL', 1), { coach: 'S1', seat: 1, berth: 'LB' });
  assert.deepEqual(seatInfo('SL', 73), { coach: 'S2', seat: 1, berth: 'LB' });
  assert.equal(seatInfo('SL', 7).berth, 'SL');
  assert.equal(seatInfo('3A', 8).berth, 'SU');
});

test('seed: every train has increasing km and non-decreasing times', () => {
  const run = '2026-10-05';
  for (const t of trains) {
    let prev = -1;
    t.route.forEach((s, i) => {
      assert.ok(s.km > prev || i === 0, `${t.number} km order`);
      prev = s.km;
      assert.ok(stopDep(t, i, run) >= stopArr(t, i, run), `${t.number} halt at ${s.station}`);
      if (i > 0) assert.ok(stopArr(t, i, run) > stopDep(t, i - 1, run), `${t.number} leg ${i}`);
    });
  }
});

test('boarding date maps back to the origin run date for overnight trains', () => {
  const t = train('12621'); // leaves MAS 22:00, reaches NDLS on day 3
  const ndlsIdx = t.route.findIndex((s) => s.station === 'NDLS');
  assert.equal(runDateFor(t, '2026-10-07', ndlsIdx), '2026-10-05');
  assert.equal(weekday('2026-10-05'), 1);
});

test('live status: before start, in transit, at station, arrived', () => {
  const t = train('12635'); // MS 12:25 -> TPJ 17:35/17:37 -> MDU 20:35
  const run = '2026-10-05';
  const at = (hhmm) => new Date(`${run}T${hhmm}:00+05:30`).getTime();

  assert.equal(computeLiveStatus(t, run, at('10:00')).status, 'YET_TO_START');
  const mid = computeLiveStatus(t, run, at('15:00'));
  assert.equal(mid.status, 'RUNNING');
  assert.equal(mid.currentStation, 'MS');
  assert.equal(mid.nextStation, 'TPJ');
  assert.ok(mid.kmCovered > 100 && mid.kmCovered < 336);
  assert.equal(computeLiveStatus(t, run, at('17:36')).status, 'AT_STATION');
  assert.equal(computeLiveStatus(t, run, at('21:00')).status, 'ARRIVED');
});

test('live status: delay shifts the whole timeline', () => {
  const t = train('12635');
  const run = '2026-10-05';
  const now = new Date(`${run}T20:40:00+05:30`).getTime();
  assert.equal(computeLiveStatus(t, run, now, 0).status, 'ARRIVED');
  assert.equal(computeLiveStatus(t, run, now, 30).status, 'RUNNING');
});

test('dates helper', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});
