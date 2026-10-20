import { CLASSES, GST_RATE, CONVENIENCE_FEE } from '../config/constants.js';

// Tapering distance slabs, like railway fare tables (rate falls with distance).
export function effectiveKm(d) {
  return (
    Math.min(d, 500) +
    0.8 * Math.max(0, Math.min(d, 1000) - 500) +
    0.65 * Math.max(0, Math.min(d, 1500) - 1000) +
    0.5 * Math.max(0, d - 1500)
  );
}

export const isSenior = (p) => (p.gender === 'F' ? p.age >= 58 : p.age >= 60);

export function passengerFare({ classType, distanceKm, trainType, fareMultiplier = 1, quota, passenger }) {
  const c = CLASSES[classType];
  let base = Math.max(c.minBase, Math.round(effectiveKm(distanceKm) * c.ratePerKm));
  base = Math.round(base * fareMultiplier);

  // Senior citizen concession (general/senior quota only): 40% men, 50% women/transgender
  if ((quota === 'GN' || quota === 'SS') && passenger && isSenior(passenger)) {
    base = Math.round(base * (passenger.gender === 'M' ? 0.6 : 0.5));
  }

  const reservation = c.reservation;
  const superfast = ['SF', 'RAJ', 'SHATABDI', 'MAIL', 'INTERCITY'].includes(trainType) ? c.superfast : 0;

  let tatkal = 0;
  if (quota === 'TQ' && c.tatkal) {
    tatkal = Math.min(c.tatkal.max, Math.max(c.tatkal.min, Math.round(base * c.tatkal.pct)));
  }

  const taxable = base + reservation + superfast + tatkal;
  const gst = c.ac ? Math.round(taxable * GST_RATE) : 0;
  return { base, reservation, superfast, tatkal, gst, total: taxable + gst };
}

export function computeFare({ classType, distanceKm, trainType, fareMultiplier, quota, passengers }) {
  const perPassenger = passengers.map((p) =>
    passengerFare({ classType, distanceKm, trainType, fareMultiplier, quota, passenger: p })
  );
  const passengersTotal = perPassenger.reduce((s, f) => s + f.total, 0);
  const convenienceFee = CLASSES[classType].ac ? CONVENIENCE_FEE.ac : CONVENIENCE_FEE.nonAc;
  return {
    perPassenger,
    passengersTotal,
    convenienceFee,
    grandTotal: Math.round((passengersTotal + convenienceFee) * 100) / 100,
  };
}
