import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, UtensilsCrossed, TrendingUp, ClipboardList } from 'lucide-react';
import { lazy, Suspense, useEffect } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Workout = lazy(() => import('./pages/Workout'));
const Diet = lazy(() => import('./pages/Diet'));
const Progress = lazy(() => import('./pages/Progress'));
const Profile = lazy(() => import('./pages/Profile'));
const WorkoutSheets = lazy(() => import('./pages/WorkoutSheets'));

function LoadingSpinner() {
  return (
    <div className="page-content flex items-center justify-center" style={{ minHeight: '60vh' }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid var(--border)',
        borderTopColor: 'var(--accent-blue)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Home' },
  { path: '/workout', icon: Dumbbell, label: 'Workout' },
  { path: '/diet', icon: UtensilsCrossed, label: 'Diet' },
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
            <Route path="/workout" element={<Workout />} />
            <Route path="/diet" element={<Diet />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/sheets" element={<WorkoutSheets />} />
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
