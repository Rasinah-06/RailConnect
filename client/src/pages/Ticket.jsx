import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { CLASS_LABELS, QUOTAS, fmtDateTime, rupee } from '../utils';

const statusBadge = (s) => (s === 'CNF' || s === 'CONFIRMED' ? 'go' : s === 'WL' || s === 'WAITLISTED' ? 'wait' : 'stop');

export default function Ticket() {
  const { pnr } = useParams();
  const { lastEvent } = useAuth();
  const [b, setB] = useState(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [sel, setSel] = useState([]);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api(`/bookings/${pnr}`).then((r) => setB(r.booking)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [pnr]); // eslint-disable-line
  useEffect(() => { if (lastEvent?.pnr === pnr) load(); }, [lastEvent]); // eslint-disable-line

  useEffect(() => {
    if (!modal || !sel.length) { setPreview(null); return; }
    api(`/bookings/${pnr}/refund-preview`, { method: 'POST', body: { passengerIds: sel } }).then(setPreview).catch((e) => setError(e.message));
  }, [modal, sel.join(',')]); // eslint-disable-line

  const cancel = async () => {
    setBusy(true); setError('');
    try { await api(`/bookings/${pnr}/cancel`, { method: 'POST', body: { passengerIds: sel } }); setModal(false); setSel([]); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  if (error && !b) return <div className="wrap"><div className="empty"><h2>{error}</h2><Link to="/bookings">My bookings</Link></div></div>;
  if (!b) return <div className="wrap" style={{ padding: 40 }}>Loading ticket...</div>;
  const active = b.passengers.filter((p) => p.status !== 'CAN');

  return (
    <div className="wrap">
      <div className="ticket">
        <div className="head">
          <div><div className="small" style={{ color: '#b9c8da' }}>PNR</div><span className="pnr">{b.pnr}</span></div>
          <span className={`badge ${statusBadge(b.status)}`} style={{ fontSize: '1rem' }}>{b.status}</span>
        </div>
        <div className="body">
          <h2 style={{ marginBottom: 2 }}>{b.trainName} <span className="muted">#{b.trainNumber}</span></h2>
          <p className="muted" style={{ marginTop: 0 }}>{CLASS_LABELS[b.classType]} ({b.classType}) &middot; {QUOTAS[b.quota]} quota</p>
          <div className="row between wrapflex" style={{ margin: '18px 0' }}>
            <div><div className="num" style={{ fontSize: '1.4rem' }}>{b.from.name}</div><div className="muted">{fmtDateTime(b.from.dep)}</div></div>
            <div className="muted">&rarr; {b.distanceKm} km</div>
            <div style={{ textAlign: 'right' }}><div className="num" style={{ fontSize: '1.4rem' }}>{b.to.name}</div><div className="muted">{fmtDateTime(b.to.arr)}</div></div>
          </div>
          <div className="perf" style={{ margin: '0 -26px 18px' }} />
          <div style={{ overflowX: 'auto' }}>
            <table className="t">
              <thead><tr><th>#</th><th>Passenger</th><th>Booking status</th><th>Current status</th><th>Fare</th></tr></thead>
              <tbody>
                {b.passengers.map((p, i) => (
                  <tr key={p._id}>
                    <td>{i + 1}</td>
                    <td>{p.name}<div className="small muted">{p.age} yrs, {p.gender}</div></td>
                    <td>{p.bookingStatus}</td>
                    <td><span className={`badge ${statusBadge(p.status)}`}>{p.status === 'CNF' ? `${p.coach} / ${p.seat} / ${p.berth}` : p.status === 'WL' ? 'Waitlisted' : 'Cancelled'}</span>
                      {p.status === 'CAN' && <div className="small muted">Refund {rupee(p.refund)}</div>}</td>
                    <td>{rupee(p.fare.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="farelines" style={{ marginTop: 14, maxWidth: 320, marginLeft: 'auto' }}>
            <div><span>Ticket fare</span><span>{rupee(b.fare.passengersTotal)}</span></div>
            <div><span>Convenience fee</span><span>{rupee(b.fare.convenienceFee)}</span></div>
            <div className="total"><span>Paid</span><span>{rupee(b.fare.grandTotal)}</span></div>
            {b.refundTotal > 0 && <div><span>Refunded</span><span>{rupee(b.refundTotal)}</span></div>}
          </div>
          <p className="small muted">Payment {b.payment.txnId} via {b.payment.method}. Carry a valid photo ID during the journey.</p>
          {error && <div className="notice bad">{error}</div>}
          <div className="row noprint wrapflex" style={{ marginTop: 14 }}>
            <button className="btn dark" onClick={() => window.print()}>Print ticket</button>
            <Link className="btn ghost" to={`/live/${b.trainNumber}`}>Track train</Link>
            {active.length > 0 && <button className="btn ghost" onClick={() => { setSel(active.map((p) => String(p._id))); setModal(true); }}>Cancel ticket</button>}
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-bg" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Cancel passengers</h3>
            {active.map((p) => (
              <label key={p._id} className="row" style={{ padding: '6px 0' }}>
                <input type="checkbox" checked={sel.includes(String(p._id))} onChange={(e) => setSel((s) => (e.target.checked ? [...s, String(p._id)] : s.filter((x) => x !== String(p._id))))} />
                {p.name} <span className="badge plain">{p.status}</span>
              </label>
            ))}
            {preview && preview.items.length > 0 && (
              <div className="notice" style={{ margin: '12px 0' }}>
                {preview.items[0].rule}.<br /><b>Refund: {rupee(preview.totalRefund)}</b> of {rupee(preview.items.reduce((s, i) => s + i.fare, 0))}
              </div>
            )}
            {error && <div className="notice bad">{error}</div>}
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn danger" disabled={busy || !sel.length} onClick={cancel}>{busy ? 'Cancelling...' : 'Confirm cancellation'}</button>
              <button className="btn ghost" onClick={() => setModal(false)}>Keep ticket</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
