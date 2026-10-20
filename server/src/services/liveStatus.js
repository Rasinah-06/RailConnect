import { stopArr, stopDep } from './trainUtils.js';

// Pure function: where is the train at time `nowMs`, given it runs `delayMin` late?
// Delay is applied to the whole schedule (a simple but reasonable model).
export function computeLiveStatus(train, runDate, nowMs, delayMin = 0) {
  const delayMs = delayMin * 60000;
  const n = train.route.length;

  const stops = train.route.map((s, i) => {
    const schedArr = stopArr(train, i, runDate);
    const schedDep = stopDep(train, i, runDate);
    return {
      code: s.station,
      km: s.km,
      schedArr,
      schedDep,
      expArr: new Date(schedArr.getTime() + delayMs),
      expDep: new Date(schedDep.getTime() + delayMs),
    };
  });

  const first = stops[0];
  const last = stops[n - 1];
  let status;
  let currentIdx = -1; // index of last station arrived at / departed from
  let progressPct = 0;
  let kmCovered = 0;

  if (nowMs < first.expDep.getTime()) {
    status = 'YET_TO_START';
  } else if (nowMs >= last.expArr.getTime()) {
    status = 'ARRIVED';
    currentIdx = n - 1;
    progressPct = 100;
    kmCovered = last.km;
  } else {
    status = 'RUNNING';
    for (let i = 0; i < n; i++) {
      if (nowMs >= stops[i].expArr.getTime() && nowMs < stops[i].expDep.getTime()) {
        status = 'AT_STATION';
        currentIdx = i;
        kmCovered = stops[i].km;
        break;
      }
      if (i < n - 1 && nowMs >= stops[i].expDep.getTime() && nowMs < stops[i + 1].expArr.getTime()) {
        currentIdx = i;
        const frac = (nowMs - stops[i].expDep.getTime()) / (stops[i + 1].expArr.getTime() - stops[i].expDep.getTime());
        kmCovered = stops[i].km + frac * (stops[i + 1].km - stops[i].km);
        break;
      }
    }
    const total = last.km || 1;
    progressPct = Math.min(100, Math.max(0, (kmCovered / total) * 100));
  }

  const outStops = stops.map((s, i) => ({
    code: s.code,
    km: s.km,
    schedArr: s.schedArr,
    schedDep: s.schedDep,
    expArr: s.expArr,
    expDep: s.expDep,
    state:
      status === 'YET_TO_START'
        ? 'UPCOMING'
        : i < currentIdx || (i === currentIdx && status === 'RUNNING')
        ? 'DEPARTED'
        : i === currentIdx
        ? status === 'ARRIVED' ? 'ARRIVED' : 'CURRENT'
        : 'UPCOMING',
  }));

  return {
    trainNumber: train.number,
    trainName: train.name,
    runDate,
    status,
    delayMin,
    currentStation: currentIdx >= 0 ? stops[currentIdx].code : null,
    nextStation: status === 'RUNNING' && currentIdx + 1 < n ? stops[currentIdx + 1].code : status === 'AT_STATION' && currentIdx + 1 < n ? stops[currentIdx + 1].code : null,
    kmCovered: Math.round(kmCovered),
    totalKm: last.km,
    progressPct: Math.round(progressPct * 10) / 10,
    stops: outStops,
    updatedAt: new Date(nowMs),
  };
}

// Demo mode: squeeze the whole journey into `loopSeconds` so the movement can be watched live.
export function demoNow(train, runDate, nowMs, loopSeconds = 150) {
  const start = stopDep(train, 0, runDate).getTime();
  const end = stopArr(train, train.route.length - 1, runDate).getTime();
  const frac = (nowMs % (loopSeconds * 1000)) / (loopSeconds * 1000);
  return start + frac * (end - start);
}
