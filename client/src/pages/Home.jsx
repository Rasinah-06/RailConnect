import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StationInput from '../components/StationInput';
import { CLASS_LABELS, QUOTAS, todayStr } from '../utils';

const POPULAR = [
  ['MAS', 'Chennai Central', 'SBC', 'KSR Bengaluru City', 'Lalbagh, Shatabdi'],
  ['MS', 'Chennai Egmore', 'MDU', 'Madurai Jn', 'Vaigai, Pandian'],
  ['MAS', 'Chennai Central', 'NDLS', 'New Delhi', 'Tamil Nadu Express'],
  ['HWH', 'Howrah Jn', 'NDLS', 'New Delhi', 'Rajdhani'],
  ['BCT', 'Mumbai Central', 'NDLS', 'New Delhi', 'Rajdhani'],
  ['MAS', 'Chennai Central', 'TVC', 'Thiruvananthapuram', 'Chennai Mail'],
];

export default function Home() {
  const nav = useNavigate();
  const [tab, setTab] = useState('book');
  const [from, setFrom] = useState({ code: 'MAS', name: 'Chennai Central' });
  const [to, setTo] = useState({ code: 'SBC', name: 'KSR Bengaluru City' });
  const [date, setDate] = useState(todayStr(1));
  const [cls, setCls] = useState('');
  const [quota, setQuota] = useState('GN');
  const [pnr, setPnr] = useState('');
  const [train, setTrain] = useState('');
  const [error, setError] = useState('');

  const search = (e) => {
    e.preventDefault();
    if (!from || !to) return setError('Choose both stations from the suggestions.');
    if (from.code === to.code) return setError('Origin and destination must be different.');
    setError('');
    nav(`/results?${new URLSearchParams({ from: from.code, to: to.code, date, quota, ...(cls ? { class: cls } : {}) })}`);
  };

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <h1>Book a berth. Watch the seats move.</h1>
          <p>Availability, waitlists and train running status update on your screen the moment they change, so you never refresh to find out.</p>
        </div>
      </section>

      <div className="wrap">
        <section className="searchboard">
          <div className="tabs" role="tablist">
            {[['book', 'Book ticket'], ['pnr', 'PNR status'], ['live', 'Live train status']].map(([k, l]) => (
              <button key={k} className="tab" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
          <div className="body">
            {tab === 'book' && (
              <form onSubmit={search}>
                <div className="searchgrid">
                  <StationInput id="from" label="From" value={from} onChange={setFrom} />
                  <button type="button" className="swap" aria-label="Swap stations" onClick={() => { setFrom(to); setTo(from); }}>&#8646;</button>
                  <StationInput id="to" label="To" value={to} onChange={setTo} />
                  <label className="field">Date
                    <input type="date" value={date} min={todayStr()} max={todayStr(60)} onChange={(e) => setDate(e.target.value)} required />
                  </label>
                </div>
                <div className="searchgrid2">
                  <label className="field">Class
                    <select value={cls} onChange={(e) => setCls(e.target.value)}>
                      <option value="">All classes</option>
                      {Object.entries(CLASS_LABELS).map(([k, v]) => <option key={k} value={k}>{v} ({k})</option>)}
                    </select>
                  </label>
                  <label className="field">Quota
                    <select value={quota} onChange={(e) => setQuota(e.target.value)}>
                      {Object.entries(QUOTAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </label>
                  <div />
                  <button className="btn" type="submit">Search trains</button>
                </div>
                {error && <p className="err">{error}</p>}
              </form>
            )}
            {tab === 'pnr' && (
              <form className="row wrapflex" onSubmit={(e) => { e.preventDefault(); if (/^\d{10}$/.test(pnr)) nav(`/pnr/${pnr}`); else setError('PNR is a 10-digit number.'); }}>
                <label className="field grow">PNR number
                  <input inputMode="numeric" maxLength={10} value={pnr} onChange={(e) => setPnr(e.target.value.replace(/\D/g, ''))} placeholder="10-digit PNR" />
                </label>
                <button className="btn" style={{ marginTop: 20 }} type="submit">Check status</button>
                {error && <span className="err">{error}</span>}
              </form>
            )}
            {tab === 'live' && (
              <form className="row wrapflex" onSubmit={(e) => { e.preventDefault(); if (train) nav(`/live/${train}`); }}>
                <label className="field grow">Train number
                  <input inputMode="numeric" maxLength={5} value={train} onChange={(e) => setTrain(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 12007" />
                </label>
                <button className="btn" style={{ marginTop: 20 }} type="submit">Track train</button>
              </form>
            )}
          </div>
        </section>

        <h2 style={{ marginTop: 44 }}>Popular routes</h2>
        <div className="routes">
          {POPULAR.map(([a, an, b, bn, note]) => (
            <Link key={a + b} to={`/results?${new URLSearchParams({ from: a, to: b, date: todayStr(1), quota: 'GN' })}`}>
              <span>{an} to {bn}</span><span className="muted small">{note}</span>
            </Link>
          ))}
        </div>

        <div className="features">
          <div><h3>Seats that update live</h3><p>When someone books or cancels, the availability on your screen changes instantly.</p></div>
          <div><h3>Fair waitlists</h3><p>Cancelled berths go to the oldest waitlisted passenger automatically, and you get a notification.</p></div>
          <div><h3>Time to pay, held for you</h3><p>Seats are locked for five minutes while you pay, so nobody takes them mid-checkout.</p></div>
        </div>
      </div>
    </>
  );
}
