import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Check, ChevronDown, ChevronUp, ChevronRight, AlertTriangle, Timer, Trophy, X, Plus, Zap, Dumbbell, Activity, Shield, Footprints, Compass } from 'lucide-react';
import { exercises, workoutTemplates, warmupRoutine, warmupSets, irradiationChecklist } from '../data/workouts';
import { getTodayWorkoutType, saveWorkoutLog, updatePR, getToday, getPRRecords, getActiveSheet, getWorkoutsByDate, getSettings } from '../utils/storage';
import { useInputFocus, useDebounce } from '../utils/ux';
import Modal from '../components/Modal';
import './Workout.css';

const playRestChime = (isFinal = false) => {
  if (typeof window === 'undefined') return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (isFinal) {
      // Gong alert when timer finishes
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.12); // G5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.25);
    } else {
      // High-pitched warning click at 10s and last 3s
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    }
  } catch (e) {
    console.warn('AudioContext not initialized', e);
  }
};

function Workout() {
  // ── UX hooks ──
  const handleInputFocus = useInputFocus();
  const debounceCompleteSet = useDebounce(600);

  // ── State ──
  const [mode, setMode] = useState('plan'); // 'plan' | 'active' | 'complete'
  const [workoutType, setWorkoutType] = useState('custom');
  const [template, setTemplate] = useState(null);

  // Collapsibles
  const [warmupOpen, setWarmupOpen] = useState(false);
  const [irradiationOpen, setIrradiationOpen] = useState(false);
  const [expandedExercise, setExpandedExercise] = useState(null);
  const [checkedSteps, setCheckedSteps] = useState({});
  const [checkedWarmups, setCheckedWarmups] = useState({});
  const [expandedWarmupIdx, setExpandedWarmupIdx] = useState(null);
  const [usingActiveSheet, setUsingActiveSheet] = useState(false);

  // Active workout
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [repsInput, setRepsInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [isResting, setIsResting] = useState(false);
  const [restTime, setRestTime] = useState(0);
  const [restTotal, setRestTotal] = useState(0);
  const [timerPaused, setTimerPaused] = useState(false);
  const [workoutLog, setWorkoutLog] = useState([]);
  const [prsHit, setPrsHit] = useState([]);
  const [workoutStartTime, setWorkoutStartTime] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [completionDuration, setCompletionDuration] = useState(0);
  const [showFlexChoice, setShowFlexChoice] = useState(false);
  const [todayWorkouts, setTodayWorkouts] = useState([]);
  const [totalRestTimeSpent, setTotalRestTimeSpent] = useState(0);
  const [exerciseRestTimes, setExerciseRestTimes] = useState({});
  const [completionStats, setCompletionStats] = useState({
    actualSets: 0,
    totalDurationSecs: 0,
    totalRestSecs: 0,
    totalExerciseSecs: 0,
    caloriesBurnt: 0
  });

  const timerRef = useRef(null);

  // ── Init — check for active sheet first, fallback to personalized custom template ──
  // ── Init — check for persisted active session first, fallback to active sheet or default CNS Blueprint ──
  useEffect(() => {
    const active = getActiveSheet();
    const activeId = active ? active.id : 'custom';

    const persisted = localStorage.getItem('fitforge_active_workout_session');
    if (persisted) {
      try {
        const session = JSON.parse(persisted);
        if (session && session.template) {
          // Sync check: check if the session template matches the current active sheet (or custom default)
          const sessionId = session.template.id || (session.workoutType === 'custom' ? null : session.workoutType);
          if (sessionId === activeId) {
            setMode('active');
            setWorkoutType(session.workoutType);
            setTemplate(session.template);
            setCurrentExIdx(session.currentExIdx);
            setCurrentSet(session.currentSet);
            setRepsInput(session.repsInput);
            setWeightInput(session.weightInput);
            setIsResting(session.isResting);
            setRestTime(session.restTime);
            setRestTotal(session.restTotal);
            setTimerPaused(session.timerPaused);
            setWorkoutLog(session.workoutLog);
            setPrsHit(session.prsHit);
            setWorkoutStartTime(session.workoutStartTime);
            setTotalRestTimeSpent(session.totalRestTimeSpent || 0);
            setExerciseRestTimes(session.exerciseRestTimes || {});
            return; // successfully loaded, skip default initialization
          } else {
            // Stale/out-of-sync session, clear it to reload the new active sheet!
            localStorage.removeItem('fitforge_active_workout_session');
          }
        }
      } catch (e) {
        console.error('Failed to parse persisted active session', e);
      }
    }

    if (active && active.exercises && active.exercises.length > 0) {
      // Use the active sheet as the workout template
      setTemplate({
        id: active.id,
        name: active.name,
        exercises: active.exercises,
      });
      setWorkoutType('custom');
      setUsingActiveSheet(true);
    } else {
      const type = getTodayWorkoutType();
      setWorkoutType(type);
      setTemplate({
        id: 'custom',
        name: workoutTemplates[type]?.name || "CNS Strength Blueprint",
        exercises: workoutTemplates[type]?.exercises || [],
      });
      setUsingActiveSheet(false);
    }
  }, []);

  // ── Persist Active Workout Session — auto-save on any change to state ──
  useEffect(() => {
    if (mode === 'active' && template) {
      const session = {
        workoutType,
        template,
        currentExIdx,
        currentSet,
        repsInput,
        weightInput,
        isResting,
        restTime,
        restTotal,
        timerPaused,
        workoutLog,
        prsHit,
        workoutStartTime,
        totalRestTimeSpent,
        exerciseRestTimes,
      };
      localStorage.setItem('fitforge_active_workout_session', JSON.stringify(session));
    } else if (mode === 'plan' || mode === 'complete') {
      localStorage.removeItem('fitforge_active_workout_session');
    }
  }, [
    mode, workoutType, template, currentExIdx, currentSet, repsInput, weightInput,
    isResting, restTime, restTotal, timerPaused, workoutLog, prsHit, workoutStartTime,
    totalRestTimeSpent, exerciseRestTimes
  ]);


  // ── Check if workout already done today ──
  useEffect(() => {
    setTodayWorkouts(getWorkoutsByDate(getToday()));
  }, [mode]);

  // ── Timer logic — only depend on isResting and timerPaused ──
  useEffect(() => {
    if (isResting && !timerPaused) {
      timerRef.current = setInterval(() => {
        setTotalRestTimeSpent(prevSpent => prevSpent + 1);
        
        // Accumulate rest time for the current exercise
        const currentExId = template?.exercises?.[currentExIdx]?.exerciseId;
        if (currentExId) {
          setExerciseRestTimes(prev => ({
            ...prev,
            [currentExId]: (prev[currentExId] || 0) + 1
          }));
        }

        setRestTime(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsResting(false);
            
            // Final Web Audio chime alert
            playRestChime(true);
            
            // Native vibration final alerts
            if (navigator.vibrate) {
              navigator.vibrate([250, 100, 250]);
            }
            return 0;
          }
          
          // Sound and subtle haptic warning ticks at 10s, 3s, 2s, 1s
          const nextVal = prev - 1;
          if (nextVal === 10 || nextVal === 3 || nextVal === 2 || nextVal === 1) {
            playRestChime(false);
            if (navigator.vibrate) {
              navigator.vibrate(40);
            }
          }
          
          return nextVal;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isResting, timerPaused]);

  // ── Helpers ──
  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

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

  // Monochrome Icons Mapping
  const getExerciseIcon = (exerciseId, size = 18) => {
    const stroke = 2.2;
    switch (exerciseId) {
      case 'squat':
      case 'deadlift':
      case 'bench':
      case 'ohp':
      case 'row':
      case 'curl':
        return <Dumbbell size={size} strokeWidth={stroke} />;
      default:
        return <Activity size={size} strokeWidth={stroke} />;
    }
  };

  const getWarmupIcon = (idx) => {
    const stroke = 2.2;
    switch (idx) {
      case 0: return <Activity size={18} strokeWidth={stroke} />;
      case 1: return <Footprints size={18} strokeWidth={stroke} />;
      case 2: return <Compass size={18} strokeWidth={stroke} />;
      case 3: return <Footprints size={18} strokeWidth={stroke} />;
      case 4: return <Activity size={18} strokeWidth={stroke} />;
      case 5: return <Dumbbell size={18} strokeWidth={stroke} />;
      case 6: return <RotateCcw size={18} strokeWidth={stroke} />;
      default: return <Activity size={18} strokeWidth={stroke} />;
    }
  };

  // ── Actions ──
  const startWorkout = () => {
    setMode('active');
    setCurrentExIdx(0);
    setCurrentSet(1);
    setWorkoutLog([]);
    setPrsHit([]);
    setWorkoutStartTime(Date.now());
    setTotalRestTimeSpent(0);
    setExerciseRestTimes({});
    const firstEx = template.exercises[0];
    setWeightInput(getExerciseWeight(firstEx.exerciseId, firstEx.weight).toString());
    setRepsInput(firstEx.reps.toString());
    window.scrollTo(0, 0);
  };

  const completeSet = () => {
    if (!debounceCompleteSet()) return;

    const exTemplate = template.exercises[currentExIdx];
    const ex = exercises[exTemplate.exerciseId];
    const weight = parseFloat(weightInput) || 0;
    const reps = parseInt(repsInput) || 0;

    if (weight <= 0 || reps <= 0) return;

    const setLog = {
      exerciseId: exTemplate.exerciseId,
      exerciseName: ex.name,
      set: currentSet,
      weight,
      reps,
      timestamp: new Date().toISOString(),
    };

    setWorkoutLog(prev => [...prev, setLog]);

    const isPR = updatePR(exTemplate.exerciseId, weight, reps);
    if (isPR) {
      setPrsHit(prev => [...prev, { name: ex.nameShort, weight, reps }]);
    }

    const minSets = exTemplate.minSets || exTemplate.sets || 3;
    const maxSets = exTemplate.maxSets || minSets;

    if (currentSet < minSets) {
      setCurrentSet(prev => prev + 1);
      const totalRest = Math.round(exTemplate.restMinutes * 60);
      setRestTotal(totalRest);
      setRestTime(totalRest);
      setIsResting(true);
      setTimerPaused(false);
    } else if (currentSet < maxSets) {
      setShowFlexChoice(true);
    } else {
      advanceToNextExercise();
    }
  };

  const doOneMoreSet = () => {
    setShowFlexChoice(false);
    setCurrentSet(prev => prev + 1);
    const exTemplate = template.exercises[currentExIdx];
    const totalRest = Math.round(exTemplate.restMinutes * 60);
    setRestTotal(totalRest);
    setRestTime(totalRest);
    setIsResting(true);
    setTimerPaused(false);
  };

  const advanceToNextExercise = () => {
    setShowFlexChoice(false);
    if (currentExIdx < template.exercises.length - 1) {
      const nextIdx = currentExIdx + 1;
      setCurrentExIdx(nextIdx);
      setCurrentSet(1);
      const nextEx = template.exercises[nextIdx];
      setWeightInput(getExerciseWeight(nextEx.exerciseId, nextEx.weight).toString());
      setRepsInput(nextEx.reps.toString());
      const exTemplate = template.exercises[currentExIdx];
      const totalRest = Math.round(exTemplate.restMinutes * 60);
      setRestTotal(totalRest);
      setRestTime(totalRest);
      setIsResting(true);
      setTimerPaused(false);
    } else {
      finishWorkout();
    }
  };

  const finishWorkout = () => {
    clearInterval(timerRef.current);
    setIsResting(false);
    setRestTime(0);

    const totalDurationSecs = Math.round((Date.now() - workoutStartTime) / 1000);
    const totalRestSecs = totalRestTimeSpent;
    const totalExerciseSecs = Math.max(0, totalDurationSecs - totalRestSecs);
    
    const settings = getSettings();
    const userWeight = parseFloat(settings.weightKg) || 70;
    const caloriesBurnt = Math.round(5.0 * 3.5 * userWeight / 200 * (totalDurationSecs / 60));
    
    setCompletionDuration(Math.round(totalDurationSecs / 60));
    setCompletionStats({
      actualSets: workoutLog.length,
      totalDurationSecs,
      totalRestSecs,
      totalExerciseSecs,
      caloriesBurnt
    });
    
    saveWorkoutLog({
      type: workoutType,
      templateName: template.name,
      sets: workoutLog,
      duration: Math.round(totalDurationSecs / 60),
      date: getToday(),
    });
    setMode('complete');
    window.scrollTo(0, 0);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 4000);
  };

  const cancelWorkout = () => {
    setShowCancelConfirm(false);
    clearInterval(timerRef.current);
    setIsResting(false);
    setRestTime(0);
    setMode('plan');
    window.scrollTo(0, 0);
  };

  const toggleTimer = () => setTimerPaused(prev => !prev);

  const resetTimer = () => {
    setRestTime(restTotal);
    setTimerPaused(false);
  };

  const skipRest = () => {
    clearInterval(timerRef.current);
    setRestTime(0);
    setIsResting(false);
  };

  const toggleCheck = (step) => {
    setCheckedSteps(prev => ({ ...prev, [step]: !prev[step] }));
  };

  const toggleWarmup = (idx) => {
    setCheckedWarmups(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (!template) return null;

  const workoutDoneToday = todayWorkouts.length > 0;

  const timerProgress = restTotal > 0 ? ((restTotal - restTime) / restTotal) * 100 : 0;
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference - (timerProgress / 100) * circumference;

  // ════════════════════════════════════════════
  // RENDER: Completion Screen
  // ════════════════════════════════════════════
  if (mode === 'complete') {
    const totalSets = workoutLog.length;
    const totalVolume = workoutLog.reduce((s, l) => s + l.weight * l.reps, 0);

    return (
      <div 
        className="page-content workout-page"
        style={{
          paddingBottom: 'calc(var(--nav-height) + var(--safe-bottom) + 32px)',
          background: '#F2F2F7',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box'
        }}
      >
        {showConfetti && (
          <div className="confetti-container">
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                className="confetti-piece"
                style={{
                  '--x': `${Math.random() * 100}vw`,
                  '--delay': `${Math.random() * 2}s`,
                  '--duration': `${2 + Math.random() * 2}s`,
                  '--color': ['#007AFF', '#5856D6', '#34C759', '#FF9500', '#FF3B30', '#FF9500'][i % 6],
                  '--rotation': `${Math.random() * 360}deg`,
                }}
              />
            ))}
          </div>
        )}

        <div className="completion-screen" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
          <div 
            className="completion-icon"
            style={{
              width: 64,
              height: 64,
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E5EA',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
            }}
          >
            <Trophy size={32} strokeWidth={2.2} style={{ color: '#FF9500' }} />
          </div>
          
          <h1 style={{ fontSize: 24, fontWeight: '800', color: '#1C1C1E', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Workout Complete
          </h1>
          <p style={{ fontSize: 13, color: '#8E8E93', margin: '0 0 20px', fontWeight: '500' }}>
            {template.name} · {Math.round(totalVolume)}kg total volume
          </p>

          {/* Premium Visual Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginBottom: 28,
            textAlign: 'left'
          }}>
            {[
              {
                label: 'Sets Done',
                value: `${completionStats.actualSets} sets`,
                icon: <Check size={18} strokeWidth={2.4} color="#34C759" />,
                color: 'rgba(52,199,89,0.06)'
              },
              {
                label: 'Exercise Time',
                value: (() => {
                  const mins = Math.floor(completionStats.totalExerciseSecs / 60);
                  const secs = completionStats.totalExerciseSecs % 60;
                  return mins === 0 ? `${secs}s` : `${mins}m ${secs}s`;
                })(),
                icon: <Dumbbell size={18} strokeWidth={2.4} color="#007AFF" />,
                color: 'rgba(0,122,255,0.06)'
              },
              {
                label: 'Rest Time',
                value: (() => {
                  const mins = Math.floor(completionStats.totalRestSecs / 60);
                  const secs = completionStats.totalRestSecs % 60;
                  return mins === 0 ? `${secs}s` : `${mins}m ${secs}s`;
                })(),
                icon: <Timer size={18} strokeWidth={2.4} color="#FF9500" />,
                color: 'rgba(255,149,0,0.06)'
              },
              {
                label: 'Est. Calories',
                value: `${completionStats.caloriesBurnt} kcal`,
                icon: <Zap size={18} strokeWidth={2.4} color="#FF3B30" />,
                color: 'rgba(255,59,48,0.06)'
              }
            ].map((stat, i) => (
              <div key={i} style={{
                padding: 16,
                background: '#FFFFFF',
                border: '1px solid #E5E5EA',
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
              }}>
                <div style={{
                  background: stat.color,
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {stat.icon}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: 10, color: '#8E8E93', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</span>
                  <span style={{ fontSize: 15, fontWeight: '700', color: '#1C1C1E', marginTop: 2 }}>{stat.value}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'left', marginBottom: 32 }}>
            <h3 style={{ fontSize: 14, fontWeight: '700', color: '#1C1C1E', margin: '0 0 12px', letterSpacing: '-0.01em' }}>
              Exercise Summary
            </h3>
            {template.exercises.map((exT, idx) => {
              const ex = exercises[exT.exerciseId];
              const sets = workoutLog.filter(l => l.exerciseId === exT.exerciseId);
              const prHit = prsHit.find(p => p.name === ex.nameShort);
              let exerciseDuration = null;
              if (sets.length >= 2) {
                const first = new Date(sets[0].timestamp).getTime();
                const last = new Date(sets[sets.length - 1].timestamp).getTime();
                exerciseDuration = Math.round((last - first) / 60000);
              }
              return (
                <div 
                  key={idx} 
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: prHit ? '1.5px solid #FFE082' : '1px solid #E5E5EA',
                    borderRadius: 14,
                    padding: '14px 16px',
                    marginBottom: 10,
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ color: '#636366' }}>
                        {getExerciseIcon(exT.exerciseId, 16)}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: '700', color: '#1C1C1E' }}>{ex.nameShort}</span>
                    </div>
                    {prHit && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        backgroundColor: '#FFF9E6', border: '1px solid #FFE082',
                        color: '#B78103', padding: '2px 8px', borderRadius: 8,
                        fontSize: 10, fontWeight: '700', letterSpacing: '0.3px'
                      }}>
                        <Trophy size={10} strokeWidth={2.5} /> PR
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {sets.map((s, si) => (
                      <span 
                        key={si} 
                        style={{
                          backgroundColor: '#F2F2F7',
                          borderRadius: 8,
                          padding: '4px 10px',
                          fontSize: 12,
                          fontWeight: '600',
                          color: '#1C1C1E'
                        }}
                      >
                        {s.weight}kg × {s.reps}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10, paddingTop: 8, borderTop: '1px solid #F2F2F7' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#8E8E93', fontWeight: '600' }}>
                      <Timer size={11} strokeWidth={2.2} />
                      {(() => {
                        const actualRestSecs = exerciseRestTimes[exT.exerciseId] || 0;
                        if (actualRestSecs === 0) return 'No rest';
                        const mins = Math.floor(actualRestSecs / 60);
                        const secs = actualRestSecs % 60;
                        return mins === 0 ? `${secs}s rest` : `${mins}m ${secs}s rest`;
                      })()}
                    </span>
                    {exerciseDuration !== null && exerciseDuration > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#8E8E93', fontWeight: '600' }}>
                        <Dumbbell size={11} strokeWidth={2.2} /> ~{exerciseDuration} min
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                padding: '16px',
                border: 'none',
                borderRadius: 14,
                backgroundColor: '#1C1C1E',
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '600',
                cursor: 'pointer',
                minHeight: 52,
                fontFamily: 'inherit'
              }}
              onClick={() => { setMode('plan'); window.scrollTo(0, 0); }}
            >
              Back to Plan
            </button>
            <button 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                padding: '16px',
                border: '1.5px solid #FF9500',
                borderRadius: 14,
                backgroundColor: '#FFFAF0',
                color: '#E67E22',
                fontSize: 16,
                fontWeight: '600',
                cursor: 'pointer',
                minHeight: 52,
                fontFamily: 'inherit'
              }}
              onClick={() => setShowGoAgainWarning(true)}
            >
              <RotateCcw size={18} strokeWidth={2.2} style={{ color: '#FF9500' }} />
              Go Again!
            </button>
          </div>

          {/* Go Again Warning Modal */}
          <Modal isOpen={showGoAgainWarning} onClose={() => setShowGoAgainWarning(false)} type="centered-alert">
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              backgroundColor: '#FFF5EB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <AlertTriangle size={26} strokeWidth={2.2} style={{ color: '#FF9500' }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: '700', color: '#1C1C1E', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
              Train Again Today?
            </h3>
            <p style={{ fontSize: 13, color: '#8E8E93', margin: '0 0 24px', lineHeight: '1.5' }}>
              You've already completed a workout today. Training the same muscle groups again increases injury risk and may hinder recovery. Only proceed if targeting different muscles or doing a light session.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="btn btn-secondary w-full"
                onClick={() => setShowGoAgainWarning(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary w-full"
                style={{ backgroundColor: '#FF9500' }}
                onClick={() => { setShowGoAgainWarning(false); startWorkout(); }}
              >
                Start Anyway
              </button>
            </div>
          </Modal>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════
  // RENDER: Active Workout
  // ════════════════════════════════════════════
  if (mode === 'active') {
    const exTemplate = template.exercises[currentExIdx];
    const ex = exercises[exTemplate.exerciseId];
    const minSets = exTemplate.minSets || exTemplate.sets || 3;
    const maxSets = exTemplate.maxSets || minSets;
    const isAmrap = exTemplate.amrap && (currentSet >= minSets);
    const isLastExercise = currentExIdx === template.exercises.length - 1;
    const weight = parseFloat(weightInput) || 0;
    const reps = parseInt(repsInput) || 0;
    const isInputValid = weight > 0 && reps > 0;

    return (
      <div 
        className="page-content workout-page"
        style={{
          paddingBottom: 'calc(var(--nav-height) + var(--safe-bottom) + 32px)',
          background: '#F2F2F7',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box'
        }}
      >
        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 4, padding: '16px 0 24px' }}>
          {template.exercises.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: i < currentExIdx ? '#34C759' : i === currentExIdx ? '#007AFF' : '#E5E5EA',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>

        <div className="active-workout" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
          {/* Current exercise */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '50%', backgroundColor: '#FFFFFF', border: '1px solid #E5E5EA', color: '#1C1C1E', marginBottom: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
              {getExerciseIcon(exTemplate.exerciseId, 24)}
            </div>
            <h2 style={{ fontSize: 24, fontWeight: '800', color: '#1C1C1E', margin: '0 0 4px', letterSpacing: '-0.02em' }}>{ex.nameShort}</h2>
            <span style={{ fontSize: 13, color: '#8E8E93', fontWeight: '500' }}>{ex.muscle}</span>
          </div>

          {/* Set counter */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span style={{ fontSize: 11, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '1px' }}>Set</span>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8 }}>
              {Array.from({ length: Math.max(currentSet, minSets) }).map((_, i) => {
                const isPast = i + 1 < currentSet;
                const isCurrent = i + 1 === currentSet;
                const isBonus = i + 1 > minSets;
                
                return (
                  <span
                    key={i}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 15,
                      fontWeight: '700',
                      border: isCurrent 
                        ? '2px solid #007AFF' 
                        : isPast 
                          ? '2px solid #34C759' 
                          : isBonus 
                            ? '2.2px dashed #E5E5EA' 
                            : '2px solid #E5E5EA',
                      color: isCurrent 
                        ? '#007AFF' 
                        : isPast 
                          ? '#34C759' 
                          : '#8E8E93',
                      backgroundColor: isCurrent 
                        ? '#E8F0FE' 
                        : isPast 
                          ? '#E8F5E9' 
                          : '#FFFFFF',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {i + 1}
                  </span>
                );
              })}
              {currentSet <= maxSets && currentSet >= minSets && !showFlexChoice && (
                <span style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: '700',
                  border: '2px dashed #D1D1D6',
                  color: '#AEAEB2',
                  backgroundColor: 'transparent'
                }}>
                  +
                </span>
              )}
            </div>
            {isAmrap && (
              <span style={{
                display: 'inline-block',
                marginTop: 12,
                backgroundColor: '#EDE7F6',
                color: '#5856D6',
                fontSize: 12,
                fontWeight: '700',
                padding: '4px 12px',
                borderRadius: 8,
                letterSpacing: 0.5,
                textTransform: 'uppercase'
              }}>
                AMRAP
              </span>
            )}
          </div>

          {/* Rest Timer */}
          {isResting && (
            <div style={{ textAlign: 'center', margin: '24px 0', animation: 'fadeInUp 0.4s ease-out' }}>
              <p style={{ fontSize: 12, fontWeight: '600', color: '#8E8E93', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Rest Period</p>
              <div className="circular-timer" style={{ width: 180, height: 180 }}>
                <svg className="timer-svg" viewBox="0 0 200 200">
                  <circle
                    className="timer-bg-circle"
                    cx="100" cy="100" r="90"
                    fill="none" stroke="#E5E5EA" strokeWidth="6"
                  />
                  <circle
                    className="timer-progress-circle"
                    cx="100" cy="100" r="90"
                    fill="none" stroke="#007AFF" strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    transform="rotate(-90 100 100)"
                  />
                </svg>
                <div className="timer-display">
                  <span className="timer-time" style={{ fontSize: 36, fontWeight: '800', color: '#1C1C1E' }}>{formatTime(restTime)}</span>
                  <span className="timer-total" style={{ fontSize: 12, color: '#8E8E93', marginTop: 2 }}>of {formatTime(restTotal)}</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 20 }}>
                <button 
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    border: '1px solid #E5E5EA',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                    color: '#1C1C1E'
                  }}
                  onClick={toggleTimer} 
                  aria-label={timerPaused ? 'Resume' : 'Pause'}
                >
                  {timerPaused ? <Play size={18} strokeWidth={2.2} /> : <Pause size={18} strokeWidth={2.2} />}
                </button>
                <button 
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    border: '1px solid #E5E5EA',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                    color: '#1C1C1E'
                  }}
                  onClick={resetTimer} 
                  aria-label="Reset timer"
                >
                  <RotateCcw size={18} strokeWidth={2.2} />
                </button>
                <button 
                  style={{
                    height: 44,
                    padding: '0 20px',
                    borderRadius: 22,
                    border: '1px solid #E5E5EA',
                    backgroundColor: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#007AFF',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                  }}
                  onClick={skipRest}
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* Input fields */}
          {!isResting && (
            <div style={{ display: 'flex', gap: 12, margin: '24px 0' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: '600', color: '#8E8E93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Weight (kg)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  disabled
                  className="input-field"
                  style={{
                    fontSize: 24,
                    textAlign: 'center',
                    padding: 12,
                    borderRadius: 14,
                    border: '1px solid #E5E5EA',
                    backgroundColor: '#F2F2F7',
                    color: '#8E8E93',
                    fontWeight: '700',
                    height: 54,
                    boxSizing: 'border-box',
                    cursor: 'not-allowed'
                  }}
                  value={weightInput}
                  placeholder="0"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: '600', color: '#8E8E93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Reps {isAmrap && <span style={{ color: '#5856D6', fontWeight: '700', fontSize: 10, textTransform: 'none', marginLeft: 4 }}>Max reps!</span>}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  disabled
                  className="input-field"
                  style={{
                    fontSize: 24,
                    textAlign: 'center',
                    padding: 12,
                    borderRadius: 14,
                    border: '1px solid #E5E5EA',
                    backgroundColor: '#F2F2F7',
                    color: '#8E8E93',
                    fontWeight: '700',
                    height: 54,
                    boxSizing: 'border-box',
                    cursor: 'not-allowed'
                  }}
                  value={repsInput}
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {/* Complete set / flex choice */}
          {!isResting && !showFlexChoice && (
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                padding: '16px',
                border: 'none',
                borderRadius: 14,
                backgroundColor: isInputValid ? '#1C1C1E' : '#E5E5EA',
                color: isInputValid ? '#FFFFFF' : '#8E8E93',
                fontSize: 16,
                fontWeight: '600',
                cursor: isInputValid ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                minHeight: 52,
                fontFamily: 'inherit'
              }}
              onClick={completeSet}
              disabled={!isInputValid}
            >
              <Check size={18} strokeWidth={2.5} />
              Complete Set {currentSet}
            </button>
          )}

          {/* After min sets: choose to continue or move on */}
          {!isResting && showFlexChoice && (
            <div style={{ marginTop: 16, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E5EA', textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: '600', color: '#1C1C1E', marginBottom: 12 }}>
                {minSets} sets done. Keep going?
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '12px 16px',
                    border: '1px solid #E5E5EA',
                    borderRadius: 12,
                    backgroundColor: '#F2F2F7',
                    color: '#1C1C1E',
                    fontSize: 14,
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                  onClick={advanceToNextExercise}
                >
                  {isLastExercise ? (
                    <>
                      <Check size={16} strokeWidth={2.2} />
                      Finish Workout
                    </>
                  ) : (
                    <>
                      Next Exercise
                      <ChevronRight size={16} strokeWidth={2.2} />
                    </>
                  )}
                </button>
                {currentSet < maxSets && (
                  <button
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '12px 16px',
                      border: '1px solid #E5E5EA',
                      borderRadius: 12,
                      backgroundColor: '#FFFFFF',
                      color: '#34C759',
                      fontSize: 14,
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                    onClick={doOneMoreSet}
                  >
                    <Plus size={16} strokeWidth={2.2} />
                    1 Set
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Logged sets */}
          {workoutLog.filter(l => l.exerciseId === exTemplate.exerciseId).length > 0 && (
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #E5E5EA' }}>
              <p style={{ fontSize: 11, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }}>Logged Sets</p>
              {workoutLog
                .filter(l => l.exerciseId === exTemplate.exerciseId)
                .map((l, i) => (
                  <div 
                    key={i} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E5EA',
                      borderRadius: 10,
                      marginBottom: 6
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: '600', color: '#8E8E93' }}>Set {l.set}</span>
                    <span style={{ fontSize: 14, fontWeight: '700', color: '#1C1C1E' }}>{l.weight}kg × {l.reps} reps</span>
                    <Check size={16} strokeWidth={2.5} style={{ color: '#34C759' }} />
                  </div>
                ))}
            </div>
          )}

          {/* Cancel workout button */}
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              width: '100%',
              padding: '14px',
              marginTop: 24,
              border: 'none',
              borderRadius: 12,
              backgroundColor: 'transparent',
              color: '#FF3B30',
              fontSize: 14,
              fontWeight: '600',
              cursor: 'pointer',
              minHeight: 44,
              fontFamily: 'inherit'
            }}
            onClick={() => setShowCancelConfirm(true)}
          >
            <X size={14} strokeWidth={2.5} />
            Cancel Workout
          </button>

          {/* Cancel confirmation dialog */}
          <Modal isOpen={showCancelConfirm} onClose={() => setShowCancelConfirm(false)} type="centered-alert">
            <h3 style={{ fontSize: 18, fontWeight: '700', color: '#1C1C1E', margin: '0 0 8px', letterSpacing: '-0.01em' }}>Cancel Workout?</h3>
            <p style={{ fontSize: 13, color: '#8E8E93', margin: '0 0 20px', lineHeight: '1.4' }}>
              Your progress for this session will be lost.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="btn btn-danger w-full"
                onClick={cancelWorkout}
              >
                Yes, Cancel
              </button>
              <button
                className="btn btn-secondary w-full"
                onClick={() => setShowCancelConfirm(false)}
              >
                No, Continue
              </button>
            </div>
          </Modal>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════
  // RENDER: Plan View (default)
  // ════════════════════════════════════════════
  return (
    <div 
      className="page-content workout-page"
      style={{
        paddingBottom: 'calc(var(--nav-height) + var(--safe-bottom) + 32px)',
        background: '#F2F2F7',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}
    >
      {/* Safety Form Tip Banner */}
      <div 
        style={{
          backgroundColor: '#FFF5F5',
          border: '1px solid #FEE2E2',
          borderRadius: 14,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20
        }}
      >
        <AlertTriangle size={18} strokeWidth={2.2} style={{ color: '#E53E3E', flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: '#9B2C2C', lineHeight: '1.4', fontWeight: '500' }}>
          <strong style={{ fontWeight: '700', marginRight: 4 }}>FORM FIRST:</strong>
          Training near max has high injury risk. Never sacrifice form for weight.
        </span>
      </div>

      {/* Workout Header */}
      <div style={{ textAlign: 'center', padding: '16px 0 20px' }}>
        <h1 style={{ fontSize: 24, fontWeight: '800', color: '#1C1C1E', margin: '0 0 6px', letterSpacing: '-0.02em' }}>{template.name}</h1>
        <p style={{ fontSize: 13, color: '#8E8E93', margin: '0 0 12px', fontWeight: '500' }}>{todayFormatted()}</p>
        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
          {usingActiveSheet ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#E8F5E9',
              color: '#2E7D32',
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: '600'
            }}>
              <Zap size={13} strokeWidth={2.5} /> Active Sheet
            </span>
          ) : (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#E8F0FE',
              color: '#007AFF',
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: '600'
            }}>
              <Activity size={13} strokeWidth={2.5} /> {workoutType === 'A' ? 'Push Day' : 'Pull Day'}
            </span>
          )}
        </div>
      </div>

      {/* Workout Completed Banner */}
      {workoutDoneToday && (
        <div 
          style={{
            backgroundColor: '#E8F5E9',
            border: '1px solid #C8E6C9',
            borderRadius: 14,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            backgroundColor: '#FFFFFF', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <Check size={18} strokeWidth={2.5} style={{ color: '#2E7D32' }} />
          </div>
          <div>
            <span style={{ fontSize: 14, fontWeight: '700', color: '#2E7D32', display: 'block' }}>Today's Workout Complete</span>
            <span style={{ fontSize: 12, color: '#4CAF50', fontWeight: '500' }}>
              {todayWorkouts.length} session{todayWorkouts.length > 1 ? 's' : ''} logged today
            </span>
          </div>
        </div>
      )}

      {/* Warm-up Section */}
      <div 
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          border: '1px solid #E5E5EA',
          padding: '20px',
          marginBottom: '16px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)'
        }}
      >
        <button 
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            padding: 0
          }}
          onClick={() => setWarmupOpen(p => !p)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: '#F2F2F7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#636366'
            }}>
              <Activity size={20} strokeWidth={2.2} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: '700', color: '#1C1C1E', margin: 0 }}>RAMP Warm-up</h3>
              <p style={{ fontSize: 12, color: '#8E8E93', margin: '2px 0 0' }}>7 movements • ~10 min</p>
            </div>
          </div>
          {warmupOpen ? <ChevronUp size={20} style={{ color: '#AEAEB2' }} /> : <ChevronDown size={20} style={{ color: '#AEAEB2' }} />}
        </button>

        {warmupOpen && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #E5E5EA' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {warmupRoutine.map((item, i) => {
                const done = !!checkedWarmups[i];
                const isWarmupExpanded = expandedWarmupIdx === i;
                return (
                  <div
                    key={i}
                    style={{
                      background: done ? '#E8F5E930' : '#FFFFFF',
                      borderRadius: 14,
                      border: '1px solid #E5E5EA',
                      transition: 'all 0.2s ease',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    {/* Header Row */}
                    <div
                      onClick={() => setExpandedWarmupIdx(isWarmupExpanded ? null : i)}
                      style={{
                        cursor: 'pointer',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        userSelect: 'none'
                      }}
                    >
                      {/* Checkbox badge circle */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleWarmup(i); }}
                        style={{
                          border: 'none',
                          cursor: 'pointer',
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          flexShrink: 0,
                          background: done ? '#34C759' : '#F2F2F7',
                          color: done ? '#FFFFFF' : '#636366',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {done ? <Check size={14} strokeWidth={2.8} /> : getWarmupIcon(i)}
                      </button>

                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, paddingLeft: 2 }}>
                        <span style={{
                          fontSize: 13.5,
                          fontWeight: '600',
                          textDecoration: done ? 'line-through' : 'none',
                          color: done ? '#AEAEB2' : '#1C1C1E',
                          transition: 'all 0.2s ease',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>{item.name}</span>
                        <span style={{ fontSize: 11.5, color: done ? '#AEAEB2' : '#8E8E93', marginTop: 2 }}>{item.duration}</span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', color: '#AEAEB2' }}>
                        {isWarmupExpanded ? <ChevronUp size={16} strokeWidth={2.4} /> : <ChevronDown size={16} strokeWidth={2.4} />}
                      </div>
                    </div>

                    {/* Accordion instructions */}
                    {isWarmupExpanded && (
                      <div style={{
                        padding: '0 14px 14px 52px',
                        fontSize: 12.5,
                        lineHeight: 1.45,
                        color: '#636366',
                        borderTop: '0.5px solid #F2F2F7',
                        background: '#F9F9FB',
                        paddingTop: 10
                      }}>
                        {item.instructions}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Barbell Warmup Sets Calculator */}
            {(() => {
              const activeExTemplate = template.exercises[currentExIdx];
              const activeExName = activeExTemplate ? (exercises[activeExTemplate.exerciseId]?.nameShort || activeExTemplate.exerciseId) : '';
              const activeWorkingWeight = activeExTemplate ? getExerciseWeight(activeExTemplate.exerciseId, activeExTemplate.weight) : 0;

              return (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #E5E5EA' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h4 style={{ fontSize: 14, fontWeight: '700', color: '#1C1C1E', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Timer size={15} strokeWidth={2.2} style={{ color: '#007AFF' }} /> Ramp-up Sets
                    </h4>
                    {activeExTemplate && activeWorkingWeight > 0 && (
                      <span style={{ fontSize: 11, fontWeight: '700', color: '#8E8E93', background: '#F2F2F7', padding: '3px 8px', borderRadius: 8 }}>
                        Calculated for {activeExName} @ {activeWorkingWeight}kg
                      </span>
                    )}
                  </div>
                  <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E5EA', backgroundColor: '#FFFFFF' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 0.6fr 1.3fr', padding: '8px 12px', backgroundColor: '#F2F2F7', fontSize: 11, fontWeight: '600', color: '#636366', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      <span>Set</span>
                      <span>Load</span>
                      <span>Reps</span>
                      <span>Purpose</span>
                    </div>
                    {warmupSets.map((s, i) => {
                      const pct = parseInt(s.load) / 100;
                      const calculatedWeight = activeWorkingWeight > 0 ? Math.round((activeWorkingWeight * pct) / 2.5) * 2.5 : 0;
                      return (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 0.6fr 1.3fr', padding: '10px 12px', fontSize: 13, borderTop: '1px solid #E5E5EA', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
                          <span style={{ fontWeight: '600', color: '#1C1C1E' }}>{s.label}</span>
                          <span style={{ fontWeight: '700', color: '#007AFF' }}>
                            {calculatedWeight > 0 ? `${calculatedWeight} kg` : s.load}
                            {calculatedWeight > 0 && <span style={{ fontSize: 10, color: '#8E8E93', fontWeight: '500', marginLeft: 4 }}>({s.load})</span>}
                          </span>
                          <span style={{ color: '#636366' }}>×{s.reps}</span>
                          <span style={{ fontSize: 11.5, color: '#8E8E93' }}>{s.purpose}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Exercise List */}
      <div style={{ marginTop: 8, marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: '700', color: '#1C1C1E', margin: '0 0 16px', letterSpacing: '-0.01em' }}>Exercises</h2>
        {template.exercises.map((exT, idx) => {
          const ex = exercises[exT.exerciseId] || { nameShort: exT.exerciseId, muscle: '', icon: '', formTips: [], warnings: [] };
          const weight = getExerciseWeight(exT.exerciseId, exT.weight);
          const isExpanded = expandedExercise === idx;
          const isAmrapSet = exT.amrap;

          return (
            <div 
              key={idx} 
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                border: '1px solid #E5E5EA',
                padding: '16px',
                marginBottom: '16px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: '#F2F2F7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#636366'
                  }}>
                    {getExerciseIcon(exT.exerciseId, 20)}
                  </div>
                  <div>
                    <h4 style={{ fontSize: 16, fontWeight: '700', color: '#1C1C1E', margin: 0, letterSpacing: '-0.01em' }}>{ex.nameShort}</h4>
                    <span style={{ fontSize: 12, color: '#8E8E93' }}>{ex.muscle}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 17, fontWeight: '800', color: '#1C1C1E', letterSpacing: '-0.02em' }}>
                      {exT.minSets || exT.sets || 3}{exT.maxSets ? `-${exT.maxSets}` : ''}×{exT.reps}
                    </span>
                    {isAmrapSet && (
                      <span style={{
                        backgroundColor: '#EDE7F6',
                        color: '#5856D6',
                        fontSize: 10,
                        fontWeight: '700',
                        padding: '2px 6px',
                        borderRadius: 6,
                        letterSpacing: 0.5,
                        textTransform: 'uppercase'
                      }}>
                        AMRAP
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: '700', color: '#007AFF' }}>{weight} kg</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#8E8E93' }}>
                    <Timer size={11} strokeWidth={2.2} /> {exT.restMinutes}m rest
                  </span>
                </div>
              </div>

              {exT.notes && (
                <p style={{
                  fontSize: 12,
                  color: '#636366',
                  margin: '12px 0 0',
                  padding: '8px 12px',
                  backgroundColor: '#F2F2F7',
                  borderRadius: 10,
                  fontStyle: 'italic',
                  lineHeight: '1.4'
                }}>{exT.notes}</p>
              )}

              <button
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  marginTop: 12,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: '600',
                  color: '#007AFF',
                  padding: '4px 0',
                  fontFamily: 'inherit'
                }}
                onClick={() => setExpandedExercise(isExpanded ? null : idx)}
              >
                {isExpanded ? 'Hide' : 'Show'} Form Tips
                {isExpanded ? <ChevronUp size={14} strokeWidth={2.5} /> : <ChevronDown size={14} strokeWidth={2.5} />}
              </button>

              {isExpanded && (
                <div style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: '1px solid #E5E5EA'
                }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px 0' }}>
                    {ex.formTips.map((tip, ti) => (
                      <li key={ti} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        fontSize: 13,
                        color: '#1C1C1E',
                        padding: '4px 0',
                        lineHeight: '1.4'
                      }}>
                        <Check size={14} strokeWidth={2.5} style={{ color: '#34C759', flexShrink: 0, marginTop: 2 }} />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                  {ex.warnings.length > 0 && (
                    <div style={{
                      padding: 10,
                      backgroundColor: '#FFF5F5',
                      border: '1px solid #FEE2E2',
                      borderRadius: 10
                    }}>
                      {ex.warnings.map((w, wi) => (
                        <p key={wi} style={{
                          fontSize: 12,
                          color: '#9B2C2C',
                          margin: 0,
                          padding: '2px 0',
                          lineHeight: '1.4',
                          fontWeight: '500'
                        }}>
                          {w.replace(/⚠️\s*/, '')}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Irradiation Checklist */}
      <div 
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          border: '1px solid #E5E5EA',
          padding: '20px',
          marginBottom: '16px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)'
        }}
      >
        <button 
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            padding: 0
          }}
          onClick={() => setIrradiationOpen(p => !p)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: '#F2F2F7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#636366'
            }}>
              <Shield size={20} strokeWidth={2.2} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: '700', color: '#1C1C1E', margin: 0 }}>Irradiation Checklist</h3>
              <p style={{ fontSize: 12, color: '#8E8E93', margin: '2px 0 0' }}>7-step tension protocol</p>
            </div>
          </div>
          {irradiationOpen ? <ChevronUp size={20} style={{ color: '#AEAEB2' }} /> : <ChevronDown size={20} style={{ color: '#AEAEB2' }} />}
        </button>

        {irradiationOpen && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #E5E5EA' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {irradiationChecklist.map((item) => {
                const done = !!checkedSteps[item.step];
                return (
                  <label 
                    key={item.step} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 0',
                      cursor: 'pointer',
                      borderBottom: '1px solid #F2F2F7',
                      minHeight: 44
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <div style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: done ? '#E8F5E9' : '#F2F2F7',
                        color: done ? '#2E7D32' : '#636366',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: '700',
                        marginRight: 12,
                        flexShrink: 0,
                        border: done ? '1.5px solid #2E7D32' : '1.5px solid transparent',
                        transition: 'all 0.2s ease'
                      }}>
                        {done ? <Check size={14} strokeWidth={3} /> : `0${item.step}`}
                      </div>
                      <span style={{
                        fontSize: 14,
                        fontWeight: '500',
                        color: done ? '#AEAEB2' : '#1C1C1E',
                        textDecoration: done ? 'line-through' : 'none',
                        transition: 'all 0.2s ease'
                      }}>{item.text}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Start Workout / Go Again Button */}
      <button 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          padding: '16px',
          border: workoutDoneToday ? '1.5px solid #FF9500' : '1px solid #E5E5EA',
          borderRadius: 14,
          backgroundColor: workoutDoneToday ? '#FFFAF0' : '#FFFFFF',
          color: workoutDoneToday ? '#E67E22' : '#1C1C1E',
          fontSize: 16,
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)',
          transition: 'all 0.2s ease',
          minHeight: 50,
          marginTop: 24,
          fontFamily: 'inherit'
        }}
        onClick={workoutDoneToday ? () => setShowGoAgainWarning(true) : startWorkout}
      >
        {workoutDoneToday ? (
          <>
            <RotateCcw size={18} strokeWidth={2.2} style={{ color: '#FF9500' }} />
            Go Again!
          </>
        ) : (
          <>
            <Play size={18} strokeWidth={2.2} style={{ color: '#007AFF' }} />
            Start Workout
          </>
        )}
      </button>

      {/* Go Again Warning Modal */}
      <Modal isOpen={showGoAgainWarning} onClose={() => setShowGoAgainWarning(false)} type="centered-alert">
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          backgroundColor: '#FFF5EB',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <AlertTriangle size={26} strokeWidth={2.2} style={{ color: '#FF9500' }} />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: '700', color: '#1C1C1E', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
          Train Again Today?
        </h3>
        <p style={{ fontSize: 13, color: '#8E8E93', margin: '0 0 24px', lineHeight: '1.5' }}>
          You've already completed a workout today. Training the same muscle groups again increases injury risk and may hinder recovery. Only proceed if targeting different muscles or doing a light session.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="btn btn-secondary w-full"
            onClick={() => setShowGoAgainWarning(false)}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary w-full"
            style={{ backgroundColor: '#FF9500' }}
            onClick={() => { setShowGoAgainWarning(false); startWorkout(); }}
          >
            Start Anyway
          </button>
        </div>
      </Modal>

      {/* Bottom spacer for nav */}
      <div className="bottom-spacer" style={{ height: 24 }} />
    </div>
  );
}

export default Workout;
