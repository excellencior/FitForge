import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Play, ClipboardList, TrendingUp, StickyNote } from 'lucide-react';
import { lazy, Suspense, useEffect } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Workout = lazy(() => import('./pages/Workout'));
const Notes = lazy(() => import('./pages/Notes'));
const Progress = lazy(() => import('./pages/Progress'));
const Profile = lazy(() => import('./pages/Profile'));
const WorkoutSheets = lazy(() => import('./pages/WorkoutSheets'));

function LoadingSpinner() {
  return (
    <div className="page-content flex items-center justify-center" style={{ minHeight: '60vh' }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid var(--border-light)',
        borderTopColor: 'var(--text-primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Home' },
  { path: '/track', icon: Play, label: 'Track' },
  { path: '/notes', icon: StickyNote, label: 'Notes' },
  { path: '/routines', icon: ClipboardList, label: 'Routines' },
  { path: '/progress', icon: TrendingUp, label: 'Progress' },
];

export default function App() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="app-container">
      <div key={location.pathname} className="route-transition-wrapper">
        <Suspense fallback={<LoadingSpinner />}>
          <Routes location={location}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/track" element={<Workout />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/routines" element={<WorkoutSheets />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </Suspense>
      </div>

      <nav className="bottom-nav">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <div className="nav-icon-wrap">
              <Icon size={20} strokeWidth={2} />
            </div>
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
