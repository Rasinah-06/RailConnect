import mongoose from 'mongoose';

// Temporary seat lock (the role Redis played in the original design).
const holdSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    inventory: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
    trainNumber: String,
    runDate: String,
    classType: String,
    kind: { type: String, enum: ['CNF', 'WL'], required: true },
    count: { type: Number, required: true },
    expiresAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ['active', 'consumed', 'expired', 'released'], default: 'active', index: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export const Hold = mongoose.model('Hold', holdSchema);
