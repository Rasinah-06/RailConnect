import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a 10-digit Indian mobile number').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
});

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role, savedPassengers: u.savedPassengers });

router.post('/register', asyncHandler(async (req, res) => {
  const body = registerSchema.parse(req.body);
  if (await User.exists({ email: body.email })) throw new HttpError(409, 'An account with this email already exists');
  const user = await User.create({ name: body.name, email: body.email, phone: body.phone || undefined, passwordHash: await bcrypt.hash(body.password, 10) });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) }).parse(req.body);
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, 'Incorrect email or password');
  res.json({ token: signToken(user), user: publicUser(user) });
}));

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

// ---- saved passengers (IRCTC "master list")
const passengerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  age: z.coerce.number().int().min(1).max(125),
  gender: z.enum(['M', 'F', 'T']),
  berthPref: z.string().default('NP'),
});

router.post('/passengers', requireAuth, asyncHandler(async (req, res) => {
  const p = passengerSchema.parse(req.body);
  if (req.user.savedPassengers.length >= 20) throw new HttpError(400, 'Master list is full (20 passengers)');
  req.user.savedPassengers.push(p);
  await req.user.save();
  res.status(201).json({ savedPassengers: req.user.savedPassengers });
}));

router.delete('/passengers/:id', requireAuth, asyncHandler(async (req, res) => {
  req.user.savedPassengers = req.user.savedPassengers.filter((p) => String(p._id) !== req.params.id);
  await req.user.save();
  res.json({ savedPassengers: req.user.savedPassengers });
}));

export default router;
