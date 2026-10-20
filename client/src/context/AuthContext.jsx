import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, getToken, setToken } from '../api';
import { getSocket, refreshSocketAuth } from '../socket';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());
  const [notifications, setNotifications] = useState([]);
  const [lastEvent, setLastEvent] = useState(null); // lets pages refresh when something changes server-side
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const loadNotifications = useCallback(async () => {
    try {
      const { notifications } = await api('/notifications');
      setNotifications(notifications);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me').then(({ user }) => setUser(user)).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) { setNotifications([]); return undefined; }
    loadNotifications();
    const s = getSocket();
    const onNew = (n) => {
      setNotifications((prev) => [n, ...prev]);
      setLastEvent({ at: Date.now(), pnr: n.pnr, type: n.type });
      toastRef.current(n.title + ': ' + n.body, n.type === 'DELAY' || n.type === 'WL_AUTO_CANCELLED' ? 'warn' : 'ok');
    };
    s.on('notification:new', onNew);
    return () => s.off('notification:new', onNew);
  }, [user, loadNotifications]);

  const finish = ({ token, user }) => {
    setToken(token);
    setUser(user);
    refreshSocketAuth();
    return user;
  };

  const value = useMemo(() => ({
    user, loading, notifications, lastEvent,
    unread: notifications.filter((n) => !n.read).length,
    login: async (email, password) => finish(await api('/auth/login', { method: 'POST', body: { email, password } })),
    register: async (form) => finish(await api('/auth/register', { method: 'POST', body: form })),
    logout: () => { setToken(null); setUser(null); refreshSocketAuth(); },
    markAllRead: async () => { await api('/notifications/read', { method: 'POST' }); setNotifications((p) => p.map((n) => ({ ...n, read: true }))); },
    setUser,
  }), [user, loading, notifications, lastEvent]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
