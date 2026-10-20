import mongoose from 'mongoose';

const stopSchema = new mongoose.Schema(
  {
    station: { type: String, required: true, uppercase: true }, // station code
    arr: { type: String, default: null }, // "HH:mm" (null at origin)
    dep: { type: String, default: null }, // "HH:mm" (null at terminus)
    day: { type: Number, required: true, min: 1 }, // day of journey (1 = day train starts)
    km: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const trainSchema = new mongoose.Schema(
  {
    number: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['EXP', 'SF', 'MAIL', 'RAJ', 'SHATABDI', 'INTERCITY'], default: 'EXP' },
    runsOn: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] }, // 0 = Sunday
    classes: [
      {
        _id: false,
        type: { type: String, enum: ['2S', 'SL', 'CC', '3A', '2A', '1A'], required: true },
        coaches: { type: Number, required: true, min: 1 },
      },
    ],
    fareMultiplier: { type: Number, default: 1 }, // Rajdhani / Shatabdi include catering
    route: { type: [stopSchema], validate: (v) => v.length >= 2 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
trainSchema.index({ 'route.station': 1 });

export const Train = mongoose.model('Train', trainSchema);
