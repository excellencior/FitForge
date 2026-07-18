import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { getBodyStats, getPRRecords, getSettings } from '../utils/storage';
import { exercises as rawExercises } from '../data/workouts';
import {
  Scale, Trophy, Dumbbell, Ruler, Heart
} from 'lucide-react';

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



ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const getThemeColor = (varName, fallback) => {
  const vars = {
    '--text-primary': '#111111',
    '--text-secondary': '#555555',
    '--text-tertiary': '#999999',
    '--border': '#222222',
    '--border-light': '#DDDDDD',
    '--bg-tertiary': '#EBEBEB',
    '--bg-card': '#FFFFFF'
  };
  return vars[varName] || fallback;
};

export default function Progress() {
  const bodyStats = useMemo(() => getBodyStats(), []);
  const prs = useMemo(() => getPRRecords(), []);
  const settings = useMemo(() => getSettings(), []);

  const bmiCalc = useMemo(() => {
    const heightM = (settings.heightCm || 178) / 100;
    const weight = settings.weightKg || 70;
    const bmiVal = heightM > 0 ? (weight / (heightM * heightM)).toFixed(1) : '0';
    const bmiNum = parseFloat(bmiVal);
    const bmiStatus = bmiNum < 18.5 ? 'Underweight' : bmiNum < 25 ? 'Normal' : bmiNum < 30 ? 'Overweight' : 'Obese';
    const bmiColor = bmiNum < 18.5 ? '#999999' : bmiNum < 25 ? '#DDDDDD' : bmiNum < 30 ? '#666666' : '#333333';
    const minBmi = 15;
    const maxBmi = 35;
    const bmiPercent = Math.min(Math.max(((bmiNum - minBmi) / (maxBmi - minBmi)) * 100, 0), 100);
    return { bmi: bmiVal, status: bmiStatus, color: bmiColor, percent: bmiPercent };
  }, [settings]);

  const themeChartOptions = useMemo(() => {
    const textTertiary = getThemeColor('--text-tertiary', '#999999');
    const textSecondary = getThemeColor('--text-secondary', '#555555');
    const bgTertiary = getThemeColor('--bg-tertiary', '#EBEBEB');
    const bgCard = getThemeColor('--bg-card', '#FFFFFF');
    const textPrimary = getThemeColor('--text-primary', '#111111');
    const border = getThemeColor('--border', '#222222');

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: bgCard,
          titleColor: textPrimary,
          bodyColor: textPrimary,
          borderColor: border,
          borderWidth: 2,
          titleFont: { family: fontFamily, weight: '600' },
          bodyFont: { family: fontFamily },
          cornerRadius: 0,
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
          ticks: { font: { size: 10, family: fontFamily }, color: textSecondary },
          beginAtZero: false
        },
      },
      elements: {
        line: { tension: 0, borderWidth: 2 },
        point: { radius: 0, hoverRadius: 5, backgroundColor: '#222222' }
      },
    };
  }, []);



  const weightChartData = useMemo(() => {
    const sorted = [...bodyStats].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
    return {
      labels: sorted.map(s => { const d = new Date(s.date); return `${d.getDate()}/${d.getMonth() + 1}`; }),
      datasets: [{
        data: sorted.map(s => s.weight),
        borderColor: '#222222',
        backgroundColor: 'rgba(34,34,34,0.1)',
        fill: true,
      }],
    };
  }, [bodyStats]);

  const latestBody = bodyStats.length > 0 ? bodyStats[bodyStats.length - 1] : null;



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

      <div>
        {/* BMI Calculator Card */}
        <div 
          className="card" 
          style={{ 
            background: 'var(--bg-card)', 
            border: '2px solid var(--border)', 
            boxShadow: 'var(--shadow-md)', 
            borderRadius: 0, 
            padding: 20, 
            marginBottom: 20 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Heart size={18} color="var(--text-primary)" strokeWidth={2.5} />
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>BMI Calculator</span>
          </div>

          <div style={{ background: 'var(--bg-tertiary)', padding: '16px 20px', borderRadius: 0, border: '2px solid var(--border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Body Mass Index</span>
              <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{bmiCalc.bmi}</span>
            </div>

            {/* Progress bar */}
            <div style={{ height: 6, background: 'var(--border-light)', borderRadius: 0, position: 'relative', overflow: 'visible', margin: '4px 0', border: '1px solid var(--border)' }}>
              <div 
                style={{ 
                  position: 'absolute', 
                  left: `${bmiCalc.percent}%`, 
                  top: -4, 
                  width: 12, 
                  height: 12, 
                  borderRadius: 0, 
                  background: bmiCalc.color, 
                  border: '2px solid var(--border)', 
                  boxShadow: 'var(--shadow-sm)',
                  transform: 'translateX(-50%)',
                  transition: 'left 0.3s ease'
                }} 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>
              <span>15.0 (Under)</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{bmiCalc.status}</span>
              <span>35.0 (Over)</span>
            </div>
          </div>
        </div>

        {/* Latest Measurements */}
        {latestBody && (
          <div className="card" style={{
            background: 'var(--bg-card)',
            border: '2px solid var(--border)',
            borderRadius: 0,
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
                { label: 'Weight', value: `${latestBody.weight} kg`, icon: <Scale size={16} strokeWidth={2.4} color="var(--text-primary)" /> },
                { label: 'Waist', value: latestBody.waist ? `${latestBody.waist} cm` : '—', icon: <Ruler size={16} strokeWidth={2.4} color="var(--text-primary)" /> },
                { label: 'Chest', value: latestBody.chest ? `${latestBody.chest} cm` : '—', icon: <Dumbbell size={16} strokeWidth={2.4} color="var(--text-primary)" /> },
                { label: 'Arm', value: latestBody.arm ? `${latestBody.arm} cm` : '—', icon: <Dumbbell size={16} strokeWidth={2.4} color="var(--text-primary)" /> },
              ].map((s, i) => (
                <div key={i} style={{
                  padding: 14,
                  background: 'var(--bg-tertiary)',
                  border: '2px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)',
                  borderRadius: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center'
                }}>
                  <div style={{
                    background: 'var(--bg-card)',
                    border: '2px solid var(--border)',
                    borderRadius: 0,
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

        {/* Weight Trend Chart */}
        {bodyStats.length >= 2 ? (
          <div className="card" style={{
            background: 'var(--bg-card)',
            border: '2px solid var(--border)',
            borderRadius: 0,
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
            borderRadius: 0,
            padding: '32px 24px',
            marginBottom: 20,
            textAlign: 'center',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div style={{
              background: 'var(--bg-tertiary)',
              border: '2px solid var(--border)',
              width: 48,
              height: 48,
              borderRadius: 0,
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
              <Trophy size={20} strokeWidth={2.4} color="var(--text-primary)" />
              Personal Records
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(prs).map(([exId, pr]) => {
                const ex = exercises[exId];
                return (
                  <div key={exId} style={{
                    background: 'var(--bg-card)',
                    border: '2px solid var(--border)',
                    borderLeft: '5px solid #333333',
                    borderRadius: 0,
                    padding: 16,
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div style={{
                          background: 'var(--bg-tertiary)',
                          border: '2px solid var(--border)',
                          borderRadius: 0,
                          width: 32,
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Trophy size={16} strokeWidth={2.4} color="#333333" />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ex?.nameShort || exId}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>{pr.date}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
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

        </div>
      </div>
  );
}
