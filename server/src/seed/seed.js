import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { pathToFileURL } from 'url';
import { env } from '../config/env.js';
import { Station } from '../models/Station.js';
import { Train } from '../models/Train.js';
import { User } from '../models/User.js';
import { Inventory } from '../models/Inventory.js';
import { Hold } from '../models/Hold.js';
import { Booking } from '../models/Booking.js';
import { SeatAssignment } from '../models/SeatAssignment.js';
import { Notification } from '../models/Notification.js';
import { stations, buildTrains } from './data.js';

export async function runSeed({ reset = false } = {}) {
  if (reset) {
    await Promise.all([Inventory, Hold, Booking, SeatAssignment, Notification].map((m) => m.deleteMany({})));
    console.log('[seed] cleared bookings, holds and inventory');
  }
  await Station.bulkWrite(
    stations.map(([code, name, city, state]) => ({ replaceOne: { filter: { code }, replacement: { code, name, city, state }, upsert: true } }))
  );
  const trains = buildTrains();
  await Train.bulkWrite(trains.map((t) => ({ replaceOne: { filter: { number: t.number }, replacement: t, upsert: true } })));
  console.log(`[seed] ${stations.length} stations, ${trains.length} trains`);

  const users = [
    { name: 'Admin', email: 'admin@railconnect.in', password: 'Admin@123', role: 'admin', phone: '9000000001' },
    { name: 'Demo Passenger', email: 'demo@railconnect.in', password: 'Demo@1234', role: 'user', phone: '9000000002' },
  ];
  for (const u of users) {
    if (await User.exists({ email: u.email })) continue;
    await User.create({ name: u.name, email: u.email, phone: u.phone, role: u.role, passwordHash: await bcrypt.hash(u.password, 10) });
  }
  console.log('[seed] users: admin@railconnect.in / Admin@123, demo@railconnect.in / Demo@1234');
}

// `npm run seed` (optionally with --reset)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  mongoose.set('strictQuery', true);
  mongoose
    .connect(env.mongoUri, { serverSelectionTimeoutMS: 4000 })
    .then(() => runSeed({ reset: process.argv.includes('--reset') }))
    .then(() => mongoose.disconnect())
    .catch((e) => { console.error('Seed failed:', e.message); process.exit(1); });
}
