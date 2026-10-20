import { Train } from './models/Train.js';
import { getIO } from './socket.js';
import { stepDelays } from './services/liveService.js';
import { liveWithNames } from './routes/live.js';
import { broadcastAvailability } from './services/availability.js';
import { sweepExpiredHolds, runChartJob } from './services/booking.js';

const trainCache = new Map(); // number -> {train, at}
async function cachedTrain(number) {
  const hit = trainCache.get(number);
  if (hit && Date.now() - hit.at < 60000) return hit.train;
  const train = await Train.findOne({ number }).lean();
  trainCache.set(number, { train, at: Date.now() });
  return train;
}

export function registerRealtime() {
  const io = getIO();

  io.on('connection', (socket) => {
    if (socket.data.userId) socket.join(`user:${socket.data.userId}`);

    // --- live seat availability for a train run
    socket.on('availability:subscribe', ({ trainNumber, runDate } = {}) => {
      if (!trainNumber || !runDate) return;
      socket.join(`inv:${trainNumber}:${runDate}`);
      broadcastAvailability(trainNumber, runDate).catch(() => {});
    });
    socket.on('availability:unsubscribe', ({ trainNumber, runDate } = {}) => {
      socket.leave(`inv:${trainNumber}:${runDate}`);
    });

    // --- live train running status
    socket.on('live:subscribe', async ({ trainNumber, mode = 'real' } = {}) => {
      if (!trainNumber) return;
      const m = mode === 'demo' ? 'demo' : 'real';
      for (const r of socket.rooms) if (r.startsWith('live:')) socket.leave(r); // one train at a time
      socket.join(`live:${trainNumber}:${m}`);
      const train = await cachedTrain(trainNumber);
      if (train) socket.emit('live:update', await liveWithNames(train, { mode: m }));
    });
    socket.on('live:unsubscribe', () => {
      for (const r of socket.rooms) if (r.startsWith('live:')) socket.leave(r);
    });
  });

  // Push running status to every room that has at least one watcher.
  setInterval(async () => {
    for (const [room, members] of io.sockets.adapter.rooms) {
      if (!room.startsWith('live:') || !members.size) continue;
      const [, number, mode] = room.split(':');
      try {
        const train = await cachedTrain(number);
        if (train) io.to(room).emit('live:update', await liveWithNames(train, { mode }));
      } catch (e) {
        console.error('[live] tick failed', e.message);
      }
    }
  }, 3000);

  setInterval(stepDelays, 20000);
}

// Background jobs: release expired seat locks, prepare charts (auto-cancel unconfirmed WL).
export function startJobs() {
  const safe = (name, fn) => async () => {
    try { await fn(); } catch (e) { console.error(`[job:${name}]`, e.message); }
  };
  const sweep = safe('sweep-holds', async () => {
    const n = await sweepExpiredHolds();
    if (n) console.log(`[job] released ${n} expired seat lock(s)`);
  });
  sweep();
  setInterval(sweep, 15000);
  setInterval(safe('chart', runChartJob), 60000);
}
