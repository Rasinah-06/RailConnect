import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { getSocket } from '../socket';
import { CLASS_LABELS, QUOTAS, TRAIN_TYPES, addDaysStr, availClass, dayLetters, fmtDate, fmtDateLong, fmtTime, rupee, todayStr } from '../utils';

export default function Results() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const q = { from: sp.get('from'), to: sp.get('to'), date: sp.get('date'), quota: sp.get('quota') || 'GN', class: sp.get('class') || '' };
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null); // { number, type }
  const [strip, setStrip] = useState(null); // { days, selected }
  const [flash, setFlash] = useState({});
  const prevText = useRef({});

  const setParam = (patch) => nav(`/results?${new URLSearchParams({ ...Object.fromEntries(sp), ...patch })}`);

  useEffect(() => {
    let live = true;
    setLoading(true); setError(''); setOpen(null); setStrip(null);
    api('/trains/search', { params: q })
      .then((d) => { if (live) setData(d); })
      .catch((e) => { if (live) { setError(e.message); setData(null); } })
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [sp.toString()]); // eslint-disable-line

  // Real-time availability for every train on screen
  useEffect(() => {
    if (!data?.trains?.length) return undefined;
    const s = getSocket();
    const rooms = data.trains.map((t) => ({ trainNumber: t.number, runDate: t.runDate }));
    const sub = () => rooms.forEach((r) => s.emit('availability:subscribe', r));
    sub();
    s.on('connect', sub);

    const onUpdate = ({ trainNumber, runDate, availability }) => {
      setData((d) => d && ({
        ...d,
        trains: d.trains.map((t) => t.number !== trainNumber || t.runDate !== runDate ? t : {
          ...t,
          classes: t.classes.map((c) => {
            const next = availability[c.type];
            if (!next) return c;
            const k = `${trainNumber}|${runDate}|${c.type}`;
            if (prevText.current[k] && prevText.current[k] !== next.text) {
              setFlash((f) => ({ ...f, [k]: Date.now() }));
              setTimeout(() => setFlash((f) => { const { [k]: _, ...rest } = f; return rest; }), 1500);
            }
            prevText.current[k] = next.text;
            return { ...c, availability: next };
          }),
        }),
      }));
    };
    data.trains.forEach((t) => t.classes.forEach((c) => { prevText.current[`${t.number}|${t.runDate}|${c.type}`] = c.availability.text; }));
    s.on('availability:update', onUpdate);
    return () => {
      s.off('connect', sub);
      s.off('availability:update', onUpdate);
      rooms.forEach((r) => s.emit('availability:unsubscribe', r));
    };
  }, [data?.trains?.map((t) => t.number + t.runDate).join(',')]); // eslint-disable-line

  const openClass = async (t, c) => {
    if (open?.number === t.number && open?.type === c.type) { setOpen(null); return; }
    setOpen({ number: t.number, type: c.type });
    setStrip(null);
    try {
      const r = await api('/trains/availability', { params: { train: t.number, from: q.from, to: q.to, class: c.type, date: q.date } });
      setStrip({ days: r.days, selected: r.days.find((d) => d.date === q.date)?.date || r.days[0]?.date });
    } catch (e) { setError(e.message); }
  };

  const goBook = (t, c, date) => nav(`/book?${new URLSearchParams({ train: t.number, from: q.from, to: q.to, date, class: c.type, quota: q.quota })}`);

  const fromName = data?.trains?.[0]?.from.name || q.from;
  const toName = data?.trains?.[0]?.to.name || q.to;

  return (
    <>
      <div className="summary">
        <div className="wrap row between wrapflex">
          <div>
            <div className="route">{fromName} &rarr; {toName}</div>
            <div style={{ color: '#b9c8da' }}>{q.date && fmtDateLong(q.date + 'T12:00:00+05:30')} &middot; {QUOTAS[q.quota]}</div>
          </div>
          <div className="datenav">
            <button disabled={q.date <= todayStr()} onClick={() => setParam({ date: addDaysStr(q.date, -1) })}>&larr; Previous day</button>
            <button onClick={() => setParam({ date: addDaysStr(q.date, 1) })}>Next day &rarr;</button>
          </div>
        </div>
      </div>

      <div className="wrap" style={{ paddingBottom: 60 }}>
        <div className="filters" role="group" aria-label="Filter by class">
          <button className="chip" aria-pressed={!q.class} onClick={() => setParam({ class: '' })}>All classes</button>
          {Object.keys(CLASS_LABELS).map((k) => <button key={k} className="chip" aria-pressed={q.class === k} onClick={() => setParam({ class: k })}>{k}</button>)}
          <span className="muted small" style={{ marginLeft: 'auto', alignSelf: 'center' }}><span className="livedot" />Availability updates live</span>
        </div>

        {loading && <div className="empty muted">Searching trains...</div>}
        {error && !loading && <div className="notice bad">{error}</div>}
        {!loading && data && data.count === 0 && (
          <div className="empty">
            <h3>No trains found for this date</h3>
            <p className="muted">Try the next day, remove the class filter, or check the stations. <Link to="/">New search</Link></p>
          </div>
        )}

        {data?.trains?.map((t) => (
          <article className="trainrow" key={t.number + t.runDate}>
            <div className="top">
              <div>
                <span className="tname">{t.name}</span> <span className="muted">#{t.number}</span>
                <div className="small muted">
                  {TRAIN_TYPES[t.type]} &middot; {t.distanceKm} km
                  <span className="days" aria-label="Runs on">{dayLetters.map((d, i) => <i key={i} className={t.runsOn.includes(i) ? 'on' : ''}>{d}</i>)}</span>
                </div>
                <Link className="small" to={`/live/${t.number}`}>Track live</Link>
              </div>
              <div className="times">
                <div><div className="t">{fmtTime(t.from.dep)}</div><div className="small muted">{t.from.code} &middot; {fmtDate(t.from.dep)}</div></div>
                <div className="dur">{t.duration}</div>
                <div style={{ textAlign: 'right' }}><div className="t">{fmtTime(t.to.arr)}</div><div className="small muted">{t.to.code} &middot; {fmtDate(t.to.arr)}</div></div>
              </div>
            </div>

            <div className="classes">
              {t.classes.map((c) => {
                const k = `${t.number}|${t.runDate}|${c.type}`;
                const expanded = open?.number === t.number && open?.type === c.type;
                return (
                  <button key={c.type} className={`cchip ${flash[k] ? 'flash' : ''}`} aria-expanded={expanded} onClick={() => openClass(t, c)}>
                    <span className="cc"><span>{c.label} ({c.type})</span><span>{rupee(c.fare)}</span></span>
                    <span className={`av ${availClass(c.availability)}`}>{c.availability.text}</span>
                  </button>
                );
              })}
            </div>

            {open?.number === t.number && (
              <>
                {!strip && <div className="strip muted">Loading dates...</div>}
                {strip && (
                  <>
                    <div className="strip" role="group" aria-label="Availability by date">
                      {strip.days.map((d) => (
                        <button key={d.date} className={strip.selected === d.date ? 'sel' : ''} onClick={() => setStrip({ ...strip, selected: d.date })}>
                          <div className="d">{fmtDate(d.date + 'T12:00:00+05:30')}</div>
                          <div className={`a ${availClass(d.availability)}`}>{d.availability.text}</div>
                        </button>
                      ))}
                    </div>
                    <div className="book-bar">
                      {(() => {
                        const sel = strip.days.find((d) => d.date === strip.selected);
                        const c = t.classes.find((x) => x.type === open.type);
                        return (
                          <>
                            <span className="muted">{c.label} from {rupee(c.fare)} per passenger</span>
                            <button className="btn" disabled={!sel || sel.availability.status === 'REGRET'} onClick={() => goBook(t, c, strip.selected)}>
                              {sel?.availability.status === 'WL' ? 'Book (waitlist)' : 'Book now'}
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </>
                )}
              </>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
