import mongoose from 'mongoose';

// Unique (inventory, seatNo) guarantees two bookings can never get the same berth.
const seatAssignmentSchema = new mongoose.Schema({
  inventory: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
  seatNo: { type: Number, required: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  passenger: { type: mongoose.Schema.Types.ObjectId, required: true },
});
seatAssignmentSchema.index({ inventory: 1, seatNo: 1 }, { unique: true });
seatAssignmentSchema.index({ passenger: 1 });

export const SeatAssignment = mongoose.model('SeatAssignment', seatAssignmentSchema);
