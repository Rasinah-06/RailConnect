import { Inventory } from '../models/Inventory.js';
import { Train } from '../models/Train.js';
import { CLASSES } from '../config/constants.js';
import { env } from '../config/env.js';
import { emitToRoom } from '../socket.js';

const pad = (n) => String(n).padStart(4, '0');

// IRCTC-style availability string: AVAILABLE-0023 / WL 7 / REGRET
export function availabilityFromCounts({ total, confirmed = 0, held = 0, wl = 0, wlCap }) {
  const free = Math.max(0, total - confirmed - held);
  if (free > 0) return { status: 'AVAILABLE', count: free, text: `AVAILABLE-${pad(free)}` };
  if (wl < wlCap) return { status: 'WL', count: wl + 1, text: `WL ${wl + 1}` };
  return { status: 'REGRET', count: 0, text: 'REGRET' };
}

export const classTotal = (train, classType) => {
  const c = train.classes.find((x) => x.type === classType);
  return c ? c.coaches * CLASSES[classType].seatsPerCoach : 0;
};

export async function getInventory(train, runDate, classType) {
  const key = { trainNumber: train.number, runDate, classType };
  const doc = { total: classTotal(train, classType), wlCap: env.wlCap };
  try {
    return await Inventory.findOneAndUpdate(key, { $setOnInsert: doc }, { upsert: true, new: true });
  } catch (e) {
    if (e.code === 11000) return Inventory.findOne(key); // lost the upsert race
    throw e;
  }
}

function classesAvailability(train, runDate, invMap) {
  const out = {};
  for (const c of train.classes) {
    const inv = invMap.get(c.type);
    out[c.type] = availabilityFromCounts(
      inv || { total: classTotal(train, c.type), wlCap: env.wlCap }
    );
  }
  return out;
}

// One DB query for many (train, runDate) pairs. Returns Map("number|runDate" -> {class: availability})
export async function bulkAvailability(pairs) {
  const result = new Map();
  if (!pairs.length) return result;
  const invs = await Inventory.find({
    $or: pairs.map((p) => ({ trainNumber: p.train.number, runDate: p.runDate })),
  }).lean();
  const grouped = new Map();
  for (const inv of invs) {
    const k = `${inv.trainNumber}|${inv.runDate}`;
    if (!grouped.has(k)) grouped.set(k, new Map());
    grouped.get(k).set(inv.classType, inv);
  }
  for (const { train, runDate } of pairs) {
    const k = `${train.number}|${runDate}`;
    result.set(k, classesAvailability(train, runDate, grouped.get(k) || new Map()));
  }
  return result;
}

// Push fresh availability to everyone watching this train run.
export async function broadcastAvailability(trainNumber, runDate) {
  const train = await Train.findOne({ number: trainNumber }).lean();
  if (!train) return;
  const map = await bulkAvailability([{ train, runDate }]);
  emitToRoom(`inv:${trainNumber}:${runDate}`, 'availability:update', {
    trainNumber,
    runDate,
    availability: map.get(`${trainNumber}|${runDate}`),
  });
}
