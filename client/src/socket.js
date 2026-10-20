import { io } from 'socket.io-client';
import { getToken } from './api';

let socket;

export function getSocket() {
  if (!socket) {
    socket = io('/', { auth: (cb) => cb({ token: getToken() }), transports: ['websocket', 'polling'] });
  }
  return socket;
}

// Reconnect so the server re-reads the auth token (after login / logout).
export function refreshSocketAuth() {
  if (socket) {
    socket.disconnect();
    socket.connect();
  }
}
