import { CLASSES, WL_CLERKAGE } from '../config/constants.js';

// Refund rules modelled on the Indian Railways cancellation rules.
//  - Confirmed, >=48h before departure : flat per-class deduction
//  - Confirmed, 12-48h                 : 25% of fare (min flat)
//  - Confirmed, 4-12h                  : 50% of fare (min flat)
//  - Confirmed, <4h (chart prepared)   : no online refund
//  - Tatkal confirmed                  : no refund
//  - Waitlisted                        : Rs.60 clerkage
export function refundFor({ status, classType, quota, fareTotal, hoursToDeparture }) {
  const flat = CLASSES[classType].cancelFlat;
  if (status === 'WL') {
    const deduction = Math.min(WL_CLERKAGE, fareTotal);
    return { refund: fareTotal - deduction, deduction, rule: 'Waitlisted ticket: Rs.60 clerkage per passenger' };
  }
  if (quota === 'TQ') return { refund: 0, deduction: fareTotal, rule: 'Tatkal tickets are non-refundable once confirmed' };
  if (hoursToDeparture < 4) return { refund: 0, deduction: fareTotal, rule: 'Less than 4 hours to departure: no refund' };

  let deduction;
  let rule;
  if (hoursToDeparture >= 48) { deduction = flat; rule = 'Cancelled 48h+ before departure: flat deduction'; }
  else if (hoursToDeparture >= 12) { deduction = Math.max(flat, Math.round(fareTotal * 0.25)); rule = 'Cancelled 12-48h before departure: 25% deduction'; }
  else { deduction = Math.max(flat, Math.round(fareTotal * 0.5)); rule = 'Cancelled 4-12h before departure: 50% deduction'; }

  deduction = Math.min(deduction, fareTotal);
  return { refund: fareTotal - deduction, deduction, rule };
}
