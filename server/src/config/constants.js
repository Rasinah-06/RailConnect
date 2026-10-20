// Class metadata used for fares, seat layout and display.
export const CLASSES = {
  '2S': { label: 'Second Sitting', ac: false, seatsPerCoach: 108, coachPrefix: 'D', ratePerKm: 0.45, minBase: 30,  reservation: 15, superfast: 15, tatkal: { pct: 0.1, min: 10,  max: 15 },  cancelFlat: 30 },
  SL:   { label: 'Sleeper',      ac: false, seatsPerCoach: 72,  coachPrefix: 'S', ratePerKm: 0.6,  minBase: 125, reservation: 20, superfast: 30, tatkal: { pct: 0.3, min: 100, max: 200 }, cancelFlat: 120 },
  CC:   { label: 'AC Chair Car', ac: true,  seatsPerCoach: 78,  coachPrefix: 'C', ratePerKm: 1.7,  minBase: 200, reservation: 40, superfast: 45, tatkal: { pct: 0.3, min: 125, max: 225 }, cancelFlat: 180 },
  '3A': { label: 'AC 3 Tier',    ac: true,  seatsPerCoach: 64,  coachPrefix: 'B', ratePerKm: 1.55, minBase: 250, reservation: 40, superfast: 45, tatkal: { pct: 0.3, min: 300, max: 400 }, cancelFlat: 180 },
  '2A': { label: 'AC 2 Tier',    ac: true,  seatsPerCoach: 48,  coachPrefix: 'A', ratePerKm: 2.25, minBase: 350, reservation: 50, superfast: 45, tatkal: { pct: 0.3, min: 400, max: 500 }, cancelFlat: 200 },
  '1A': { label: 'AC First',     ac: true,  seatsPerCoach: 24,  coachPrefix: 'H', ratePerKm: 3.8,  minBase: 550, reservation: 60, superfast: 75, tatkal: null,                                cancelFlat: 240 },
};

export const CLASS_KEYS = Object.keys(CLASSES);

export const QUOTAS = { GN: 'General', TQ: 'Tatkal', LD: 'Ladies', SS: 'Senior Citizen' };

export const GST_RATE = 0.05;
// IRCTC-style payment-gateway convenience fee (incl. GST) per ticket
export const CONVENIENCE_FEE = { ac: 35.4, nonAc: 17.7 };
export const MAX_PASSENGERS = 6;
export const WL_CLERKAGE = 60;
export const CHART_HOURS = 4; // chart prepared 4h before departure
