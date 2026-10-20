import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { HttpError, asyncHandler } from './error.js';

export const signToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

export const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Please log in to continue');
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new HttpError(401, 'Your session has expired. Please log in again');
  }
  const user = await User.findById(payload.sub);
  if (!user) throw new HttpError(401, 'Account not found');
  req.user = user;
  next();
});

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return next(new HttpError(403, 'Admin access only'));
  next();
};
