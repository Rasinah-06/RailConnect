import { addDays, weekday, istDateTime } from './dates.js';

export const stopIndex = (train, code) => train.route.findIndex((s) => s.station === code);

// Date the train left its origin, given the date a passenger boards at stop `idx`.
export const runDateFor = (train, boardingDate, idx) => addDays(boardingDate, -(train.route[idx].day - 1));

export const runsOnRunDate = (train, runDate) => train.runsOn.includes(weekday(runDate));

export function stopArr(train, i, runDate) {
  const s = train.route[i];
  return istDateTime(runDate, s.day - 1, s.arr || s.dep);
}
export function stopDep(train, i, runDate) {
  const s = train.route[i];
  const dep = istDateTime(runDate, s.day - 1, s.dep || s.arr);
  const arr = stopArr(train, i, runDate);
  // a halt that straddles midnight: departure is on the next calendar day
  return dep < arr ? new Date(dep.getTime() + 86400000) : dep;
}

export const classCapacity = (train, classType) => {
  const c = train.classes.find((x) => x.type === classType);
  return c ? c.coaches : 0;
};
