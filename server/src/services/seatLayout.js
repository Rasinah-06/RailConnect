import { CLASSES } from '../config/constants.js';

const PATTERNS = {
  SL: ['LB', 'MB', 'UB', 'LB', 'MB', 'UB', 'SL', 'SU'],
  '3A': ['LB', 'MB', 'UB', 'LB', 'MB', 'UB', 'SL', 'SU'],
  '2A': ['LB', 'UB', 'LB', 'UB', 'SL', 'SU'],
  '1A': ['LB', 'UB', 'LB', 'UB'],
  CC: ['WS', 'MS', 'AS', 'AS', 'WS'],
  '2S': ['WS', 'MS', 'AS', 'AS', 'MS', 'WS'],
};

export const BERTH_LABELS = {
  LB: 'Lower', MB: 'Middle', UB: 'Upper', SL: 'Side Lower', SU: 'Side Upper',
  WS: 'Window', MS: 'Middle', AS: 'Aisle', NP: 'No preference',
};

// seatIndex is 1-based across the whole class inventory.
export function seatInfo(classType, seatIndex) {
  const meta = CLASSES[classType];
  const perCoach = meta.seatsPerCoach;
  const coachNo = Math.floor((seatIndex - 1) / perCoach) + 1;
  const seat = ((seatIndex - 1) % perCoach) + 1;
  const pattern = PATTERNS[classType];
  return { coach: `${meta.coachPrefix}${coachNo}`, seat, berth: pattern[(seat - 1) % pattern.length] };
}

export const berthOptions = (classType) => ['NP', ...new Set(PATTERNS[classType])];
