import { addDays, todayIST } from './dates.js';
import { runsOnRunDate, stopArr, stopDep } from './trainUtils.js';
import { computeLiveStatus, demoNow } from './liveStatus.js';

// There is no free public API for live running status in India, so RailConnect
// keeps its own state: a delay per (train, run) that drifts over time and can be
// overridden by an admin. Swap `ensureDelay` for a real NTES/partner feed in production.
const delayStore = new Map();
const keyOf = (num, runDate) => `${num}|${runDate}`;

function ensureDelay(key) {
  if (!delayStore.has(key)) {
    const r = Math.random();
    const delay = r < 0.45 ? 0 : r < 0.8 ? Math.floor(Math.random() * 15) : 15 + Math.floor(Math.random() * 50);
    delayStore.set(key, { delay, reason: delay ? 'Running late' : 'On time', manual: false, updatedAt: Date.now() });
  }
  return delayStore.get(key);
}

export function stepDelays() {
  for (const v of delayStore.values()) {
    if (v.manual && Date.now() - v.updatedAt < 30 * 60000) continue;
    const r = Math.random();
    let d = v.delay;
    if (r < 0.3) d += Math.floor(Math.random() * 4);
    else if (r < 0.6) d -= Math.floor(Math.random() * 3);
    v.delay = Math.max(0, Math.min(240, d));
    v.reason = v.delay ? 'Running late' : 'On time';
  }
}

export function setManualDelay(trainNumber, runDate, minutes, reason) {
  delayStore.set(keyOf(trainNumber, runDate), {
    delay: minutes,
    reason: reason || (minutes ? 'Delay announced by control room' : 'On time'),
    manual: true,
    updatedAt: Date.now(),
  });
}

// Which run of this train is "current" right now (running > next upcoming > last finished)
export function pickRun(train, nowMs = Date.now()) {
  const today = todayIST(new Date(nowMs));
  const last = train.route.length - 1;
  let running = null;
  let upcoming = null;
  let finished = null;
  for (let off = -4; off <= 2; off++) {
    const rd = addDays(today, off);
    if (!runsOnRunDate(train, rd)) continue;
    const start = stopDep(train, 0, rd).getTime();
    const end = stopArr(train, last, rd).getTime() + 4 * 3600000;
    if (nowMs >= start && nowMs <= end) running = rd; // keep latest-started
    else if (start > nowMs && !upcoming) upcoming = rd;
    else if (end < nowMs) finished = rd;
  }
  return running || upcoming || finished;
}

export function getLiveStatus(train, { mode = 'real', date } = {}, nowMs = Date.now()) {
  if (mode === 'demo') {
    const runDate = todayIST(new Date(nowMs));
    const d = ensureDelay(keyOf(train.number, 'demo'));
    const status = computeLiveStatus(train, runDate, demoNow(train, runDate, nowMs), d.delay);
    return { ...status, mode, delayReason: d.reason, updatedAt: new Date(nowMs) };
  }
  const runDate = date || pickRun(train, nowMs);
  if (!runDate) return null;
  const d = ensureDelay(keyOf(train.number, runDate));
  const status = computeLiveStatus(train, runDate, nowMs, d.delay);
  return { ...status, mode, delayReason: d.reason };
}
