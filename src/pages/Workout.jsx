import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Check, ChevronDown, ChevronUp, ChevronRight, AlertTriangle, Timer, Trophy, X, Plus, Zap, Dumbbell, Activity, Shield, Footprints, Compass, CalendarCheck } from 'lucide-react';
import { exercises as rawExercises, workoutTemplates, warmupRoutine, warmupSets, irradiationChecklist } from '../data/workouts';

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
      icon: '💪',
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
import { getTodayWorkoutType, saveWorkoutLog, updatePR, getToday, getPRRecords, getActiveSheet, getWorkoutsByDate, getSettings } from '../utils/storage';
import { useInputFocus, useDebounce } from '../utils/ux';
import Modal from '../components/Modal';
import WorkoutSheets from './WorkoutSheets';
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
  const [subTab, setSubTab] = useState('track'); // 'track' | 'routines'


  // Active workout
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [checkedWarmupSets, setCheckedWarmupSets] = useState({});
  const toggleWarmupSet = (key) => {
    setCheckedWarmupSets(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  const [activeWarmupOpen, setActiveWarmupOpen] = useState(true);
  
  useEffect(() => {
    setCheckedWarmupSets({});
    setActiveWarmupOpen(true);
  }, [currentExIdx, mode]);
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
  const [showGoAgainWarning, setShowGoAgainWarning] = useState(false);
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
            setTimerPaused(session.timerPaused);
            setWorkoutStartTime(session.workoutStartTime);

            // Catch up elapsed rest time
            let restoredIsResting = session.isResting;
            let restoredRestTime = session.restTime;
            let restoredTotalRestTimeSpent = session.totalRestTimeSpent || 0;
            let restoredExerciseRestTimes = session.exerciseRestTimes || {};

            if (session.isResting && !session.timerPaused && session.restLastUpdated) {
              const elapsedSecs = Math.floor((Date.now() - session.restLastUpdated) / 1000);
              if (elapsedSecs > 0) {
                if (elapsedSecs >= restoredRestTime) {
                  // Rest has completed while away
                  restoredTotalRestTimeSpent += restoredRestTime;
                  const currentExId = session.template?.exercises?.[session.currentExIdx]?.exerciseId;
                  if (currentExId) {
                    restoredExerciseRestTimes[currentExId] = (restoredExerciseRestTimes[currentExId] || 0) + restoredRestTime;
                  }
                  restoredRestTime = 0;
                  restoredIsResting = false;
                } else {
                  restoredRestTime -= elapsedSecs;
                  restoredTotalRestTimeSpent += elapsedSecs;
                  const currentExId = session.template?.exercises?.[session.currentExIdx]?.exerciseId;
                  if (currentExId) {
                    restoredExerciseRestTimes[currentExId] = (restoredExerciseRestTimes[currentExId] || 0) + elapsedSecs;
                  }
                }
              }
            }

            setIsResting(restoredIsResting);
            setRestTime(restoredRestTime);
            setRestTotal(session.restTotal);
            setTotalRestTimeSpent(restoredTotalRestTimeSpent);
            setExerciseRestTimes(restoredExerciseRestTimes);
            setWorkoutLog(session.workoutLog || []);
            setPrsHit(session.prsHit || []);
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
        restLastUpdated: Date.now(),
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



  // ── Timer logic ──
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
  }, [isResting, timerPaused, template, currentExIdx]);

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
  const hasExercises = template && template.exercises && template.exercises.length > 0;

  const timerProgress = restTotal > 0 ? ((restTotal - restTime) / restTotal) * 100 : 0;
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference - (timerProgress / 100) * circumference;

  // ════════════════════════════════════════════
  // RENDER: Completion Screen
  // ════════════════════════════════════════════
  if (mode === 'complete') {
    if (!template || !template.exercises) {
      setTimeout(() => setMode('plan'), 0);
      return null;
    }
    const totalSets = workoutLog.length;
    const totalVolume = workoutLog.reduce((s, l) => s + l.weight * l.reps, 0);

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
              backgroundColor: 'var(--bg-card)',
              border: '2px solid var(--border)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <Trophy size={32} strokeWidth={2.2} style={{ color: '#FF9500' }} />
          </div>
          
          <h1 style={{ fontSize: 24, fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Workout Complete
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 20px', fontWeight: '500' }}>
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
                icon: <Check size={18} strokeWidth={2.4} color="var(--success)" />,
                color: 'rgba(52,199,89,0.06)'
              },
              {
                label: 'Exercise Time',
                value: (() => {
                  const mins = Math.floor(completionStats.totalExerciseSecs / 60);
                  const secs = completionStats.totalExerciseSecs % 60;
                  return mins === 0 ? `${secs}s` : `${mins}m ${secs}s`;
                })(),
                icon: <Dumbbell size={18} strokeWidth={2.4} color="var(--accent-blue)" />,
                color: 'rgba(0,122,255,0.06)'
              },
              {
                label: 'Rest Time',
                value: (() => {
                  const mins = Math.floor(completionStats.totalRestSecs / 60);
                  const secs = completionStats.totalRestSecs % 60;
                  return mins === 0 ? `${secs}s` : `${mins}m ${secs}s`;
                })(),
                icon: <Timer size={18} strokeWidth={2.4} color="var(--warning)" />,
                color: 'rgba(255,149,0,0.06)'
              },
              {
                label: 'Est. Calories',
                value: `${completionStats.caloriesBurnt} kcal`,
                icon: <Zap size={18} strokeWidth={2.4} color="var(--danger)" />,
                color: 'rgba(255,59,48,0.06)'
              }
            ].map((stat, i) => (
              <div key={i} style={{
                padding: 16,
                background: 'var(--bg-card)',
                border: '2px solid var(--border)',
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                boxShadow: 'var(--shadow-sm)'
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
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</span>
                  <span style={{ fontSize: 15, fontWeight: '700', color: 'var(--text-primary)', marginTop: 2 }}>{stat.value}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'left', marginBottom: 32 }}>
            <h3 style={{ fontSize: 14, fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 12px', letterSpacing: '-0.01em' }}>
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
                    backgroundColor: 'var(--bg-card)',
                    border: prHit ? '2.5px solid var(--warning)' : '2px solid var(--border)',
                    borderRadius: 14,
                    padding: '14px 16px',
                    marginBottom: 10,
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        {getExerciseIcon(exT.exerciseId, 16)}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: '700', color: 'var(--text-primary)' }}>{ex.nameShort}</span>
                    </div>
                    {prHit && (
                      <span className="badge" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        backgroundColor: 'var(--warning-light)', border: '2px solid var(--border)',
                        color: 'var(--warning)', padding: '2px 8px', borderRadius: 8,
                        fontSize: 10, fontWeight: '750', letterSpacing: '0.3px',
                        boxShadow: 'var(--shadow-sm)'
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
                          backgroundColor: 'var(--bg-tertiary)',
                          borderRadius: 8,
                          padding: '4px 10px',
                          fontSize: 12,
                          fontWeight: '600',
                          color: 'var(--text-primary)'
                        }}
                      >
                        {s.weight}kg × {s.reps}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-light)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-tertiary)', fontWeight: '600' }}>
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
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-tertiary)', fontWeight: '600' }}>
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
                backgroundColor: 'var(--text-primary)',
                color: 'var(--bg-primary)',
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
                border: '1.5px solid var(--warning)',
                borderRadius: 14,
                backgroundColor: 'var(--warning-light)',
                color: 'var(--warning)',
                fontSize: 16,
                fontWeight: '600',
                cursor: 'pointer',
                minHeight: 52,
                fontFamily: 'inherit'
              }}
              onClick={() => setShowGoAgainWarning(true)}
            >
              <RotateCcw size={18} strokeWidth={2.2} style={{ color: 'var(--warning)' }} />
              Go Again!
            </button>
          </div>

          {/* Go Again Warning Modal */}
          <Modal isOpen={showGoAgainWarning} onClose={() => setShowGoAgainWarning(false)} type="centered-alert">
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              backgroundColor: 'var(--warning-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <AlertTriangle size={26} strokeWidth={2.2} style={{ color: 'var(--warning)' }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
              Train Again Today?
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 24px', lineHeight: '1.5' }}>
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
                style={{ backgroundColor: 'var(--warning)' }}
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

  if (mode === 'active') {
    if (!template || !template.exercises || template.exercises.length === 0 || !template.exercises[currentExIdx]) {
      setTimeout(() => {
        setMode('plan');
        localStorage.removeItem('fitforge_active_workout_session');
      }, 0);
      return null;
    }
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
          background: 'var(--bg-secondary)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box'
        }}
      >
        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 6, padding: '16px 0 24px' }}>
          {template.exercises.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                border: '1.5px solid var(--border)',
                backgroundColor: i < currentExIdx ? 'var(--success)' : i === currentExIdx ? 'var(--accent-purple)' : 'var(--bg-tertiary)',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>

        <div className="active-workout" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
          {/* Current exercise */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '50%', backgroundColor: 'var(--bg-card)', border: '2px solid var(--border)', color: 'var(--text-primary)', marginBottom: 12, boxShadow: 'var(--shadow-sm)' }}>
              {getExerciseIcon(exTemplate.exerciseId, 24)}
            </div>
            <h2 style={{ fontSize: 24, fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>{ex.nameShort}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: '500' }}>{ex.muscle}</span>
              
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 6,
                padding: '6px 12px',
                backgroundColor: 'var(--bg-card)',
                border: '2px solid var(--border)',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: '600',
                color: 'var(--text-secondary)',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <span>Target: {minSets}{maxSets && maxSets !== minSets ? `-${maxSets}` : ''} × {exTemplate.reps}{exTemplate.amrap ? '+' : ''} @ {getExerciseWeight(exTemplate.exerciseId, exTemplate.weight)}kg</span>
                <span style={{ color: 'var(--text-tertiary)' }}>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Timer size={13} strokeWidth={2.4} style={{ color: 'var(--accent-purple)' }} />
                  {exTemplate.restMinutes}m rest
                </span>
              </div>
            </div>
          </div>



          {/* Set counter */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span style={{ fontSize: 11, fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Set</span>
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
                      border: '2px solid var(--border)',
                      color: isCurrent 
                        ? '#FFFFFF' 
                        : isPast 
                          ? '#FFFFFF' 
                          : 'var(--text-secondary)',
                      backgroundColor: isCurrent 
                        ? 'var(--accent-purple)' 
                        : isPast 
                          ? 'var(--success)' 
                          : 'var(--bg-card)',
                      boxShadow: (isCurrent || isPast) ? 'none' : 'var(--shadow-sm)',
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
                  border: '2px dashed var(--border)',
                  color: 'var(--text-tertiary)',
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
                backgroundColor: 'var(--accent-purple-light)',
                color: 'var(--accent-purple)',
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
              <p style={{ fontSize: 12, fontWeight: '600', color: 'var(--text-tertiary)', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Rest Period</p>
              <div className="circular-timer" style={{ width: 180, height: 180 }}>
                <svg className="timer-svg" viewBox="0 0 200 200">
                  <circle
                    className="timer-bg-circle"
                    cx="100" cy="100" r="90"
                    fill="none" stroke="var(--border)" strokeWidth="10"
                  />
                  <circle
                    className="timer-progress-circle"
                    cx="100" cy="100" r="90"
                    fill="none" stroke="var(--accent-blue)" strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    transform="rotate(-90 100 100)"
                  />
                </svg>
                <div className="timer-display">
                  <span className="timer-time" style={{ fontSize: 36, fontWeight: '800', color: 'var(--text-primary)' }}>{formatTime(restTime)}</span>
                  <span className="timer-total" style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>of {formatTime(restTotal)}</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 20 }}>
                <button 
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    border: '2px solid var(--border)',
                    backgroundColor: 'var(--bg-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)',
                    color: 'var(--text-primary)'
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
                    border: '2px solid var(--border)',
                    backgroundColor: 'var(--bg-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)',
                    color: 'var(--text-primary)'
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
                    border: '2px solid var(--border)',
                    backgroundColor: 'var(--bg-card)',
                    fontSize: 14,
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                  onClick={skipRest}
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* Input fields */}
          {!isResting && !showFlexChoice && (
            <div style={{ display: 'flex', gap: 12, margin: '24px 0' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: '600', color: 'var(--text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Weight (kg)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  className="input"
                  style={{
                    fontSize: 24,
                    textAlign: 'center',
                    padding: 12,
                    borderRadius: 14,
                    border: '2px solid var(--border)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontWeight: '700',
                    height: 54,
                    boxSizing: 'border-box',
                    cursor: 'text',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                  value={weightInput}
                  placeholder="0"
                  onChange={(e) => setWeightInput(e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: '600', color: 'var(--text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Reps {isAmrap && <span style={{ color: 'var(--accent-purple)', fontWeight: '700', fontSize: 10, textTransform: 'none', marginLeft: 4 }}>Max reps!</span>}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  className="input"
                  style={{
                    fontSize: 24,
                    textAlign: 'center',
                    padding: 12,
                    borderRadius: 14,
                    border: '2px solid var(--border)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontWeight: '700',
                    height: 54,
                    boxSizing: 'border-box',
                    cursor: 'text',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                  value={repsInput}
                  placeholder="0"
                  onChange={(e) => setRepsInput(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Complete set / flex choice */}
          {!isResting && !showFlexChoice && (
            <button
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                padding: '16px',
                border: '2px solid var(--border)',
                borderRadius: 14,
                backgroundColor: isInputValid ? 'var(--accent-purple)' : 'var(--bg-tertiary)',
                color: isInputValid ? '#FFFFFF' : 'var(--text-tertiary)',
                boxShadow: isInputValid ? 'var(--shadow-sm)' : 'none',
                fontSize: 16,
                fontWeight: '700',
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
            <div style={{ marginTop: 16, padding: 16, backgroundColor: 'var(--bg-card)', borderRadius: 16, border: '2px solid var(--border)', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: '600', color: 'var(--text-primary)', marginBottom: 12 }}>
                {minSets} sets done. Keep going?
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-secondary"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '12px 16px',
                    border: '2px solid var(--border)',
                    borderRadius: 12,
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    boxShadow: 'var(--shadow-sm)',
                    fontSize: 14,
                    fontWeight: '700',
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
                    className="btn btn-primary"
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '12px 16px',
                      border: '2px solid var(--border)',
                      borderRadius: 12,
                      backgroundColor: 'var(--accent-blue)',
                      color: '#FFFFFF',
                      boxShadow: 'var(--shadow-sm)',
                      fontSize: 14,
                      fontWeight: '700',
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
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
              <p style={{ fontSize: 11, fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }}>Logged Sets</p>
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
                      backgroundColor: 'var(--bg-card)',
                      border: '2px solid var(--border)',
                      borderRadius: 10,
                      marginBottom: 6,
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: '600', color: 'var(--text-tertiary)' }}>Set {l.set}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{l.weight}kg × {l.reps} reps</span>
                    <Check size={16} strokeWidth={2.5} style={{ color: 'var(--success)' }} />
                  </div>
                ))}
            </div>
          )}

          {/* Cancel workout button */}
          <button
            className="btn btn-outline"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              width: '100%',
              padding: '14px',
              marginTop: 24,
              border: '2px solid var(--border)',
              borderRadius: 12,
              backgroundColor: 'var(--bg-card)',
              color: 'var(--danger)',
              boxShadow: 'var(--shadow-sm)',
              fontSize: 14,
              fontWeight: '700',
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
            <h3 style={{ fontSize: 18, fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 8px', letterSpacing: '-0.01em' }}>Cancel Workout?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 20px', lineHeight: '1.4' }}>
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
  }  // ════════════════════════════════════════════
  // RENDER: Plan View (default)
  // ════════════════════════════════════════════
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
      {/* Segmented Control */}
      <div 
        className="tab-bar" 
        style={{ 
          display: 'flex', 
          gap: 8, 
          padding: '6px', 
          background: 'var(--bg-card)', 
          borderRadius: 16, 
          marginBottom: 20, 
          border: '2px solid var(--border)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <button 
          className={`tab-item ${subTab === 'track' ? 'active' : ''}`}
          onClick={() => setSubTab('track')}
        >
          Track Workout
        </button>
        <button 
          className={`tab-item ${subTab === 'routines' ? 'active' : ''}`}
          onClick={() => setSubTab('routines')}
        >
          Routine Templates
        </button>
      </div>

      {subTab === 'routines' ? (
        <WorkoutSheets isEmbedded={true} />
      ) : (
        <>
          {/* Safety Form Tip Banner */}
          <div 
            style={{
              backgroundColor: 'var(--danger-light)',
              border: '2px solid var(--border)',
              borderRadius: 14,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 20,
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <AlertTriangle size={18} strokeWidth={2.2} style={{ color: 'var(--danger)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--danger)', lineHeight: '1.4', fontWeight: '700' }}>
              <strong style={{ fontWeight: '800', marginRight: 4 }}>FORM FIRST:</strong>
              Training near max has high injury risk. Never sacrifice form for weight.
            </span>
          </div>

          {/* Workout Header */}
          <div style={{ textAlign: 'center', padding: '16px 0 20px' }}>
            <h1 style={{ fontSize: 24, fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>{template.name}</h1>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 12px', fontWeight: '500' }}>{todayFormatted()}</p>
            <div style={{ display: 'inline-flex', alignItems: 'center' }}>
              {!usingActiveSheet && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: 'var(--accent-blue-light)',
                  color: 'var(--text-primary)',
                  border: '2px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)',
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: '700'
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
                backgroundColor: 'var(--success-light)',
                border: '2px solid var(--border)',
                borderRadius: 14,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 16,
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                backgroundColor: 'var(--bg-card)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--border)',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <Check size={18} strokeWidth={2.5} style={{ color: 'var(--success)' }} />
              </div>
              <div>
                <span style={{ fontSize: 14, fontWeight: '800', color: 'var(--success)', display: 'block' }}>Today's Workout Complete</span>
                <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: '600' }}>
                  {todayWorkouts.length} session{todayWorkouts.length > 1 ? 's' : ''} logged today
                </span>
              </div>
            </div>
          )}

          {/* Warm-up Section */}
          <div 
            className="card"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 16,
              border: '2px solid var(--border)',
              padding: '20px',
              marginBottom: '16px',
              boxShadow: 'var(--shadow-md)'
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
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '2px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)'
                }}>
                  <Activity size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>RAMP Warm-up</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>7 movements • ~10 min</p>
                </div>
              </div>
              {warmupOpen ? <ChevronUp size={20} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={20} style={{ color: 'var(--text-tertiary)' }} />}
            </button>

            {warmupOpen && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {warmupRoutine.map((item, i) => {
                    const done = !!checkedWarmups[i];
                    const isWarmupExpanded = expandedWarmupIdx === i;
                    return (
                      <div
                        key={i}
                        style={{
                          background: done ? 'var(--success-light)' : 'var(--bg-card)',
                          borderRadius: 14,
                          border: '2px solid var(--border)',
                          boxShadow: 'var(--shadow-sm)',
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
                              border: '2px solid var(--border)',
                              boxShadow: done ? 'none' : 'var(--shadow-sm)',
                              cursor: 'pointer',
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              flexShrink: 0,
                              background: done ? 'var(--success)' : 'var(--bg-tertiary)',
                              color: done ? '#FFFFFF' : 'var(--text-secondary)',
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
                              color: done ? 'var(--text-tertiary)' : 'var(--text-primary)',
                              transition: 'all 0.2s ease',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>{item.name}</span>
                            <span style={{ fontSize: 11.5, color: done ? 'var(--text-tertiary)' : 'var(--text-tertiary)', marginTop: 2 }}>{item.duration}</span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-tertiary)' }}>
                            {isWarmupExpanded ? <ChevronUp size={16} strokeWidth={2.4} /> : <ChevronDown size={16} strokeWidth={2.4} />}
                          </div>
                        </div>

                        {/* Accordion instructions */}
                        {isWarmupExpanded && (
                          <div style={{
                            padding: '0 14px 14px 52px',
                            fontSize: 12.5,
                            lineHeight: 1.45,
                            color: 'var(--text-secondary)',
                            borderTop: '2px solid var(--border)',
                            background: 'var(--bg-secondary)',
                            paddingTop: 10
                          }}>
                            {item.instructions}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Exercise List */}
          <div style={{ marginTop: 8, marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 16px', letterSpacing: '-0.01em' }}>Exercises</h2>
            {template.exercises.map((exT, idx) => {
              const ex = exercises[exT.exerciseId] || { nameShort: exT.exerciseId, muscle: '', icon: '', formTips: [], warnings: [] };
              const weight = getExerciseWeight(exT.exerciseId, exT.weight);
              const isExpanded = expandedExercise === idx;
              const isAmrapSet = exT.amrap;

              return (
                <div 
                  key={idx} 
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: 16,
                    border: '2px solid var(--border)',
                    padding: '16px',
                    marginBottom: '16px',
                    boxShadow: 'var(--shadow-md)',
                    position: 'relative'
                  }}
                >
                  <div 
                    onClick={() => setExpandedExercise(isExpanded ? null : idx)}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20
                    }}>
                      {ex.icon || '💪'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: '700', color: 'var(--text-primary)', display: 'block', letterSpacing: '-0.01em' }}>{ex.nameShort}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>
                        {exT.sets || 3} sets × {exT.reps}{isAmrapSet ? '+' : ''} reps · {weight > 0 ? `${weight} kg` : 'Bodyweight'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-tertiary)' }}>
                      {isExpanded ? <ChevronUp size={18} strokeWidth={2.4} /> : <ChevronDown size={18} strokeWidth={2.4} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '0.5px solid var(--border-light)' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                        <span className="badge" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>Muscle: {ex.muscle || 'Full Body'}</span>
                        {isAmrapSet && <span className="badge" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)', fontWeight: 700 }}>AMRAP Last Set</span>}
                      </div>

                      {ex.formTips && ex.formTips.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <span style={{ fontSize: 11, fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Form Checklist</span>
                          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            {ex.formTips.map((tip, i) => <li key={i}>{tip}</li>)}
                          </ul>
                        </div>
                      )}

                      {ex.warnings && ex.warnings.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: '700', color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Injury Warnings</span>
                          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--danger)', lineHeight: 1.5 }}>
                            {ex.warnings.map((warn, i) => <li key={i}>{warn}</li>)}
                          </ul>
                        </div>
                      )}

                      {weight > 0 && (
                        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-light)' }}>
                          <span style={{ fontSize: 11, fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>Ramp-up Sets Checklist</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {warmupSets.map((s, i) => {
                              const pct = parseInt(s.load) / 100;
                              const calculatedWeight = Math.round((weight * pct) / 2.5) * 2.5;
                              const setKey = `${exT.exerciseId}_${i}`;
                              const isChecked = !!checkedWarmupSets[setKey];

                              return (
                                <div
                                  key={i}
                                  onClick={(e) => { e.stopPropagation(); toggleWarmupSet(setKey); }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '8px 12px',
                                    borderRadius: 10,
                                    border: '2px solid var(--border)',
                                    backgroundColor: isChecked ? 'var(--success-light)' : 'var(--bg-card)',
                                    boxShadow: isChecked ? 'none' : 'var(--shadow-sm)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    userSelect: 'none'
                                  }}
                                >
                                  {/* Custom Checkbox */}
                                  <div
                                    style={{
                                      width: 20,
                                      height: 20,
                                      borderRadius: '50%',
                                      border: isChecked ? 'none' : '1.5px solid var(--border)',
                                      backgroundColor: isChecked ? 'var(--success)' : 'transparent',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#FFFFFF',
                                      flexShrink: 0,
                                      transition: 'all 0.2s ease'
                                    }}
                                  >
                                    {isChecked && <Check size={12} strokeWidth={3} />}
                                  </div>

                                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
                                      <span style={{
                                        fontSize: 13,
                                        fontWeight: '600',
                                        color: isChecked ? 'var(--text-tertiary)' : 'var(--text-primary)',
                                        textDecoration: isChecked ? 'line-through' : 'none',
                                        transition: 'all 0.2s ease'
                                      }}>
                                        {calculatedWeight} kg
                                      </span>
                                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                        ({s.load})
                                      </span>
                                      <span style={{
                                        fontSize: 13,
                                        color: isChecked ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                                        textDecoration: isChecked ? 'line-through' : 'none'
                                      }}>
                                        × {s.reps} reps
                                      </span>
                                    </div>
                                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: 4 }}>
                                      {s.purpose}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Start Workout / Go Again Button */}
          <button
            disabled={!hasExercises}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '16px',
              border: '2px solid var(--border)',
              borderRadius: 14,
              background: !hasExercises ? 'var(--bg-tertiary)' : (workoutDoneToday ? 'var(--warning-light)' : 'var(--accent-purple)'),
              color: !hasExercises ? 'var(--text-tertiary)' : (workoutDoneToday ? 'var(--warning)' : '#FFFFFF'),
              fontSize: 16,
              fontWeight: '700',
              cursor: !hasExercises ? 'not-allowed' : 'pointer',
              boxShadow: !hasExercises ? 'none' : 'var(--shadow-sm)',
              transition: 'all 0.2s ease',
              minHeight: 52,
              marginTop: 24,
              fontFamily: 'inherit',
              letterSpacing: '-0.01em'
            }}
            onClick={workoutDoneToday ? () => setShowGoAgainWarning(true) : startWorkout}
          >
            {workoutDoneToday ? (
              <>
                <RotateCcw size={18} strokeWidth={2.2} style={{ color: !hasExercises ? 'var(--text-tertiary)' : 'var(--warning)' }} />
                Go Again!
              </>
            ) : (
              <>
                <Play size={18} strokeWidth={2.2} style={{ color: !hasExercises ? 'var(--text-tertiary)' : '#FFFFFF' }} />
                Start Workout
              </>
            )}
          </button>

          {/* Go Again Warning Modal */}
          <Modal isOpen={showGoAgainWarning} onClose={() => setShowGoAgainWarning(false)} type="centered-alert">
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              backgroundColor: 'var(--warning-light)',
              border: '2px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <AlertTriangle size={26} strokeWidth={2.2} style={{ color: 'var(--warning)' }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
              Train Again Today?
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 24px', lineHeight: '1.5' }}>
              You've already completed a workout today. Training the same muscle groups again increases injury risk and may hinder recovery. Only proceed if targeting different muscles or doing a light session.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="btn btn-secondary w-full"
                style={{ border: '2px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
                onClick={() => setShowGoAgainWarning(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary w-full"
                style={{ border: '2px solid var(--border)', boxShadow: 'var(--shadow-sm)', backgroundColor: 'var(--warning)' }}
                onClick={() => { setShowGoAgainWarning(false); startWorkout(); }}
              >
                Start Anyway
              </button>
            </div>
          </Modal>
        </>
      )}

      {/* Bottom spacer for nav */}
      <div className="bottom-spacer" style={{ height: 24 }} />
    </div>
  );
}

export default Workout;
