import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fmtDateTime } from '../utils';

export default function Navbar() {
  const { user, logout, notifications, unread, markAllRead } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  const links = [
    ['/', 'Book ticket', true],
    ['/pnr', 'PNR status'],
    ['/live', 'Live status'],
    ...(user ? [['/bookings', 'My bookings']] : []),
    ...(user?.role === 'admin' ? [['/admin', 'Admin']] : []),
  ];

  return (
    <>
      <header className="topbar">
        <div className="wrap">
          <Link to="/" className="logo">RailConnect</Link>
          <nav className="nav" aria-label="Main">
            {links.map(([to, label, end]) => <NavLink key={to} to={to} end={end}>{label}</NavLink>)}
          </nav>
          <div style={{ flex: 1 }} className="mobile-spacer" />
          {user && (
            <div className="menu-anchor">
              <button className="bell" aria-label={`Notifications, ${unread} unread`} onClick={() => { setOpen((o) => !o); }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
                {unread > 0 && <span className="dot">{unread}</span>}
              </button>
              {open && (
                <div className="dropdown">
                  <div className="head">
                    <span>Notifications</span>
                    {unread > 0 && <button className="btn small ghost" onClick={markAllRead}>Mark all read</button>}
                  </div>
                  {notifications.length === 0 && <div className="item muted">Booking, waitlist and delay updates will show up here as they happen.</div>}
                  {notifications.map((n) => (
                    <div key={n._id} className={`item ${n.read ? '' : 'unread'}`} onClick={() => { if (n.pnr) { setOpen(false); nav(`/ticket/${n.pnr}`); } }} style={{ cursor: n.pnr ? 'pointer' : 'default' }}>
                      <b>{n.title}</b>
                      {n.body}
                      <div className="muted small">{fmtDateTime(n.createdAt)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {user ? (
            <>
              <span className="small" style={{ color: '#cdd8e6' }}>{user.name.split(' ')[0]}</span>
              <button className="btn small ghost" style={{ color: '#fff', borderColor: '#456' }} onClick={() => { logout(); nav('/'); }}>Log out</button>
            </>
          ) : (
            <Link className="btn small" to="/login">Log in</Link>
          )}
        </div>
        <nav className="mobile-nav" aria-label="Main mobile">
          {links.map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}
        </nav>
      </header>
    </>
  );
}
