import { useState, useMemo, useRef, useCallback } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { getWorkoutLogs, getBodyStats, saveBodyStat, getDietLogs, getPRRecords, getSettings, getWorkoutSheets, saveWorkoutSheet, setActiveSheet, getActiveSheet } from '../utils/storage';
import { useModalLock, useInputFocus } from '../utils/ux';
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
  Scale, Plus, X, Trophy, Dumbbell, Flame, Ruler, ChevronRight,
  Calendar, User, TrendingUp, Apple, History
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const fontFamily = "'Google Sans', 'Plus Jakarta Sans', -apple-system, sans-serif";

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#FFFFFF',
      titleColor: '#1C1C1E',
      bodyColor: '#1C1C1E',
      borderColor: '#E5E5EA',
      borderWidth: 1,
      titleFont: { family: fontFamily, weight: '600' },
      bodyFont: { family: fontFamily },
      cornerRadius: 12,
      padding: 12,
      boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
    }
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { font: { size: 10, family: fontFamily }, color: '#8E8E93' }
    },
    y: {
      grid: { color: '#F2F2F7', drawTicks: false },
      border: { display: false },
      ticks: { font: { size: 10, family: fontFamily }, color: '#8E8E93' },
      beginAtZero: false
    },
  },
  elements: {
    line: { tension: 0.35, borderWidth: 2 },
    point: { radius: 0, hoverRadius: 5 }
  },
};

export default function Progress() {
  const [tab, setTab] = useState('strength');
  const handleFocus = useInputFocus();

  // Stabilize data with lazy initializer pattern
  const [workoutLogs] = useState(() => getWorkoutLogs());
  const [bodyStats, setBodyStats] = useState(() => getBodyStats());
  const [dietLogs] = useState(() => getDietLogs());
  const [prs] = useState(() => getPRRecords());
  const [settings] = useState(() => getSettings());

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
    return {
      labels: sorted.map(s => { const d = new Date(s.date); return `${d.getDate()}/${d.getMonth() + 1}`; }),
      datasets: [{
        data: sorted.map(s => s.weight),
        borderColor: '#007AFF',
        backgroundColor: 'rgba(0, 122, 255, 0.04)',
        fill: true,
      }],
    };
  }, [bodyStats]);

  const weeklyCalories = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayMeals = dietLogs.filter(l => l.date === dateStr);
      const total = dayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
      days.push({ label: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()], calories: total });
    }
    return days;
  }, [dietLogs]);

  const weeklyProtein = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
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
    
    return (
      <div key={exId} style={{
        background: '#FFFFFF',
        border: '1px solid #E5E5EA',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{
              background: 'rgba(0,122,255,0.06)',
              borderRadius: '8px',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Dumbbell size={16} strokeWidth={2.4} color="#007AFF" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ex?.nameShort || exId}
              </div>
              {pr && <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 1 }}>PR: {pr.weight}kg × {pr.reps}</div>}
            </div>
          </div>
          {pr && (
            <span style={{
              background: '#FFF9E6',
              border: '1px solid #FFE082',
              color: '#B78103',
              padding: '4px 8px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              flexShrink: 0
            }}>
              <Trophy size={12} strokeWidth={2.5} /> {Math.round(pr.estimated1RM)}kg
            </span>
          )}
        </div>
        <div style={{ height: 140 }} aria-label={`${ex?.nameShort || exId} strength progression chart`}>
          <Line
            data={{
              labels: data.map(d => { const dt = new Date(d.date); return `${dt.getDate()}/${dt.getMonth() + 1}`; }),
              datasets: [{
                data: data.map(d => d.weight),
                borderColor: '#007AFF',
                backgroundColor: 'rgba(0, 122, 255, 0.04)',
                fill: true,
              }],
            }}
            options={chartOptions}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="page-content" style={{
      maxWidth: '480px',
      margin: '0 auto',
      paddingLeft: '16px',
      paddingRight: '16px',
      paddingTop: '20px',
      paddingBottom: 'calc(var(--nav-height) + var(--safe-bottom) + 32px)',
      background: '#FFFFFF',
      minHeight: '100vh',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: '#1C1C1E' }}>
          Progress
        </h1>
        <p style={{ fontSize: 14, color: '#8E8E93', marginTop: 4 }}>Track your gains</p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        border: '1px solid #E5E5EA',
        borderRadius: '10px',
        padding: '2px',
        background: '#F2F2F7',
        marginBottom: 24
      }}>
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
              padding: '10px 12px',
              border: 'none',
              borderRadius: '8px',
              background: tab === t ? '#FFFFFF' : 'transparent',
              color: tab === t ? '#000000' : '#8E8E93',
              fontSize: '14px',
              fontWeight: tab === t ? '600' : '500',
              boxShadow: tab === t ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: fontFamily,
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
          {/* Latest Measurements */}
          {latestBody && (
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E5E5EA',
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
              boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E' }}>Latest Measurements</span>
                <span style={{ fontSize: 12, color: '#8E8E93' }}>{latestBody.date}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Weight', value: `${latestBody.weight} kg`, icon: <Scale size={16} strokeWidth={2.4} color="#007AFF" />, color: 'rgba(0,122,255,0.06)' },
                  { label: 'Waist', value: latestBody.waist ? `${latestBody.waist} cm` : '—', icon: <Ruler size={16} strokeWidth={2.4} color="#34C759" />, color: 'rgba(52,199,89,0.06)' },
                  { label: 'Chest', value: latestBody.chest ? `${latestBody.chest} cm` : '—', icon: <Dumbbell size={16} strokeWidth={2.4} color="#FF9500" />, color: 'rgba(255,149,0,0.06)' },
                  { label: 'Arm', value: latestBody.arm ? `${latestBody.arm} cm` : '—', icon: <Dumbbell size={16} strokeWidth={2.4} color="#5856D6" />, color: 'rgba(88,86,214,0.06)' },
                ].map((s, i) => (
                  <div key={i} style={{
                    padding: 14,
                    background: '#F2F2F7',
                    border: '1px solid #E5E5EA',
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
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 4, fontWeight: '500' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bodyStats.length >= 2 ? (
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E5E5EA',
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
              boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
            }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E', marginBottom: 16 }}>Weight Trend</div>
              <div style={{ height: 180 }} aria-label="Weight trend chart">
                <Line data={weightChartData} options={chartOptions} />
              </div>
            </div>
          ) : (
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E5E5EA',
              borderRadius: 16,
              padding: '32px 24px',
              marginBottom: 20,
              textAlign: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
            }}>
              <div style={{
                background: '#F2F2F7',
                width: 48,
                height: 48,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Scale size={22} strokeWidth={2.2} color="#8E8E93" />
              </div>
              <div style={{ fontSize: 14, color: '#8E8E93', lineHeight: 1.4 }}>Log at least 2 body measurements to see your weight trend</div>
            </div>
          )}


          {Object.keys(strengthData).length > 0 ? (
            <>
              {['squat', 'deadlift', 'bench', 'ohp'].map(exId => renderStrengthChart(exId))}
            </>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '40px 24px',
              background: '#FFFFFF',
              border: '1px solid #E5E5EA',
              borderRadius: 16,
              boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
            }}>
              <div style={{
                background: '#F2F2F7',
                width: 48,
                height: 48,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Dumbbell size={22} strokeWidth={2.2} color="#8E8E93" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1C1C1E', marginBottom: 4 }}>No workout data yet</div>
              <div style={{ fontSize: 14, color: '#8E8E93', lineHeight: 1.4 }}>Complete your first workout to start tracking strength progress.</div>
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
            color: '#1C1C1E'
          }}>
            <Trophy size={20} strokeWidth={2.4} color="#FF9500" />
            Personal Records
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(prs).map(([exId, pr]) => {
              const ex = exercises[exId];
              return (
                <div key={exId} style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E5EA',
                  borderLeft: '4px solid #FF9500',
                  borderRadius: 12,
                  padding: 16,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div style={{
                        background: 'rgba(255,149,0,0.06)',
                        borderRadius: '8px',
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Trophy size={16} strokeWidth={2.4} color="#FF9500" />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ex?.nameShort || exId}
                        </div>
                        <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 1 }}>{pr.date}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#FF9500', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                        {pr.weight}kg × {pr.reps}
                      </div>
                      <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 2 }}>
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
          color: '#1C1C1E'
        }}>
          <Calendar size={20} strokeWidth={2.4} color="#007AFF" />
          Monthly Archives
        </div>

        {monthlyArchive.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {monthlyArchive.map((month) => (
              <div key={month.monthKey} style={{
                background: '#FFFFFF',
                border: '1px solid #E5E5EA',
                borderRadius: 18,
                padding: 20,
                boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
              }}>
                {/* Header of Month */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F2F2F7', paddingBottom: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#1C1C1E', letterSpacing: '-0.02em' }}>
                    {month.monthName}
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    background: '#F2F2F7',
                    color: '#1C1C1E',
                    padding: '4px 10px',
                    borderRadius: '100px',
                    letterSpacing: '0.02em',
                  }}>
                    🏃 {month.workoutsCount} Workouts
                  </span>
                </div>

                {/* 2x2 Grid of stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* Calorie Burnout */}
                  <div style={{ background: '#F2F2F7', borderRadius: 12, padding: 12, border: '1px solid #E5E5EA' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#FF3B30', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                      <Flame size={12} strokeWidth={2.5} />
                      Burnout
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E' }}>
                      {month.caloriesBurned > 0 ? `${month.caloriesBurned} kcal` : '—'}
                    </div>
                  </div>

                  {/* Most Performed Exercise */}
                  <div style={{ background: '#F2F2F7', borderRadius: 12, padding: 12, border: '1px solid #E5E5EA' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#007AFF', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                      <Dumbbell size={12} strokeWidth={2.5} />
                      Most Done
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1C1C1E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={month.topExercise}>
                      {month.topExercise}
                    </div>
                  </div>

                  {/* Weight Change */}
                  <div style={{ background: '#F2F2F7', borderRadius: 12, padding: 12, border: '1px solid #E5E5EA' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34C759', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                      <Scale size={12} strokeWidth={2.5} />
                      Weight Change
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: month.weightChange.startsWith('-') ? '#34C759' : month.weightChange.startsWith('+') ? '#FF3B30' : '#1C1C1E' }}>
                      {month.weightChange}
                    </div>
                  </div>

                  {/* BMI Change */}
                  <div style={{ background: '#F2F2F7', borderRadius: 12, padding: 12, border: '1px solid #E5E5EA' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#5856D6', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                      <TrendingUp size={12} strokeWidth={2.5} />
                      BMI Change
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: month.bmiChange.startsWith('-') ? '#34C759' : month.bmiChange.startsWith('+') ? '#FF3B30' : '#1C1C1E' }}>
                      {month.bmiChange}
                    </div>
                  </div>
                </div>

                {/* Top Meals Section */}
                {month.topMealsList && month.topMealsList.length > 0 && (
                  <div style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: '1px solid #F2F2F7',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}>
                    <div style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#FF9500',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      <Apple size={12} strokeWidth={2.5} color="#FF9500" />
                      Top 3 Meals
                    </div>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      marginTop: 2
                    }}>
                      {month.topMealsList.map((mealName, idx) => (
                        <span key={idx} style={{
                          fontSize: 11,
                          fontWeight: 600,
                          background: 'rgba(255,149,0,0.06)',
                          color: '#FF9500',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,149,0,0.12)'
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
          <div style={{ padding: '40px 20px', textAlign: 'center', background: '#FFFFFF', border: '1px solid #E5E5EA', borderRadius: 20 }}>
            <Calendar size={36} strokeWidth={2} style={{ color: '#AEAEB2', marginBottom: 12 }} />
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1C1C1E' }}>No monthly archives yet</div>
            <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 4, lineHeight: 1.4 }}>
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
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E5E5EA',
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E', marginBottom: 16 }}>Weekly Calories</div>
            <div style={{ height: 180 }} aria-label="Weekly calorie chart">
              <Bar
                data={{
                  labels: weeklyCalories.map(d => d.label),
                  datasets: [{
                    data: weeklyCalories.map(d => d.calories),
                    backgroundColor: weeklyCalories.map(d => d.calories > 0 ? '#007AFF' : 'rgba(0, 122, 255, 0.06)'),
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.6,
                  }],
                }}
                options={{
                  ...chartOptions,
                  scales: {
                    ...chartOptions.scales,
                    y: {
                      ...chartOptions.scales.y,
                      beginAtZero: true
                    }
                  }
                }}
              />
            </div>
          </div>

          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E5E5EA',
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E', marginBottom: 16 }}>Weekly Protein (g)</div>
            <div style={{ height: 180 }} aria-label="Weekly protein chart">
              <Bar
                data={{
                  labels: weeklyProtein.map(d => d.label),
                  datasets: [{
                    data: weeklyProtein.map(d => d.protein),
                    backgroundColor: weeklyProtein.map(d => d.protein >= 160 ? '#34C759' : '#FF9500'),
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.6,
                  }],
                }}
                options={{
                  ...chartOptions,
                  scales: {
                    ...chartOptions.scales,
                    y: {
                      ...chartOptions.scales.y,
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
              borderTop: '1px solid #E5E5EA'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#8E8E93' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34C759', display: 'inline-block' }} />
                Target Hit (160g+)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#8E8E93' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF9500', display: 'inline-block' }} />
                Below Target
              </div>
            </div>
          </div>

          {dietLogs.length > 0 && (
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E5E5EA',
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
              boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
            }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E', marginBottom: 16 }}>Average Daily Macros</div>
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
                      backgroundColor: ['#007AFF', '#FF9500', '#FF3B30'],
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
