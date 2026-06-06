import { useState, useEffect } from 'react';
import {
  getWorkoutSheets, saveWorkoutSheet, deleteWorkoutSheet,
  setActiveSheet, getActiveSheet, getToday
} from '../utils/storage';
import { useModalLock, useInputFocus, useToast } from '../utils/ux';
import { exercises as defaultExercises } from '../data/workouts';
import Modal from '../components/Modal';
import {
  Plus, X, Trash2, Check, Edit3, ChevronDown, ChevronUp,
  Play, AlertTriangle, Dumbbell, RotateCcw, Zap, Star, Calendar,
  GripVertical, Sparkles
} from 'lucide-react';

const KEYFRAMES_ID = 'sheets-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(KEYFRAMES_ID)) {
  const sheet = document.createElement('style');
  sheet.id = KEYFRAMES_ID;
  sheet.textContent = `
    @keyframes sheetsCardInsert {
      0%   { opacity: 0; transform: translateY(12px) scale(0.97); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes sheetsCardRemove {
      0%   { opacity: 1; transform: scale(1); max-height: 200px; padding: 16px; margin-bottom: 20px; overflow: hidden; }
      100% { opacity: 0; transform: scale(0.95); max-height: 0; padding: 0; margin-bottom: 0; border: none; overflow: hidden; }
    }
    @keyframes sheetsAddPop {
      0%   { transform: scale(0.6); opacity: 0; }
      60%  { transform: scale(1.15); }
      100% { transform: scale(1);   opacity: 1; }
    }
    @keyframes sheetsExInsert {
      0%   { opacity: 0; transform: translateY(-8px) scale(0.98); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
  `;
  document.head.appendChild(sheet);
}

const exerciseCatalog = [
  // Compounds
  { id: 'squat', name: 'Barbell Back Squat', muscle: 'Legs, Core', type: 'compound' },
  { id: 'deadlift', name: 'Barbell Deadlift', muscle: 'Back, Legs', type: 'compound' },
  { id: 'bench', name: 'Barbell Bench Press', muscle: 'Chest, Triceps', type: 'compound' },
  { id: 'ohp', name: 'Overhead Press', muscle: 'Shoulders, Triceps', type: 'compound' },
  { id: 'pullup', name: 'Weighted Pull-ups', muscle: 'Back, Biceps', type: 'compound' },
  { id: 'row', name: 'Bent-Over Row', muscle: 'Back, Biceps', type: 'compound' },
  // Accessories
  { id: 'curl', name: 'Barbell Curl', muscle: 'Biceps', type: 'accessory' },
  { id: 'tricepDip', name: 'Tricep Dips', muscle: 'Triceps', type: 'accessory' },
  { id: 'legPress', name: 'Leg Press', muscle: 'Legs', type: 'accessory' },
  { id: 'latPull', name: 'Lat Pulldown', muscle: 'Back', type: 'accessory' },
  { id: 'shoulderRaise', name: 'Lateral Raise', muscle: 'Shoulders', type: 'accessory' },
  { id: 'facePull', name: 'Face Pull', muscle: 'Rear Delts', type: 'accessory' },
  { id: 'plank', name: 'Plank Hold', muscle: 'Core', type: 'accessory' },
  { id: 'legCurl', name: 'Leg Curl', muscle: 'Hamstrings', type: 'accessory' },
  { id: 'calfRaise', name: 'Calf Raise', muscle: 'Calves', type: 'accessory' },
  { id: 'inclineBench', name: 'Incline Bench Press', muscle: 'Upper Chest', type: 'compound' },
  { id: 'romanianDL', name: 'Romanian Deadlift', muscle: 'Hamstrings, Glutes', type: 'compound' },
  { id: 'frontSquat', name: 'Front Squat', muscle: 'Quads, Core', type: 'compound' },
  // Conditioning
  { id: 'farmerWalk', name: "Farmer's Walk", muscle: 'Grip, Full Body', type: 'conditioning' },
  { id: 'kbSwing', name: 'Kettlebell Swing', muscle: 'Hips, Core', type: 'conditioning' },
  { id: 'jumpRope', name: 'Jump Rope', muscle: 'Cardio', type: 'conditioning' },
  { id: 'bwCircuit', name: 'Bodyweight Circuit', muscle: 'Full Body', type: 'conditioning' },
];

/*
 * Optimal exercise ordering based on exercise science:
 * 1. Primary barbell compounds (highest neural demand, do fresh)
 * 2. Secondary compounds (heavy but less demanding)
 * 3. Accessory compounds (moderate load)
 * 4. Isolation exercises (least fatigue-sensitive)
 * 5. Core (stabilizers, don't fatigue before heavy lifts)
 * 6. Conditioning (finish with metabolic work)
 *
 * Within each tier, sort by muscle group size:
 * Legs > Back > Chest > Shoulders > Arms > Core > Cardio
 */
const EXERCISE_PRIORITY = {
  // Tier 1: Primary barbell compounds
  squat: 10, deadlift: 11, bench: 12, ohp: 13,
  frontSquat: 14,
  // Tier 2: Secondary compounds
  row: 20, pullup: 21, inclineBench: 22, romanianDL: 23,
  // Tier 3: Machine/accessory compounds
  legPress: 30, latPull: 31, tricepDip: 32,
  // Tier 4: Isolation
  legCurl: 40, shoulderRaise: 41, facePull: 42, curl: 43, calfRaise: 44,
  // Tier 5: Core
  plank: 50,
  // Tier 6: Conditioning (always last)
  kbSwing: 60, farmerWalk: 61, jumpRope: 62, bwCircuit: 63,
};

const TIER_LABELS = {
  1: 'Primary Compound', 2: 'Secondary Compound', 3: 'Accessory Compound',
  4: 'Isolation', 5: 'Core', 6: 'Conditioning',
};

const getTier = (exId) => {
  const p = EXERCISE_PRIORITY[exId];
  if (!p) return 4; // unknown → isolation
  return Math.floor(p / 10);
};

const getTierLabel = (exId) => TIER_LABELS[getTier(exId)] || 'Exercise';
const getTierColor = (exId) => {
  const t = getTier(exId);
  if (t === 1) return '#E04F4F';
  if (t === 2) return '#E0851B';
  if (t === 3) return '#3A86C8';
  if (t === 4) return '#7B61FF';
  if (t === 5) return '#2E9E47';
  return '#7A7A7E';
};

const defaultSheets = [
  {
    id: 1780143765896,
    name: "CNS Strength Blueprint",
    description: "Personalized compound routine maximizing myofibrillar density and neural drive (1-5 rep range) based on your stats (72.7kg, 5'10\"). Squeeze the bar with a white-knuckle grip to activate full-body tension (irradiation).",
    isDefault: true,
    exercises: [
      { exerciseId: 'squat', minSets: 3, maxSets: 5, reps: 5, weight: 60, restMinutes: 4, amrap: false, notes: 'White-knuckle the bar and squeeze glutes. Rest 4m.' },
      { exerciseId: 'bench', minSets: 3, maxSets: 5, reps: 5, weight: 50, restMinutes: 4, amrap: true, notes: 'Crush the bar, brace stomach. Last set AMRAP. Rest 4m.' },
      { exerciseId: 'row', minSets: 3, maxSets: 5, reps: 5, weight: 45, restMinutes: 3, amrap: false, notes: 'Explode up, 2-sec slow eccentric control. Rest 3m.' },
      { exerciseId: 'ohp', minSets: 3, maxSets: 5, reps: 5, weight: 35, restMinutes: 4, amrap: true, notes: 'Stand tall, squeeze glutes. Last set AMRAP. Rest 4m.' },
      { exerciseId: 'deadlift', minSets: 1, maxSets: 3, reps: 5, weight: 70, restMinutes: 5, amrap: true, notes: 'Single high-effort work set. Pull with perfect form. Rest 5m.' },
    ],
  }
];

export default function WorkoutSheets() {
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActive] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingSheet, setEditingSheet] = useState(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState('all');
  const [expandedSheet, setExpandedSheet] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [expandedExIdx, setExpandedExIdx] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [deletingSheetId, setDeletingSheetId] = useState(null);
  const handleFocus = useInputFocus();
  const { toast, show: showToast } = useToast();

  // Lock body scroll when any modal is open
  useModalLock(showEditor || showCatalog || !!showDeleteConfirm);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    let loaded = getWorkoutSheets();
    // Seed default sheets if empty
    if (loaded.length === 0) {
      defaultSheets.forEach(s => saveWorkoutSheet({ ...s }));
      loaded = getWorkoutSheets();
    }
    setSheets(loaded);
    setActive(getActiveSheet());
  };

  /* ── Activation lock: once per day ── */
  const canChangeActive = () => {
    const lastChange = localStorage.getItem('fitforge_last_sheet_change');
    if (!lastChange) return true;
    return lastChange !== getToday();
  };

  const markActivationUsed = () => {
    localStorage.setItem('fitforge_last_sheet_change', getToday());
  };

  const handleActivate = (sheet) => {
    if (!canChangeActive()) {
      showToast('You can only change your active sheet once per day', 'warning');
      return;
    }
    setActiveSheet(sheet.id);
    setActive(sheet);
    markActivationUsed();
    showToast(`Activated: ${sheet.name}`, 'success');
  };

  const handleDeactivate = () => {
    if (!canChangeActive()) {
      showToast('You can only change your active sheet once per day', 'warning');
      return;
    }
    setActiveSheet(null);
    setActive(null);
    markActivationUsed();
    showToast('Sheet deactivated', 'success');
  };

  const handleDelete = (sheetId) => {
    const sheetName = sheets.find(s => s.id === sheetId)?.name || 'Sheet';
    setDeletingSheetId(sheetId);
    setShowDeleteConfirm(null);
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
    setTimeout(() => {
      deleteWorkoutSheet(sheetId);
      // If we deleted the active sheet, fall back to the default or first available
      if (activeSheet?.id === sheetId) {
        const remaining = getWorkoutSheets();
        const defaultSheet = remaining.find(s => s.isDefault) || remaining[0];
        if (defaultSheet) {
          setActiveSheet(defaultSheet.id);
          setActive(defaultSheet);
        } else {
          setActiveSheet(null);
          setActive(null);
        }
      }
      loadData();
      setDeletingSheetId(null);
      showToast(`Deleted: ${sheetName}`, 'success');
    }, 280);
  };

  const handleSetDefault = (sheet) => {
    // Remove default from all, set on this one
    const all = getWorkoutSheets();
    all.forEach(s => {
      if (s.isDefault) saveWorkoutSheet({ ...s, isDefault: false });
    });
    saveWorkoutSheet({ ...sheet, isDefault: true });
    loadData();
    showToast(`${sheet.name} set as default`, 'success');
  };

  const openNewSheet = () => {
    setEditingSheet({
      name: '',
      description: '',
      exercises: [],
    });
    setShowEditor(true);
  };

  const openEditSheet = (sheet) => {
    setEditingSheet({ ...sheet, exercises: [...sheet.exercises] });
    setShowEditor(true);
  };

  const handleSaveSheet = () => {
    if (!editingSheet.name.trim()) {
      showToast('Please enter a sheet name', 'warning');
      return;
    }
    if (editingSheet.exercises.length === 0) {
      showToast('Add at least one exercise', 'warning');
      return;
    }
    saveWorkoutSheet(editingSheet);
    setShowEditor(false);
    setEditingSheet(null);
    loadData();
    showToast(editingSheet.id ? 'Sheet updated' : 'Sheet created', 'success');
  };

  const addExerciseToSheet = (catalogExercise) => {
    setEditingSheet(prev => ({
      ...prev,
      exercises: [...prev.exercises, {
        exerciseId: catalogExercise.id,
        minSets: 3,
        maxSets: 5,
        reps: 5,
        weight: 0,
        restMinutes: 3,
        amrap: false,
        notes: '',
      }],
    }));
    setShowCatalog(false);
  };

  const removeExerciseFromSheet = (index) => {
    setEditingSheet(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index),
    }));
  };

  const updateExerciseInSheet = (index, field, value) => {
    setEditingSheet(prev => {
      const exercises = [...prev.exercises];
      exercises[index] = { ...exercises[index], [field]: value };
      return { ...prev, exercises };
    });
  };

  const moveExercise = (index, direction) => {
    setEditingSheet(prev => {
      const exercises = [...prev.exercises];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= exercises.length) return prev;
      [exercises[index], exercises[newIndex]] = [exercises[newIndex], exercises[index]];
      return { ...prev, exercises };
    });
  };

  const autoOrderExercises = () => {
    setEditingSheet(prev => {
      const sorted = [...prev.exercises].sort((a, b) => {
        const pa = EXERCISE_PRIORITY[a.exerciseId] ?? 45;
        const pb = EXERCISE_PRIORITY[b.exerciseId] ?? 45;
        return pa - pb;
      });
      return { ...prev, exercises: sorted };
    });
    setExpandedExIdx(null);
    showToast('Exercises reordered optimally', 'success');
  };

  const handleDragStart = (i) => setDragIdx(i);
  const handleDragOver = (e, i) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    setEditingSheet(prev => {
      const exercises = [...prev.exercises];
      const [moved] = exercises.splice(dragIdx, 1);
      exercises.splice(i, 0, moved);
      return { ...prev, exercises };
    });
    setDragIdx(i);
  };
  const handleDragEnd = () => setDragIdx(null);

  const getExerciseInfo = (exId) => {
    return exerciseCatalog.find(e => e.id === exId) || defaultExercises[exId] || { name: exId, muscle: '' };
  };

  const getExerciseType = (exId) => {
    const item = exerciseCatalog.find(e => e.id === exId);
    return item ? item.type : 'accessory';
  };

  const renderExerciseIcon = (type, size = 16) => {
    if (type === 'compound') return <Dumbbell size={size} strokeWidth={2.4} color="#1C1C1E" />;
    if (type === 'conditioning') return <Zap size={size} strokeWidth={2.4} color="#1C1C1E" />;
    return <Sparkles size={size} strokeWidth={2.4} color="#1C1C1E" />;
  };

  return (
    <div 
      className="page-content" 
      style={{ 
        maxWidth: 480, 
        margin: '0 auto', 
        paddingBottom: 'calc(var(--nav-height) + var(--safe-bottom) + 32px)', 
        paddingTop: 24,
        paddingLeft: 16,
        paddingRight: 16,
        background: '#FFFFFF',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: '#1C1C1E', margin: 0 }}>
          Workout Sheets
        </h1>
        <p style={{ fontSize: 13, color: '#8E8E93', marginTop: 4, letterSpacing: '-0.01em', margin: '4px 0 0' }}>
          Create, customize, and activate your weekly plans
        </p>
      </div>

      {/* Active Sheet Banner */}
      {activeSheet && (
        <div style={{
          marginBottom: 20, 
          padding: '14px 16px', 
          borderRadius: '16px',
          background: '#F2F2F7', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12,
          border: '1px solid #E5E5EA',
        }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: '10px',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}>
            <Zap size={18} strokeWidth={2.4} color="#1C1C1E" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Currently Active</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E', marginTop: 1 }}>{activeSheet.name}</div>
          </div>
        </div>
      )}

      {/* Sheets List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
        {sheets.map(sheet => {
          const isActive = activeSheet?.id === sheet.id;
          const isExpanded = expandedSheet === sheet.id;
          return (
            <div 
              key={sheet.id} 
              style={{
                background: isActive ? '#F6F9FF' : '#FFFFFF',
                borderRadius: '20px',
                border: isActive ? '1.5px solid #007AFF' : '1px solid #E5E5EA',
                boxShadow: isActive ? '0 8px 24px rgba(0, 122, 255, 0.06)' : '0 4px 16px rgba(0, 0, 0, 0.02)',
                padding: '16px',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                animation: deletingSheetId === sheet.id 
                  ? 'sheetsCardRemove 0.28s cubic-bezier(0.4, 0, 0.2, 1) forwards' 
                  : 'sheetsCardInsert 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              }}
            >
              {/* Sheet Header */}
              <div
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                onClick={() => setExpandedSheet(isExpanded ? null : sheet.id)}
              >
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 15, color: '#1C1C1E', letterSpacing: '-0.01em' }}>{sheet.name}</span>
                      {isActive && (
                        <span style={{ 
                          fontSize: 9, 
                          fontWeight: 700, 
                          background: '#E5F6ED', 
                          color: '#2E9E47', 
                          padding: '2px 6px', 
                          borderRadius: '100px', 
                          letterSpacing: '0.03em' 
                        }}>
                          ACTIVE
                        </span>
                      )}
                      {sheet.isDefault && <Star size={12} fill="#FFB300" color="#FFB300" />}
                    </div>
                    <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 4 }}>
                      {sheet.exercises?.length || 0} exercises
                      {sheet.startDate && sheet.endDate && ` · ${sheet.startDate} to ${sheet.endDate}`}
                    </div>
                  </div>
                </div>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#F2F2F7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {isExpanded ? <ChevronUp size={16} strokeWidth={2.4} color="#8E8E93" /> : <ChevronDown size={16} strokeWidth={2.4} color="#8E8E93" />}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #E5E5EA' }}>
                  {sheet.description && (
                    <div style={{ fontSize: 13, color: '#636366', marginBottom: 14, lineHeight: 1.4 }}>{sheet.description}</div>
                  )}

                  {/* Exercise List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {sheet.exercises?.map((ex, i) => {
                      const info = getExerciseInfo(ex.exerciseId);
                      const type = getExerciseType(ex.exerciseId);
                      return (
                        <div key={i} style={{
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 12,
                          padding: '10px 12px', 
                          background: '#F2F2F7', 
                          borderRadius: '12px',
                          border: '1px solid #E5E5EA',
                        }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: '8px',
                            background: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                          }}>
                            {renderExerciseIcon(type, 16)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E' }}>{info.name}</div>
                            <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 2 }}>
                              {ex.minSets || ex.sets || 3}{ex.maxSets ? `-${ex.maxSets}` : ''} × {ex.reps}{ex.amrap ? '+' : ''} · {ex.weight > 0 ? `${ex.weight}kg` : 'No weight'} · Rest {ex.restMinutes}m
                            </div>
                          </div>
                          {ex.amrap && (
                            <span style={{ 
                              fontSize: 9, 
                              fontWeight: 700, 
                              background: '#F3E8FF', 
                              color: '#7B61FF', 
                              padding: '2px 6px', 
                              borderRadius: '100px', 
                              letterSpacing: '0.03em' 
                            }}>
                              AMRAP
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                    {!isActive ? (
                      <button 
                        style={{ 
                          flex: 1.5, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: 6,
                          background: '#1C1C1E',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '10px 16px',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }} 
                        onClick={() => handleActivate(sheet)}
                      >
                        <Play size={14} strokeWidth={2.4} /> Activate
                      </button>
                    ) : (
                      <button 
                        style={{ 
                          flex: 1.5, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: 6,
                          background: '#FFFFFF',
                          color: '#E04F4F',
                          border: '1px solid #E5E5EA',
                          borderRadius: '12px',
                          padding: '10px 16px',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }} 
                        onClick={handleDeactivate}
                      >
                        <RotateCcw size={14} strokeWidth={2.4} /> Deactivate
                      </button>
                    )}
                    
                    {!sheet.isDefault && (
                      <button 
                        style={{
                          width: 38,
                          height: 38,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#FFFFFF',
                          border: '1px solid #E5E5EA',
                          borderRadius: '12px',
                          cursor: 'pointer',
                        }} 
                        onClick={() => handleSetDefault(sheet)} 
                        title="Set as default"
                      >
                        <Star size={14} strokeWidth={2.4} color="#8E8E93" />
                      </button>
                    )}

                    <button 
                      style={{
                        width: 38,
                        height: 38,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#FFFFFF',
                        border: '1px solid #E5E5EA',
                        borderRadius: '12px',
                        cursor: 'pointer',
                      }} 
                      onClick={() => openEditSheet(sheet)}
                    >
                      <Edit3 size={14} strokeWidth={2.4} color="#8E8E93" />
                    </button>

                    {sheets.length > 1 && (
                      <button
                        style={{ 
                          width: 38,
                          height: 38,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#FFF0F0', 
                          color: '#E04F4F',
                          border: '1px solid #FFD1D1',
                          borderRadius: '12px',
                          cursor: 'pointer',
                        }}
                        onClick={() => setShowDeleteConfirm(sheet.id)}
                      >
                        <Trash2 size={14} strokeWidth={2.4} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create New Sheet Button */}
      <button 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          background: '#1C1C1E',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '14px',
          padding: '14px 20px',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          transition: 'background-color 0.2s',
        }} 
        onClick={openNewSheet}
      >
        <Plus size={16} strokeWidth={2.4} /> Create New Workout Sheet
      </button>

      <div style={{ fontSize: 12, color: '#AEAEB2', textAlign: 'center', marginTop: 16, lineHeight: 1.4 }}>
        Activate one sheet per week. Alternate between sheets for progressive overload.
      </div>

      {/* ===== SHEET EDITOR MODAL ===== */}
      {editingSheet && (
        <Modal
          isOpen={showEditor}
          onClose={() => { setShowEditor(false); setEditingSheet(null); }}
          title={editingSheet.id ? 'Edit Sheet' : 'New Workout Sheet'}
          type="bottom-sheet"
        >

            {/* Sheet Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Sheet Name *</label>
                <input
                  style={{
                    width: '100%',
                    background: '#F2F2F7',
                    border: '1px solid #E5E5EA',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: 14,
                    color: '#1C1C1E',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder="e.g. Upper Body Power"
                  value={editingSheet.name}
                  onChange={e => setEditingSheet(p => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Description</label>
                <input
                  style={{
                    width: '100%',
                    background: '#F2F2F7',
                    border: '1px solid #E5E5EA',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: 14,
                    color: '#1C1C1E',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder="Brief description (optional)"
                  value={editingSheet.description || ''}
                  onChange={e => setEditingSheet(p => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    <Calendar size={11} strokeWidth={2.4} /> Start Date
                  </label>
                  <input
                    style={{
                      width: '100%',
                      background: '#F2F2F7',
                      border: '1px solid #E5E5EA',
                      borderRadius: '12px',
                      padding: '10px 12px',
                      fontSize: 13,
                      color: '#1C1C1E',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    type="date"
                    value={editingSheet.startDate || ''}
                    onChange={e => setEditingSheet(p => ({ ...p, startDate: e.target.value }))}
                    onFocus={handleFocus}
                  />
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    <Calendar size={11} strokeWidth={2.4} /> End Date
                  </label>
                  <input
                    style={{
                      width: '100%',
                      background: '#F2F2F7',
                      border: '1px solid #E5E5EA',
                      borderRadius: '12px',
                      padding: '10px 12px',
                      fontSize: 13,
                      color: '#1C1C1E',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    type="date"
                    value={editingSheet.endDate || ''}
                    onChange={e => setEditingSheet(p => ({ ...p, endDate: e.target.value }))}
                    onFocus={handleFocus}
                  />
                </div>
              </div>
            </div>

            {/* Exercises in Sheet */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E' }}>Exercises ({editingSheet.exercises.length})</span>
                {editingSheet.exercises.length >= 2 && (
                  <button
                    type="button"
                    style={{ 
                      background: '#F2F2F7', 
                      color: '#1C1C1E', 
                      fontSize: 11, 
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      border: '1px solid #E5E5EA',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      cursor: 'pointer',
                    }}
                    onClick={autoOrderExercises}
                  >
                    <Sparkles size={12} strokeWidth={2.4} /> Optimize Order
                  </button>
                )}
              </div>

              {editingSheet.exercises.length === 0 && (
                <div style={{ padding: '24px 16px', textAlign: 'center', background: '#F2F2F7', borderRadius: '16px', border: '1px dashed #E5E5EA' }}>
                  <Dumbbell size={28} strokeWidth={2.2} color="#8E8E93" style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 13, color: '#8E8E93', fontWeight: 500 }}>No exercises added yet</div>
                  <div style={{ fontSize: 11, color: '#AEAEB2', marginTop: 2 }}>Tap "Add Exercise" below</div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {editingSheet.exercises.map((ex, i) => {
                  const info = getExerciseInfo(ex.exerciseId);
                  const type = getExerciseType(ex.exerciseId);
                  const isOpen = expandedExIdx === i;
                  const tierColor = getTierColor(ex.exerciseId);
                  const tierLabel = getTierLabel(ex.exerciseId);
                  const isDragging = dragIdx === i;
                  const summary = `${ex.minSets || ex.sets || 3}-${ex.maxSets || ex.minSets || ex.sets || 5} × ${ex.reps}${ex.amrap ? '+' : ''} · ${ex.weight > 0 ? ex.weight + 'kg' : '—'} · ${ex.restMinutes}m rest`;

                  return (
                    <div
                      key={i}
                      draggable
                      onDragStart={() => handleDragStart(i)}
                      onDragOver={(e) => handleDragOver(e, i)}
                      onDragEnd={handleDragEnd}
                      style={{
                        background: isDragging ? '#F2F2F7' : '#FFFFFF',
                        borderRadius: '14px',
                        border: isDragging ? '1.5px dashed #1C1C1E' : '1px solid #E5E5EA',
                        overflow: 'hidden',
                        transition: 'all 0.15s ease',
                        opacity: isDragging ? 0.7 : 1,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                        animation: 'sheetsExInsert 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                      }}
                    >
                      {/* Collapsed Header — always visible */}
                      <div
                        onClick={() => setExpandedExIdx(isOpen ? null : i)}
                        style={{
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 8, 
                          padding: '12px 14px',
                          cursor: 'pointer', 
                          userSelect: 'none',
                        }}
                      >
                        <GripVertical size={16} color="#C7C7CC" style={{ cursor: 'grab', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0, paddingLeft: 4 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {renderExerciseIcon(type, 13)}
                            <span>{info.name}</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#8E8E93', display: 'flex', flexWrap: 'wrap', gap: '2px 8px', alignItems: 'center', marginTop: 2 }}>
                            <span style={{ color: tierColor, fontWeight: 600 }}>{tierLabel}</span>
                            <span>·</span>
                            <span>{summary}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          style={{ 
                            width: 24, 
                            height: 24, 
                            borderRadius: '50%',
                            background: '#FFF0F0', 
                            color: '#E04F4F', 
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            cursor: 'pointer',
                          }}
                          onClick={(e) => { e.stopPropagation(); removeExerciseFromSheet(i); }}
                        >
                          <Trash2 size={12} strokeWidth={2.4} />
                        </button>
                      </div>

                      {/* Expanded Config */}
                      {isOpen && (
                        <div style={{ padding: '0 14px 14px', borderTop: '1px solid #E5E5EA', background: '#F9F9FB' }}>
                          <div style={{ display: 'flex', gap: 4, marginTop: 10, marginBottom: 10 }}>
                            <button 
                              type="button" 
                              style={{ 
                                width: 28, 
                                height: 28, 
                                borderRadius: '8px',
                                background: '#FFFFFF',
                                border: '1px solid #E5E5EA',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }} 
                              onClick={() => moveExercise(i, -1)} 
                              disabled={i === 0}
                            >
                              <ChevronUp size={14} strokeWidth={2.4} color={i === 0 ? '#C7C7CC' : '#1C1C1E'} />
                            </button>
                            <button 
                              type="button" 
                              style={{ 
                                width: 28, 
                                height: 28, 
                                borderRadius: '8px',
                                background: '#FFFFFF',
                                border: '1px solid #E5E5EA',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }} 
                              onClick={() => moveExercise(i, 1)} 
                              disabled={i === editingSheet.exercises.length - 1}
                            >
                              <ChevronDown size={14} strokeWidth={2.4} color={i === editingSheet.exercises.length - 1 ? '#C7C7CC' : '#1C1C1E'} />
                            </button>
                            <div style={{ flex: 1, fontSize: 11, color: '#8E8E93', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontWeight: 500 }}>
                              Targeting: {info.muscle}
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#8E8E93', marginBottom: 4, textTransform: 'uppercase' }}>Min Sets</label>
                              <input 
                                type="number" 
                                inputMode="numeric" 
                                min="1" 
                                max="10" 
                                style={{ 
                                  width: '100%', 
                                  background: '#FFFFFF', 
                                  border: '1px solid #E5E5EA', 
                                  borderRadius: '8px', 
                                  padding: '8px', 
                                  fontSize: 13, 
                                  textAlign: 'center',
                                  outline: 'none',
                                  color: '#1C1C1E',
                                  boxSizing: 'border-box',
                                }}
                                value={ex.minSets || ex.sets || 3} 
                                onChange={e => updateExerciseInSheet(i, 'minSets', +e.target.value)} 
                                onFocus={handleFocus} 
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#8E8E93', marginBottom: 4, textTransform: 'uppercase' }}>Max Sets</label>
                              <input 
                                type="number" 
                                inputMode="numeric" 
                                min="1" 
                                max="10" 
                                style={{ 
                                  width: '100%', 
                                  background: '#FFFFFF', 
                                  border: '1px solid #E5E5EA', 
                                  borderRadius: '8px', 
                                  padding: '8px', 
                                  fontSize: 13, 
                                  textAlign: 'center',
                                  outline: 'none',
                                  color: '#1C1C1E',
                                  boxSizing: 'border-box',
                                }}
                                value={ex.maxSets || ex.minSets || ex.sets || 5} 
                                onChange={e => updateExerciseInSheet(i, 'maxSets', +e.target.value)} 
                                onFocus={handleFocus} 
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#8E8E93', marginBottom: 4, textTransform: 'uppercase' }}>Reps</label>
                              <input 
                                type="number" 
                                inputMode="numeric" 
                                min="1" 
                                max="30" 
                                style={{ 
                                  width: '100%', 
                                  background: '#FFFFFF', 
                                  border: '1px solid #E5E5EA', 
                                  borderRadius: '8px', 
                                  padding: '8px', 
                                  fontSize: 13, 
                                  textAlign: 'center',
                                  outline: 'none',
                                  color: '#1C1C1E',
                                  boxSizing: 'border-box',
                                }}
                                value={ex.reps} 
                                onChange={e => updateExerciseInSheet(i, 'reps', +e.target.value)} 
                                onFocus={handleFocus} 
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#8E8E93', marginBottom: 4, textTransform: 'uppercase' }}>Weight (kg)</label>
                              <input 
                                type="number" 
                                inputMode="decimal" 
                                min="0" 
                                step="0.5" 
                                style={{ 
                                  width: '100%', 
                                  background: '#FFFFFF', 
                                  border: '1px solid #E5E5EA', 
                                  borderRadius: '8px', 
                                  padding: '8px', 
                                  fontSize: 13, 
                                  textAlign: 'center',
                                  outline: 'none',
                                  color: '#1C1C1E',
                                  boxSizing: 'border-box',
                                }}
                                placeholder="0" 
                                value={ex.weight || ''} 
                                onChange={e => updateExerciseInSheet(i, 'weight', +e.target.value)} 
                                onFocus={handleFocus} 
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#8E8E93', marginBottom: 4, textTransform: 'uppercase' }}>Rest (min)</label>
                              <input 
                                type="number" 
                                inputMode="decimal" 
                                min="0.5" 
                                max="10" 
                                step="0.5" 
                                style={{ 
                                  width: '100%', 
                                  background: '#FFFFFF', 
                                  border: '1px solid #E5E5EA', 
                                  borderRadius: '8px', 
                                  padding: '8px', 
                                  fontSize: 13, 
                                  textAlign: 'center',
                                  outline: 'none',
                                  color: '#1C1C1E',
                                  boxSizing: 'border-box',
                                }}
                                value={ex.restMinutes} 
                                onChange={e => updateExerciseInSheet(i, 'restMinutes', +e.target.value)} 
                                onFocus={handleFocus} 
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                              <button
                                type="button"
                                onClick={() => updateExerciseInSheet(i, 'amrap', !ex.amrap)}
                                style={{
                                  width: '100%',
                                  height: '37px',
                                  background: ex.amrap ? '#1C1C1E' : '#FFFFFF',
                                  color: ex.amrap ? '#FFFFFF' : '#1C1C1E',
                                  border: '1px solid #E5E5EA',
                                  borderRadius: '8px',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 6,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                }}
                              >
                                <Check size={12} strokeWidth={2.4} color={ex.amrap ? '#FFFFFF' : '#8E8E93'} />
                                AMRAP
                              </button>
                            </div>
                          </div>

                          <input
                            style={{
                              width: '100%',
                              background: '#FFFFFF',
                              border: '1px solid #E5E5EA',
                              borderRadius: '8px',
                              padding: '8px 10px',
                              fontSize: 12,
                              outline: 'none',
                              color: '#1C1C1E',
                              boxSizing: 'border-box',
                            }}
                            placeholder="Notes (optional)"
                            value={ex.notes || ''} 
                            onChange={e => updateExerciseInSheet(i, 'notes', e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Exercise Button */}
              <button
                type="button"
                style={{ 
                  marginTop: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  width: '100%',
                  background: '#FFFFFF',
                  color: '#1C1C1E',
                  border: '1.5px solid #E5E5EA',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onClick={() => setShowCatalog(true)}
              >
                <Plus size={14} strokeWidth={2.4} /> Add Exercise
              </button>
            </div>

            {/* Save Button */}
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                width: '100%',
                background: editingSheet.name.trim() ? '#1C1C1E' : '#AEAEB2',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '14px',
                padding: '14px 20px',
                fontSize: 14,
                fontWeight: 600,
                cursor: editingSheet.name.trim() ? 'pointer' : 'default',
                transition: 'background-color 0.2s',
              }}
              onClick={handleSaveSheet}
              disabled={!editingSheet.name.trim()}
            >
              <Check size={16} strokeWidth={2.4} /> {editingSheet.id ? 'Save Changes' : 'Create Sheet'}
            </button>
        </Modal>
      )}

      {/* ===== EXERCISE CATALOG MODAL ===== */}
      <Modal
        isOpen={showCatalog}
        onClose={() => setShowCatalog(false)}
        title="Add Exercise"
        type="bottom-sheet"
      >

            {/* Filter chips */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
              {['all', 'compound', 'accessory', 'conditioning'].map(f => {
                const isAct = catalogFilter === f;
                return (
                  <button 
                    key={f} 
                    style={{
                      flexShrink: 0,
                      background: isAct ? '#1C1C1E' : '#F2F2F7',
                      color: isAct ? '#FFFFFF' : '#1C1C1E',
                      border: 'none',
                      borderRadius: '100px',
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => setCatalogFilter(f)}
                  >
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                );
              })}
            </div>

            {/* Exercise list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {exerciseCatalog
                .filter(e => catalogFilter === 'all' || e.type === catalogFilter)
                .map(ex => {
                  const alreadyAdded = editingSheet?.exercises.some(e => e.exerciseId === ex.id);
                  return (
                    <button
                      key={ex.id}
                      disabled={alreadyAdded}
                      onClick={() => addExerciseToSheet(ex)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        width: '100%',
                        padding: '12px 14px',
                        background: alreadyAdded ? '#F2F2F7' : '#FFFFFF',
                        borderRadius: '14px',
                        border: '1px solid #E5E5EA',
                        cursor: alreadyAdded ? 'default' : 'pointer',
                        textAlign: 'left',
                        opacity: alreadyAdded ? 0.6 : 1,
                        transition: 'all 0.15s ease',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '8px',
                        background: alreadyAdded ? '#E5E5EA' : '#F2F2F7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {renderExerciseIcon(ex.type, 15)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E' }}>{ex.name}</div>
                        <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 2 }}>{ex.muscle} · {ex.type}</div>
                      </div>
                      {alreadyAdded ? (
                        <span style={{ 
                          fontSize: 9, 
                          fontWeight: 700, 
                          background: '#E5F6ED', 
                          color: '#2E9E47', 
                          padding: '2px 6px', 
                          borderRadius: '100px', 
                          letterSpacing: '0.03em',
                          animation: 'sheetsAddPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                        }}>
                          Added
                        </span>
                      ) : (
                        <Plus size={16} strokeWidth={2.4} color="#1C1C1E" />
                      )}
                    </button>
                  );
                })}
            </div>
      </Modal>

      {/* ===== DELETE CONFIRMATION ===== */}
      <Modal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        type="centered-alert"
      >
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: '#FFF0F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
          margin: '0 auto 12px'
        }}>
          <Trash2 size={22} strokeWidth={2.2} color="#E04F4F" />
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E', marginBottom: 6, margin: 0 }}>Delete this sheet?</h2>
        <p style={{ fontSize: 12, color: '#8E8E93', marginBottom: 20, lineHeight: 1.5, margin: '6px 0 20px' }}>
          This action cannot be undone.
          {activeSheet?.id === showDeleteConfirm && ' The active sheet will switch to your default.'}
        </p>
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <button 
            style={{ 
              flex: 1,
              background: '#F2F2F7',
              color: '#1C1C1E',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }} 
            onClick={() => setShowDeleteConfirm(null)}
          >
            Cancel
          </button>
          <button 
            style={{ 
              flex: 1,
              background: '#FFF0F0',
              color: '#E04F4F',
              border: '1px solid #FFD1D1',
              borderRadius: '12px',
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }} 
            onClick={() => handleDelete(showDeleteConfirm)}
          >
            <Trash2 size={12} strokeWidth={2.4} /> Delete
          </button>
        </div>
      </Modal>

      {/* ── Toast Notification ── */}
      {toast && (
        <div style={{
          position: 'fixed', 
          bottom: 100, 
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', 
          justifyContent: 'center', 
          zIndex: 9999,
          width: 'calc(100% - 32px)',
          maxWidth: 400,
        }}>
          <div style={{
            background: '#1C1C1E',
            color: '#FFFFFF', 
            padding: '12px 20px', 
            borderRadius: '20px', 
            fontSize: 13, 
            fontWeight: 600,
            boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
            display: 'flex', 
            alignItems: 'center', 
            gap: 10,
            lineHeight: 1.4,
          }}>
            {toast.type === 'success' ? (
              <Check size={16} strokeWidth={2.5} color="#2E9E47" />
            ) : (
              <AlertTriangle size={16} strokeWidth={2.5} color="#FFB300" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
