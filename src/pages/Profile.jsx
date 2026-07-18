import { useState, useRef } from 'react';
import { getSettings, saveSettings, getDeloadTracker, saveDeloadTracker, getToday } from '../utils/storage';
import { useModalLock, useInputFocus } from '../utils/ux';
import Modal from '../components/Modal';
import logo from '../assets/fitforge_logo.png';
import { 
  Save, 
  Check,
  RotateCcw, 
  AlertTriangle, 
  ChevronLeft, 
  User, 
  Ruler, 
 
  ShieldCheck, 
  Clock, 
  Zap, 
  Sparkles,
  CalendarCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(() => getSettings());
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showReset, setShowReset] = useState(false);
  
  const [deloadTracker, setDeloadTrackerState] = useState(() => getDeloadTracker());

  const handleDeloadChange = (field, value) => {
    const updated = { ...deloadTracker, [field]: value };
    const saved = saveDeloadTracker(updated.from, updated.to);
    setDeloadTrackerState(saved);
  };

  const saveTimerRef = useRef(null);
  const handleFocus = useInputFocus();

  useModalLock(showReset);

  const handleSave = () => {
    setErrorMsg('');
    if (!settings.name || !settings.name.trim()) {
      setErrorMsg('Name cannot be empty.');
      return;
    }
    if (!settings.heightCm || isNaN(settings.heightCm) || settings.heightCm <= 0 || settings.heightCm > 300) {
      setErrorMsg('Please enter a valid height (1-300 cm).');
      return;
    }
    if (!settings.weightKg || isNaN(settings.weightKg) || settings.weightKg <= 0 || settings.weightKg > 500) {
      setErrorMsg('Please enter a valid weight (1-500 kg).');
      return;
    }

    saveSettings(settings);
    setSaved(true);
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('fitforge_'));
    keys.forEach(k => localStorage.removeItem(k));
    window.location.reload();
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div 
      className="page-content" 
      style={{ 
        paddingBottom: 'calc(var(--nav-height) + var(--safe-bottom) + 32px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 0
      }}
    >
      {/* Header with back button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button 
          onClick={() => navigate(-1)} 
          aria-label="Go back"
          style={{ 
            width: 40, 
            height: 40, 
            borderRadius: '50%', 
            background: 'var(--bg-card)', 
            border: '2px solid var(--border)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: 'pointer', 
            flexShrink: 0,
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.2s ease'
          }}
        >
          <ChevronLeft size={20} color="var(--text-primary)" strokeWidth={2.2} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', margin: 0 }}>
            Profile
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2, fontWeight: 500 }}>Your stats & settings</p>
        </div>
        <img src={logo} alt="FitForge" style={{ width: 40, height: 40, objectFit: 'contain' }} />
      </div>

      {/* Core Training Principles */}
      <div 
        className="card" 
        style={{ 
          background: 'var(--bg-card)', 
          border: '2px solid var(--border)', 
          boxShadow: 'var(--shadow-md)', 
          borderRadius: 18, 
          padding: 20, 
          marginBottom: 20 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <AlertTriangle size={18} color="var(--text-primary)" strokeWidth={2.5} />
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>Core Training Principles</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { text: 'Form is NON-NEGOTIABLE. Training near max = HIGH injury risk.', icon: <ShieldCheck size={18} color="var(--text-primary)" strokeWidth={2.2} /> },
            { text: 'Rest 3–5 minutes between heavy sets for full ATP recovery.', icon: <Clock size={18} color="var(--text-primary)" strokeWidth={2.2} /> },
            { text: 'Intensity over volume. Fewer sets, higher effort.', icon: <Zap size={18} color="var(--text-primary)" strokeWidth={2.2} /> },
            { text: 'Deload every 6 weeks. Cut volume 50% for 1 week.', icon: <Sparkles size={18} color="var(--text-primary)" strokeWidth={2.2} /> },
          ].map((item, i) => (
            <div 
              key={i} 
              style={{ 
                display: 'flex', 
                gap: 12, 
                padding: '12px 14px', 
                background: 'var(--bg-tertiary)', 
                borderRadius: 12, 
                fontSize: 13, 
                color: 'var(--text-primary)', 
                lineHeight: 1.5, 
                alignItems: 'flex-start',
                border: '2px solid var(--border-light)'
              }}
            >
              <div style={{ flexShrink: 0, marginTop: 1 }}>{item.icon}</div>
              <div style={{ fontWeight: 600 }}>{item.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Personal Settings */}
      <div 
        className="card" 
        style={{ 
          background: 'var(--bg-card)', 
          border: '2px solid var(--border)', 
          boxShadow: 'var(--shadow-md)', 
          borderRadius: 18, 
          padding: 20, 
          marginBottom: 20 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <User size={18} color="var(--text-primary)" strokeWidth={2.5} />
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>Personal Settings</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Name</label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                className="input" 
                placeholder="Your name" 
                value={settings.name || ''} 
                onChange={e => handleChange('name', e.target.value)} 
                onFocus={handleFocus}
                style={{ paddingLeft: 40, background: 'var(--bg-tertiary)', borderRadius: 12, border: '2px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
              />
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Height (cm)</label>
            <div style={{ position: 'relative' }}>
              <Ruler size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                className="input" 
                type="number" 
                inputMode="numeric" 
                min="1" 
                max="300" 
                value={settings.heightCm} 
                onChange={e => handleChange('heightCm', +e.target.value)} 
                onFocus={handleFocus}
                style={{ paddingLeft: 40, background: 'var(--bg-tertiary)', borderRadius: 12, border: '2px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
              />
            </div>
          </div>
        </div>

        {errorMsg && (
          <div style={{
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            padding: '10px 14px',
            borderRadius: 12,
            border: '2px solid var(--border)',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
            marginTop: 16
          }}>
            <AlertTriangle size={16} strokeWidth={2.4} color="var(--text-primary)" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button 
          onClick={handleSave}
          style={{
            width: '100%',
            marginTop: 24,
            padding: '14px 20px',
            borderRadius: 14,
            border: '2px solid var(--border)',
            background: saved ? 'var(--bg-tertiary)' : 'var(--text-primary)',
            color: saved ? '#333333' : '#FFFFFF',
            fontSize: 15,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            minHeight: 48,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {saved ? (
            <>
              <Check size={16} strokeWidth={3} color="#333333" />
              <span>Settings Saved</span>
            </>
          ) : (
            <>
              <Save size={16} strokeWidth={2.2} />
              <span>Save Profile</span>
            </>
          )}
        </button>
      </div>

      {/* Deload Scheduler Card */}
      <div 
        className="card" 
        style={{ 
          background: 'var(--bg-card)', 
          border: '2px solid var(--border)', 
          boxShadow: 'var(--shadow-md)', 
          borderRadius: 18, 
          padding: 20, 
          marginBottom: 20 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <CalendarCheck size={18} color="var(--text-primary)" strokeWidth={2.5} />
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>Deload Period</span>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>From</label>
            <input 
              type="date" 
              className="input" 
              style={{ 
                width: '100%', 
                padding: '10px 12px', 
                minHeight: 44, 
                borderRadius: 12, 
                border: '2px solid var(--border)', 
                boxShadow: 'var(--shadow-sm)',
                background: 'var(--bg-tertiary)', 
                color: 'var(--text-primary)',
                fontSize: 13,
                boxSizing: 'border-box'
              }}
              value={deloadTracker.from} 
              onChange={e => handleDeloadChange('from', e.target.value)} 
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>To</label>
            <input 
              type="date" 
              className="input" 
              style={{ 
                width: '100%', 
                padding: '10px 12px', 
                minHeight: 44, 
                borderRadius: 12, 
                border: '2px solid var(--border)', 
                boxShadow: 'var(--shadow-sm)',
                background: 'var(--bg-tertiary)', 
                color: 'var(--text-primary)',
                fontSize: 13,
                boxSizing: 'border-box'
              }}
              value={deloadTracker.to} 
              onChange={e => handleDeloadChange('to', e.target.value)} 
            />
          </div>
        </div>

        {deloadTracker.from && deloadTracker.to && (
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600 }}>
              {Math.max(0, Math.round((new Date(deloadTracker.to) - new Date(deloadTracker.from)) / (1000 * 60 * 60 * 24)) + 1)} days scheduled
            </span>
            <button
              onClick={() => { const cleared = saveDeloadTracker('', ''); setDeloadTrackerState(cleared); }}
              style={{
                padding: '4px 12px', borderRadius: 8, border: '1.5px solid var(--border)',
                background: 'var(--bg-card)', color: 'var(--text-secondary)',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4
              }}
            >
              <RotateCcw size={12} strokeWidth={2.2} /> Clear
            </button>
          </div>
        )}
      </div>

      {/* Reset */}
      <div 
        className="card" 
        style={{ 
          background: 'var(--bg-card)', 
          border: '2px solid var(--border)', 
          boxShadow: 'var(--shadow-md)', 
          borderRadius: 18, 
          padding: 20, 
          marginBottom: 20 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Reset All Data</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, fontWeight: 600 }}>Delete all workouts and progress</div>
          </div>
          <button 
            onClick={() => setShowReset(true)}
            style={{
              padding: '8px 16px',
              borderRadius: 12,
              border: '2px solid var(--border)',
              background: 'var(--text-primary)',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s ease',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <RotateCcw size={14} strokeWidth={2.2} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Reset Modal */}
      <Modal isOpen={showReset} onClose={() => setShowReset(false)} type="centered-alert">
        <div style={{ 
          width: 56, 
          height: 56, 
          borderRadius: '50%', 
          background: 'var(--bg-tertiary)', 
          border: '2px solid var(--border)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <AlertTriangle size={28} color="var(--text-primary)" strokeWidth={2.2} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.03em', color: 'var(--text-primary)', textAlign: 'center' }}>Reset All Data?</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5, padding: '0 8px', fontWeight: 600, textAlign: 'center' }}>
          This action cannot be undone. All workout logs, body stats, and progress will be permanently deleted.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button 
            onClick={() => setShowReset(false)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 12,
              border: '2px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            Cancel
          </button>
          <button 
            onClick={handleReset}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 12,
              border: '2px solid var(--border)',
              background: 'var(--text-primary)',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <RotateCcw size={16} strokeWidth={2.2} />
            <span>Delete Everything</span>
          </button>
        </div>
      </Modal>

      {/* Footer */}
      <div 
        style={{ 
          textAlign: 'center', 
          padding: '24px 0 8px', 
          fontSize: 12, 
          color: 'var(--text-secondary)', 
          fontWeight: 600, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: 6 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>FitForge v1.0 · Crafted with care</span>
        </div>
      </div>
    </div>
  );
}
