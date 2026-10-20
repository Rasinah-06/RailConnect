import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { CLASS_LABELS, fmtDateTime, rupee } from '../utils';

export default function Pay() {
  const { holdId } = useParams();
  const nav = useNavigate();
  const [hold, setHold] = useState(null);
  const [left, setLeft] = useState(null);
  const [method, setMethod] = useState('UPI');
  const [fail, setFail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api(`/bookings/hold/${holdId}`).then((r) => setHold(r.hold)).catch((e) => setError(e.message)); }, [holdId]);

  useEffect(() => {
    if (!hold) return undefined;
    const tick = () => setLeft(Math.max(0, Math.round((new Date(hold.expiresAt) - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [hold]);

  const expired = hold && (hold.status !== 'active' || left === 0);
  const mm = String(Math.floor((left || 0) / 60)).padStart(2, '0');
  const ss = String((left || 0) % 60).padStart(2, '0');

  const pay = async () => {
    setBusy(true); setError('');
    try {
      const { booking } = await api('/bookings/confirm', { method: 'POST', body: { holdId, payment: { method, simulateFailure: fail } } });
      nav(`/ticket/${booking.pnr}`, { replace: true });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const cancel = async () => { await api(`/bookings/hold/${holdId}`, { method: 'DELETE' }).catch(() => {}); nav('/'); };

  if (error && !hold) return <div className="wrap"><div className="empty"><h2>{error}</h2><Link to="/">Back to search</Link></div></div>;
  if (!hold) return <div className="wrap" style={{ padding: 40 }}>Loading...</div>;

  return (
    <div className="wrap">
      <div className="cols">
        <div className="panel">
          <div className="row between wrapflex">
            <h2 style={{ margin: 0 }}>Payment</h2>
            {!expired && <div className={`timer ${left < 60 ? 'low' : ''}`} aria-live="off" title="Time left to complete payment">{mm}:{ss}</div>}
          </div>
          {expired ? (
            <div className="notice bad" style={{ marginTop: 16 }}>
              {hold.status === 'consumed' ? 'This booking is already paid.' : 'Your seats were released because the payment window ended.'}{' '}
              <Link to="/">Search again</Link>
            </div>
          ) : (
            <>
              {hold.kind === 'WL' && <p className="notice" style={{ marginTop: 14 }}>No confirmed berths are free right now. This ticket will join the waiting list. If it is not confirmed by chart preparation (about 4 hours before departure) it is cancelled and fully refunded.</p>}
              <p className="muted">Choose a payment method. This is a simulated gateway, so no real money is charged.</p>
              <div className="methods" role="tablist">
                {[['UPI', 'UPI'], ['CARD', 'Card'], ['NETBANKING', 'Net banking'], ['WALLET', 'Wallet']].map(([k, l]) => (
                  <button key={k} role="tab" aria-selected={method === k} className="chip" aria-pressed={method === k} onClick={() => setMethod(k)}>{l}</button>
                ))}
              </div>
              {method === 'UPI' && <label className="field">UPI ID<input placeholder="name@bank" defaultValue="demo@upi" /></label>}
              {method === 'CARD' && (
                <div className="stack">
                  <label className="field">Card number<input inputMode="numeric" placeholder="4111 1111 1111 1111" defaultValue="4111 1111 1111 1111" /></label>
                  <div className="row"><label className="field grow">Expiry<input placeholder="MM/YY" defaultValue="12/30" /></label><label className="field grow">CVV<input type="password" placeholder="***" defaultValue="123" /></label></div>
                </div>
              )}
              {method === 'NETBANKING' && <label className="field">Bank<select><option>State Bank of India</option><option>HDFC Bank</option><option>ICICI Bank</option><option>Indian Bank</option></select></label>}
              {method === 'WALLET' && <label className="field">Wallet<select><option>Paytm Wallet</option><option>PhonePe Wallet</option><option>Amazon Pay</option></select></label>}
              <label className="row small" style={{ marginTop: 14 }}><input type="checkbox" checked={fail} onChange={(e) => setFail(e.target.checked)} /> Simulate a failed payment (demo only)</label>
              {error && <div className="notice bad" role="alert" style={{ marginTop: 14 }}>{error}</div>}
              <div className="row" style={{ marginTop: 18 }}>
                <button className="btn" disabled={busy} onClick={pay}>{busy ? 'Processing payment...' : `Pay ${rupee(hold.fare.grandTotal)}`}</button>
                <button className="btn ghost" disabled={busy} onClick={cancel}>Cancel booking</button>
              </div>
            </>
          )}
        </div>

        <aside className="panel">
          <h3>{hold.train.name} <span className="muted">#{hold.train.number}</span></h3>
          <p className="small muted" style={{ marginTop: -6 }}>{CLASS_LABELS[hold.classType]} ({hold.classType})</p>
          <p><b>{hold.from.name}</b><br /><span className="muted small">{fmtDateTime(hold.from.dep)}</span></p>
          <p><b>{hold.to.name}</b><br /><span className="muted small">{fmtDateTime(hold.to.arr)}</span></p>
          <hr style={{ border: 0, borderTop: '1px solid var(--line)' }} />
          {hold.passengers.map((p, i) => <div key={i} className="row between small"><span>{p.name}, {p.age}{p.gender}</span><span>{rupee(hold.fare.perPassenger[i].total)}</span></div>)}
          <div className="farelines" style={{ marginTop: 10 }}>
            <div><span>Convenience fee</span><span>{rupee(hold.fare.convenienceFee)}</span></div>
            <div className="total"><span>Total</span><span>{rupee(hold.fare.grandTotal)}</span></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
