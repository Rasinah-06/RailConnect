# RailConnect - Smart Railway Passenger Platform (MERN + Socket.IO)

IRCTC-style railway booking built on **MongoDB, Express, React, Node.js**, with real-time seat availability, live train status and notifications over **Socket.IO**.

## Quick start
Requires Node 18+. **MongoDB is optional**: if none is running, the server starts a temporary in-memory database
(first run downloads ~100MB, needs internet; data resets on restart). To keep data, install MongoDB Community
or put a MongoDB Atlas URL in `server/.env` as `MONGO_URI`.

```bash
npm run install:all      # installs root, server and client
npm run dev              # API :5001 + web :5173, sample data is seeded automatically
```
Open http://localhost:5173 and wait until the terminal shows `[api] RailConnect API + Socket.IO ready`.
Check http://localhost:5001/api/health returns `{"ok":true}`.

**"Request failed" / "API server is not responding"?** The API is not running. Read the terminal:
a port clash (change `PORT` in `server/.env` and the proxy in `client/vite.config.js`) or a database error is printed there.

| Role  | Login                       |
|-------|-----------------------------|
| User  | demo@railconnect.in / Demo@1234 |
| Admin | admin@railconnect.in / Admin@123 |

## Features
- **Search** by station (autocomplete), date, class, quota; 7-day availability strip per class
- **Live availability** (`AVAILABLE-0042 / WL 5 / REGRET`) pushed to every open results page when anyone books or cancels
- **Seat lock for 5 minutes** during payment (replaces Redis from the original design), auto-released by a background sweeper
- **Booking**: up to 6 passengers, berth preference, saved passenger list, coach/seat/berth allocation, 10-digit PNR
- **Fares**: tapering distance slabs, reservation + superfast charges, GST on AC, Tatkal min/max, senior-citizen concession, convenience fee
- **Waitlist** with automatic promotion (oldest first) when a berth is cancelled; WL auto-cancelled with full refund at chart time (4h before departure)
- **Cancellation** with IRCTC-style refund tiers, partial cancel per passenger, refund preview
- **PNR status** (public), **My bookings**, printable e-ticket
- **Live train status**: running position, delay, per-station expected times; *Demo mode* replays a whole journey in ~2.5 min
- **Notifications** (bell + toast): confirmed, waitlisted, promoted, cancelled, delay, chart prepared
- **Admin**: stats, announce delays (notifies booked passengers live), enable/disable trains, add trains, recent bookings

## Architecture
```
client/  React 18 + Vite + React Router + socket.io-client
server/  Express + Mongoose + Socket.IO + JWT + Zod
  src/models      User, Station, Train, Inventory, Hold, SeatAssignment, Booking, Notification
  src/services    fare, refund, booking (hold/confirm/cancel/promote/chart), availability, liveStatus
  src/routes      auth, stations, trains, bookings, pnr, live, notifications, admin
  src/realtime.js socket rooms + background jobs
```

### How double-booking is prevented (no transactions needed)
Every (train, run date, class) has one `Inventory` document with `total / confirmed / held / wl` counters.
- **Hold**: `findOneAndUpdate({ _id, $expr: confirmed + held + n <= total }, { $inc: { held: n } })` - atomic, so two users can never lock the same last seat.
- **Seat numbers**: `SeatAssignment` has a unique index on `(inventory, seatNo)`, so a berth can only be assigned once.
- **Expiry**: a 15s sweeper marks stale holds `expired` (atomic status flip) and gives the seats back.

Verify with the load test (API running + seeded): `npm run test:concurrency --prefix server`
Unit tests (fare, refund, live status, seat layout, schedules): `npm test`

## Configuration (`server/.env`)
`HOLD_MINUTES`, `WL_CAP`, `ADVANCE_DAYS`, `ENFORCE_TATKAL_WINDOW` (set `true` for real Tatkal windows).

## Honest limitations / next steps
- Schedules, distances and fares are **sample data** modelled on real services, not official.
- Payment is a **simulated gateway**; swap `mockPayment` in `services/booking.js` for Razorpay/Stripe test mode.
- Live running status is **simulated** (no free public API exists); replace `services/liveService.js` with a real feed if you get access.
- Seat inventory is per whole train run, not per segment (IRCTC reuses a berth across non-overlapping segments).
- No email/SMS; add nodemailer/Twilio inside `services/notify.js`.
- RAC and Tatkal seat quotas are not modelled separately.
