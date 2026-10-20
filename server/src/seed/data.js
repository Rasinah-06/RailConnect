// SAMPLE DATA for demo purposes. Train names/numbers follow real services, but the
// timings, distances and coach counts are approximations - not official schedules.

export const stations = [
  ['MAS', 'Chennai Central', 'Chennai', 'Tamil Nadu'],
  ['MS', 'Chennai Egmore', 'Chennai', 'Tamil Nadu'],
  ['TBM', 'Tambaram', 'Chennai', 'Tamil Nadu'],
  ['KPD', 'Katpadi Jn', 'Vellore', 'Tamil Nadu'],
  ['SA', 'Salem Jn', 'Salem', 'Tamil Nadu'],
  ['ED', 'Erode Jn', 'Erode', 'Tamil Nadu'],
  ['CBE', 'Coimbatore Jn', 'Coimbatore', 'Tamil Nadu'],
  ['TPJ', 'Tiruchchirappalli Jn', 'Tiruchirappalli', 'Tamil Nadu'],
  ['MDU', 'Madurai Jn', 'Madurai', 'Tamil Nadu'],
  ['SBC', 'KSR Bengaluru City', 'Bengaluru', 'Karnataka'],
  ['MYS', 'Mysuru Jn', 'Mysuru', 'Karnataka'],
  ['PGT', 'Palakkad Jn', 'Palakkad', 'Kerala'],
  ['ERS', 'Ernakulam Jn', 'Kochi', 'Kerala'],
  ['TVC', 'Thiruvananthapuram Central', 'Thiruvananthapuram', 'Kerala'],
  ['BZA', 'Vijayawada Jn', 'Vijayawada', 'Andhra Pradesh'],
  ['VSKP', 'Visakhapatnam', 'Visakhapatnam', 'Andhra Pradesh'],
  ['SC', 'Secunderabad Jn', 'Hyderabad', 'Telangana'],
  ['NGP', 'Nagpur', 'Nagpur', 'Maharashtra'],
  ['BCT', 'Mumbai Central', 'Mumbai', 'Maharashtra'],
  ['ST', 'Surat', 'Surat', 'Gujarat'],
  ['BRC', 'Vadodara Jn', 'Vadodara', 'Gujarat'],
  ['RTM', 'Ratlam Jn', 'Ratlam', 'Madhya Pradesh'],
  ['BPL', 'Bhopal Jn', 'Bhopal', 'Madhya Pradesh'],
  ['KOTA', 'Kota Jn', 'Kota', 'Rajasthan'],
  ['JHS', 'Jhansi Jn', 'Jhansi', 'Uttar Pradesh'],
  ['AGC', 'Agra Cantt', 'Agra', 'Uttar Pradesh'],
  ['CNB', 'Kanpur Central', 'Kanpur', 'Uttar Pradesh'],
  ['DDU', 'Pt Deen Dayal Upadhyaya Jn', 'Mughalsarai', 'Uttar Pradesh'],
  ['NDLS', 'New Delhi', 'Delhi', 'Delhi'],
  ['HWH', 'Howrah Jn', 'Kolkata', 'West Bengal'],
  ['BBS', 'Bhubaneswar', 'Bhubaneswar', 'Odisha'],
];

const ALL = [0, 1, 2, 3, 4, 5, 6];

// stop = [station, arr, dep, day, km]
const forward = [
  { number: '12621', name: 'Tamil Nadu Express', type: 'SF', runsOn: ALL, classes: { SL: 6, '3A': 3, '2A': 1, '1A': 1 }, mirror: ['12622', '22:30'], route: [
    ['MAS', null, '22:00', 1, 0], ['BZA', '04:00', '04:10', 2, 431], ['NGP', '14:00', '14:10', 2, 1092], ['BPL', '19:15', '19:25', 2, 1380],
    ['JHS', '23:35', '23:45', 2, 1717], ['AGC', '03:40', '03:45', 3, 1987], ['NDLS', '07:10', null, 3, 2182] ] },
  { number: '12007', name: 'Chennai - Mysuru Shatabdi', type: 'SHATABDI', runsOn: [0, 1, 2, 4, 5, 6], fareMultiplier: 1.3, classes: { CC: 4 }, mirror: ['12008', '14:15'], route: [
    ['MAS', null, '06:00', 1, 0], ['KPD', '07:40', '07:42', 1, 124], ['SBC', '11:00', '11:05', 1, 358], ['MYS', '13:30', null, 1, 497] ] },
  { number: '12623', name: 'Chennai - Thiruvananthapuram Mail', type: 'MAIL', runsOn: ALL, classes: { SL: 6, '3A': 3, '2A': 1 }, mirror: ['12624', '17:15'], route: [
    ['MAS', null, '19:45', 1, 0], ['SA', '00:55', '00:58', 2, 335], ['ED', '02:05', '02:10', 2, 394], ['CBE', '04:05', '04:10', 2, 496],
    ['PGT', '05:10', '05:15', 2, 550], ['ERS', '08:25', '08:30', 2, 696], ['TVC', '14:35', null, 2, 921] ] },
  { number: '12635', name: 'Vaigai Express', type: 'SF', runsOn: ALL, classes: { CC: 3, '2S': 4 }, mirror: ['12636', '06:35'], route: [
    ['MS', null, '12:25', 1, 0], ['TPJ', '17:35', '17:37', 1, 336], ['MDU', '20:35', null, 1, 497] ] },
  { number: '12637', name: 'Pandian Express', type: 'SF', runsOn: ALL, classes: { SL: 5, '3A': 2, '2A': 1 }, mirror: ['12638', '21:15'], route: [
    ['MS', null, '21:40', 1, 0], ['TPJ', '03:40', '03:45', 2, 336], ['MDU', '06:20', null, 2, 497] ] },
  { number: '12607', name: 'Lalbagh Express', type: 'SF', runsOn: ALL, classes: { CC: 3, '2S': 4 }, mirror: ['12608', '06:30'], route: [
    ['MAS', null, '15:30', 1, 0], ['KPD', '17:08', '17:10', 1, 124], ['SBC', '21:05', null, 1, 358] ] },
  { number: '12759', name: 'Charminar Express', type: 'SF', runsOn: ALL, classes: { SL: 5, '3A': 2, '2A': 1 }, mirror: ['12760', '18:30'], route: [
    ['MAS', null, '18:10', 1, 0], ['BZA', '00:10', '00:15', 2, 431], ['SC', '06:15', null, 2, 723] ] },
  { number: '12841', name: 'Coromandel Express', type: 'SF', runsOn: ALL, classes: { SL: 6, '3A': 3, '2A': 1, '1A': 1 }, mirror: ['12842', '08:45'], route: [
    ['HWH', null, '14:50', 1, 0], ['BBS', '20:30', '20:35', 1, 441], ['VSKP', '03:45', '03:55', 2, 880], ['BZA', '10:00', '10:10', 2, 1232], ['MAS', '17:15', null, 2, 1662] ] },
  { number: '12301', name: 'Howrah Rajdhani Express', type: 'RAJ', runsOn: ALL, fareMultiplier: 1.35, classes: { '3A': 4, '2A': 2, '1A': 1 }, mirror: ['12302', '16:50'], route: [
    ['HWH', null, '16:55', 1, 0], ['DDU', '00:15', '00:20', 2, 678], ['CNB', '05:35', '05:40', 2, 1007], ['NDLS', '10:05', null, 2, 1447] ] },
  { number: '12951', name: 'Mumbai Rajdhani Express', type: 'RAJ', runsOn: ALL, fareMultiplier: 1.35, classes: { '3A': 4, '2A': 2, '1A': 1 }, mirror: ['12952', '16:25'], route: [
    ['BCT', null, '16:35', 1, 0], ['ST', '19:35', '19:40', 1, 263], ['BRC', '21:35', '21:40', 1, 392], ['RTM', '00:30', '00:35', 2, 654],
    ['KOTA', '03:35', '03:40', 2, 926], ['NDLS', '08:35', null, 2, 1384] ] },
  { number: '12677', name: 'Bengaluru - Ernakulam Intercity', type: 'INTERCITY', runsOn: ALL, classes: { CC: 3, '2S': 4 }, mirror: ['12678', '09:30'], route: [
    ['SBC', null, '06:00', 1, 0], ['SA', '09:50', '09:55', 1, 205], ['CBE', '12:50', '12:55', 1, 360], ['PGT', '14:10', '14:12', 1, 415], ['ERS', '17:15', null, 1, 573] ] },
];

const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const toHHmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// Build the return service by mirroring the outward journey's running-time profile.
export function mirrorRoute(route, startHHmm) {
  const base = toMin(route[0][2]);
  const rel = route.map(([code, arr, dep, day, km]) => ({
    code, km,
    arr: arr ? (day - 1) * 1440 + toMin(arr) - base : null,
    dep: dep ? (day - 1) * 1440 + toMin(dep) - base : null,
  }));
  rel[0].arr = rel[0].dep;
  rel[rel.length - 1].dep = rel[rel.length - 1].arr;
  const total = rel[rel.length - 1].arr;
  const startAbs = toMin(startHHmm);

  return rel.slice().reverse().map((s, i, arr) => {
    const isFirst = i === 0;
    const isLast = i === arr.length - 1;
    const a = startAbs + (total - s.dep);
    const d = startAbs + (total - s.arr);
    return [s.code, isFirst ? null : toHHmm(a), isLast ? null : toHHmm(d), Math.floor((isFirst ? d : isLast ? a : a) / 1440) + 1, total_km(route) - s.km];
  });
}
const total_km = (route) => route[route.length - 1][4];

const shapeRoute = (r) => r.map(([station, arr, dep, day, km]) => ({ station, arr, dep, day, km }));
const shapeClasses = (c) => Object.entries(c).map(([type, coaches]) => ({ type, coaches }));

export function buildTrains() {
  const out = [];
  for (const t of forward) {
    out.push({ number: t.number, name: t.name, type: t.type, runsOn: t.runsOn, fareMultiplier: t.fareMultiplier || 1, classes: shapeClasses(t.classes), route: shapeRoute(t.route), isActive: true });
    const [num, start] = t.mirror;
    const [a, b] = t.name.includes(' - ') ? t.name.split(' - ') : [null, null];
    const name = a ? `${b.replace(/ (Shatabdi|Mail|Intercity)$/, '')} - ${a} ${(t.name.match(/(Shatabdi|Mail|Intercity)$/) || [''])[0]}`.trim() : t.name;
    out.push({ number: num, name, type: t.type, runsOn: t.runsOn, fareMultiplier: t.fareMultiplier || 1, classes: shapeClasses(t.classes), route: shapeRoute(mirrorRoute(t.route, start)), isActive: true });
  }
  return out;
}
