import { useState, useMemo, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { getWorkoutLogs, getBodyStats, getDietLogs, getPRRecords, getSettings } from '../utils/storage';
import { exercises as rawExercises } from '../data/workouts';

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
import {
  Scale, Trophy, Dumbbell, Flame, Ruler,
  Calendar, TrendingUp, Apple, Heart
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const fontFamily = "'Google Sans', 'Plus Jakarta Sans', -apple-system, sans-serif";

const getThemeColor = (varName, fallback) => {
  if (typeof window === 'undefined') return fallback;
  const val = window.getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return val || fallback;
};

export default function Progress() {
  const [tab, setTab] = useState('strength');

  const isDark = false;

  // Stabilize data with useMemo cache
  const workoutLogs = useMemo(() => getWorkoutLogs(), []);
  const bodyStats = useMemo(() => getBodyStats(), []);
  const dietLogs = useMemo(() => getDietLogs(), []);
  const prs = useMemo(() => getPRRecords(), []);
  const settings = useMemo(() => getSettings(), []);

  const bmiCalc = useMemo(() => {
    const heightM = (settings.heightCm || 178) / 100;
    const weight = settings.weightKg || 70;
    const bmiVal = heightM > 0 ? (weight / (heightM * heightM)).toFixed(1) : '0';
    const bmiNum = parseFloat(bmiVal);
    const bmiStatus = bmiNum < 18.5 ? 'Underweight' : bmiNum < 25 ? 'Normal' : bmiNum < 30 ? 'Overweight' : 'Obese';
    const bmiColor = bmiNum < 18.5 ? '#FF9500' : bmiNum < 25 ? '#34C759' : bmiNum < 30 ? '#FF9500' : '#FF3B30';
    const minBmi = 15;
    const maxBmi = 35;
    const bmiPercent = Math.min(Math.max(((bmiNum - minBmi) / (maxBmi - minBmi)) * 100, 0), 100);
    return { bmi: bmiVal, status: bmiStatus, color: bmiColor, percent: bmiPercent };
  }, [settings]);

  const themeChartOptions = useMemo(() => {
    const textTertiary = getThemeColor('--text-tertiary', '#8E8E93');
    const borderLight = getThemeColor('--border-light', '#E2E8F0');
    const bgTertiary = getThemeColor('--bg-tertiary', '#F1F5F9');
    const bgCard = getThemeColor('--bg-card', '#FFFFFF');
    const textPrimary = getThemeColor('--text-primary', '#0F172A');

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: bgCard,
          titleColor: textPrimary,
          bodyColor: textPrimary,
          borderColor: borderLight,
          borderWidth: 1,
          titleFont: { family: fontFamily, weight: '600' },
          bodyFont: { family: fontFamily },
          cornerRadius: 12,
          padding: 12,
        }
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { font: { size: 10, family: fontFamily }, color: textTertiary }
        },
        y: {
          grid: { color: bgTertiary, drawTicks: false },
          border: { display: false },
          ticks: { font: { size: 10, family: fontFamily }, color: textTertiary },
          beginAtZero: false
        },
      },
      elements: {
        line: { tension: 0.35, borderWidth: 2 },
        point: { radius: 0, hoverRadius: 5 }
      },
    };
  }, [isDark]);

  const strengthData = useMemo(() => {
    const exerciseProgress = {};
    const mainLifts = ['squat', 'deadlift', 'bench', 'ohp'];
    
    mainLifts.forEach(exId => {
      const logs = workoutLogs
        .filter(l => l.sets)
        .flatMap(l => l.sets.filter(s => s.exerciseId === exId).map(s => ({ date: l.date, weight: s.weight, reps: s.reps })))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      if (logs.length > 0) exerciseProgress[exId] = logs;
    });
    return exerciseProgress;
  }, [workoutLogs]);

  const monthlyArchive = useMemo(() => {
    try {
      const archive = {};
      const heightM = (settings.heightCm || 178) / 100;

      // Group workout logs by month (YYYY-MM)
      workoutLogs.forEach(log => {
        if (!log.date) return;
        const monthKey = log.date.substring(0, 7); // "YYYY-MM"
        if (!archive[monthKey]) {
          archive[monthKey] = {
            monthKey,
            workouts: [],
            bodyLogs: [],
            dietLogs: [],
          };
        }
        archive[monthKey].workouts.push(log);
      });

      // Group body stats by month (YYYY-MM)
      bodyStats.forEach(stat => {
        if (!stat.date) return;
        const monthKey = stat.date.substring(0, 7); // "YYYY-MM"
        if (!archive[monthKey]) {
          archive[monthKey] = {
            monthKey,
            workouts: [],
            bodyLogs: [],
            dietLogs: [],
          };
        }
        archive[monthKey].bodyLogs.push(stat);
      });

      // Group diet logs by month (YYYY-MM)
      dietLogs.forEach(log => {
        if (!log.date) return;
        const monthKey = log.date.substring(0, 7); // "YYYY-MM"
        if (!archive[monthKey]) {
          archive[monthKey] = {
            monthKey,
            workouts: [],
            bodyLogs: [],
            dietLogs: [],
          };
        }
        if (!archive[monthKey].dietLogs) archive[monthKey].dietLogs = [];
        archive[monthKey].dietLogs.push(log);
      });

      // Compile stats for each month
      return Object.values(archive)
        .sort((a, b) => b.monthKey.localeCompare(a.monthKey)) // newest month first
        .map(group => {
          const [year, month] = group.monthKey.split('-');
          const dateObj = new Date(Number(year), Number(month) - 1, 1);
          const monthName = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

          // Workout stats
          const workoutsCount = group.workouts.length;
          const totalDuration = group.workouts.reduce((sum, w) => sum + (w.duration || 0), 0);
          const caloriesBurned = Math.round(totalDuration * 6.5); // ~6.5 kcal per min of strength training

          // Most performed exercise
          const exCounts = {};
          group.workouts.forEach(w => {
            if (w.sets && Array.isArray(w.sets)) {
              w.sets.forEach(s => {
                if (s.exerciseId) {
                  exCounts[s.exerciseId] = (exCounts[s.exerciseId] || 0) + 1;
                }
              });
            }
          });
          const topExerciseEntry = Object.entries(exCounts).sort((a, b) => b[1] - a[1])[0];
          let topExercise = '—';
          if (topExerciseEntry) {
            const exInfo = exercises[topExerciseEntry[0]] || { nameShort: topExerciseEntry[0] };
            topExercise = `${exInfo.nameShort} (${topExerciseEntry[1]} sets)`;
          }

          // Weight loss & BMI change in this month
          let weightChange = '—';
          let bmiChange = '—';

          if (group.bodyLogs.length > 0) {
            const sortedBody = [...group.bodyLogs].sort((a, b) => a.date.localeCompare(b.date));
            const first = sortedBody[0].weight;
            const last = sortedBody[sortedBody.length - 1].weight;
            
            if (sortedBody.length > 1) {
              const diff = last - first;
              weightChange = diff === 0 ? '0.0 kg' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg`;
              const bmiDiff = diff / (heightM * heightM);
              bmiChange = diff === 0 ? '0.0' : `${bmiDiff > 0 ? '+' : ''}${bmiDiff.toFixed(1)}`;
            } else {
              // Only 1 log. Let's see if we can find the last log before this month
              const prevLogs = bodyStats
                .filter(s => s.date && s.date < group.monthKey)
                .sort((a, b) => a.date.localeCompare(b.date));
              if (prevLogs.length > 0) {
                const prevWeight = prevLogs[prevLogs.length - 1].weight;
                const diff = last - prevWeight;
                weightChange = diff === 0 ? '0.0 kg' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg`;
                const bmiDiff = diff / (heightM * heightM);
                bmiChange = diff === 0 ? '0.0' : `${bmiDiff > 0 ? '+' : ''}${bmiDiff.toFixed(1)}`;
              }
            }
          }

          // Top 3 meals/foods logged in this month
          const mealCounts = {};
          if (group.dietLogs && Array.isArray(group.dietLogs)) {
            group.dietLogs.forEach(log => {
              const name = log.namebn || log.nameen || log.name;
              if (name) {
                mealCounts[name] = (mealCounts[name] || 0) + 1;
              }
            });
          }
          const topMealsList = Object.entries(mealCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name]) => name);

          return {
            monthName,
            workoutsCount,
            caloriesBurned,
            topExercise,
            weightChange,
            bmiChange,
            topMealsList,
            monthKey: group.monthKey
          };
        });
    } catch (e) {
      console.error("Failed to compile monthly archives:", e);
      return [];
    }
  }, [workoutLogs, bodyStats, dietLogs, settings]);

  const weightChartData = useMemo(() => {
    const sorted = [...bodyStats].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
    const accentBlue = getThemeColor('--accent-blue', '#4F46E5');
    const accentBlueLight = getThemeColor('--accent-blue-light', 'rgba(79, 70, 229, 0.04)');
    return {
      labels: sorted.map(s => { const d = new Date(s.date); return `${d.getDate()}/${d.getMonth() + 1}`; }),
      datasets: [{
        data: sorted.map(s => s.weight),
        borderColor: accentBlue,
        backgroundColor: accentBlueLight,
        fill: true,
      }],
    };
  }, [bodyStats, isDark]);

  const weeklyCalories = useMemo(() => {
    const days = [];
    const getLocalDateString = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const dVal = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${dVal}`;
    };
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = getLocalDateString(d);
      const dayMeals = dietLogs.filter(l => l.date === dateStr);
      const total = dayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
      days.push({ label: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()], calories: total });
    }
    return days;
  }, [dietLogs]);

  const weeklyProtein = useMemo(() => {
    const days = [];
    const getLocalDateString = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const dVal = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${dVal}`;
    };
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = getLocalDateString(d);
      const dayMeals = dietLogs.filter(l => l.date === dateStr);
      const total = dayMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
      days.push({ label: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()], protein: total });
    }
    return days;
  }, [dietLogs]);


  const latestBody = bodyStats.length > 0 ? bodyStats[bodyStats.length - 1] : null;

  const renderStrengthChart = (exId) => {
    const data = strengthData[exId];
    if (!data || data.length < 2) return null;
    const ex = exercises[exId];
    const pr = prs[exId];
    
    const accentBlue = getThemeColor('--accent-blue', '#4F46E5');
    const accentBlueLight = getThemeColor('--accent-blue-light', 'rgba(79, 70, 229, 0.04)');

    return (
      <div className="card" key={exId} style={{
        background: 'var(--bg-card)',
        border: '2px solid var(--border)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{
              background: 'var(--accent-blue-light)',
              borderRadius: '8px',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Dumbbell size={16} strokeWidth={2.4} color="var(--accent-blue)" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ex?.nameShort || exId}
              </div>
              {pr && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>PR: {pr.weight}kg × {pr.reps}</div>}
            </div>
          </div>
          {pr && (
            <span className="badge" style={{
              background: 'var(--warning-light)',
              border: '2px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
              color: 'var(--warning)',
              padding: '4px 8px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              flexShrink: 0
            }}>
              <Trophy size={12} strokeWidth={2.5} color="var(--warning)" /> {Math.round(pr.estimated1RM)}kg
            </span>
          )}
        </div>
        <div style={{ height: 140 }} aria-label={`${ex?.nameShort || exId} strength progression chart`}>
          <Line
            data={{
              labels: data.map(d => { const dt = new Date(d.date); return `${dt.getDate()}/${dt.getMonth() + 1}`; }),
              datasets: [{
                data: data.map(d => d.weight),
                borderColor: accentBlue,
                backgroundColor: accentBlueLight,
                fill: true,
              }],
            }}
            options={themeChartOptions}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="page-content" style={{
      paddingBottom: 'calc(var(--nav-height) + var(--safe-bottom) + 32px)',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          Progress
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 }}>Track your gains</p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        border: '2px solid var(--border)',
        borderRadius: '12px',
        padding: '3px',
        background: 'var(--bg-tertiary)',
        marginBottom: 24,
        position: 'relative',
        height: 44,
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Sliding indicator pill */}
        <div style={{
          position: 'absolute',
          top: 3,
          bottom: 3,
          left: tab === 'strength' ? 3 : 'calc(50% + 1.5px)',
          width: 'calc(50% - 4.5px)',
          background: 'var(--bg-card)',
          borderRadius: '9px',
          boxShadow: 'var(--shadow-sm)',
          transition: 'left 0.28s var(--ease-standard)',
          zIndex: 1,
        }} />
        {['strength', 'nutrition'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              border: 'none',
              borderRadius: '9px',
              background: 'transparent',
              color: tab === t ? 'var(--text-primary)' : 'var(--text-tertiary)',
              fontSize: '14px',
              fontWeight: tab === t ? '700' : '600',
              cursor: 'pointer',
              transition: 'color 0.28s var(--ease-standard)',
              fontFamily: fontFamily,
              zIndex: 2,
            }}
            type="button"
          >
            {t === 'strength' && <Dumbbell size={16} strokeWidth={2.4} />}
            {t === 'nutrition' && <Flame size={16} strokeWidth={2.4} />}
            {t === 'strength' ? 'Journey' : 'Nutrition'}
          </button>
        ))}
      </div>

      {/* Strength & Body Tab */}
      {tab === 'strength' && (
        <div>
          {/* BMI Calculator Card */}
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
              <Heart size={18} color="var(--accent-blue)" strokeWidth={2.5} />
              <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>BMI Calculator</span>
            </div>

            <div style={{ background: 'var(--bg-tertiary)', padding: '16px 20px', borderRadius: 16, border: '2px solid var(--border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Body Mass Index</span>
                <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{bmiCalc.bmi}</span>
              </div>

              {/* Progress bar */}
              <div style={{ height: 6, background: 'var(--border-light)', borderRadius: 10, position: 'relative', overflow: 'visible', margin: '4px 0' }}>
                <div 
                  style={{ 
                    position: 'absolute', 
                    left: `${bmiCalc.percent}%`, 
                    top: -3, 
                    width: 12, 
                    height: 12, 
                    borderRadius: '50%', 
                    background: bmiCalc.color, 
                    border: '2px solid #FFFFFF', 
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                    transform: 'translateX(-50%)',
                    transition: 'left 0.3s ease'
                  }} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>
                <span>15.0 (Under)</span>
                <span style={{ color: bmiCalc.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{bmiCalc.status}</span>
                <span>35.0 (Over)</span>
              </div>
            </div>
          </div>
          {/* Latest Measurements */}
          {latestBody && (
            <div className="card" style={{
              background: 'var(--bg-card)',
              border: '2px solid var(--border)',
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
              boxShadow: 'var(--shadow-md)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Latest Measurements</span>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{latestBody.date}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Weight', value: `${latestBody.weight} kg`, icon: <Scale size={16} strokeWidth={2.4} color="var(--accent-blue)" />, color: 'var(--accent-blue-light)' },
                  { label: 'Waist', value: latestBody.waist ? `${latestBody.waist} cm` : '—', icon: <Ruler size={16} strokeWidth={2.4} color="var(--success)" />, color: 'var(--success-light)' },
                  { label: 'Chest', value: latestBody.chest ? `${latestBody.chest} cm` : '—', icon: <Dumbbell size={16} strokeWidth={2.4} color="var(--warning)" />, color: 'var(--warning-light)' },
                  { label: 'Arm', value: latestBody.arm ? `${latestBody.arm} cm` : '—', icon: <Dumbbell size={16} strokeWidth={2.4} color="var(--accent-purple)" />, color: 'var(--accent-purple-light)' },
                ].map((s, i) => (
                  <div key={i} style={{
                    padding: 14,
                    background: 'var(--bg-tertiary)',
                    border: '2px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                    borderRadius: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      background: s.color,
                      borderRadius: '50%',
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 8
                    }}>
                      {s.icon}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, fontWeight: '500' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bodyStats.length >= 2 ? (
            <div className="card" style={{
              background: 'var(--bg-card)',
              border: '2px solid var(--border)',
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
              boxShadow: 'var(--shadow-md)'
            }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Weight Trend</div>
              <div style={{ height: 180 }} aria-label="Weight trend chart">
                <Line data={weightChartData} options={themeChartOptions} />
              </div>
            </div>
          ) : (
            <div className="card" style={{
              background: 'var(--bg-card)',
              border: '2px solid var(--border)',
              borderRadius: 16,
              padding: '32px 24px',
              marginBottom: 20,
              textAlign: 'center',
              boxShadow: 'var(--shadow-md)'
            }}>
              <div style={{
                background: 'var(--bg-tertiary)',
                width: 48,
                height: 48,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Scale size={22} strokeWidth={2.2} color="var(--text-tertiary)" />
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>Log at least 2 body measurements to see your weight trend</div>
            </div>
          )}


          {Object.keys(strengthData).length > 0 ? (
            <>
              {['squat', 'deadlift', 'bench', 'ohp'].map(exId => renderStrengthChart(exId))}
            </>
          ) : (
            <div className="card" style={{
              textAlign: 'center',
              padding: '40px 24px',
              background: 'var(--bg-card)',
              border: '2px solid var(--border)',
              borderRadius: 16,
              boxShadow: 'var(--shadow-md)'
            }}>
              <div style={{
                background: 'var(--bg-tertiary)',
                width: 48,
                height: 48,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Dumbbell size={22} strokeWidth={2.2} color="var(--text-tertiary)" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>No workout data yet</div>
              <div style={{ fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>Complete your first workout to start tracking strength progress.</div>
            </div>
          )}
        {/* PR Records */}
      {Object.keys(prs).length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--text-primary)'
          }}>
            <Trophy size={20} strokeWidth={2.4} color="var(--warning)" />
            Personal Records
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(prs).map(([exId, pr]) => {
              const ex = exercises[exId];
              return (
                <div key={exId} style={{
                  background: 'var(--bg-card)',
                  border: '2px solid var(--border)',
                  borderLeft: '5px solid var(--warning)',
                  borderRadius: 12,
                  padding: 16,
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div style={{
                        background: 'var(--warning-light)',
                        borderRadius: '8px',
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Trophy size={16} strokeWidth={2.4} color="var(--warning)" />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ex?.nameShort || exId}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>{pr.date}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--warning)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                        {pr.weight}kg × {pr.reps}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                        e1RM: {Math.round(pr.estimated1RM)}kg
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


            {/* Monthly Journey Archives */}
      <div style={{ marginTop: 28 }}>
        <div style={{
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: 'var(--text-primary)'
        }}>
          <Calendar size={20} strokeWidth={2.4} color="var(--accent-blue)" />
          Monthly Archives
        </div>

        {monthlyArchive.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {monthlyArchive.map((month) => (
              <div className="card" key={month.monthKey} style={{
                background: 'var(--bg-card)',
                border: '2px solid var(--border)',
                borderRadius: 18,
                padding: 20,
                boxShadow: 'var(--shadow-md)',
              }}>
                {/* Header of Month */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    {month.monthName}
                  </div>
                  <span className="badge" style={{
                    fontSize: 11,
                    fontWeight: 700,
                    background: 'var(--bg-tertiary)',
                    border: '2px solid var(--border)',
                    color: 'var(--text-primary)',
                    padding: '4px 10px',
                    borderRadius: '100px',
                    letterSpacing: '0.02em',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    🏃 {month.workoutsCount} Workouts
                  </span>
                </div>

                {/* 2x2 Grid of stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* Calorie Burnout */}
                  <div style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: 12, border: '2px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                      <Flame size={12} strokeWidth={2.5} />
                      Burnout
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {month.caloriesBurned > 0 ? `${month.caloriesBurned} kcal` : '—'}
                    </div>
                  </div>

                  {/* Most Performed Exercise */}
                  <div style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: 12, border: '2px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-blue)', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                      <Dumbbell size={12} strokeWidth={2.5} />
                      Most Done
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={month.topExercise}>
                      {month.topExercise}
                    </div>
                  </div>

                  {/* Weight Change */}
                  <div style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: 12, border: '2px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                      <Scale size={12} strokeWidth={2.5} />
                      Weight Change
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: month.weightChange.startsWith('-') ? 'var(--success)' : month.weightChange.startsWith('+') ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {month.weightChange}
                    </div>
                  </div>

                  {/* BMI Change */}
                  <div style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: 12, border: '2px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-purple)', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                      <TrendingUp size={12} strokeWidth={2.5} />
                      BMI Change
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: month.bmiChange.startsWith('-') ? 'var(--success)' : month.bmiChange.startsWith('+') ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {month.bmiChange}
                    </div>
                  </div>
                </div>

                {/* Top Meals Section */}
                {month.topMealsList && month.topMealsList.length > 0 && (
                  <div style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: '2px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}>
                    <div style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--warning)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      <Apple size={12} strokeWidth={2.5} color="var(--warning)" />
                      Top 3 Meals
                    </div>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      marginTop: 2
                    }}>
                      {month.topMealsList.map((mealName, idx) => (
                        <span key={idx} className="badge" style={{
                          fontSize: 11,
                          fontWeight: 700,
                          background: 'var(--warning-light)',
                          color: 'var(--warning)',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          border: '2px solid var(--border)',
                          boxShadow: 'var(--shadow-sm)'
                        }}>
                          {mealName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--bg-card)', border: '2px solid var(--border)', borderRadius: 20, boxShadow: 'var(--shadow-md)' }}>
            <Calendar size={36} strokeWidth={2} style={{ color: 'var(--text-tertiary)', marginBottom: 12 }} />
            <div style={{ fontWeight: 750, fontSize: 15, color: 'var(--text-primary)' }}>No monthly archives yet</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4, lineHeight: 1.4 }}>
              Your completed training and body stats will automatically archive here month-by-month.
            </div>
          </div>
        )}
      </div>
    </div>
      )}



      {/* Nutrition Tab */}
      {tab === 'nutrition' && (
        <div>
          <div className="card" style={{
            background: 'var(--bg-card)',
            border: '2px solid var(--border)',
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            boxShadow: 'var(--shadow-md)'
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Weekly Calories</div>
            <div style={{ height: 180 }} aria-label="Weekly calorie chart">
              <Bar
                data={{
                  labels: weeklyCalories.map(d => d.label),
                  datasets: [{
                    data: weeklyCalories.map(d => d.calories),
                    backgroundColor: weeklyCalories.map(d => d.calories > 0 ? getThemeColor('--accent-blue', '#4F46E5') : getThemeColor('--accent-blue-light', '#EEF2FF')),
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.6,
                  }],
                }}
                options={{
                  ...themeChartOptions,
                  scales: {
                    ...themeChartOptions.scales,
                    y: {
                      ...themeChartOptions.scales.y,
                      beginAtZero: true
                    }
                  }
                }}
              />
            </div>
          </div>

          <div className="card" style={{
            background: 'var(--bg-card)',
            border: '2px solid var(--border)',
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            boxShadow: 'var(--shadow-md)'
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Weekly Protein (g)</div>
            <div style={{ height: 180 }} aria-label="Weekly protein chart">
              <Bar
                data={{
                  labels: weeklyProtein.map(d => d.label),
                  datasets: [{
                    data: weeklyProtein.map(d => d.protein),
                    backgroundColor: weeklyProtein.map(d => d.protein >= 160 ? getThemeColor('--success', '#10B981') : getThemeColor('--warning', '#F59E0B')),
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.6,
                  }],
                }}
                options={{
                  ...themeChartOptions,
                  scales: {
                    ...themeChartOptions.scales,
                    y: {
                      ...themeChartOptions.scales.y,
                      beginAtZero: true
                    }
                  }
                }}
              />
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              marginTop: 14,
              paddingTop: 12,
              borderTop: '2px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                Target Hit (160g+)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', display: 'inline-block' }} />
                Below Target
              </div>
            </div>
          </div>

          {dietLogs.length > 0 && (
            <div className="card" style={{
              background: 'var(--bg-card)',
              border: '2px solid var(--border)',
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
              boxShadow: 'var(--shadow-md)'
            }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Average Daily Macros</div>
              <div style={{ height: 160, display: 'flex', justifyContent: 'center' }} aria-label="Macro distribution chart">
                <Doughnut
                  data={{
                    labels: ['Protein', 'Carbs', 'Fat'],
                    datasets: [{
                      data: (() => {
                        const totals = dietLogs.reduce((a, m) => ({
                          p: a.p + (m.protein || 0), c: a.c + (m.carbs || 0), f: a.f + (m.fat || 0),
                        }), { p: 0, c: 0, f: 0 });
                        return [totals.p, totals.c, totals.f];
                      })(),
                      backgroundColor: [getThemeColor('--protein-color', '#4F46E5'), getThemeColor('--carbs-color', '#F59E0B'), getThemeColor('--fat-color', '#F43F5E')],
                      borderWidth: 0,
                    }],
                  }}
                  options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          font: { size: 12, family: fontFamily },
                          padding: 14,
                          usePointStyle: true,
                          pointStyle: 'circle'
                        }
                      }
                    },
                    cutout: '70%',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
