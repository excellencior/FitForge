import { useMemo, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { getBodyStats, getPRRecords, getSettings } from '../utils/storage';
import { exercises as rawExercises } from '../data/workouts';
import {
  Scale, Trophy, Heart
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

const fontFamily = "Iosevka, Iosevka Web, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, monospace";

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

  const weightChartData = useMemo(() => {
    const sorted = [...bodyStats].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
    const weights = sorted.map(s => s.weight);
    return {
      labels: sorted.map(s => { const d = new Date(s.date + 'T00:00:00'); return `${d.getDate()}/${d.getMonth() + 1}`; }),
      datasets: [{
        data: weights,
        borderColor: '#222222',
        backgroundColor: (ctx) => {
          const chart = ctx.chart;
          const { ctx: canvasCtx, chartArea } = chart;
          if (!chartArea) return 'rgba(34,34,34,0.08)';
          const gradient = canvasCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(34,34,34,0.15)');
          gradient.addColorStop(0.6, 'rgba(34,34,34,0.05)');
          gradient.addColorStop(1, 'rgba(34,34,34,0)');
          return gradient;
        },
        fill: true,
        borderWidth: 2.5,
        pointRadius: weights.length <= 10 ? 5 : weights.length <= 20 ? 3.5 : 2,
        pointHoverRadius: 7,
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: '#222222',
        pointBorderWidth: 2.5,
        pointHitRadius: 12,
        tension: 0.3,
      }],
    };
  }, [bodyStats]);

  const themeChartOptions = useMemo(() => {
    const textTertiary = getThemeColor('--text-tertiary', '#999999');
    const textSecondary = getThemeColor('--text-secondary', '#555555');
    const bgTertiary = getThemeColor('--bg-tertiary', '#EBEBEB');
    const bgCard = getThemeColor('--bg-card', '#FFFFFF');
    const textPrimary = getThemeColor('--text-primary', '#111111');
    const border = getThemeColor('--border', '#222222');

    // Compute padded Y-axis bounds
    const sorted = [...bodyStats].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
    const weights = sorted.map(s => s.weight).filter(w => w > 0);
    let yMin, yMax;
    if (weights.length > 0) {
      const dataMin = Math.min(...weights);
      const dataMax = Math.max(...weights);
      const range = dataMax - dataMin;
      // Pad by at least 2kg or 5% of range, whichever is larger
      const pad = Math.max(2, range * 0.25);
      yMin = Math.floor((dataMin - pad) * 2) / 2; // round to 0.5
      yMax = Math.ceil((dataMax + pad) * 2) / 2;
      // Ensure we have at least a 4kg visible range
      if (yMax - yMin < 4) {
        const mid = (dataMin + dataMax) / 2;
        yMin = Math.floor((mid - 2) * 2) / 2;
        yMax = Math.ceil((mid + 2) * 2) / 2;
      }
    }

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
          titleFont: { family: fontFamily, weight: '600', size: 11 },
          bodyFont: { family: fontFamily, weight: '700', size: 13 },
          cornerRadius: 0,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: (ctx) => `${ctx.parsed.y} kg`,
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            font: { size: 10, family: fontFamily, weight: '500' },
            color: textTertiary,
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8,
          }
        },
        y: {
          min: yMin,
          max: yMax,
          grid: { color: bgTertiary, drawTicks: false },
          border: { display: false },
          ticks: {
            font: { size: 10, family: fontFamily, weight: '600' },
            color: textSecondary,
            callback: (v) => `${v}`,
            maxTicksLimit: 6,
            padding: 8,
          },
        },
      },
      elements: {
        line: { tension: 0.3, borderWidth: 2.5 },
        point: { radius: 4, hoverRadius: 7, backgroundColor: '#FFFFFF', borderColor: '#222222', borderWidth: 2.5 }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false,
      },
    };
  }, [bodyStats]);

  const latestBody = bodyStats.length > 0 ? bodyStats[bodyStats.length - 1] : null;

  // Weight stats summary
  const weightStats = useMemo(() => {
    const sorted = [...bodyStats].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
    const weights = sorted.map(s => s.weight).filter(w => w > 0);
    if (weights.length < 2) return null;
    const first = weights[0];
    const last = weights[weights.length - 1];
    const diff = last - first;
    return {
      change: diff.toFixed(1),
      isGain: diff > 0,
      isLoss: diff < 0,
      entries: weights.length,
    };
  }, [bodyStats]);



  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }, []);

  return (
    <div className="page-content" style={{
      paddingBottom: 'calc(var(--nav-height) + var(--safe-bottom) + 32px)',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24, paddingTop: 4 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: '#0F172A', margin: 0, lineHeight: 1.2 }}>
          Progress
        </h1>
        <p style={{ fontSize: 13, color: '#475569', marginTop: 4, fontWeight: 600 }}>Track your gains</p>
      </div>

      <div>
        {/* BMI Calculator Card */}
        <div 
          className="glass-card" 
          style={{ 
            borderRadius: 20, 
            padding: 20, 
            marginBottom: 20 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Heart size={18} color="#0F172A" strokeWidth={2.5} />
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>BMI Calculator</span>
          </div>

          <div style={{ background: 'var(--glass-bg)', padding: '16px 20px', borderRadius: 16, border: 'var(--glass-border)', boxShadow: 'var(--glass-shadow), var(--glass-rim)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Body Mass Index</span>
              <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{bmiCalc.bmi}</span>
            </div>

            {/* Progress bar */}
            <div style={{ height: 6, background: 'rgba(241, 245, 249, 0.8)', borderRadius: 99, position: 'relative', overflow: 'visible', margin: '4px 0', border: 'var(--glass-border-separator)' }}>
              <div 
                style={{ 
                  position: 'absolute', 
                  left: `${bmiCalc.percent}%`, 
                  top: -4, 
                  width: 14, 
                  height: 14, 
                  borderRadius: '50%', 
                  background: bmiCalc.color, 
                  border: '2px solid #FFFFFF', 
                  boxShadow: 'var(--glass-shadow-sm)',
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
          <div className="glass-card" style={{
            borderRadius: 20,
            padding: 16,
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Latest Measurements</span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{latestBody.date}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                background: 'var(--bg-tertiary)',
                border: '2px solid var(--border)',
                borderRadius: 0,
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Scale size={18} strokeWidth={2.4} color="var(--text-primary)" />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: '500', marginBottom: 2 }}>Weight</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{latestBody.weight} kg</div>
              </div>
            </div>
          </div>
        )}

        {/* Weight Trend Chart */}
        {bodyStats.length >= 2 ? (
          <div className="glass-card" style={{
            borderRadius: 20,
            padding: 16,
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Weight Trend</div>
            <div style={{ height: 180 }} aria-label="Weight trend chart">
              <Line data={weightChartData} options={themeChartOptions} />
            </div>
          </div>
        ) : (
          <div className="glass-card" style={{
            borderRadius: 20,
            padding: '32px 24px',
            marginBottom: 20,
            textAlign: 'center',
          }}>
            <div style={{
              background: 'rgba(124, 92, 255, 0.12)',
              border: 'var(--glass-border-strong)',
              width: 48,
              height: 48,
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Scale size={22} strokeWidth={2.2} color="#7C5CFF" />
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
                  <div key={exId} className="glass-card" style={{
                    borderLeft: '4px solid #0F172A',
                    borderRadius: 18,
                    padding: 16,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div style={{
                          background: 'rgba(15, 23, 42, 0.08)',
                          border: 'var(--glass-border-strong)',
                          borderRadius: 12,
                          width: 36,
                          height: 36,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Trophy size={16} strokeWidth={2.4} color="#0F172A" />
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
                          {pr.reps} reps
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
