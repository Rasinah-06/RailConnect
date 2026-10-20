import http from 'http';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';
import { createSocketServer } from './socket.js';
import { registerRealtime, startJobs } from './realtime.js';

async function main() {
  await connectDB();
  const app = createApp();
  const server = http.createServer(app);
  createSocketServer(server);
  registerRealtime();
  startJobs();
  server.on('error', (e) => { console.error('\nFailed to start:', e.code === 'EADDRINUSE' ? `port ${env.port} is already in use. Change PORT in server/.env and the proxy target in client/vite.config.js.` : e.message); process.exit(1); });
  server.listen(env.port, () => console.log(`[api] RailConnect API + Socket.IO ready on http://localhost:${env.port}  (health: /api/health)`));
}

main().catch((e) => {
  console.error('\nFailed to start:', e.code === 'EADDRINUSE' ? `port ${env.port} is already in use. Set PORT in server/.env (and the proxy port in client/vite.config.js).` : e.message);
  process.exit(1);
});
