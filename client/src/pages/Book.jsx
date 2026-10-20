import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { BERTHS, BERTH_BY_CLASS, CLASS_LABELS, QUOTAS, availClass, fmtDateLong, rupee } from '../utils';

const blank = () => ({ name: '', age: '', gender: 'M', berthPref: 'NP' });

export default function Book() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { user, setUser } = useAuth();
  const p = { train: sp.get('train'), from: sp.get('from'), to: sp.get('to'), date: sp.get('date'), cls: sp.get('class'), quota: sp.get('quota') || 'GN' };

  const [train, setTrain] = useState(null);
  const [avail, setAvail] = useState(null);
  const [quota, setQuota] = useState(p.quota);
  const [pax, setPax] = useState([blank()]);
  const [phone, setPhone] = useState(user?.phone || '');
  const [fare, setFare] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/trains/${p.train}`).then((r) => setTrain(r.train)).catch((e) => setError(e.message));
    api('/trains/availability', { params: { train: p.train, from: p.from, to: p.to, class: p.cls, date: p.date } })
      .then((r) => setAvail(r.days.find((d) => d.date === p.date)?.availability || null)).catch(() => {});
  }, []); // eslint-disable-line

  // live fare preview
  useEffect(() => {
    const t = setTimeout(() => {
      api('/trains/fare', { method: 'POST', body: { trainNumber: p.train, from: p.from, to: p.to, classType: p.cls, quota, passengers: pax.map((x) => ({ age: Number(x.age) || 30, gender: x.gender })) } })
        .then((r) => setFare(r.fare)).catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [pax.map((x) => `${x.age}${x.gender}`).join(','), quota]); // eslint-disable-line

  const fromStop = train?.route.find((s) => s.station === p.from);
  const toStop = train?.route.find((s) => s.station === p.to);

  const update = (i, patch) => setPax((arr) => arr.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    for (const [i, x] of pax.entries()) {
      if (!/^[A-Za-z .'-]{2,}$/.test(x.name.trim())) return setError(`Passenger ${i + 1}: enter the name using letters only.`);
      if (!(Number(x.age) >= 5)) return setError(`Passenger ${i + 1}: age must be 5 or above. Children under 5 travel free without a berth.`);
    }
    if (!/^[6-9]\d{9}$/.test(phone)) return setError('Enter a valid 10-digit mobile number.');
    setBusy(true);
    try {
      const { hold } = await api('/bookings/hold', {
        method: 'POST',
        body: { trainNumber: p.train, from: p.from, to: p.to, date: p.date, classType: p.cls, quota, contact: { phone, email: user?.email || '' }, passengers: pax.map((x) => ({ ...x, name: x.name.trim(), age: Number(x.age) })) },
      });
      nav(`/pay/${hold.id}`);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const savePassenger = async (x) => {
    try {
      const r = await api('/auth/passengers', { method: 'POST', body: { name: x.name, age: Number(x.age), gender: x.gender, berthPref: x.berthPref } });
      setUser({ ...user, savedPassengers: r.savedPassengers });
    } catch (err) { setError(err.message); }
  };

  const berths = BERTH_BY_CLASS[p.cls] || ['NP'];

  return (
    <div className="wrap">
      <form className="cols" onSubmit={submit}>
        <div className="stack">
          <div className="panel">
            <h2>Passenger details</h2>
            {user?.savedPassengers?.length > 0 && (
              <div className="row wrapflex" style={{ marginBottom: 10 }}>
                <span className="small muted">Saved passengers:</span>
                {user.savedPassengers.map((s) => (
                  <button type="button" key={s._id} className="chip" disabled={pax.length >= 6}
                    onClick={() => setPax((arr) => (arr.length === 1 && !arr[0].name ? [{ name: s.name, age: s.age, gender: s.gender, berthPref: 'NP' }] : [...arr, { name: s.name, age: s.age, gender: s.gender, berthPref: 'NP' }]))}>
                    + {s.name}
                  </button>
                ))}
              </div>
            )}
            {pax.map((x, i) => (
              <div className="pax" key={i}>
                <label className="field">Name<input value={x.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="As on ID proof" required /></label>
                <label className="field">Age<input type="number" min="5" max="125" value={x.age} onChange={(e) => update(i, { age: e.target.value })} required /></label>
                <label className="field">Gender
                  <select value={x.gender} onChange={(e) => update(i, { gender: e.target.value })}><option value="M">Male</option><option value="F">Female</option><option value="T">Transgender</option></select>
                </label>
                <label className="field">Berth preference
                  <select value={x.berthPref} onChange={(e) => update(i, { berthPref: e.target.value })}>{berths.map((b) => <option key={b} value={b}>{BERTHS[b]}</option>)}</select>
                </label>
                <div className="row">
                  {x.name && x.age && !user?.savedPassengers?.some((s) => s.name === x.name && s.age === Number(x.age)) && (
                    <button type="button" className="btn small ghost" onClick={() => savePassenger(x)}>Save</button>
                  )}
                  {pax.length > 1 && <button type="button" className="btn small ghost" aria-label={`Remove passenger ${i + 1}`} onClick={() => setPax((a) => a.filter((_, j) => j !== i))}>Remove</button>}
                </div>
              </div>
            ))}
            <div style={{ marginTop: 14 }}>
              <button type="button" className="btn ghost" disabled={pax.length >= 6} onClick={() => setPax((a) => [...a, blank()])}>Add passenger ({pax.length}/6)</button>
            </div>
          </div>

          <div className="panel">
            <h3>Contact and quota</h3>
            <div className="row wrapflex">
              <label className="field grow">Mobile number (ticket updates are sent here)
                <input inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} required />
              </label>
              <label className="field grow">Quota
                <select value={quota} onChange={(e) => setQuota(e.target.value)}>{Object.entries(QUOTAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              </label>
            </div>
            {quota === 'TQ' && <p className="notice" style={{ marginTop: 12 }}>Tatkal tickets add a premium and are not refundable once confirmed.</p>}
          </div>
          {error && <div className="notice bad" role="alert">{error}</div>}
        </div>

        <aside className="panel sticky">
          {train && fromStop && toStop ? (
            <>
              <h3>{train.name} <span className="muted">#{train.number}</span></h3>
              <p className="small muted" style={{ marginTop: -6 }}>{CLASS_LABELS[p.cls]} ({p.cls}) &middot; {fmtDateLong(p.date + 'T12:00:00+05:30')}</p>
              <div className="row between" style={{ margin: '12px 0' }}>
                <div><div className="num" style={{ fontSize: '1.6rem' }}>{fromStop.dep}</div><div className="small muted">{fromStop.name}</div></div>
                <div style={{ textAlign: 'right' }}><div className="num" style={{ fontSize: '1.6rem' }}>{toStop.arr}</div><div className="small muted">{toStop.name}{toStop.day > fromStop.day ? ` (+${toStop.day - fromStop.day}d)` : ''}</div></div>
              </div>
              {avail && <p><span className={`badge ${availClass(avail)}`}>{avail.text}</span> <span className="muted small">right now</span></p>}
              {avail?.status === 'WL' && <p className="notice">No confirmed berths left. You can still book and join the waiting list; if a berth frees up you are confirmed automatically.</p>}
            </>
          ) : <p className="muted">Loading train...</p>}

          {fare && (
            <div className="farelines" style={{ marginTop: 14 }}>
              <div><span>Base fare</span><span>{rupee(fare.perPassenger.reduce((s, f) => s + f.base, 0))}</span></div>
              <div><span>Reservation + superfast</span><span>{rupee(fare.perPassenger.reduce((s, f) => s + f.reservation + f.superfast, 0))}</span></div>
              {fare.perPassenger.some((f) => f.tatkal) && <div><span>Tatkal charge</span><span>{rupee(fare.perPassenger.reduce((s, f) => s + f.tatkal, 0))}</span></div>}
              {fare.perPassenger.some((f) => f.gst) && <div><span>GST (5%)</span><span>{rupee(fare.perPassenger.reduce((s, f) => s + f.gst, 0))}</span></div>}
              <div><span>Payment convenience fee</span><span>{rupee(fare.convenienceFee)}</span></div>
              <div className="total"><span>Total</span><span>{rupee(fare.grandTotal)}</span></div>
            </div>
          )}
          <button className="btn" style={{ width: '100%', marginTop: 16 }} disabled={busy} type="submit">{busy ? 'Locking your seats...' : 'Review and pay'}</button>
          <p className="small muted" style={{ marginBottom: 0 }}>Seats are locked for 5 minutes once you continue.</p>
        </aside>
      </form>
    </div>
  );
}
