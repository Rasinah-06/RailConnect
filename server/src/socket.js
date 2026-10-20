import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './config/env.js';

let io = null;

export function createSocketServer(httpServer) {
  io = new Server(httpServer, { cors: { origin: env.clientOrigin, credentials: true } });

  // Optional auth: logged-in users join a private room used for notifications.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const payload = jwt.verify(token, env.jwtSecret);
        socket.data.userId = payload.sub;
      } catch {
        /* anonymous socket - still allowed for public rooms */
      }
    }
    next();
  });
  return io;
}

export const getIO = () => io;
export const emitToUser = (userId, event, payload) => io?.to(`user:${userId}`).emit(event, payload);
export const emitToRoom = (room, event, payload) => io?.to(room).emit(event, payload);
