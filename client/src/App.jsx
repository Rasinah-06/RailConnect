import { Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import RequireAuth from './components/RequireAuth';
import Home from './pages/Home';
import Results from './pages/Results';
import Book from './pages/Book';
import Pay from './pages/Pay';
import Ticket from './pages/Ticket';
import MyBookings from './pages/MyBookings';
import Pnr from './pages/Pnr';
import Live from './pages/Live';
import Auth from './pages/Auth';
import Admin from './pages/Admin';

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/results" element={<Results />} />
          <Route path="/book" element={<RequireAuth><Book /></RequireAuth>} />
          <Route path="/pay/:holdId" element={<RequireAuth><Pay /></RequireAuth>} />
          <Route path="/ticket/:pnr" element={<RequireAuth><Ticket /></RequireAuth>} />
          <Route path="/bookings" element={<RequireAuth><MyBookings /></RequireAuth>} />
          <Route path="/pnr" element={<Pnr />} />
          <Route path="/pnr/:pnr" element={<Pnr />} />
          <Route path="/live" element={<Live />} />
          <Route path="/live/:number" element={<Live />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/register" element={<Auth mode="register" />} />
          <Route path="/admin" element={<RequireAuth admin><Admin /></RequireAuth>} />
          <Route path="*" element={<div className="wrap empty"><h2>Page not found</h2><a href="/">Back to search</a></div>} />
        </Routes>
      </main>
      <footer className="footer noprint">
        <div className="wrap">
          RailConnect is a student project built for learning. Train schedules, fares and payments are simulated sample data and are not affiliated with IRCTC or Indian Railways.
        </div>
      </footer>
    </>
  );
}
