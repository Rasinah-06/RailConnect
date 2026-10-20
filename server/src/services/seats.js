import mongoose from 'mongoose';
import { SeatAssignment } from '../models/SeatAssignment.js';
import { seatInfo } from './seatLayout.js';

// Assign concrete seats. Capacity was already guaranteed by an atomic counter on the
// Inventory document; the unique (inventory, seatNo) index guarantees no double allocation.
export async function assignSeats(inventory, bookingId, passengers, classType) {
  const used = new Set(
    (await SeatAssignment.find({ inventory: inventory._id }).select('seatNo').lean()).map((s) => s.seatNo)
  );
  const free = [];
  for (let s = 1; s <= inventory.total; s++) if (!used.has(s)) free.push(s);

  const assigned = [];
  try {
    for (const p of passengers) {
      let placed = false;
      while (!placed && free.length) {
        let pickIdx = 0;
        if (p.berthPref && p.berthPref !== 'NP') {
          const m = free.findIndex((s) => seatInfo(classType, s).berth === p.berthPref);
          if (m >= 0) pickIdx = m;
        }
        const seatNo = free[pickIdx];
        free.splice(pickIdx, 1);
        try {
          await SeatAssignment.create({
            inventory: inventory._id,
            seatNo,
            booking: bookingId,
            passenger: new mongoose.Types.ObjectId(String(p._id)),
          });
          assigned.push({ passengerId: String(p._id), seatIndex: seatNo, ...seatInfo(classType, seatNo) });
          placed = true;
        } catch (e) {
          if (e.code !== 11000) throw e; // someone else took it, try the next free seat
        }
      }
      if (!placed) throw new Error('No seat could be allocated');
    }
  } catch (e) {
    // roll back partial allocation
    await SeatAssignment.deleteMany({ passenger: { $in: assigned.map((a) => new mongoose.Types.ObjectId(a.passengerId)) } });
    throw e;
  }
  return assigned;
}
