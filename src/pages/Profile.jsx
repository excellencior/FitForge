import { useState, useRef } from 'react';
import { getSettings, saveSettings, calculateTDEE, getDeloadTracker, updateDeloadTracker, getToday } from '../utils/storage';
import { useModalLock, useInputFocus } from '../utils/ux';
import Modal from '../components/Modal';
import logo from '../assets/fitforge_logo.png';
import { 
  Save, 
  RotateCcw, 
  AlertTriangle, 
  Target, 
  Heart, 
  ChevronLeft, 
  User, 
  Ruler, 
  Scale, 
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

  const handleDeloadDateChange = (dateStr) => {
    const updated = updateDeloadTracker(dateStr);
    setDeloadTrackerState(updated);
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
    if (!settings.calorieTarget || isNaN(settings.calorieTarget) || settings.calorieTarget <= 0) {
      setErrorMsg('Please enter a valid daily calorie target.');
      return;
    }
    if (settings.proteinTarget === undefined || isNaN(settings.proteinTarget) || settings.proteinTarget < 0) {
      setErrorMsg('Please enter a valid protein target.');
      return;
    }
    if (settings.carbsTarget === undefined || isNaN(settings.carbsTarget) || settings.carbsTarget < 0) {
      setErrorMsg('Please enter a valid carbs target.');
      return;
    }
    if (settings.fatTarget === undefined || isNaN(settings.fatTarget) || settings.fatTarget < 0) {
      setErrorMsg('Please enter a valid fat target.');
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
          <AlertTriangle size={18} color="#FF9500" strokeWidth={2.5} />
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>Core Training Principles</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { text: 'Form is NON-NEGOTIABLE. Training near max = HIGH injury risk.', icon: <ShieldCheck size={18} color="#FF3B30" strokeWidth={2.2} /> },
            { text: 'Rest 3–5 minutes between heavy sets for full ATP recovery.', icon: <Clock size={18} color="#007AFF" strokeWidth={2.2} /> },
            { text: 'Intensity over volume. Fewer sets, higher effort.', icon: <Zap size={18} color="#FF9500" strokeWidth={2.2} /> },
            { text: 'Deload every 6 weeks. Cut volume 50% for 1 week.', icon: <Sparkles size={18} color="#5856D6" strokeWidth={2.2} /> },
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
                alignItems: 'flex-start' 
              }}
            >
              <div style={{ flexShrink: 0, marginTop: 1 }}>{item.icon}</div>
              <div style={{ fontWeight: 555 }}>{item.text}</div>
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
          <User size={18} color="#007AFF" strokeWidth={2.5} />
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>Personal Settings</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6 }}>Name</label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="var(--text-tertiary)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
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
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6 }}>Height (cm)</label>
              <div style={{ position: 'relative' }}>
                <Ruler size={16} color="var(--text-tertiary)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
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
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6 }}>Weight (kg)</label>
              <div style={{ position: 'relative' }}>
                <Scale size={16} color="var(--text-tertiary)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  className="input" 
                  type="number" 
                  inputMode="decimal" 
                  min="1" 
                  step="0.1" 
                  value={settings.weightKg} 
                  onChange={e => handleChange('weightKg', +e.target.value)} 
                  onFocus={handleFocus}
                  style={{ paddingLeft: 40, background: 'var(--bg-tertiary)', borderRadius: 12, border: '2px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
                />
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6 }}>Daily Calorie Target</label>
            <div style={{ position: 'relative' }}>
              <Target size={16} color="var(--text-tertiary)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                className="input" 
                type="number" 
                inputMode="numeric" 
                min="1" 
                value={settings.calorieTarget} 
                onChange={e => handleChange('calorieTarget', +e.target.value)} 
                onFocus={handleFocus}
                style={{ paddingLeft: 40, background: 'var(--bg-tertiary)', borderRadius: 12, border: '2px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
              />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: '#34C759' }} />
              <span>TDEE recommendation: <strong>{calculateTDEE(settings.weightKg, settings.heightCm, 25)} kcal</strong></span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Protein (g)</label>
              <input 
                className="input" 
                type="number" 
                inputMode="numeric" 
                min="0" 
                value={settings.proteinTarget} 
                onChange={e => handleChange('proteinTarget', +e.target.value)} 
                onFocus={handleFocus}
                style={{ background: 'var(--accent-blue-light)', borderRadius: 12, border: '2px solid var(--border)', boxShadow: 'var(--shadow-sm)', textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Carbs (g)</label>
              <input 
                className="input" 
                type="number" 
                inputMode="numeric" 
                min="0" 
                value={settings.carbsTarget} 
                onChange={e => handleChange('carbsTarget', +e.target.value)} 
                onFocus={handleFocus}
                style={{ background: 'var(--warning-light)', borderRadius: 12, border: '2px solid var(--border)', boxShadow: 'var(--shadow-sm)', textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Fat (g)</label>
              <input 
                className="input" 
                type="number" 
                inputMode="numeric" 
                min="0" 
                value={settings.fatTarget} 
                onChange={e => handleChange('fatTarget', +e.target.value)} 
                onFocus={handleFocus}
                style={{ background: 'var(--danger-light)', borderRadius: 12, border: '2px solid var(--border)', boxShadow: 'var(--shadow-sm)', textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}
              />
            </div>
          </div>
        </div>

        {errorMsg && (
          <div style={{
            backgroundColor: '#FFEBEE',
            color: '#FF3B30',
            padding: '10px 14px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
            marginTop: 16
          }}>
            <AlertTriangle size={16} strokeWidth={2.4} />
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
            background: saved ? 'var(--success-light)' : 'var(--accent-purple)',
            color: saved ? 'var(--success)' : '#FFFFFF',
            fontSize: 15,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)',
            minHeight: 48,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {saved ? (
            <>
              <span style={{ fontSize: 16 }}>✓</span>
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
          <CalendarCheck size={18} color="var(--accent-blue)" strokeWidth={2.5} />
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>Deload Scheduler</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6 }}>Cycle Start Date</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input 
                type="date" 
                className="input" 
                style={{ 
                  flex: 1, 
                  padding: '10px 14px', 
                  minHeight: 44, 
                  borderRadius: 12, 
                  border: '2px solid var(--border)', 
                  boxShadow: 'var(--shadow-sm)',
                  background: 'var(--bg-tertiary)', 
                  color: 'var(--text-primary)',
                  fontSize: 14 
                }}
                value={deloadTracker.startDate} 
                onChange={e => handleDeloadDateChange(e.target.value)} 
              />
              <button 
                onClick={() => handleDeloadDateChange(getToday())}
                style={{
                  padding: '0 16px',
                  borderRadius: 12,
                  border: '2px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <RotateCcw size={14} strokeWidth={2.2} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--bg-tertiary)', padding: '12px 14px', borderRadius: 12, border: '2px solid var(--border)', boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700 }}>
                {deloadTracker.isDeloadWeek ? 'Deload Week 🎉' : `Week ${deloadTracker.currentWeek} of 7`}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                Cycle {deloadTracker.completedCycles + 1} · {deloadTracker.isDeloadWeek ? 'Focus on light active recovery' : `${7 - deloadTracker.currentWeek} weeks until deload`}
              </div>
            </div>
            <span className="badge" style={{ background: deloadTracker.isDeloadWeek ? 'var(--warning-light)' : 'var(--accent-blue-light)', color: deloadTracker.isDeloadWeek ? 'var(--warning)' : 'var(--accent-blue)', fontWeight: 700, border: '2px solid var(--border)' }}>
              {deloadTracker.isDeloadWeek ? 'Deloading' : 'Training'}
            </span>
          </div>

          {/* Week dots schedule representation */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginTop: 4 }}>
            {[1, 2, 3, 4, 5, 6, 7].map((w) => {
              const isCurrent = w === deloadTracker.currentWeek;
              const isPast = w < deloadTracker.currentWeek;
              const isDeload = w === 7;
              
              let bgColor = 'var(--bg-tertiary)';
              let textColor = 'var(--text-tertiary)';
              let border = '2.2px solid var(--border)';
              
              if (isDeload) {
                border = '2.2px dashed var(--border)';
                if (isCurrent) {
                  bgColor = 'var(--warning)';
                  textColor = 'var(--text-primary)';
                } else if (isPast) {
                  bgColor = 'var(--warning-light)';
                  textColor = 'var(--warning)';
                } else {
                  bgColor = 'var(--bg-card)';
                  textColor = 'var(--warning)';
                }
              } else {
                if (isCurrent) {
                  bgColor = 'var(--accent-blue)';
                  textColor = '#FFFFFF';
                } else if (isPast) {
                  bgColor = 'var(--accent-blue-light)';
                  textColor = 'var(--accent-blue)';
                } else {
                  bgColor = 'var(--bg-tertiary)';
                  textColor = 'var(--text-tertiary)';
                }
              }
              
              return (
                <div 
                  key={w} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    gap: 4 
                  }}
                >
                  <div 
                    style={{ 
                      width: '100%', 
                      aspectRatio: '1/1', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      background: bgColor, 
                      color: textColor, 
                      fontSize: 13, 
                      fontWeight: 700,
                      border: border,
                      boxShadow: isCurrent ? 'var(--shadow-sm)' : 'none'
                    }}
                  >
                    {w}
                  </div>
                  <span style={{ fontSize: 9, color: isCurrent ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: isCurrent ? 700 : 500 }}>
                    {isDeload ? 'Deload' : `W${w}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
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
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--danger)', letterSpacing: '-0.01em' }}>Reset All Data</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, fontWeight: 500 }}>Delete all workout, diet, and progress data</div>
          </div>
          <button 
            onClick={() => setShowReset(true)}
            style={{
              padding: '8px 16px',
              borderRadius: 12,
              border: '2px solid var(--border)',
              background: 'var(--danger-light)',
              color: 'var(--danger)',
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
          background: '#FF3B3010', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <AlertTriangle size={28} color="#FF3B30" strokeWidth={2.2} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>Reset All Data?</h2>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 24, lineHeight: 1.5, padding: '0 8px', fontWeight: 500 }}>
          This action cannot be undone. All workout logs, diet entries, body stats, and progress will be permanently deleted.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button 
            className="btn btn-secondary w-full"
            onClick={() => setShowReset(false)}
          >
            Cancel
          </button>
          <button 
            className="btn btn-danger w-full" 
            onClick={handleReset}
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
          color: 'var(--text-tertiary)', 
          fontWeight: 500, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: 6 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>FitForge v1.0 · Crafted with</span>
          <Heart size={12} color="var(--text-tertiary)" fill="var(--text-tertiary)" />
        </div>
        <span>Personalized for Dhaka, Bangladesh</span>
      </div>
    </div>
  );
}
