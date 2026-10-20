import mongoose from 'mongoose';

// One document per (train, run date, class). All seat accounting is done with
// atomic findOneAndUpdate operations on this document, which is what makes
// concurrent bookings safe on a standalone MongoDB (no transactions needed).
const inventorySchema = new mongoose.Schema({
  trainNumber: { type: String, required: true },
  runDate: { type: String, required: true }, // YYYY-MM-DD, date the train leaves its origin
  classType: { type: String, required: true },
  total: { type: Number, required: true },
  confirmed: { type: Number, default: 0 },
  held: { type: Number, default: 0 }, // seats locked while a user pays
  wl: { type: Number, default: 0 }, // current waiting-list size
  wlSeq: { type: Number, default: 0 }, // ever-increasing WL ticket counter
  wlCap: { type: Number, required: true },
});
inventorySchema.index({ trainNumber: 1, runDate: 1, classType: 1 }, { unique: true });

export const Inventory = mongoose.model('Inventory', inventorySchema);
