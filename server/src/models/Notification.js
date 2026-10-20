import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['BOOKING_CONFIRMED', 'BOOKING_WAITLISTED', 'WL_PROMOTED', 'CANCELLED', 'DELAY', 'CHART_PREPARED', 'WL_AUTO_CANCELLED'],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    pnr: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification = mongoose.model('Notification', notificationSchema);
