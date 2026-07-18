import { useState, useEffect, useCallback, useRef } from 'react';
import { Check, ChevronDown, ChevronUp, Dumbbell, Moon, Scale } from 'lucide-react';
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

import { getTodayWorkoutType, saveWorkoutLog, removeWorkoutLogByExercise, updatePR, getToday, getPRRecords, getTodayRoutine, saveBodyStat, getWorkoutsByDate } from '../utils/storage';
import Modal from '../components/Modal';
import './Workout.css';

function Workout() {
  const [workoutType, setWorkoutType] = useState('custom');
  const [template, setTemplate] = useState(null);
  const [expandedExercise, setExpandedExercise] = useState(null);

  const [doneExercises, setDoneExercises] = useState({});
  const [showToast, setShowToast] = useState(false);
  const [toastPhase, setToastPhase] = useState('enter');
  const [confettiIdx, setConfettiIdx] = useState(null);
  const confettiTimerRef = useRef(null);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');

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
          onClick={() => { setWeightInput(''); setShowWeightModal(true); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 10, marginTop: 16,
            border: '1.5px solid var(--border)', background: 'var(--bg-card)',
            cursor: 'pointer', boxShadow: 'var(--shadow-sm)',
            color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600
          }}
        >
          <Scale size={14} strokeWidth={2.2} />
          Log Wt.
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
              onClick={() => {
                const w = parseFloat(weightInput);
                if (w > 0) {
                  saveBodyStat({ date: getToday(), weight: w });
                  setShowWeightModal(false);
                }
              }}
              className="btn btn-primary"
              style={{
                width: '100%', padding: '12px', marginTop: 16, borderRadius: 12,
                border: '2px solid var(--border)', background: 'var(--text-primary)',
                color: '#FFFFFF', fontSize: 14, fontWeight: 700, cursor: 'pointer'
              }}
            >
              Save
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
        background: 'var(--bg-secondary)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ textAlign: 'center', padding: '16px 0 20px' }}>
        <h1 style={{ fontSize: 24, fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>{template.name}</h1>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0, fontWeight: '500' }}>{todayFormatted()}</p>
      </div>

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
            onClick={() => {
              const w = parseFloat(weightInput);
              if (w > 0) {
                saveBodyStat({ date: getToday(), weight: w });
                setShowWeightModal(false);
              }
            }}
            className="btn btn-primary"
            style={{
              width: '100%', padding: '12px', marginTop: 16, borderRadius: 12,
              border: '2px solid var(--border)', background: 'var(--text-primary)',
              color: '#FFFFFF', fontSize: 14, fontWeight: 700, cursor: 'pointer'
            }}
          >
            Save
          </button>
        </div>
      </Modal>



      <div style={{ marginTop: 8, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 16px' }}>
          <h2 style={{ fontSize: 18, fontWeight: '700', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>Exercises</h2>
          <button
            onClick={() => { setWeightInput(''); setShowWeightModal(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 8,
              border: '1.5px solid var(--border)', background: 'var(--bg-card)',
              cursor: 'pointer', boxShadow: 'var(--shadow-sm)',
              color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 600
            }}
            aria-label="Log weight"
          >
            <Scale size={12} strokeWidth={2.2} />
            Log Wt.
          </button>
        </div>
        {template.exercises.map((exT, idx) => {
          const ex = exercises[exT.exerciseId] || { nameShort: exT.exerciseId, muscle: '', icon: '', formTips: [], warnings: [] };
          const weight = getExerciseWeight(exT.exerciseId, exT.weight);
          const isExpanded = expandedExercise === idx;
          const isAmrapSet = exT.amrap;
          const numSets = exT.minSets || exT.sets || 3;
          const isDone = !!doneExercises[idx];

          return (
            <div 
              key={idx} 
              style={{
                backgroundColor: isDone ? '#f0fdf4' : 'var(--bg-card)',
                borderRadius: 16,
                border: isDone ? '2px solid #86efac' : '2px solid var(--border)',
                padding: '16px',
                marginBottom: '16px',
                boxShadow: isDone ? '0 0 0 1px rgba(34,197,94,0.1)' : 'var(--shadow-md)',
                position: 'relative',
                transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                overflow: 'hidden'
              }}
            >
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: 14 }}
              >
                {/* Single Checkbox for the entire exercise */}
                <div
                  onClick={(e) => toggleExerciseDone(e, idx, exT, ex, weight)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: isDone ? '2px solid #22c55e' : '2px solid var(--border)',
                    backgroundColor: isDone ? '#22c55e' : 'var(--bg-card)',
                    color: isDone ? '#FFFFFF' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: isDone ? '0 2px 8px rgba(34,197,94,0.3)' : 'var(--shadow-sm)'
                  }}
                >
                  {isDone && <Check size={18} strokeWidth={3} />}
                </div>

                <div 
                  onClick={() => setExpandedExercise(isExpanded ? null : idx)}
                  style={{ flex: 1, minWidth: 0, cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div>
                    <span style={{ 
                      fontSize: 15, 
                      fontWeight: '700', 
                      color: isDone ? '#15803d' : 'var(--text-primary)', 
                      display: 'block', 
                      letterSpacing: '-0.01em'
                    }}>
                      {ex.nameShort}
                    </span>
                    <span style={{ 
                      fontSize: 12, 
                      color: isDone ? '#4ade80' : 'var(--text-tertiary)', 
                      marginTop: 4, 
                      display: 'block'
                    }}>
                      {numSets} sets × {exT.reps}{isAmrapSet ? '+' : ''} reps · {weight > 0 ? `${weight} kg` : 'Bodyweight'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', color: isDone ? '#4ade80' : 'var(--text-tertiary)' }}>
                    {isExpanded ? <ChevronUp size={18} strokeWidth={2.4} /> : <ChevronDown size={18} strokeWidth={2.4} />}
                  </div>
                </div>
              </div>

              {/* Set Breakdown */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 6, 
                marginTop: 12, 
                paddingTop: 12, 
                borderTop: '1px solid ' + (isDone ? '#bbf7d0' : 'var(--border-light)') 
              }}>
                {Array.from({ length: numSets }, (_, s) => {
                  const isLast = s === numSets - 1;
                  const setLabel = isAmrapSet && isLast ? `Set ${s + 1} (AMRAP)` : `Set ${s + 1}`;
                  return (
                    <div key={s} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: isDone ? '#dcfce7' : 'var(--bg-secondary)',
                      border: isDone ? '1px solid #bbf7d0' : '1px solid var(--border)',
                      transition: 'all 0.3s ease'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%',
                          background: isDone ? '#22c55e' : 'var(--bg-tertiary)',
                          border: isDone ? 'none' : '1.5px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#FFFFFF', fontSize: 10, fontWeight: 700,
                          transition: 'all 0.2s'
                        }}>
                          {isDone ? <Check size={11} strokeWidth={3} /> : <span style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>{s + 1}</span>}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: isDone ? '#15803d' : 'var(--text-primary)' }}>
                          {setLabel}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: isDone ? '#16a34a' : 'var(--text-tertiary)' }}>
                        {exT.reps}{isAmrapSet && isLast ? '+' : ''} reps · {weight > 0 ? `${weight}kg` : 'BW'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {isExpanded && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid ' + (isDone ? '#bbf7d0' : 'var(--border-light)') }}>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    <span className="badge" style={{ backgroundColor: isDone ? '#dcfce7' : 'var(--bg-card)', border: isDone ? '1px solid #bbf7d0' : '1px solid var(--border)', color: isDone ? '#15803d' : 'var(--text-secondary)' }}>Muscle: {ex.muscle || 'Full Body'}</span>
                    {isAmrapSet && <span className="badge" style={{ backgroundColor: isDone ? '#22c55e' : 'var(--text-primary)', color: '#FFFFFF', fontWeight: 700 }}>AMRAP Last Set</span>}
                  </div>

                  {ex.formTips && ex.formTips.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: '700', color: isDone ? '#4ade80' : 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Form Checklist</span>
                      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: isDone ? '#15803d' : 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {ex.formTips.map((tip, i) => <li key={i}>{tip}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
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
    </div>
  );
}

export default Workout;
