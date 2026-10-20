import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: Number(process.env.PORT || 5001),
  useMemoryDb: process.env.USE_MEMORY_DB === 'true',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/railconnect',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  holdMinutes: Number(process.env.HOLD_MINUTES || 5),
  wlCap: Number(process.env.WL_CAP || 25),
  advanceDays: Number(process.env.ADVANCE_DAYS || 60),
  enforceTatkalWindow: process.env.ENFORCE_TATKAL_WINDOW === 'true',
  isProd: process.env.NODE_ENV === 'production',
};
