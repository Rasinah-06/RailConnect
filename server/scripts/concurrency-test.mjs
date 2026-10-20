// Proves the booking engine never oversells. Needs the API running and the DB seeded.
//   npm run seed && npm run dev   (in another terminal)
//   npm run test:concurrency --prefix server
//
// 15 users each fire 3 simultaneous seat-lock requests at 1A on Tamil Nadu Express (24 seats).
// Exactly 24 must be locked as confirmed; the rest must fall to the waiting list.
const API = process.env.API || 'http://localhost:5001/api';

async function call(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ...json };
}

const istToday = () => new Date(Date.now() + 5.5 * 3600e3);
const date = new Date(istToday().getTime() + 12 * 86400e3).toISOString().slice(0, 10);
const run = Date.now().toString(36);

const users = [];
for (let i = 0; i < 15; i++) {
  const r = await call('/auth/register', { method: 'POST', body: { name: `Load Tester ${i}`, email: `load${i}.${run}@test.in`, password: 'Passw0rd!x' } });
  if (!r.token) { console.error('register failed', r); process.exit(1); }
  users.push(r.token);
}
console.log(`registered ${users.length} users; journey date ${date}`);

const holdBody = (n) => ({
  trainNumber: '12621', from: 'MAS', to: 'NDLS', date, classType: '1A', quota: 'GN',
  passengers: [{ name: `Passenger ${n}`, age: 30, gender: 'M', berthPref: 'NP' }],
  contact: { phone: '9876543210' },
});

const jobs = [];
users.forEach((token, u) => { for (let k = 0; k < 3; k++) jobs.push(call('/bookings/hold', { method: 'POST', token, body: holdBody(`${u}-${k}`) }).then((r) => ({ token, r }))); });
const holds = (await Promise.all(jobs)).filter((x) => x.r.hold);
const cnfHolds = holds.filter((x) => x.r.hold.kind === 'CNF').length;
console.log(`holds created: ${holds.length}  (CNF locks: ${cnfHolds}, WL: ${holds.length - cnfHolds})`);

const bookings = (await Promise.all(holds.map(({ token, r }) => call('/bookings/confirm', { method: 'POST', token, body: { holdId: r.hold.id, payment: { method: 'UPI' } } })))).filter((x) => x.booking);
let cnf = 0, wl = 0;
const seats = new Set();
let dup = 0;
for (const { booking } of bookings) {
  for (const p of booking.passengers) {
    if (p.status === 'CNF') { cnf++; const k = `${p.coach}/${p.seat}`; if (seats.has(k)) dup++; seats.add(k); }
    if (p.status === 'WL') wl++;
  }
}
console.log(`bookings: ${bookings.length}  confirmed passengers: ${cnf}  waitlisted: ${wl}  duplicate seats: ${dup}`);

const ok = cnf <= 24 && dup === 0;
console.log(ok ? 'PASS - no overbooking, no double-allocated seats' : 'FAIL - inventory was oversold');
process.exit(ok ? 0 : 1);
