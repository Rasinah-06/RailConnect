import { Notification } from '../models/Notification.js';
import { emitToUser } from '../socket.js';

export async function notify(userId, { type, title, body, pnr }) {
  const n = await Notification.create({ user: userId, type, title, body, pnr });
  emitToUser(String(userId), 'notification:new', n.toObject());
  return n;
}
