import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { fmtDateTime } from '../utils';

export default function Pnr() {
  const { pnr: param } = useParams();
  const nav = useNavigate();
  const [pnr, setPnr] = useState(param || '');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!param) { setData(null); return; }
    setError('');
    api(`/pnr/${param}`).then(setData).catch((e) => { setData(null); setError(e.message); });
  }, [param]);

  return (
    <div className="wrap" style={{ padding: '28px 20px 60px', maxWidth: 760 }}>
      <h2>PNR status</h2>
      <form className="row wrapflex" onSubmit={(e) => { e.preventDefault(); if (/^\d{10}$/.test(pnr)) nav(`/pnr/${pnr}`); else setError('PNR is a 10-digit number.'); }}>
        <label className="field grow">PNR number<input inputMode="numeric" maxLength={10} value={pnr} onChange={(e) => setPnr(e.target.value.replace(/\D/g, ''))} /></label>
        <button className="btn" style={{ marginTop: 20 }}>Check status</button>
      </form>
      {error && <div className="notice bad" style={{ marginTop: 16 }}>{error}</div>}
      {data && (
        <div className="panel" style={{ marginTop: 20 }}>
          <h3>{data.train.name} <span className="muted">#{data.train.number}</span></h3>
          <p>{data.from.name} &rarr; {data.to.name}<br /><span className="muted small">Departs {fmtDateTime(data.from.dep)} &middot; Class {data.classType}</span></p>
          <table className="t">
            <thead><tr><th>Passenger</th><th>Booking status</th><th>Current status</th></tr></thead>
            <tbody>{data.passengers.map((p) => <tr key={p.no}><td>Passenger {p.no}</td><td>{p.bookingStatus}</td><td><b>{p.currentStatus}</b></td></tr>)}</tbody>
          </table>
          <p className="small muted">Chart {data.chartPrepared ? 'prepared' : 'not prepared yet'}. Waiting list for this class: {data.waitlistSize}.</p>
        </div>
      )}
    </div>
  );
}
