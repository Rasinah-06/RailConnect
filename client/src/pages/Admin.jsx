import { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { fmtDateTime, rupee } from '../utils';

const SAMPLE = `{
  "number": "12999", "name": "Sample Express", "type": "EXP", "runsOn": [0,1,2,3,4,5,6],
  "classes": [{ "type": "SL", "coaches": 4 }, { "type": "3A", "coaches": 2 }],
  "route": [
    { "station": "MAS", "arr": null, "dep": "20:00", "day": 1, "km": 0 },
    { "station": "SBC", "arr": "02:30", "dep": null, "day": 2, "km": 358 }
  ]
}`;

export default function Admin() {
  const toast = useToast();
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [trains, setTrains] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [delay, setDelay] = useState({});
  const [json, setJson] = useState(SAMPLE);

  const load = () => {
    api('/admin/stats').then(setStats);
    api('/admin/trains').then((r) => setTrains(r.trains));
    api('/admin/bookings').then((r) => setBookings(r.bookings));
  };
  useEffect(load, []);

  const announce = async (t) => {
    try {
      const d = delay[t.number] || {};
      const r = await api(`/admin/trains/${t.number}/delay`, { method: 'POST', body: { minutes: Number(d.minutes || 0), reason: d.reason } });
      toast(`Delay set for ${t.number}. ${r.notified} passenger(s) notified.`);
    } catch (e) { toast(e.message, 'warn'); }
  };
  const toggle = async (t) => { await api(`/admin/trains/${t.number}`, { method: 'PATCH', body: { isActive: !t.isActive } }); load(); };
  const addTrain = async () => {
    try { await api('/admin/trains', { method: 'POST', body: JSON.parse(json) }); toast('Train added'); load(); }
    catch (e) { toast(e.message, 'warn'); }
  };

  return (
    <div className="wrap" style={{ padding: '28px 20px 60px' }}>
      <h2>Admin dashboard</h2>
      <div className="tabs-line" role="tablist">
        {[['stats', 'Overview'], ['trains', 'Trains and delays'], ['bookings', 'Recent bookings'], ['add', 'Add train']].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {tab === 'stats' && stats && (
        <div className="stats">
          {[['Bookings', stats.bookings], ['Gross revenue', rupee(stats.grossRevenue)], ['Refunds', rupee(stats.refunds)], ['Users', stats.users], ['Active trains', stats.trains], ['Stations', stats.stations],
            ['Confirmed', stats.byStatus.CONFIRMED || 0], ['Waitlisted', stats.byStatus.WAITLISTED || 0], ['Cancelled', stats.byStatus.CANCELLED || 0]].map(([l, v]) => (
            <div className="stat" key={l}><div className="muted small">{l}</div><div className="v">{v}</div></div>
          ))}
        </div>
      )}

      {tab === 'trains' && (
        <div className="panel" style={{ overflowX: 'auto' }}>
          <p className="muted small">Announcing a delay updates the live status board instantly and sends a notification to every passenger booked on the current run.</p>
          <table className="t">
            <thead><tr><th>Train</th><th>Delay (min)</th><th>Reason</th><th /><th>Status</th></tr></thead>
            <tbody>
              {trains.map((t) => (
                <tr key={t.number}>
                  <td><b>{t.number}</b> {t.name}</td>
                  <td style={{ width: 90 }}><input className="input" type="number" min="0" style={{ marginTop: 0 }} value={delay[t.number]?.minutes ?? ''} onChange={(e) => setDelay({ ...delay, [t.number]: { ...delay[t.number], minutes: e.target.value } })} /></td>
                  <td><input className="input" style={{ marginTop: 0 }} placeholder="e.g. Signal failure" value={delay[t.number]?.reason ?? ''} onChange={(e) => setDelay({ ...delay, [t.number]: { ...delay[t.number], reason: e.target.value } })} /></td>
                  <td><button className="btn small" onClick={() => announce(t)}>Announce</button></td>
                  <td><button className="btn small ghost" onClick={() => toggle(t)}>{t.isActive ? 'Active' : 'Disabled'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'bookings' && (
        <div className="panel" style={{ overflowX: 'auto' }}>
          <table className="t">
            <thead><tr><th>PNR</th><th>User</th><th>Train</th><th>Journey</th><th>Status</th><th>Paid</th></tr></thead>
            <tbody>{bookings.map((b) => <tr key={b._id}><td>{b.pnr}</td><td>{b.user?.name}</td><td>{b.trainNumber} ({b.classType})</td><td>{b.from.code} to {b.to.code}<div className="small muted">{fmtDateTime(b.departureAt)}</div></td><td>{b.status}</td><td>{rupee(b.fare.grandTotal)}</td></tr>)}</tbody>
          </table>
        </div>
      )}

      {tab === 'add' && (
        <div className="panel stack">
          <p className="muted small">Station codes must already exist. Times are IST, day 1 is the day the train leaves its origin.</p>
          <textarea className="input" rows={16} style={{ fontFamily: 'monospace' }} value={json} onChange={(e) => setJson(e.target.value)} aria-label="Train JSON" />
          <button className="btn" onClick={addTrain}>Add train</button>
        </div>
      )}
    </div>
  );
}
