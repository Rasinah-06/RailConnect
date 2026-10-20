import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { getSocket } from '../socket';
import { fmtTime } from '../utils';

const ROW_H = 76;

export default function Live() {
  const { number } = useParams();
  const nav = useNavigate();
  const [q, setQ] = useState(number || '');
  const [sugg, setSugg] = useState([]);
  const [demo, setDemo] = useState(false);
  const [st, setSt] = useState(null);
  const [error, setError] = useState('');
  const timer = useRef();

  useEffect(() => {
    if (!number) { setSt(null); return undefined; }
    setError(''); setSt(null);
    const s = getSocket();
    const mode = demo ? 'demo' : 'real';
    const sub = () => s.emit('live:subscribe', { trainNumber: number, mode });
    const onUpdate = (u) => { if (u && u.trainNumber === number) setSt(u); };
    api(`/live/${number}`, { params: { mode } }).then((r) => setSt(r.status)).catch((e) => setError(e.message));
    sub();
    s.on('connect', sub);
    s.on('live:update', onUpdate);
    return () => { s.off('connect', sub); s.off('live:update', onUpdate); s.emit('live:unsubscribe'); };
  }, [number, demo]);

  const suggest = (v) => {
    setQ(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => api('/trains/suggest', { params: { q: v } }).then((r) => setSugg(r.trains)).catch(() => {}), 200);
  };

  const curIdx = st ? st.stops.findIndex((s) => s.state === 'CURRENT' || s.state === 'ARRIVED') : -1;
  const lastDep = st ? st.stops.reduce((a, s, i) => (s.state === 'DEPARTED' ? i : a), -1) : -1;
  let markerY = 0;
  if (st) {
    if (st.status === 'AT_STATION' || st.status === 'ARRIVED') markerY = curIdx * ROW_H;
    else if (st.status === 'RUNNING' && lastDep >= 0) {
      const a = st.stops[lastDep]; const b = st.stops[lastDep + 1];
      const frac = b ? (st.kmCovered - a.km) / (b.km - a.km || 1) : 0;
      markerY = (lastDep + Math.min(1, Math.max(0, frac))) * ROW_H;
    }
  }
  const delayed = st && st.delayMin > 0;

  return (
    <>
      <div className="live-head">
        <div className="wrap">
          <h2 style={{ marginBottom: 12 }}>Live train status</h2>
          <form className="row wrapflex" onSubmit={(e) => { e.preventDefault(); if (q) nav(`/live/${q.trim().split(/\s/)[0]}`); }}>
            <div className="grow ac" style={{ maxWidth: 420 }}>
              <input className="input" placeholder="Train number or name" value={q} onChange={(e) => suggest(e.target.value)} aria-label="Train number or name" style={{ marginTop: 0 }} />
              {sugg.length > 0 && q && q !== number && (
                <ul>{sugg.map((t) => <li key={t.number} onMouseDown={() => { setSugg([]); setQ(t.number); nav(`/live/${t.number}`); }}><span>{t.name}</span><span className="code">{t.number}</span></li>)}</ul>
              )}
            </div>
            <button className="btn">Track</button>
            <label className="row small" style={{ color: '#b9c8da' }}><input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} /> Demo mode (whole journey in ~2.5 minutes)</label>
          </form>
        </div>
      </div>

      <div className="wrap">
        {!number && <div className="empty"><p className="muted">Enter a train number such as 12007 or 12621 to see where it is right now.</p></div>}
        {error && <div className="notice bad" style={{ marginTop: 20 }}>{error}</div>}
        {st && (
          <>
            <div className="panel" style={{ marginTop: 20 }}>
              <div className="row between wrapflex">
                <div>
                  <h3 style={{ marginBottom: 2 }}>{st.trainName} <span className="muted">#{st.trainNumber}</span></h3>
                  <div className="muted small"><span className="livedot" />Run of {st.runDate}{st.mode === 'demo' ? ' (simulated)' : ''}</div>
                </div>
                <span className={`delay ${delayed ? 'late' : 'ok'}`}>{delayed ? `${st.delayMin} min late` : 'On time'}</span>
              </div>
              <p style={{ marginBottom: 0 }}>
                {st.status === 'YET_TO_START' && 'Yet to start from the origin station.'}
                {st.status === 'AT_STATION' && <>Standing at <b>{st.currentStationName}</b>. Next stop {st.nextStationName}.</>}
                {st.status === 'RUNNING' && <>Left <b>{st.currentStationName}</b>, heading to <b>{st.nextStationName}</b>. {st.kmCovered} of {st.totalKm} km covered.</>}
                {st.status === 'ARRIVED' && <>Reached the destination, <b>{st.currentStationName}</b>.</>}
                {delayed && st.delayReason ? ` ${st.delayReason}.` : ''}
              </p>
              <div className="progress" aria-label="Journey progress"><i style={{ width: `${st.progressPct}%` }} /></div>
            </div>

            <div className="timeline" style={{ height: st.stops.length * ROW_H }}>
              <div className="tl-rail" style={{ bottom: ROW_H - 18 }} />
              <div className="tl-fill" style={{ height: markerY }} />
              {st.status !== 'YET_TO_START' && <div className="marker" style={{ top: markerY }} aria-hidden="true">{st.status === 'ARRIVED' ? 'END' : 'TRN'}</div>}
              {st.stops.map((s) => (
                <div key={s.code} className={`tl-row ${s.state}`}>
                  <div className="tl-dot" />
                  <div className="tl-name">{s.name} <span className="muted small">{s.code} &middot; {s.km} km</span></div>
                  <div className="tl-times">
                    <div className="small muted">Arr {s.schedArr && s.code !== st.stops[0].code ? (delayed ? <><s>{fmtTime(s.schedArr)}</s><span className="late">{fmtTime(s.expArr)}</span></> : fmtTime(s.schedArr)) : '--'}</div>
                    <div className="small muted">Dep {s.code !== st.stops[st.stops.length - 1].code ? (delayed ? <><s>{fmtTime(s.schedDep)}</s><span className="late">{fmtTime(s.expDep)}</span></> : fmtTime(s.schedDep)) : '--'}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
