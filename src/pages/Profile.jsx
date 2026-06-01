import { useState, useRef } from 'react';
import { getSettings, saveSettings, calculateTDEE, getDeloadTracker, updateDeloadTracker, getToday } from '../utils/storage';
import { useModalLock, useInputFocus } from '../utils/ux';
import logo from '../assets/fitforge_logo.png';
import { 
  Save, 
  RotateCcw, 
  AlertTriangle, 
  Target, 
  Heart, 
  ChevronLeft, 
  CalendarCheck, 
  User, 
  Ruler, 
  Scale, 
  ShieldCheck, 
  Clock, 
  Zap, 
  Sparkles 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(() => getSettings());
  const [saved, setSaved] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [deloadTracker, setDeloadTrackerState] = useState(() => getDeloadTracker());
  const saveTimerRef = useRef(null);
  const handleFocus = useInputFocus();

  useModalLock(showReset);

  const handleSave = () => {
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

  const handleDeloadDateChange = (newDateStr) => {
    if (!newDateStr) return;
    const currentTracker = { ...getDeloadTracker(), startDate: newDateStr };
    const start = new Date(newDateStr);
    const now = new Date();
    const weeksDiff = Math.max(0, Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000)));
    const cycleWeek = (weeksDiff % 7) + 1;
    
    currentTracker.currentWeek = Math.min(cycleWeek, 7);
    currentTracker.isDeloadWeek = cycleWeek === 7;
    currentTracker.completedCycles = Math.floor(weeksDiff / 7);
    
    localStorage.setItem('fitforge_deload', JSON.stringify(currentTracker));
    setDeloadTrackerState(currentTracker);
  };

  const heightM = settings.heightCm / 100;
  const bmi = heightM > 0 ? (settings.weightKg / (heightM * heightM)).toFixed(1) : '0';
  const bmiNum = parseFloat(bmi);
  const bmiStatus = bmiNum < 18.5 ? 'Underweight' : bmiNum < 25 ? 'Normal' : bmiNum < 30 ? 'Overweight' : 'Obese';
  const bmiColor = bmiNum < 18.5 ? '#FF9500' : bmiNum < 25 ? '#34C759' : bmiNum < 30 ? '#FF9500' : '#FF3B30';

  const minBmi = 15;
  const maxBmi = 35;
  const bmiPercent = Math.min(Math.max(((bmiNum - minBmi) / (maxBmi - minBmi)) * 100, 0), 100);

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
            background: '#FFFFFF', 
            border: '1px solid #E5E5EA', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: 'pointer', 
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            transition: 'all 0.2s ease'
          }}
        >
          <ChevronLeft size={20} color="#1C1C1E" strokeWidth={2.2} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#1C1C1E', margin: 0 }}>
            Profile
          </h1>
          <p style={{ fontSize: 13, color: '#8E8E93', marginTop: 2, fontWeight: 500 }}>Your stats & settings</p>
        </div>
        <img src={logo} alt="FitForge" style={{ width: 40, height: 40, objectFit: 'contain' }} />
      </div>

      {/* BMI Card */}
      <div 
        className="card" 
        style={{ 
          background: '#FFFFFF', 
          border: '1px solid #E5E5EA', 
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)', 
          borderRadius: 18, 
          padding: 20, 
          marginBottom: 20 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Heart size={18} color={bmiColor} strokeWidth={2.5} />
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', color: '#1C1C1E' }}>Body Mass Index</span>
          </div>
          <span 
            className="badge font-semibold" 
            style={{ 
              background: `${bmiColor}10`, 
              color: bmiColor, 
              padding: '4px 10px', 
              fontSize: 12 
            }}
          >
            {bmiStatus}
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 16 }}>
          <span style={{ fontSize: 36, fontWeight: 800, color: '#1C1C1E', letterSpacing: '-0.04em' }}>{bmi}</span>
          <span style={{ fontSize: 14, color: '#8E8E93', fontWeight: 500 }}>BMI</span>
        </div>

        {/* Gradient Bar Slider */}
        <div 
          style={{ 
            position: 'relative', 
            height: 6, 
            borderRadius: 3, 
            background: 'linear-gradient(to right, #FF9500 0%, #34C759 30%, #34C759 50%, #FF9500 75%, #FF3B30 100%)', 
            marginBottom: 12 
          }}
        >
          <div style={{
            position: 'absolute',
            left: `${bmiPercent}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 14,
            height: 14,
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            border: `2px solid ${bmiColor}`,
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            transition: 'left 0.5s ease-out'
          }} />
        </div>

        {/* Slider Labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#AEAEB2', fontWeight: 600 }}>
          <span>18.5 (Under)</span>
          <span>25.0 (Normal)</span>
          <span>30.0 (Over)</span>
        </div>
      </div>

      {/* Deload Scheduler Calendar */}
      <div 
        className="card" 
        style={{ 
          background: '#FFFFFF', 
          border: '1px solid #E5E5EA', 
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)', 
          borderRadius: 18, 
          padding: 20, 
          marginBottom: 20 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <CalendarCheck size={18} color="#007AFF" strokeWidth={2.5} />
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', color: '#1C1C1E' }}>Deload Scheduler</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8E8E93', marginBottom: 6 }}>Cycle Start Date</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input 
                type="date" 
                className="input" 
                style={{ 
                  flex: 1, 
                  padding: '10px 14px', 
                  minHeight: 44, 
                  borderRadius: 12, 
                  border: '1px solid #E5E5EA', 
                  background: '#F2F2F7', 
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
                  border: '1px solid #E5E5EA',
                  background: '#FFFFFF',
                  color: '#1C1C1E',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <RotateCcw size={14} strokeWidth={2.2} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <div style={{ background: '#F2F2F7', padding: '12px 14px', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, color: '#1C1C1E', fontWeight: 700 }}>
                {deloadTracker.isDeloadWeek ? 'Deload Week 🎉' : `Week ${deloadTracker.currentWeek} of 7`}
              </div>
              <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 2 }}>
                Cycle {deloadTracker.completedCycles + 1} · {deloadTracker.isDeloadWeek ? 'Focus on light active recovery' : `${7 - deloadTracker.currentWeek} weeks until deload`}
              </div>
            </div>
            <span className="badge" style={{ background: deloadTracker.isDeloadWeek ? '#FF950015' : '#007AFF15', color: deloadTracker.isDeloadWeek ? '#FF9500' : '#007AFF', fontWeight: 700 }}>
              {deloadTracker.isDeloadWeek ? 'Deloading' : 'Training'}
            </span>
          </div>

          {/* Week dots schedule representation */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginTop: 4 }}>
            {[1, 2, 3, 4, 5, 6, 7].map((w) => {
              const isCurrent = w === deloadTracker.currentWeek;
              const isPast = w < deloadTracker.currentWeek;
              const isDeload = w === 7;
              
              let bgColor = '#F2F2F7';
              let textColor = '#8E8E93';
              let border = '1px solid transparent';
              
              if (isCurrent) {
                bgColor = isDeload ? '#FF9500' : '#007AFF';
                textColor = '#FFFFFF';
              } else if (isPast) {
                bgColor = isDeload ? '#FF950030' : '#007AFF15';
                textColor = isDeload ? '#FF9500' : '#007AFF';
              } else if (isDeload) {
                bgColor = '#FFFFFF';
                border = '1px dashed #FF9500';
                textColor = '#FF9500';
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
                      boxShadow: isCurrent ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    {w}
                  </div>
                  <span style={{ fontSize: 9, color: isCurrent ? '#1C1C1E' : '#8E8E93', fontWeight: isCurrent ? 700 : 500 }}>
                    {isDeload ? 'Deload' : `W${w}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Core Training Principles */}
      <div 
        className="card" 
        style={{ 
          background: '#FFFFFF', 
          border: '1px solid #E5E5EA', 
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)', 
          borderRadius: 18, 
          padding: 20, 
          marginBottom: 20 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <AlertTriangle size={18} color="#FF9500" strokeWidth={2.5} />
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', color: '#1C1C1E' }}>Core Training Principles</span>
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
                background: '#F2F2F7', 
                borderRadius: 12, 
                fontSize: 13, 
                color: '#1C1C1E', 
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
          background: '#FFFFFF', 
          border: '1px solid #E5E5EA', 
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)', 
          borderRadius: 18, 
          padding: 20, 
          marginBottom: 20 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <User size={18} color="#007AFF" strokeWidth={2.5} />
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', color: '#1C1C1E' }}>Personal Settings</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8E8E93', marginBottom: 6 }}>Name</label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="#8E8E93" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                className="input" 
                placeholder="Your name" 
                value={settings.name || ''} 
                onChange={e => handleChange('name', e.target.value)} 
                onFocus={handleFocus}
                style={{ paddingLeft: 40, background: '#F2F2F7', borderRadius: 12, border: '1px solid #E5E5EA' }}
              />
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8E8E93', marginBottom: 6 }}>Height (cm)</label>
              <div style={{ position: 'relative' }}>
                <Ruler size={16} color="#8E8E93" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  className="input" 
                  type="number" 
                  inputMode="numeric" 
                  min="1" 
                  max="300" 
                  value={settings.heightCm} 
                  onChange={e => handleChange('heightCm', +e.target.value)} 
                  onFocus={handleFocus}
                  style={{ paddingLeft: 40, background: '#F2F2F7', borderRadius: 12, border: '1px solid #E5E5EA' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8E8E93', marginBottom: 6 }}>Weight (kg)</label>
              <div style={{ position: 'relative' }}>
                <Scale size={16} color="#8E8E93" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  className="input" 
                  type="number" 
                  inputMode="decimal" 
                  min="1" 
                  step="0.1" 
                  value={settings.weightKg} 
                  onChange={e => handleChange('weightKg', +e.target.value)} 
                  onFocus={handleFocus}
                  style={{ paddingLeft: 40, background: '#F2F2F7', borderRadius: 12, border: '1px solid #E5E5EA' }}
                />
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8E8E93', marginBottom: 6 }}>Daily Calorie Target</label>
            <div style={{ position: 'relative' }}>
              <Target size={16} color="#8E8E93" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                className="input" 
                type="number" 
                inputMode="numeric" 
                min="1" 
                value={settings.calorieTarget} 
                onChange={e => handleChange('calorieTarget', +e.target.value)} 
                onFocus={handleFocus}
                style={{ paddingLeft: 40, background: '#F2F2F7', borderRadius: 12, border: '1px solid #E5E5EA' }}
              />
            </div>
            <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: '#34C759' }} />
              <span>TDEE recommendation: <strong>{calculateTDEE(settings.weightKg, settings.heightCm, 25)} kcal</strong></span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#007AFF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Protein (g)</label>
              <input 
                className="input" 
                type="number" 
                inputMode="numeric" 
                min="0" 
                value={settings.proteinTarget} 
                onChange={e => handleChange('proteinTarget', +e.target.value)} 
                onFocus={handleFocus}
                style={{ background: '#007AFF08', borderRadius: 12, border: '1px solid #007AFF20', textAlign: 'center', fontWeight: 700, color: '#007AFF' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#FF9500', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Carbs (g)</label>
              <input 
                className="input" 
                type="number" 
                inputMode="numeric" 
                min="0" 
                value={settings.carbsTarget} 
                onChange={e => handleChange('carbsTarget', +e.target.value)} 
                onFocus={handleFocus}
                style={{ background: '#FF950008', borderRadius: 12, border: '1px solid #FF950020', textAlign: 'center', fontWeight: 700, color: '#FF9500' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#FF3B30', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Fat (g)</label>
              <input 
                className="input" 
                type="number" 
                inputMode="numeric" 
                min="0" 
                value={settings.fatTarget} 
                onChange={e => handleChange('fatTarget', +e.target.value)} 
                onFocus={handleFocus}
                style={{ background: '#FF3B3008', borderRadius: 12, border: '1px solid #FF3B3020', textAlign: 'center', fontWeight: 700, color: '#FF3B30' }}
              />
            </div>
          </div>
        </div>

        <button 
          onClick={handleSave}
          style={{
            width: '100%',
            marginTop: 24,
            padding: '14px 20px',
            borderRadius: 14,
            border: '1px solid #1C1C1E',
            background: saved ? '#E8F5E9' : '#1C1C1E',
            color: saved ? '#34C759' : '#FFFFFF',
            fontSize: 15,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)',
            minHeight: 48,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
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

      {/* Reset */}
      <div 
        className="card" 
        style={{ 
          background: '#FFFFFF', 
          border: '1px solid #E5E5EA', 
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)', 
          borderRadius: 18, 
          padding: 20, 
          marginBottom: 20 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#FF3B30', letterSpacing: '-0.01em' }}>Reset All Data</div>
            <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 2, fontWeight: 500 }}>Delete all workout, diet, and progress data</div>
          </div>
          <button 
            onClick={() => setShowReset(true)}
            style={{
              padding: '8px 16px',
              borderRadius: 12,
              border: '1px solid #FF3B30',
              background: '#FFFFFF',
              color: '#FF3B30',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s ease',
            }}
          >
            <RotateCcw size={14} strokeWidth={2.2} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Reset Modal */}
      {showReset && (
        <div className="modal-overlay" onClick={() => setShowReset(false)} style={{ zIndex: 9999 }}>
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            role="dialog" 
            aria-modal="true"
            style={{
              background: '#FFFFFF',
              borderRadius: '24px 24px 0 0',
              padding: '24px 20px calc(24px + var(--safe-bottom))',
            }}
          >
            <div className="modal-handle" style={{ background: '#E5E5EA', width: 40, height: 5 }} />
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
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
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.03em', color: '#1C1C1E' }}>Reset All Data?</h2>
              <p style={{ fontSize: 14, color: '#8E8E93', marginBottom: 28, lineHeight: 1.5, padding: '0 8px', fontWeight: 500 }}>
                This action cannot be undone. All workout logs, diet entries, body stats, and progress will be permanently deleted.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button 
                  className="btn" 
                  style={{ 
                    flex: 1, 
                    background: '#F2F2F7', 
                    color: '#1C1C1E', 
                    borderRadius: 14,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    minHeight: 48
                  }} 
                  onClick={() => setShowReset(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn" 
                  style={{ 
                    flex: 1, 
                    background: '#FF3B30', 
                    color: '#FFFFFF', 
                    borderRadius: 14,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    minHeight: 48
                  }} 
                  onClick={handleReset}
                >
                  <RotateCcw size={16} strokeWidth={2.2} />
                  <span>Delete Everything</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div 
        style={{ 
          textAlign: 'center', 
          padding: '24px 0 8px', 
          fontSize: 12, 
          color: '#AEAEB2', 
          fontWeight: 500, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: 6 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>FitForge v1.0 · Crafted with</span>
          <Heart size={12} color="#AEAEB2" fill="#AEAEB2" />
        </div>
        <span>Personalized for Dhaka, Bangladesh</span>
      </div>
    </div>
  );
}
