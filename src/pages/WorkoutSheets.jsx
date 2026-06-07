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
  GripVertical, Sparkles, Search
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
    @keyframes sheetsContentExpand {
      0%   { opacity: 0; transform: translateY(-10px); max-height: 0; margin-top: 0; padding-top: 0; overflow: hidden; }
      100% { opacity: 1; transform: translateY(0); max-height: 1500px; margin-top: 16px; padding-top: 16px; }
    }
    @keyframes sheetsExConfigExpand {
      0%   { opacity: 0; transform: translateY(-8px); max-height: 0; overflow: hidden; }
      100% { opacity: 1; transform: translateY(0); max-height: 500px; }
    }
    .sheet-btn {
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .sheet-btn:active {
      transform: scale(0.96);
      opacity: 0.85;
    }
    .sheet-btn:disabled {
      opacity: 0.4;
      pointer-events: none;
      transform: none !important;
    }
    .sheet-chip {
      transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .sheet-chip:active {
      transform: scale(0.92);
    }
    .modal-content::-webkit-scrollbar {
      display: none !important;
    }
    .ios-form-row {
      transition: background-color 0.2s ease;
    }
    .ios-form-row:focus-within {
      background-color: #F9F9FC;
    }
    .ios-form-row:focus-within label {
      color: #007AFF !important;
    }
    .ex-config-container {
      animation: sheetsExConfigExpand 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      overflow: hidden;
    }
  `;
  document.head.appendChild(sheet);
}

const exerciseCatalog = Object.values(defaultExercises).map(ex => ({
  id: ex.id,
  name: ex.name,
  muscle: ex.muscle,
  category: ex.category || 'strength',
  muscleGroup: ex.muscleGroup || 'legs',
  type: ex.type,
  icon: ex.icon || '💪'
}));

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
  squat: 10, deadlift: 11, bench: 12, ohp: 13,
  frontSquat: 14,
  row: 20, pullup: 21, inclineBench: 22, romanianDL: 23,
  legPress: 30, latPull: 31, tricepDip: 32,
  legCurl: 40, shoulderRaise: 41, facePull: 42, curl: 43, calfRaise: 44,
  plank: 50,
  kbSwing: 60, farmerWalk: 61, jumpRope: 62, bwCircuit: 63,
};

const TIER_LABELS = {
  1: 'Primary Compound', 2: 'Secondary Compound', 3: 'Accessory Compound',
  4: 'Isolation', 5: 'Core', 6: 'Conditioning',
};

const getTier = (exId) => {
  const p = EXERCISE_PRIORITY[exId];
  if (!p) return 4;
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

export default function WorkoutSheets({ isEmbedded = false }) {
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActive] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingSheet, setEditingSheet] = useState(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogCategory, setCatalogCategory] = useState('all');
  const [catalogMuscle, setCatalogMuscle] = useState('all');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [expandedSheet, setExpandedSheet] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [expandedExIdx, setExpandedExIdx] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [deletingSheetId, setDeletingSheetId] = useState(null);
  const handleFocus = useInputFocus();
  const { toast, show: showToast } = useToast();

  useModalLock(showEditor || showCatalog || !!showDeleteConfirm);

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    let loaded = getWorkoutSheets();
    if (loaded.length === 0) {
      defaultSheets.forEach(s => saveWorkoutSheet({ ...s }));
      loaded = getWorkoutSheets();
    }
    setSheets(loaded);
    setActive(getActiveSheet());
  }

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
    // Keep catalog open so animations can run and users can perform multiple consecutive additions.
    showToast(`Added ${catalogExercise.name}`);
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

  const renderExerciseIcon = (type, size = 16, color = "var(--text-primary)") => {
    if (type === 'compound') return <Dumbbell size={size} strokeWidth={2.4} color={color} />;
    if (type === 'conditioning') return <Zap size={size} strokeWidth={2.4} color={color} />;
    return <Sparkles size={size} strokeWidth={2.4} color={color} />;
  };

  const getAreaOrMuscleMatch = (ex, filter) => {
    if (filter === 'all') return true;
    const muscleGroup = (ex.muscleGroup || '').toLowerCase();
    const muscle = (ex.muscle || '').toLowerCase();
    const name = (ex.name || '').toLowerCase();

    if (filter === 'upper') {
      return ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'arms'].includes(muscleGroup) ||
             muscle.includes('chest') || muscle.includes('back') || muscle.includes('shoulder') ||
             muscle.includes('biceps') || muscle.includes('triceps') || muscle.includes('lats') ||
             muscle.includes('arms') || muscle.includes('delt') || muscle.includes('rotator');
    }
    if (filter === 'lower') {
      return ['legs', 'calves', 'quads', 'hamstrings'].includes(muscleGroup) ||
             muscle.includes('legs') || muscle.includes('quads') || muscle.includes('hamstrings') ||
             muscle.includes('glutes') || muscle.includes('calves') || muscle.includes('calf');
    }
    if (filter === 'chest') {
      return muscleGroup === 'chest' || muscle.includes('chest') || name.includes('pushup') || name.includes('bench') || name.includes('dip');
    }
    if (filter === 'back') {
      return muscleGroup === 'back' || muscle.includes('back') || muscle.includes('lats') || name.includes('pull') || name.includes('row');
    }
    if (filter === 'shoulders') {
      return muscleGroup === 'shoulders' || muscle.includes('shoulder') || muscle.includes('delt') || (name.includes('press') && !name.includes('bench'));
    }
    if (filter === 'biceps') {
      return muscleGroup === 'biceps' || muscle.includes('bicep') || name.includes('curl') || name.includes('chin-up');
    }
    if (filter === 'triceps') {
      return muscleGroup === 'triceps' || muscle.includes('tricep') || name.includes('pushdown') || name.includes('skull') || name.includes('dip');
    }
    if (filter === 'legs') {
      return muscleGroup === 'legs' || muscle.includes('legs') || muscle.includes('quad') || muscle.includes('hamstring') || muscle.includes('glute') || muscle.includes('calf') || muscle.includes('calves');
    }
    if (filter === 'core') {
      return muscleGroup === 'core' || muscle.includes('core') || muscle.includes('abs') || muscle.includes('oblique') || name.includes('plank') || name.includes('twist') || name.includes('raise');
    }
    return false;
  };

  return (
    <div 
      className={isEmbedded ? "" : "page-content"} 
      style={isEmbedded ? { 
        display: 'flex',
        flexDirection: 'column',
      } : { 
        paddingBottom: 'calc(var(--nav-height) + var(--safe-bottom) + 32px)', 
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      {!isEmbedded && (
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)', margin: 0 }}>
            Workout Sheets
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, letterSpacing: '-0.01em', margin: '4px 0 0' }}>
            Create, customize, and activate your weekly plans
          </p>
        </div>
      )}

      {/* Active Sheet Banner */}
      {activeSheet && (
        <div 
          style={{
            marginBottom: 24, 
            padding: '20px', 
            borderRadius: '20px',
            background: 'var(--accent-purple-light)', 
            display: 'flex', 
            flexDirection: 'column',
            border: '2px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {/* Banner Header Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', marginBottom: 14 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '12px',
              background: 'var(--accent-purple)',
              border: '2px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Zap size={20} strokeWidth={2.4} color="#FFFFFF" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Currently Active Plan</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 1, letterSpacing: '-0.01em' }}>{activeSheet.name}</div>
            </div>
          </div>

          {/* Statically Displayed Content */}
          <div 
            style={{
              borderTop: '2px solid var(--border)',
              paddingTop: 14,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {activeSheet.description && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {activeSheet.description}
              </div>
            )}

            {/* Exercise List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeSheet.exercises?.map((ex, i) => {
                const info = getExerciseInfo(ex.exerciseId);
                const type = getExerciseType(ex.exerciseId);
                return (
                  <div key={i} style={{
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 12,
                    padding: '10px 12px', 
                    background: 'var(--bg-card)', 
                    borderRadius: '12px',
                    border: '2px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                  }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '8px',
                      background: 'var(--bg-secondary)',
                      border: '1.5px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {renderExerciseIcon(type, 14, "var(--text-primary)")}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{info.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {ex.minSets || ex.sets || 3}{ex.maxSets ? `-${ex.maxSets}` : ''} × {ex.reps}{ex.amrap ? '+' : ''} · {ex.weight > 0 ? `${ex.weight}kg` : 'No weight'} · Rest {ex.restMinutes}m
                      </div>
                    </div>
                    {ex.amrap && (
                      <span style={{ 
                        fontSize: 8, 
                        fontWeight: 700, 
                        background: 'var(--warning-light)', 
                        color: 'var(--text-primary)', 
                        padding: '2px 6px', 
                        borderRadius: '100px', 
                        border: '1.5px solid var(--border)',
                        letterSpacing: '0.03em' 
                      }}>
                        AMRAP
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action Buttons inside banner */}
            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              <button 
                className="sheet-btn"
                style={{ 
                  flex: 1.5, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: 6,
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '2px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }} 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeactivate();
                }}
              >
                <RotateCcw size={14} strokeWidth={2.4} color="var(--text-primary)" /> Deactivate
              </button>

              {!activeSheet.isDefault && (
                <button 
                  className="sheet-btn"
                  style={{
                    width: 38,
                    height: 38,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-card)',
                    border: '2px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                  }} 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetDefault(activeSheet);
                  }} 
                  title="Set as default"
                >
                  <Star size={14} strokeWidth={2.4} color="var(--text-primary)" />
                </button>
              )}

              <button 
                className="sheet-btn"
                style={{
                  width: 38,
                  height: 38,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-card)',
                  border: '2px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                }} 
                onClick={(e) => {
                  e.stopPropagation();
                  openEditSheet(activeSheet);
                }}
                title="Edit Plan"
              >
                <Edit3 size={14} strokeWidth={2.4} color="var(--text-primary)" />
              </button>

              {sheets.length > 1 && (
                <button
                  className="sheet-btn"
                  style={{ 
                    width: 38,
                    height: 38,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-card)',
                    border: '2px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                  }} 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(activeSheet.id);
                  }}
                  title="Delete Plan"
                >
                  <Trash2 size={14} strokeWidth={2.4} color="var(--text-primary)" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sheets List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
        {sheets.filter(sheet => sheet.id !== activeSheet?.id).length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            background: 'var(--bg-card)',
            border: '2px dashed var(--border)',
            borderRadius: '20px',
            color: '#8E8E93',
            fontSize: 13,
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}>
            <Star size={24} strokeWidth={1.5} color="#C7C7CC" />
            <span>No other plans. Create a new plan using the button below.</span>
          </div>
        )}
        {sheets.filter(sheet => sheet.id !== activeSheet?.id).map(sheet => {
          const isActive = activeSheet?.id === sheet.id;
          const isExpanded = expandedSheet === sheet.id;
          return (
            <div 
              key={sheet.id} 
              style={{
                background: isActive ? 'var(--accent-blue-light)' : 'var(--bg-card)',
                borderRadius: '20px',
                border: '2px solid var(--border)',
                boxShadow: isActive ? 'var(--shadow-md)' : 'var(--shadow-sm)',
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
                      <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{sheet.name}</span>
                      {isActive && (
                        <span style={{ 
                          fontSize: 9, 
                          fontWeight: 700, 
                          background: 'var(--success-light)', 
                          color: 'var(--success)', 
                          padding: '2px 6px', 
                          borderRadius: '100px', 
                          border: '1.5px solid var(--border)',
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
                  background: 'var(--bg-secondary)',
                  border: '2.2px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {isExpanded ? <ChevronUp size={16} strokeWidth={2.4} color="var(--text-primary)" /> : <ChevronDown size={16} strokeWidth={2.4} color="var(--text-primary)" />}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div style={{
                  borderTop: '2px solid var(--border)',
                  marginTop: 12,
                  paddingTop: 12,
                  animation: 'sheetsContentExpand 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                  overflow: 'hidden',
                }}>
                  {sheet.description && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.45 }}>{sheet.description}</div>
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
                          padding: '12px 14px', 
                          background: isActive ? 'var(--bg-card)' : 'var(--bg-secondary)', 
                          borderRadius: '14px',
                          border: '2px solid var(--border)',
                          boxShadow: 'var(--shadow-sm)',
                        }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: '8px',
                            background: 'var(--bg-card)',
                            border: '1.5px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            {renderExerciseIcon(type, 16)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{info.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                              {ex.minSets || ex.sets || 3}{ex.maxSets ? `-${ex.maxSets}` : ''} × {ex.reps}{ex.amrap ? '+' : ''} · {ex.weight > 0 ? `${ex.weight}kg` : 'No weight'} · Rest {ex.restMinutes}m
                            </div>
                          </div>
                          {ex.amrap && (
                            <span style={{ 
                              fontSize: 9, 
                              fontWeight: 700, 
                              background: 'var(--warning-light)', 
                              color: 'var(--text-primary)', 
                              padding: '2px 6px', 
                              borderRadius: '100px', 
                              border: '1.5px solid var(--border)',
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
                        className="btn btn-primary"
                        style={{ 
                          flex: 1.5, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: 6,
                          background: 'var(--accent-blue)',
                          color: '#FFFFFF',
                          border: '2px solid var(--border)',
                          borderRadius: '12px',
                          boxShadow: 'var(--shadow-sm)',
                          padding: '10px 16px',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }} 
                        onClick={() => handleActivate(sheet)}
                      >
                        <Play size={14} strokeWidth={2.4} /> Activate
                      </button>
                    ) : (
                      <button 
                        className="btn btn-outline"
                        style={{ 
                          flex: 1.5, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: 6,
                          background: 'var(--bg-card)',
                          color: 'var(--danger)',
                          border: '2px solid var(--border)',
                          borderRadius: '12px',
                          boxShadow: 'var(--shadow-sm)',
                          padding: '10px 16px',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }} 
                        onClick={handleDeactivate}
                      >
                        <RotateCcw size={14} strokeWidth={2.4} /> Deactivate
                      </button>
                    )}
                    
                    {!sheet.isDefault && (
                      <button 
                        className="sheet-btn"
                        style={{
                          width: 38,
                          height: 38,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'var(--bg-card)',
                          border: '2px solid var(--border)',
                          borderRadius: '12px',
                          boxShadow: 'var(--shadow-sm)',
                          cursor: 'pointer',
                        }} 
                        onClick={() => handleSetDefault(sheet)} 
                        title="Set as default"
                      >
                        <Star size={14} strokeWidth={2.4} color="var(--text-primary)" />
                      </button>
                    )}

                    <button 
                      className="sheet-btn"
                      style={{
                        width: 38,
                        height: 38,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--bg-card)',
                        border: '2px solid var(--border)',
                        borderRadius: '12px',
                        boxShadow: 'var(--shadow-sm)',
                        cursor: 'pointer',
                      }} 
                      onClick={() => openEditSheet(sheet)}
                    >
                      <Edit3 size={14} strokeWidth={2.4} color="var(--text-primary)" />
                    </button>

                    {sheets.length > 1 && (
                      <button
                        className="sheet-btn"
                        style={{ 
                          width: 38,
                          height: 38,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'var(--bg-card)', 
                          color: 'var(--danger)',
                          border: '2px solid var(--border)',
                          borderRadius: '12px',
                          boxShadow: 'var(--shadow-sm)',
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
        className="btn btn-primary"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          background: 'var(--accent-purple)',
          color: '#FFFFFF',
          border: '2px solid var(--border)',
          borderRadius: '14px',
          padding: '14px 20px',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 16 }}>
            {/* Sheet Info Card — iOS Settings Grouped Table Style */}
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: '14px',
              border: '2px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-sm)',
              overflow: 'hidden',
            }}>
              {/* Row 1: Name */}
              <div className="ios-form-row" style={{
                padding: '12px 16px',
                borderBottom: '2px solid var(--border)',
              }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Sheet Name *</label>
                <input
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    padding: '4px 0',
                    fontSize: 14,
                    color: 'var(--text-primary)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder="e.g. Upper Body Power"
                  value={editingSheet.name}
                  onChange={e => setEditingSheet(p => ({ ...p, name: e.target.value }))}
                  onFocus={handleFocus}
                />
              </div>

              {/* Row 2: Description */}
              <div className="ios-form-row" style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-light)',
              }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Description</label>
                <input
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    padding: '4px 0',
                    fontSize: 14,
                    color: 'var(--text-primary)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder="Brief description (optional)"
                  value={editingSheet.description || ''}
                  onChange={e => setEditingSheet(p => ({ ...p, description: e.target.value }))}
                  onFocus={handleFocus}
                />
              </div>

              {/* Row 3: Grid of Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div className="ios-form-row" style={{
                  padding: '12px 16px',
                  borderRight: '1px solid var(--border-light)',
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    <Calendar size={11} strokeWidth={2.4} /> Start Date
                  </label>
                  <input
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      padding: '4px 0',
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    type="date"
                    value={editingSheet.startDate || ''}
                    onChange={e => setEditingSheet(p => ({ ...p, startDate: e.target.value }))}
                    onFocus={handleFocus}
                  />
                </div>
                <div className="ios-form-row" style={{
                  padding: '12px 16px',
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    <Calendar size={11} strokeWidth={2.4} /> End Date
                  </label>
                  <input
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      padding: '4px 0',
                      fontSize: 13,
                      color: 'var(--text-primary)',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContainer: 'space-between', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Exercises ({editingSheet.exercises.length})</span>
                {editingSheet.exercises.length >= 2 && (
                  <button
                    type="button"
                    className="sheet-btn"
                    style={{ 
                      background: 'var(--bg-card)', 
                      color: '#007AFF', 
                      fontSize: 11, 
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                       border: '2px solid var(--border)',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                    onClick={autoOrderExercises}
                  >
                    <Sparkles size={12} strokeWidth={2.4} /> Optimize Order
                  </button>
                )}
              </div>

              {editingSheet.exercises.length === 0 && (
                <div style={{ padding: '24px 16px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '16px', border: '2px dashed var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                  <Dumbbell size={28} strokeWidth={2.2} color="#8E8E93" style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 13, color: '#8E8E93', fontWeight: 500 }}>No exercises added yet</div>
                  <div style={{ fontSize: 11, color: '#AEAEB2', marginTop: 2 }}>Tap "Add Exercise" below</div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                        background: 'var(--bg-card)',
                        borderRadius: '14px',
                        border: '2px solid var(--border)',
                        overflow: 'hidden',
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        opacity: isDragging ? 0.4 : 1,
                        transform: isDragging ? 'scale(0.96)' : 'scale(1)',
                        boxShadow: isDragging ? '0 12px 24px rgba(0,0,0,0.08)' : 'var(--shadow-sm)',
                        animation: 'sheetsExInsert 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
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
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
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
                          className="sheet-btn"
                          style={{ 
                            width: 24, 
                            height: 24, 
                            borderRadius: '50%',
                            background: '#FFF0F0', 
                            color: '#FF3B30', 
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
                        <div className="ex-config-container" style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border-light)', background: '#F9F9FB' }}>
                          <div style={{ display: 'flex', gap: 4, marginTop: 10, marginBottom: 10 }}>
                            <button 
                              type="button" 
                              className="sheet-btn"
                              style={{ 
                                width: 28, 
                                height: 28, 
                                borderRadius: '8px',
                                background: 'var(--bg-card)',
                                border: '2px solid var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: 'var(--shadow-sm)',
                              }} 
                              onClick={() => moveExercise(i, -1)} 
                              disabled={i === 0}
                            >
                              <ChevronUp size={14} strokeWidth={2.4} color={i === 0 ? '#C7C7CC' : 'var(--text-primary)'} />
                            </button>
                            <button 
                              type="button" 
                              className="sheet-btn"
                              style={{ 
                                width: 28, 
                                height: 28, 
                                borderRadius: '8px',
                                background: 'var(--bg-card)',
                                border: '2px solid var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: 'var(--shadow-sm)',
                              }} 
                              onClick={() => moveExercise(i, 1)} 
                              disabled={i === editingSheet.exercises.length - 1}
                            >
                              <ChevronDown size={14} strokeWidth={2.4} color={i === editingSheet.exercises.length - 1 ? '#C7C7CC' : 'var(--text-primary)'} />
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
                                  background: 'var(--bg-card)', 
                                  border: '2px solid var(--border)', 
                                  borderRadius: '10px', 
                                  padding: '8px', 
                                  fontSize: 13, 
                                  textAlign: 'center',
                                  outline: 'none',
                                  color: 'var(--text-primary)',
                                  boxSizing: 'border-box',
                                  transition: 'border-color 0.2s',
                                  boxShadow: 'var(--shadow-sm)',
                                }}
                                value={ex.minSets || ex.sets || 3} 
                                onChange={e => updateExerciseInSheet(i, 'minSets', +e.target.value)} 
                                onFocus={(e) => {
                                  e.target.style.borderColor = 'var(--accent-purple)';
                                  handleFocus(e);
                                }}
                                onBlur={(e) => {
                                  e.target.style.borderColor = 'var(--border)';
                                }}
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
                                  background: 'var(--bg-card)', 
                                  border: '2px solid var(--border)', 
                                  borderRadius: '10px', 
                                  padding: '8px', 
                                  fontSize: 13, 
                                  textAlign: 'center',
                                  outline: 'none',
                                  color: 'var(--text-primary)',
                                  boxSizing: 'border-box',
                                  transition: 'border-color 0.2s',
                                  boxShadow: 'var(--shadow-sm)',
                                }}
                                value={ex.maxSets || ex.minSets || ex.sets || 5} 
                                onChange={e => updateExerciseInSheet(i, 'maxSets', +e.target.value)} 
                                onFocus={(e) => {
                                  e.target.style.borderColor = 'var(--accent-purple)';
                                  handleFocus(e);
                                }}
                                onBlur={(e) => {
                                  e.target.style.borderColor = 'var(--border)';
                                }}
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
                                  background: 'var(--bg-card)', 
                                  border: '2px solid var(--border)', 
                                  borderRadius: '10px', 
                                  padding: '8px', 
                                  fontSize: 13, 
                                  textAlign: 'center',
                                  outline: 'none',
                                  color: 'var(--text-primary)',
                                  boxSizing: 'border-box',
                                  transition: 'border-color 0.2s',
                                  boxShadow: 'var(--shadow-sm)',
                                }}
                                value={ex.reps} 
                                onChange={e => updateExerciseInSheet(i, 'reps', +e.target.value)} 
                                onFocus={(e) => {
                                  e.target.style.borderColor = 'var(--accent-purple)';
                                  handleFocus(e);
                                }}
                                onBlur={(e) => {
                                  e.target.style.borderColor = 'var(--border)';
                                }}
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
                                  background: 'var(--bg-card)', 
                                  border: '2px solid var(--border)', 
                                  borderRadius: '10px', 
                                  padding: '8px', 
                                  fontSize: 13, 
                                  textAlign: 'center',
                                  outline: 'none',
                                  color: 'var(--text-primary)',
                                  boxSizing: 'border-box',
                                  transition: 'border-color 0.2s',
                                  boxShadow: 'var(--shadow-sm)',
                                }}
                                placeholder="0" 
                                value={ex.weight || ''} 
                                onChange={e => updateExerciseInSheet(i, 'weight', +e.target.value)} 
                                onFocus={(e) => {
                                  e.target.style.borderColor = 'var(--accent-purple)';
                                  handleFocus(e);
                                }}
                                onBlur={(e) => {
                                  e.target.style.borderColor = 'var(--border)';
                                }}
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
                                  background: 'var(--bg-card)', 
                                  border: '2px solid var(--border)', 
                                  borderRadius: '10px', 
                                  padding: '8px', 
                                  fontSize: 13, 
                                  textAlign: 'center',
                                  outline: 'none',
                                  color: 'var(--text-primary)',
                                  boxSizing: 'border-box',
                                  transition: 'border-color 0.2s',
                                  boxShadow: 'var(--shadow-sm)',
                                }}
                                value={ex.restMinutes} 
                                onChange={e => updateExerciseInSheet(i, 'restMinutes', +e.target.value)} 
                                onFocus={(e) => {
                                  e.target.style.borderColor = 'var(--accent-purple)';
                                  handleFocus(e);
                                }}
                                onBlur={(e) => {
                                  e.target.style.borderColor = 'var(--border)';
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                              <button
                                type="button"
                                className="sheet-btn"
                                onClick={() => updateExerciseInSheet(i, 'amrap', !ex.amrap)}
                                style={{
                                  width: '100%',
                                  height: '37px',
                                  background: ex.amrap ? 'var(--accent-blue-light)' : 'var(--bg-card)',
                                  color: ex.amrap ? 'var(--accent-blue)' : 'var(--text-primary)',
                                  border: '2px solid var(--border)',
                                  borderRadius: '10px',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 6,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  boxShadow: 'var(--shadow-sm)'
                                }}
                              >
                                <Check size={12} strokeWidth={2.4} color={ex.amrap ? '#007AFF' : '#8E8E93'} />
                                AMRAP
                              </button>
                            </div>
                          </div>

                          <input
                            style={{
                              width: '100%',
                              background: 'var(--bg-card)',
                              border: '2px solid var(--border)',
                              borderRadius: '10px',
                              padding: '8px 10px',
                              fontSize: 12,
                              outline: 'none',
                              color: 'var(--text-primary)',
                              boxSizing: 'border-box',
                              transition: 'border-color 0.2s',
                              boxShadow: 'var(--shadow-sm)'
                            }}
                            placeholder="Notes (optional)"
                            value={ex.notes || ''} 
                            onChange={e => updateExerciseInSheet(i, 'notes', e.target.value)}
                            onFocus={(e) => {
                              e.target.style.borderColor = 'var(--accent-purple)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = 'var(--border)';
                            }}
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
                className="sheet-btn"
                style={{ 
                  marginTop: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  width: '100%',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '2px solid var(--border)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                }}
                onClick={() => setShowCatalog(true)}
              >
                <Plus size={14} strokeWidth={2.4} /> Add Exercise
              </button>
            </div>

            {/* Save Button */}
            <button
              className="sheet-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                width: '100%',
                background: editingSheet.name.trim() ? 'var(--text-primary)' : '#AEAEB2',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '14px',
                padding: '14px 20px',
                fontSize: 14,
                fontWeight: 600,
                cursor: editingSheet.name.trim() ? 'pointer' : 'default',
              }}
              onClick={handleSaveSheet}
              disabled={!editingSheet.name.trim()}
            >
              <Check size={16} strokeWidth={2.4} /> {editingSheet.id ? 'Save Changes' : 'Create Sheet'}
            </button>
          </div>
        </Modal>
      )}

      {/* ===== EXERCISE CATALOG MODAL ===== */}
      <Modal
        isOpen={showCatalog}
        onClose={() => setShowCatalog(false)}
        title="Add Exercise"
        type="bottom-sheet"
      >
        {/* Search and filters container (scrolls out of view) */}
        <div style={{
          position: 'relative',
          background: 'var(--bg-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          paddingTop: 12,
          paddingBottom: 12,
          borderBottom: '2px solid var(--border)',
          margin: '0 -20px 12px -20px',
          paddingLeft: 20,
          paddingRight: 20,
        }}>
          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <Search size={16} strokeWidth={2.4} color="#8E8E93" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search exercises..."
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                borderRadius: '10px',
                border: '2px solid var(--border)',
                background: 'var(--bg-card)',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
                boxShadow: 'var(--shadow-sm)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--accent-purple)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border)';
              }}
            />
            {catalogSearch && (
              <button
                onClick={() => setCatalogSearch('')}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#8E8E93',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={16} strokeWidth={2.4} />
              </button>
            )}
          </div>

          {/* Primary Category selector */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'strength', label: 'Strength' },
              { id: 'calisthenics', label: 'Calisthenics' },
              { id: 'cardio', label: 'Cardio' },
              { id: 'mobility', label: 'Mobility' }
            ].map(c => {
              const isAct = catalogCategory === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCatalogCategory(c.id)}
                  className="sheet-chip"
                  style={{
                    flexShrink: 0,
                    background: isAct ? 'var(--accent-blue)' : 'var(--bg-card)',
                    color: isAct ? 'var(--text-inverse)' : 'var(--text-primary)',
                    border: isAct ? 'none' : '2px solid var(--border)',
                    borderRadius: '100px',
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Secondary Muscle selector */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
            {[
              { id: 'all', label: 'All Areas' },
              { id: 'upper', label: 'Upper Body' },
              { id: 'lower', label: 'Lower Body' },
              { id: 'chest', label: 'Chest' },
              { id: 'back', label: 'Back' },
              { id: 'shoulders', label: 'Shoulder' },
              { id: 'biceps', label: 'Biceps' },
              { id: 'triceps', label: 'Triceps' },
              { id: 'legs', label: 'Legs' },
              { id: 'core', label: 'Core' }
            ].map(m => {
              const isAct = catalogMuscle === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setCatalogMuscle(m.id)}
                  className="sheet-chip"
                  style={{
                    flexShrink: 0,
                    background: isAct ? 'var(--accent-blue-light)' : 'var(--bg-card)',
                    color: isAct ? 'var(--accent-blue)' : 'var(--text-tertiary)',
                    border: isAct ? '2px solid var(--accent-blue)' : '2px solid var(--border)',
                    borderRadius: '100px',
                    padding: '5px 12px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Exercise list grouped by category */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(() => {
            const filtered = exerciseCatalog.filter(e => {
              const matchesSearch = !catalogSearch.trim() || 
                e.name.toLowerCase().includes(catalogSearch.toLowerCase()) || 
                e.muscle.toLowerCase().includes(catalogSearch.toLowerCase());
              const matchesCategory = catalogCategory === 'all' || e.category === catalogCategory;
              const matchesMuscle = getAreaOrMuscleMatch(e, catalogMuscle);
              return matchesSearch && matchesCategory && matchesMuscle;
            });

            const categoryGroups = [
              { id: 'strength', name: 'Strength Training', icon: '🏋️' },
              { id: 'calisthenics', name: 'Calisthenics & Bodyweight', icon: '🤸' },
              { id: 'cardio', name: 'Cardio & Conditioning', icon: '🏃' },
              { id: 'mobility', name: 'Mobility & Warm-up', icon: '🧘' }
            ];

            const grouped = categoryGroups.map(group => {
              const items = filtered.filter(e => e.category === group.id);
              return { ...group, items };
            }).filter(group => group.items.length > 0);

            if (grouped.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8E8E93' }}>
                  <AlertTriangle size={32} strokeWidth={2} style={{ marginBottom: 10, color: '#FF9500' }} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>No Exercises Found</div>
                  <div style={{ fontSize: 12, marginBottom: 14 }}>Try adjusting your search terms or filters.</div>
                  <button
                    className="sheet-btn"
                    onClick={() => {
                      setCatalogSearch('');
                      setCatalogCategory('all');
                      setCatalogMuscle('all');
                    }}
                    style={{
                      background: 'var(--bg-card)',
                      color: '#007AFF',
                      border: '2px solid var(--border)',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    Reset Filters
                  </button>
                </div>
              );
            }

            return grouped.map(group => (
              <div key={group.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Category Header */}
                <div style={{
                  position: 'sticky',
                  top: 40,
                  background: 'var(--bg-secondary)',
                  zIndex: 5,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#8E8E93',
                  padding: '12px 20px 6px 20px',
                  borderBottom: '2px solid var(--border)',
                  margin: '0 -20px 8px -20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <span>{group.icon}</span>
                  <span>{group.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 500, color: '#C7C7CC' }}>({group.items.length})</span>
                </div>

                {/* Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.items.map(ex => {
                    const addedCount = editingSheet?.exercises.filter(e => e.exerciseId === ex.id).length || 0;
                    const alreadyAdded = addedCount > 0;
                    return (
                      <button
                        key={ex.id}
                        onClick={() => addExerciseToSheet(ex)}
                        className="sheet-btn"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          width: '100%',
                          padding: '12px 14px',
                          background: alreadyAdded ? 'var(--success-light)' : 'var(--bg-card)',
                          borderRadius: '14px',
                          border: '2px solid var(--border)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          boxSizing: 'border-box',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '8px',
                          background: 'var(--bg-tertiary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16,
                        }}>
                          {ex.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{ex.name}</div>
                          <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 2 }}>
                            {ex.muscle} · <span style={{ textTransform: 'capitalize' }}>{ex.category}</span>
                          </div>
                        </div>
                        {alreadyAdded ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                              {addedCount}× Added
                            </span>
                            <Plus size={16} strokeWidth={2.4} color="var(--text-primary)" />
                          </div>
                        ) : (
                          <Plus size={16} strokeWidth={2.4} color="var(--text-primary)" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
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
          <Trash2 size={22} strokeWidth={2.2} color="#FF3B30" />
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, margin: 0 }}>Delete this sheet?</h2>
        <p style={{ fontSize: 12, color: '#8E8E93', marginBottom: 20, lineHeight: 1.5, margin: '6px 0 20px' }}>
          This action cannot be undone.
          {activeSheet?.id === showDeleteConfirm && ' The active sheet will switch to your default.'}
        </p>
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <button 
            className="sheet-btn"
            style={{ 
              flex: 1,
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '2px solid var(--border)',
              borderRadius: '12px',
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
            }} 
            onClick={() => setShowDeleteConfirm(null)}
          >
            Cancel
          </button>
          <button 
            className="sheet-btn"
            style={{ 
              flex: 1,
              background: '#FFF0F0',
              color: '#FF3B30',
              border: '2px solid #FFD1D1',
              borderRadius: '12px',
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              boxShadow: 'var(--shadow-sm)',
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
            background: 'var(--text-primary)',
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
              <Check size={16} strokeWidth={2.5} color="#34C759" />
            ) : (
              <AlertTriangle size={16} strokeWidth={2.5} color="#FF9500" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
