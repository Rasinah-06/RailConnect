export const CLASS_LABELS = { '2S': 'Second Sitting', SL: 'Sleeper', CC: 'AC Chair Car', '3A': 'AC 3 Tier', '2A': 'AC 2 Tier', '1A': 'AC First' };
export const QUOTAS = { GN: 'General', TQ: 'Tatkal', LD: 'Ladies', SS: 'Senior Citizen' };
export const BERTHS = { NP: 'No preference', LB: 'Lower', MB: 'Middle', UB: 'Upper', SL: 'Side Lower', SU: 'Side Upper', WS: 'Window', MS: 'Middle seat', AS: 'Aisle' };
export const BERTH_BY_CLASS = {
  SL: ['NP', 'LB', 'MB', 'UB', 'SL', 'SU'], '3A': ['NP', 'LB', 'MB', 'UB', 'SL', 'SU'], '2A': ['NP', 'LB', 'UB', 'SL', 'SU'],
  '1A': ['NP', 'LB', 'UB'], CC: ['NP', 'WS', 'AS'], '2S': ['NP', 'WS', 'AS'],
};
export const TRAIN_TYPES = { EXP: 'Express', SF: 'Superfast', MAIL: 'Mail', RAJ: 'Rajdhani', SHATABDI: 'Shatabdi', INTERCITY: 'Intercity' };

export const rupee = (n) => `\u20B9${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: Number(n) % 1 ? 2 : 0 })}`;
export const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
export const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: '2-digit', month: 'short' });
export const fmtDateLong = (d) => new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
export const fmtDateTime = (d) => `${fmtDate(d)}, ${fmtTime(d)}`;

export const todayStr = (offset = 0) => {
  const t = new Date(Date.now() + 5.5 * 3600e3 + offset * 86400e3);
  return t.toISOString().slice(0, 10);
};
export const addDaysStr = (s, n) => {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const availClass = (a) => (a?.status === 'AVAILABLE' ? 'go' : a?.status === 'WL' ? 'wait' : 'stop');
