import mongoose from 'mongoose';

const savedPassengerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  age: { type: Number, required: true, min: 1, max: 125 },
  gender: { type: String, enum: ['M', 'F', 'T'], required: true },
  berthPref: { type: String, default: 'NP' },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    savedPassengers: { type: [savedPassengerSchema], default: [] },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
