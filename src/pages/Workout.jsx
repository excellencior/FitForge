import { useState, useEffect, useCallback, useRef } from 'react';
import { Check, Dumbbell, Moon, Scale, Pencil } from 'lucide-react';
import { exercises as rawExercises, workoutTemplates } from '../data/workouts';

const legacyExerciseMap = {
  latPull: 'latPulldown',
  romanianDL: 'romanianDeadlift',
  tricepDip: 'dips',
  shoulderRaise: 'lateralRaise',
  inclineBench: 'inclineDbPress',
  bwCircuit: 'burpees'
};

const exercises = new Proxy(rawExercises, {
  get(target, prop) {
    if (typeof prop === 'symbol' || prop === 'then') return target[prop];
    const propStr = String(prop);
    
    if (propStr.startsWith('__') || [
      '$$typeof', 'prototype', 'constructor', 'toJSON', 'nodeType', 
      'displayName', 'default', 'length', 'name', 'caller', 'arguments'
    ].includes(propStr)) {
      return target[prop];
    }

    let resolvedProp = propStr;
    if (legacyExerciseMap[resolvedProp]) {
      resolvedProp = legacyExerciseMap[resolvedProp];
    }
    const exercise = target[resolvedProp];
    if (exercise) return exercise;

    const display = resolvedProp && resolvedProp !== 'undefined' && resolvedProp !== 'null'
      ? resolvedProp.charAt(0).toUpperCase() + resolvedProp.slice(1)
      : 'Unknown Exercise';

    return {
      id: resolvedProp,
      name: display,
      nameShort: display,

      muscle: 'N/A',
      category: 'strength',
      muscleGroup: 'fullbody',
      type: 'accessory',
      formTips: [],
      warnings: [],
      startWeight: 0,
      increment: 0
    };
  }
});

import { getTodayWorkoutType, saveWorkoutLog, removeWorkoutLogByExercise, updatePR, getToday, getPRRecords, getTodayRoutine, saveBodyStat, getWorkoutsByDate, getBodyStats } from '../utils/storage';
import Modal from '../components/Modal';
import MuscleMap from '../components/MuscleMap';
import { muscleMappings } from '../data/muscleMappings';
import './Workout.css';

function Workout() {
  const [workoutType, setWorkoutType] = useState('custom');
  const [template, setTemplate] = useState(null);


  const [doneExercises, setDoneExercises] = useState({});
  const [showToast, setShowToast] = useState(false);
  const [toastPhase, setToastPhase] = useState('enter');
  const [confettiIdx, setConfettiIdx] = useState(null);
  const confettiTimerRef = useRef(null);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [weightLogged, setWeightLogged] = useState(false);
  const [todayWeight, setTodayWeight] = useState(null);
  const [showWeightInfoModal, setShowWeightInfoModal] = useState(false);

  // Check if weight is already logged for today
  useEffect(() => {
    const today = getToday();
    const stats = getBodyStats();
    const todayStat = stats.find(s => s.date === today);
    if (todayStat && todayStat.weight) {
      setWeightLogged(true);
      setTodayWeight(todayStat.weight);
    }
  }, []);

  // Confetti burst — spawns particles from the checkbox position
  const spawnConfetti = (evt) => {
    const rect = evt.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;overflow:hidden';
    document.body.appendChild(container);
    const colors = ['#22c55e','#4ade80','#16a34a','#86efac','#a3e635','#34d399'];
    for (let i = 0; i < 28; i++) {
      const p = document.createElement('div');
      const size = 4 + Math.random() * 6;
      const angle = (Math.PI * 2 * i) / 28 + (Math.random() - 0.5) * 0.4;
      const velocity = 120 + Math.random() * 180;
      const dx = Math.cos(angle) * velocity;
      const dy = Math.sin(angle) * velocity - 60;
      p.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:${Math.random()>0.5?'50%':'2px'};background:${colors[i%colors.length]};left:${cx}px;top:${cy}px;opacity:1;pointer-events:none`;
      container.appendChild(p);
      p.animate([
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px,${dy + 200}px) rotate(${360+Math.random()*360}deg)`, opacity: 0 }
      ], { duration: 600 + Math.random() * 400, easing: 'cubic-bezier(0.25,0.46,0.45,0.94)', fill: 'forwards' });
    }
    setTimeout(() => container.remove(), 1200);
  };

  useEffect(() => {
    const active = getTodayRoutine();
    
    if (active && active.exercises && active.exercises.length > 0) {
      setTemplate({
        id: active.id,
        name: active.name,
        exercises: active.exercises,
      });
      setWorkoutType('custom');

      // Restore checked state from today's logs
      const todayLogs = getWorkoutsByDate(getToday());
      const relevantLogs = todayLogs.filter(l => l.templateName === active.name);
      const loggedIds = new Set(relevantLogs.flatMap(l => (l.sets || []).map(s => s.exerciseId)));
      const restored = {};
      active.exercises.forEach((ex, idx) => {
        if (loggedIds.has(ex.exerciseId)) restored[idx] = true;
      });
      if (Object.keys(restored).length > 0) setDoneExercises(restored);
    }
    // If no routine assigned → template stays null → Rest Day screen
  }, []);



  const todayFormatted = () => {
    const d = new Date();
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const getExerciseWeight = useCallback((exerciseId, sheetWeight) => {
    if (sheetWeight && sheetWeight > 0) return sheetWeight;
    const prs = getPRRecords();
    const ex = exercises[exerciseId];
    if (prs[exerciseId]) {
      return prs[exerciseId].weight;
    }
    return ex?.startWeight || 0;
  }, []);

  const toggleExerciseDone = (evt, idx, exT, ex, weight) => {
    const isCurrentlyDone = !!doneExercises[idx];

    if (!isCurrentlyDone) {
      spawnConfetti(evt);
      if (navigator.vibrate) navigator.vibrate(25);

      // Log all sets
      const numSets = exT.minSets || exT.sets || 3;
      const logs = [];
      for (let s = 1; s <= numSets; s++) {
        logs.push({
          exerciseId: exT.exerciseId,
          exerciseName: ex.name,
          set: s,
          weight: weight,
          reps: exT.reps,
          timestamp: new Date().toISOString()
        });
      }

      saveWorkoutLog({
        type: workoutType,
        templateName: template.name,
        sets: logs,
        duration: 0,
        date: getToday()
      });

      updatePR(exT.exerciseId, weight, exT.reps);
    } else {
      // Uncheck — remove the log so Dashboard stays in sync
      removeWorkoutLogByExercise(exT.exerciseId, getToday());
    }

    setDoneExercises(prev => {
      const newState = { ...prev, [idx]: !isCurrentlyDone };

      // Check if all exercises are done
      const allDone = template.exercises.every((_, exIdx) => newState[exIdx]);
      if (allDone && !isCurrentlyDone) {
        setToastPhase('enter');
        setShowToast(true);
        setTimeout(() => {
          setToastPhase('exit');
          setTimeout(() => setShowToast(false), 350);
        }, 3500);
      }

      return newState;
    });
  };



  if (!template || !template.exercises || template.exercises.length === 0) {
    return (
      <div 
        className="page-content" 
        style={{ 
          paddingBottom: 'calc(var(--nav-height) + var(--safe-bottom) + 32px)', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '60vh',
          gap: 8,
        }}
      >
        <Moon size={48} strokeWidth={1.5} color="var(--text-tertiary)" />
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: '20px 0 8px', letterSpacing: '-0.03em' }}>Rest Day</h1>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', textAlign: 'center', maxWidth: 260, lineHeight: 1.5 }}>Get 7–9 hours of sleep, stay hydrated, and let your muscles recover.</p>
        <button
          onClick={() => {
            if (weightLogged) {
              setShowWeightInfoModal(true);
            } else {
              setWeightInput(''); setShowWeightModal(true);
            }
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 10, marginTop: 16,
            border: weightLogged ? '2px solid var(--accent-mint)' : '1.5px solid var(--border)',
            background: weightLogged ? 'var(--accent-mint)' : 'var(--glass-bg)',
            cursor: 'pointer',
            boxShadow: weightLogged ? 'var(--glass-green-shadow)' : 'var(--shadow-sm)',
            color: weightLogged ? '#fff' : 'var(--text-secondary)',
            fontSize: 13, fontWeight: 600,
            transition: 'all 0.25s ease',
          }}
        >
          {weightLogged ? <Check size={14} strokeWidth={3} /> : <Scale size={14} strokeWidth={2.2} />}
          {weightLogged ? 'Wt. Logged' : 'Log Wt.'}
        </button>

        <Modal isOpen={showWeightModal} onClose={() => setShowWeightModal(false)} type="centered-alert">
          <div style={{ textAlign: 'center' }}>
            <Scale size={28} strokeWidth={2} style={{ color: 'var(--text-primary)', marginBottom: 12 }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>Log Weight</h3>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 72.5"
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
              style={{
                width: '100%', padding: '12px 16px', fontSize: 18, fontWeight: 700,
                textAlign: 'center', borderRadius: 12, border: '2px solid var(--border)',
                background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                boxSizing: 'border-box', outline: 'none'
              }}
              autoFocus
            />
            <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6, fontWeight: 600 }}>kg</span>
            <button
              disabled={!weightInput || parseFloat(weightInput) <= 0}
              onClick={() => {
                const w = parseFloat(weightInput);
                if (w > 0) {
                  saveBodyStat({ date: getToday(), weight: w });
                  setWeightLogged(true);
                  setTodayWeight(w);
                  setShowWeightModal(false);
                }
              }}
              className="btn btn-primary"
              style={{
                width: '100%', padding: '12px', marginTop: 16, borderRadius: 14,
                border: 'none', fontSize: 14, fontWeight: 700,
              }}
            >
              Save
            </button>
          </div>
        </Modal>

        <Modal isOpen={showWeightInfoModal} onClose={() => setShowWeightInfoModal(false)} type="centered-alert">
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--accent-mint)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: 'var(--glass-green-shadow)',
            }}>
              <Check size={24} strokeWidth={3} color="#fff" />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-green)', fontWeight: 600, marginBottom: 4 }}>Today's Weight</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{todayWeight} <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-tertiary)' }}>kg</span></div>
            <button
              onClick={() => {
                setShowWeightInfoModal(false);
                setWeightInput(String(todayWeight));
                setShowWeightModal(true);
              }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                width: '100%', padding: '10px', marginTop: 20, borderRadius: 10,
                border: '1.5px solid var(--border)', background: 'var(--bg-tertiary)',
                cursor: 'pointer', color: 'var(--text-primary)',
                fontSize: 13, fontWeight: 600,
              }}
            >
              <Pencil size={13} strokeWidth={2.5} />
              Edit Weight
            </button>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div 
      className="page-content workout-page"
      style={{
        paddingBottom: 'calc(var(--nav-height) + var(--safe-bottom) + 32px)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ textAlign: 'center', padding: '16px 0 20px' }}>
        <h1 style={{ fontSize: 24, fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>{template.name}</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, fontWeight: '600' }}>{todayFormatted()}</p>
      </div>

      {/* Muscle Map Hero Card */}
      {(() => {
        const exIds = template.exercises.map(e => e.exerciseId);
        const hasMuscles = exIds.some(id => {
          const m = muscleMappings[id];
          return m && (m.primary.length > 0 || m.secondary.length > 0);
        });
        // Count unique primary and secondary muscles
        const primarySet = new Set();
        const secondarySet = new Set();
        exIds.forEach(id => {
          const m = muscleMappings[id];
          if (m) {
            m.primary.forEach(p => primarySet.add(p));
            m.secondary.forEach(s => secondarySet.add(s));
          }
        });
        // Primary wins
        primarySet.forEach(p => secondarySet.delete(p));

        return (
          <div className="muscle-hero-card">
            <div className="muscle-hero-card__body">
              <MuscleMap
                exerciseIds={exIds}
                view="auto"
                size="lg"
                showLabel={!hasMuscles}
              />
            </div>
            {hasMuscles && (
              <div className="muscle-hero-card__legend">
                <span className="muscle-hero-card__legend-item">
                  <span className="muscle-hero-card__legend-dot" style={{ background: '#ef4444' }} />
                  {primarySet.size} primary
                </span>
                <span className="muscle-hero-card__legend-item">
                  <span className="muscle-hero-card__legend-dot" style={{ background: '#93c5fd' }} />
                  {secondarySet.size} secondary
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Weight Log Modal */}
      <Modal isOpen={showWeightModal} onClose={() => setShowWeightModal(false)} type="centered-alert">
        <div style={{ textAlign: 'center' }}>
          <Scale size={28} strokeWidth={2} style={{ color: 'var(--text-primary)', marginBottom: 12 }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>Log Weight</h3>
          <input
            type="number"
            step="0.1"
            placeholder="e.g. 72.5"
            value={weightInput}
            onChange={e => setWeightInput(e.target.value)}
            style={{
              width: '100%', padding: '12px 16px', fontSize: 18, fontWeight: 700,
              textAlign: 'center', borderRadius: 12, border: '2px solid var(--border)',
              background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
              boxSizing: 'border-box', outline: 'none'
            }}
            autoFocus
          />
          <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6, fontWeight: 600 }}>kg</span>
          <button
            disabled={!weightInput || parseFloat(weightInput) <= 0}
            onClick={() => {
              const w = parseFloat(weightInput);
              if (w > 0) {
                saveBodyStat({ date: getToday(), weight: w });
                setWeightLogged(true);
                setTodayWeight(w);
                setShowWeightModal(false);
              }
            }}
            className="btn btn-primary"
            style={{
              width: '100%', padding: '12px', marginTop: 16, borderRadius: 14,
              border: 'none', fontSize: 14, fontWeight: 700,
            }}
          >
            Save
          </button>
        </div>
      </Modal>



      <div style={{ marginTop: 8, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: '700', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>Exercises</h2>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)' }}>
              {Object.keys(doneExercises).filter(k => doneExercises[k]).length}/{template.exercises.length}
            </span>
          </div>
          <button
            onClick={() => {
              if (weightLogged) {
                setShowWeightInfoModal(true);
              } else {
                setWeightInput(''); setShowWeightModal(true);
              }
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 12,
              border: weightLogged ? '1px solid rgba(16, 185, 129, 0.4)' : '1.5px solid rgba(15, 23, 42, 0.15)',
              background: weightLogged ? 'var(--glass-green-gradient)' : 'var(--glass-bg-tint)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              cursor: 'pointer',
              boxShadow: weightLogged ? 'var(--glass-green-shadow)' : 'var(--glass-shadow-sm)',
              color: weightLogged ? '#FFFFFF' : 'var(--text-primary)',
              fontSize: 12, fontWeight: 700,
              transition: 'all 0.25s ease',
            }}
            aria-label="Log weight"
          >
            {weightLogged ? <Check size={13} strokeWidth={3} color="#FFFFFF" /> : <Scale size={13} strokeWidth={2.2} color="#475569" />}
            {weightLogged ? 'Wt. Logged' : 'Log Wt.'}
          </button>
        </div>
        {template.exercises.map((exT, idx) => {
          const ex = exercises[exT.exerciseId] || { nameShort: exT.exerciseId, muscle: '', icon: '', formTips: [], warnings: [] };
          const weight = getExerciseWeight(exT.exerciseId, exT.weight);
          const isAmrapSet = exT.amrap;
          const numSets = exT.minSets || exT.sets || 3;
          const isDone = !!doneExercises[idx];

          return (
            <div 
              key={idx} 
              className="glass-card"
              style={{
                backgroundColor: isDone ? 'var(--glass-green-bg)' : undefined,
                borderRadius: 20,
                border: isDone ? '1px solid rgba(34, 197, 94, 0.25)' : undefined,
                padding: '14px 16px',
                marginBottom: 12,
                boxShadow: isDone
                  ? 'var(--glass-green-shadow), var(--glass-rim)'
                  : undefined,
                transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div
                  onClick={(e) => toggleExerciseDone(e, idx, exT, ex, weight)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: isDone ? 'none' : '2px solid rgba(148, 163, 184, 0.3)',
                    background: isDone ? 'var(--glass-green-gradient)' : 'var(--glass-bg)',
                    color: isDone ? '#FFFFFF' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    marginTop: 1,
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: isDone ? 'var(--glass-green-shadow)' : 'var(--glass-shadow-sm)'
                  }}
                >
                  {isDone && <Check size={16} strokeWidth={3} color="#FFFFFF" />}
                </div>

                <div style={{ flex: 1, minWidth: 0, userSelect: 'none' }}>
                  <span style={{ 
                    fontSize: 15, 
                    fontWeight: '700', 
                    color: isDone ? '#0F172A' : 'var(--text-primary)', 
                    display: 'block', 
                    letterSpacing: '-0.01em',
                    lineHeight: 1.2,
                  }}>
                    {ex.nameShort}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
                    <span style={{ 
                      fontSize: 11, 
                      color: isDone ? 'var(--text-green)' : 'var(--text-primary)', 
                      padding: '3px 10px',
                      border: isDone ? '1px solid rgba(16, 185, 129, 0.2)' : 'var(--glass-border-strong)',
                      borderRadius: 10,
                      fontWeight: 700,
                      background: isDone ? 'var(--glass-green-bg)' : 'var(--glass-bg)',
                      lineHeight: '16px',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                    }}>
                      {numSets} sets
                    </span>
                    <span style={{ fontSize: 10, color: isDone ? 'var(--text-green)' : 'var(--text-tertiary)', fontWeight: 700 }}>×</span>
                    <span style={{ 
                      fontSize: 11, 
                      color: isDone ? 'var(--text-green)' : 'var(--text-primary)', 
                      padding: '3px 10px',
                      border: isDone ? '1px solid rgba(16, 185, 129, 0.2)' : 'var(--glass-border-strong)',
                      borderRadius: 10,
                      fontWeight: 700,
                      background: isDone ? 'var(--glass-green-bg)' : 'var(--glass-bg)',
                      lineHeight: '16px',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                    }}>
                      {exT.reps || '8-12'} {isAmrapSet ? 'AMRAP' : 'reps'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bottom-spacer" style={{ height: 24 }} />

      {showToast && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(var(--nav-height) + 24px)',
          left: '50%',
          padding: '14px 28px',
          borderRadius: 50,
          fontWeight: '700',
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          zIndex: 1000,
          background: 'rgba(34, 197, 94, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          color: '#FFFFFF',
          boxShadow: '0 8px 32px rgba(34,197,94,0.25), 0 2px 8px rgba(0,0,0,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          animation: toastPhase === 'enter'
            ? 'toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            : 'toastSlideOut 0.3s ease-in forwards',
          whiteSpace: 'nowrap'
        }}>
          <Check size={18} strokeWidth={2.5} /> Workout Complete!
        </div>
      )}

      <style>{`
        @keyframes toastSlideIn {
          from { transform: translateX(-50%) translateY(24px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        @keyframes toastSlideOut {
          from { transform: translateX(-50%) translateY(0); opacity: 1; }
          to { transform: translateX(-50%) translateY(24px); opacity: 0; }
        }
      `}</style>

      <Modal isOpen={showWeightInfoModal} onClose={() => setShowWeightInfoModal(false)} type="centered-alert">
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'var(--accent-mint)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: 'var(--glass-green-shadow)',
          }}>
            <Check size={24} strokeWidth={3} color="#fff" />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-green)', fontWeight: 600, marginBottom: 4 }}>Today's Weight</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{todayWeight} <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-tertiary)' }}>kg</span></div>
          <button
            onClick={() => {
              setShowWeightInfoModal(false);
              setWeightInput(String(todayWeight));
              setShowWeightModal(true);
            }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              width: '100%', padding: '10px', marginTop: 20, borderRadius: 10,
              border: '1.5px solid var(--border)', background: 'var(--bg-tertiary)',
              cursor: 'pointer', color: 'var(--text-primary)',
              fontSize: 13, fontWeight: 600,
            }}
          >
            <Pencil size={13} strokeWidth={2.5} />
            Edit Weight
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default Workout;
