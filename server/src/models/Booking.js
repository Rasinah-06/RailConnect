import mongoose from 'mongoose';

const fareSchema = new mongoose.Schema(
  { base: Number, reservation: Number, superfast: Number, tatkal: Number, gst: Number, total: Number },
  { _id: false }
);

const passengerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['M', 'F', 'T'], required: true },
  berthPref: { type: String, default: 'NP' },
  status: { type: String, enum: ['CNF', 'WL', 'CAN'], required: true },
  bookingStatus: String, // status shown at booking time, e.g. "WL 7"
  wlSeq: Number,
  seatIndex: Number, // absolute seat number inside the class inventory
  coach: String,
  seat: Number,
  berth: String,
  fare: fareSchema,
  refund: { type: Number, default: 0 },
  cancelledAt: Date,
});

const bookingSchema = new mongoose.Schema(
  {
    pnr: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true, index: true },
    trainNumber: { type: String, required: true, index: true },
    trainName: String,
    runDate: { type: String, required: true },
    classType: { type: String, required: true },
    quota: { type: String, default: 'GN' },
    from: { code: String, name: String, dep: Date },
    to: { code: String, name: String, arr: Date },
    distanceKm: Number,
    departureAt: { type: Date, required: true, index: true },
    contact: { phone: String, email: String },
    passengers: [passengerSchema],
    status: { type: String, enum: ['CONFIRMED', 'WAITLISTED', 'CANCELLED'], required: true },
    fare: { passengersTotal: Number, convenienceFee: Number, grandTotal: Number },
    payment: { txnId: String, method: String, amount: Number, status: String, paidAt: Date },
    refundTotal: { type: Number, default: 0 },
    chartPrepared: { type: Boolean, default: false },
  },
  { timestamps: true }
);

bookingSchema.methods.recomputeStatus = function () {
  const active = this.passengers.filter((p) => p.status !== 'CAN');
  if (!active.length) this.status = 'CANCELLED';
  else if (active.some((p) => p.status === 'WL')) this.status = 'WAITLISTED';
  else this.status = 'CONFIRMED';
};

export const Booking = mongoose.model('Booking', bookingSchema);
