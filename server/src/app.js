import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import stationRoutes from './routes/stations.js';
import trainRoutes from './routes/trains.js';
import bookingRoutes from './routes/bookings.js';
import pnrRoutes from './routes/pnr.js';
import liveRoutes from './routes/live.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  if (!env.isProd) app.use(morgan('dev'));

  app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date() }));
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }));
  app.use('/api/auth', rateLimit({ windowMs: 15 * 60_000, limit: 50, standardHeaders: true, legacyHeaders: false }), authRoutes);
  app.use('/api/stations', stationRoutes);
  app.use('/api/trains', trainRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/pnr', pnrRoutes);
  app.use('/api/live', liveRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
