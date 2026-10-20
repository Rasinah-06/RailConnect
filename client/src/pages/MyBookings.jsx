import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { fmtDateTime, rupee } from '../utils';

export default function MyBookings() {
  const { lastEvent } = useAuth();
  const [list, setList] = useState(null);
  const [tab, setTab] = useState('upcoming');
  useEffect(() => { api('/bookings/mine').then((r) => setList(r.bookings)); }, [lastEvent]);

  const now = Date.now();
  const shown = (list || []).filter((b) => (tab === 'cancelled' ? b.status === 'CANCELLED' : tab === 'upcoming' ? b.status !== 'CANCELLED' && new Date(b.departureAt) > now : b.status !== 'CANCELLED' && new Date(b.departureAt) <= now));

  return (
    <div className="wrap" style={{ padding: '28px 20px 60px' }}>
      <h2>My bookings</h2>
      <div className="tabs-line" role="tablist">
        {['upcoming', 'completed', 'cancelled'].map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>{t}</button>)}
      </div>
      {!list && <p className="muted">Loading...</p>}
      {list && shown.length === 0 && <div className="empty"><p className="muted">No {tab} journeys. <Link to="/">Book a ticket</Link></p></div>}
      {shown.map((b) => (
        <Link key={b._id} to={`/ticket/${b.pnr}`} className="panel row between wrapflex" style={{ textDecoration: 'none', color: 'inherit', marginBottom: 10 }}>
          <div>
            <b className="num" style={{ fontSize: '1.2rem' }}>{b.trainName}</b> <span className="muted">#{b.trainNumber}</span>
            <div>{b.from.name} &rarr; {b.to.name}</div>
            <div className="small muted">{fmtDateTime(b.departureAt)} &middot; PNR {b.pnr} &middot; {b.passengers.length} passenger(s)</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className={`badge ${b.status === 'CONFIRMED' ? 'go' : b.status === 'WAITLISTED' ? 'wait' : 'stop'}`}>{b.status}</span>
            <div>{rupee(b.fare.grandTotal)}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
