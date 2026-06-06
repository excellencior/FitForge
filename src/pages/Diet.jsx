import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Modal from '../components/Modal';
import {
  Plus, Search, X, Trash2, ChevronDown, ChevronUp, Droplets, AlertTriangle,
  Sun, CloudSun, Moon, Cookie, Zap, Circle, Star, Check, ChevronLeft, ChevronRight
} from 'lucide-react';
import foods, { foodCategories } from '../data/foods';
import { getDietByDate, saveDietLog, removeDietEntry, getToday, getSettings, getDietLogs } from '../utils/storage';
import { useModalLock, useInputFocus, useDebounce, useToast } from '../utils/ux';

/* ──────────────────── inject keyframes (once) ──────────────────── */
const KEYFRAMES_ID = 'diet-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(KEYFRAMES_ID)) {
  const sheet = document.createElement('style');
  sheet.id = KEYFRAMES_ID;
  sheet.textContent = `

    @keyframes dietToastSlideUp {
      from { transform: translateY(24px) scale(0.95); opacity: 0; }
      to   { transform: translateY(0) scale(1);       opacity: 1; }
    }
    @keyframes dietPopIn {
      0%   { transform: scale(0.6); opacity: 0; }
      60%  { transform: scale(1.15); }
      100% { transform: scale(1);   opacity: 1; }
    }
    @keyframes dietRingDraw {
      from { stroke-dasharray: 0 999; }
    }
    @keyframes dietRowFlash {
      0%   { opacity: 1; transform: scale(1); max-height: 80px; padding-top: 8px; padding-bottom: 8px; border-bottom-width: 0.5px; overflow: hidden; }
      100% { opacity: 0; transform: scale(0.95); max-height: 0; padding-top: 0; padding-bottom: 0; margin: 0; border: none; overflow: hidden; }
    }
    @keyframes dietDelBtnAnim {
      0%   { transform: scale(1); color: #C7C7CC; }
      50%  { transform: scale(1.4) rotate(-30deg); color: #FF3B30; }
      100% { transform: scale(0); opacity: 0; }
    }
    @keyframes dietRowInsert {
      0%   { opacity: 0; transform: translateY(-10px) scale(0.97); max-height: 0; padding-top: 0; padding-bottom: 0; overflow: hidden; }
      100% { opacity: 1; transform: translateY(0) scale(1); max-height: 100px; padding-top: 8px; padding-bottom: 8px; }
    }
    @keyframes dietMealExpand {
      from { opacity: 0; max-height: 0; }
      to   { opacity: 1; max-height: 1000px; }
    }
    @keyframes dietStarPop {
      0%   { transform: scale(1); }
      50%  { transform: scale(1.35); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(sheet);
}

/* ──────────────────── helpers ──────────────────── */
const fmtDate = (d) => {
  const [year, month, day] = d.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-BD', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const shiftDate = (d, n) => {
  const [year, month, day] = d.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + n);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

/** Auto-detect meal based on current time of day */
const detectMeal = () => {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snacks';
};

// Favorites are now dynamically calculated from timeline history in getDietLogs()

const MEAL_ICONS = {
  breakfast: <Sun size={18} strokeWidth={2.2} />,
  lunch: <CloudSun size={18} strokeWidth={2.2} />,
  dinner: <Moon size={18} strokeWidth={2.2} />,
  snacks: <Cookie size={18} strokeWidth={2.2} />,
};

const MEALS = [
  { key: 'breakfast', label: 'Breakfast', labelbn: 'সকালের নাস্তা' },
  { key: 'lunch', label: 'Lunch', labelbn: 'দুপুরের খাবার' },
  { key: 'dinner', label: 'Dinner', labelbn: 'রাতের খাবার' },
  { key: 'snacks', label: 'Snacks', labelbn: 'নাস্তা' },
];

const MULTIPLIERS = [0.5, 1, 1.5, 2, 3];

/** Category → color map for the small dot in the modal food list */
const CAT_COLORS = {
  rice_bread: '#FF9500',
  fish: '#007AFF',
  meat: '#FF3B30',
  egg_dairy: '#FFCC00',
  dal_legume: '#8E8E93',
  vegetable: '#34C759',
  fruit: '#AF52DE',
  snack: '#FF6482',
  drink: '#5AC8FA',
  supplement: '#5856D6',
};

/* ──────────────────── component ──────────────────── */
export default function Diet() {
  const settings = getSettings();
  const [date, setDate] = useState(getToday());
  const [entries, setEntries] = useState([]);
  const [expanded, setExpanded] = useState({ breakfast: true, lunch: true, dinner: true, snacks: true });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMeal, setModalMeal] = useState('breakfast');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [multipliers, setMultipliers] = useState({});
  const [expandedFoodId, setExpandedFoodId] = useState(null);
  const [water, setWater] = useState(0);
  const [flashId, setFlashId] = useState(null); // for delete flash
  const [lastWaterIdx, setLastWaterIdx] = useState(-1); // for water popIn

  const searchInputRef = useRef(null);
  const onFocusInput = useInputFocus();
  const debounceAdd = useDebounce(450);
  const { toast, show: showToast } = useToast();

  /* lock background scroll when modal is open */
  useModalLock(modalOpen);

  /* targets from settings */
  const targets = useMemo(() => ({
    calories: settings.calorieTarget || 2900,
    protein: settings.proteinTarget || 160,
    carbs: settings.carbsTarget || 360,
    fat: settings.fatTarget || 80,
  }), [settings.calorieTarget, settings.proteinTarget, settings.carbsTarget, settings.fatTarget]);
  
  const waterTarget = 12;

  /* memoize today to prevent running layout helpers repeatedly */
  const today = useMemo(() => getToday(), []);

  /* load entries for selected date */
  useEffect(() => {
    setEntries(getDietByDate(date));
    const storedWater = localStorage.getItem(`fitforge_water_${date}`);
    setWater(storedWater ? Number(storedWater) : 0);
    setLastWaterIdx(-1);
  }, [date]);

  /* computed totals */
  const totals = useMemo(() => entries.reduce((a, e) => ({
    calories: a.calories + (e.calories || 0),
    protein: a.protein + (e.protein || 0),
    carbs: a.carbs + (e.carbs || 0),
    fat: a.fat + (e.fat || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 }), [entries]);

  /* meals grouped */
  const mealEntries = useMemo(() => {
    const grouped = { breakfast: [], lunch: [], dinner: [], snacks: [] };
    entries.forEach(e => {
      if (grouped[e.meal]) grouped[e.meal].push(e);
    });
    return grouped;
  }, [entries]);


  /* protein alert threshold */
  const isToday = date === today;
  const showProteinWarning = useMemo(() => {
    const h = new Date().getHours();
    return isToday && h >= 17 && totals.protein < targets.protein * 0.5;
  }, [isToday, totals.protein, targets.protein]);

  /* filtered food list for modal */
  const filteredFoods = useMemo(() => {
    let list = foods;
    if (catFilter !== 'all') list = list.filter(f => f.category === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.namebn.includes(q) ||
        f.category.includes(q)
      );
    }
    return list;
  }, [search, catFilter]);

  /* actions */
  const handleAdd = useCallback((food, meal) => {
    if (!debounceAdd()) return;
    let mult = multipliers[food.id];
    if (mult === undefined || mult === '' || isNaN(mult) || mult <= 0) {
      mult = 1;
    }
    const entry = {
      foodId: food.id,
      name: food.name,
      namebn: food.namebn,
      meal,
      serving: food.serving,
      multiplier: mult,
      calories: Math.round(food.calories * mult),
      protein: Math.round(food.protein * mult * 10) / 10,
      carbs: Math.round(food.carbs * mult * 10) / 10,
      fat: Math.round(food.fat * mult * 10) / 10,
      date,
    };
    saveDietLog(entry);
    setEntries(getDietByDate(date));
    setMultipliers(p => ({ ...p, [food.id]: 1 }));
    showToast(`Added ${food.namebn || food.name}`);
  }, [multipliers, date, debounceAdd, showToast]);

  const handleRemove = (id, name) => {
    setFlashId(id);
    showToast(`Removed ${name}`, 'error');
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
    setTimeout(() => {
      removeDietEntry(id);
      setEntries(getDietByDate(date));
      setFlashId(null);
    }, 280);
  };

  const openModal = (mealKey) => {
    setModalMeal(mealKey);
    setSearch('');
    setCatFilter('all');
    setMultipliers({});
    setModalOpen(true);
  };

  const addWater = () => {
    const next = Math.min(water + 1, 20);
    setLastWaterIdx(next - 1);
    setWater(next);
    localStorage.setItem(`fitforge_water_${date}`, next);
  };

  const removeWater = () => {
    const next = Math.max(water - 1, 0);
    setLastWaterIdx(-1);
    setWater(next);
    localStorage.setItem(`fitforge_water_${date}`, next);
  };

  /* calorie ring math — guard against divide-by-zero */
  const calPct = targets.calories > 0 ? Math.min(totals.calories / targets.calories, 1) : 0;
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const dash = calPct * circ;

  return (
    <div className="page-content" style={s.page}>

      {/* ── Toast Notification (positioned elegantly above bottom navigation) ── */}
      {toast && (
        <div key={toast.id} style={s.toast}>
          <div style={{
            ...s.toastInner,
            background: toast.type === 'success' ? '#34C759' : '#FF3B30',
          }}>
            {toast.type === 'success' ? <Check size={14} strokeWidth={2.5} /> : <X size={14} strokeWidth={2.5} />}
            {toast.message}
          </div>
        </div>
      )}

      {/* ── Protein Warning Banner ── */}
      {showProteinWarning && (
        <div style={s.warning}>
          <AlertTriangle size={18} color="#FF9500" strokeWidth={2.2} />
          <span style={s.warningText}>Low on protein today! Consider adding boiled eggs, chicken breast, or dal.</span>
        </div>
      )}

      {/* ── Header / Date Navigator ── */}
      <div style={s.dateNav}>
        <button style={s.dateBtn} onClick={() => setDate(shiftDate(date, -1))}>
          <ChevronLeft size={20} strokeWidth={2.2} />
        </button>
        <div style={s.dateLabel}>
          <span style={s.dateText}>{fmtDate(date)}</span>
          {isToday && <span style={s.dateBadge}>Today</span>}
        </div>
        <button
          style={{ ...s.dateBtn, ...(date >= today ? s.dateBtnDisabled : {}) }}
          onClick={() => setDate(shiftDate(date, 1))}
          disabled={date >= today}
        >
          <ChevronRight size={20} strokeWidth={2.2} />
        </button>
      </div>

      {/* ── Daily Summary Card ── */}
      <div style={s.summaryCard}>
        <div style={s.summaryTop}>
          {/* Calorie Ring */}
          <div style={s.ringWrap}>
            <svg viewBox="0 0 120 120" style={s.ringSvg}>
              <circle cx="60" cy="60" r={radius} fill="none" stroke="#F2F2F7" strokeWidth="9" />
              <circle
                cx="60" cy="60" r={radius}
                fill="none"
                stroke="#007AFF"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                transform="rotate(-90 60 60)"
                style={{
                  transition: 'stroke-dasharray 0.5s cubic-bezier(0.1, 0.76, 0.55, 0.94)',
                  animation: 'dietRingDraw 0.8s ease-out',
                }}
              />
            </svg>
            <div style={s.ringInner}>
              <span style={s.ringVal}>{totals.calories}</span>
              <span style={s.ringUnit}>/ {targets.calories}</span>
              <span style={s.ringLabel}>kcal</span>
            </div>
          </div>

          {/* Macro Progress Grid */}
          <div style={s.macros}>
            <MacroRow label="Protein" value={totals.protein} target={targets.protein} unit="g" color="#007AFF" />
            <MacroRow label="Carbs" value={totals.carbs} target={targets.carbs} unit="g" color="#FF9500" />
            <MacroRow label="Fat" value={totals.fat} target={targets.fat} unit="g" color="#FF3B30" />
          </div>
        </div>
        
        <div style={s.remaining}>
          {totals.calories < targets.calories
            ? <span>{targets.calories - totals.calories} kcal left to reach target</span>
            : <span style={s.overText}>Exceeded target by {totals.calories - targets.calories} kcal</span>}
        </div>
      </div>



      {/* ── Meal Cards ── */}
      <div style={s.mealList}>
        {MEALS.map(meal => {
          const items = mealEntries[meal.key] || [];
          const mealCal = items.reduce((sum, e) => sum + e.calories, 0);
          const isOpen = expanded[meal.key];
          return (
            <div key={meal.key} style={s.mealCard}>
              <button style={s.mealHeader} onClick={() => setExpanded(p => ({ ...p, [meal.key]: !p[meal.key] }))}>
                <div style={s.mealLeft}>
                  <span style={s.mealIcon}>{MEAL_ICONS[meal.key]}</span>
                  <div>
                    <span style={s.mealTitle}>{meal.label}</span>
                    <span style={s.mealTitleBn}>{meal.labelbn}</span>
                  </div>
                </div>
                <div style={s.mealRight}>
                  <span style={s.mealCal}>{mealCal} kcal</span>
                  {isOpen ? <ChevronUp size={16} strokeWidth={2.2} /> : <ChevronDown size={16} strokeWidth={2.2} />}
                </div>
              </button>

              {isOpen && (
                <div style={s.mealBody}>
                  {items.length === 0 ? (
                    <p style={s.mealEmpty}>No logs for this meal</p>
                  ) : (
                    <div style={s.foodRows}>
                      {items.map(item => (
                        <div
                          key={item.id}
                          style={{
                            ...s.foodItem,
                            ...(flashId === item.id ? { animation: 'dietRowFlash 0.28s cubic-bezier(0.4, 0, 0.2, 1) forwards' } : {}),
                          }}
                        >
                          <div style={s.foodInfo}>
                            <span style={s.foodName}>{item.namebn || item.name}</span>
                            <span style={s.foodMeta}>
                              {item.multiplier !== 1 && `${item.multiplier}× · `}
                              {item.calories} kcal · P {item.protein}g · C {item.carbs}g
                            </span>
                          </div>
                          <button 
                            style={{
                              ...s.foodDel,
                              ...(flashId === item.id ? { animation: 'dietDelBtnAnim 0.28s cubic-bezier(0.4, 0, 0.2, 1) forwards' } : {}),
                            }} 
                            onClick={() => handleRemove(item.id, item.namebn || item.name)}
                          >
                            <Trash2 size={15} strokeWidth={2} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button style={s.addBtn} onClick={() => openModal(meal.key)}>
                    <Plus size={15} strokeWidth={2.2} /> Add to {meal.label}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Hydration Card ── */}
      <div style={s.hydrationCard}>
        <div style={s.hydrationHeader}>
          <div style={s.hydrationLeft}>
            <div style={s.waterIconBox}><Droplets size={18} color="#007AFF" strokeWidth={2.2} /></div>
            <div>
              <span style={s.hydrationTitle}>Hydration Tracker</span>
              <span style={s.hydrationSub}>{water} / {waterTarget} glasses · {(water * 0.25).toFixed(2)}L</span>
            </div>
          </div>
          <div style={s.hydrationBtns}>
            <button style={{ ...s.waterBtn, ...s.waterBtnMinus, ...(water <= 0 ? s.waterBtnDisabled : {}) }} onClick={removeWater} disabled={water <= 0}>−</button>
            <button style={{ ...s.waterBtn, ...s.waterBtnPlus }} onClick={addWater}>+</button>
          </div>
        </div>

        <div style={s.waterGlasses}>
          {Array.from({ length: waterTarget }, (_, i) => (
            <div
              key={i}
              style={{
                ...s.glass,
                ...(i < water ? s.glassFilled : {}),
                ...(i === lastWaterIdx ? { animation: 'dietPopIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)' } : {}),
              }}
            >
              <Circle
                size={8}
                fill={i < water ? '#007AFF' : '#C7C7CC'}
                color={i < water ? '#007AFF' : '#C7C7CC'}
              />
            </div>
          ))}
        </div>

        <div style={s.waterBarWrap}>
          <div style={{ ...s.waterBar, width: `${Math.min(water / waterTarget * 100, 100)}%` }} />
        </div>
      </div>

      {/* ── Floating Food Search Modal ── */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', color: 'var(--accent-blue)' }}>{MEAL_ICONS[modalMeal]}</span>
              <span>Add to ${MEALS.find(m => m.key === modalMeal)?.label}</span>
            </span>
          }
          type="bottom-sheet"
        >

            {/* Search Box - no autofocus to prevent keyboard obstruction */}
            <div style={s.modalSearchWrap}>
              <Search size={16} strokeWidth={2.2} style={s.modalSearchIcon} />
              <input
                ref={searchInputRef}
                style={s.modalSearchInput}
                type="text"
                placeholder="Search food... (e.g. ভাত, chicken)"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={onFocusInput}
              />
              {search && (
                <button style={s.modalSearchClear} onClick={() => setSearch('')}>
                  <X size={15} strokeWidth={2.2} />
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div style={s.catChips}>
              <button
                style={{ ...s.catChip, ...(catFilter === 'all' ? s.catChipActive : {}) }}
                onClick={() => setCatFilter('all')}
              >
                All
              </button>
              {foodCategories.map(c => (
                <button
                  key={c.id}
                  style={{ ...s.catChip, ...(catFilter === c.id ? s.catChipActive : {}) }}
                  onClick={() => setCatFilter(c.id)}
                >
                  <span style={{ ...s.catDot, background: CAT_COLORS[c.id] || '#8E8E93' }} />
                  {c.name}
                </button>
              ))}
            </div>

            {/* Scrollable Food List */}
            <div style={s.modalList}>
              {filteredFoods.length === 0 ? (
                <p style={s.modalEmpty}>No matching foods found</p>
              ) : (
                filteredFoods.map(food => {
                  const mult = multipliers[food.id] || 1;
                  return (
                    <div key={food.id} style={s.modalItem}>
                      <div style={s.modalItemTop}>
                        <span style={{ ...s.modalItemDot, background: CAT_COLORS[food.category] || '#8E8E93' }} />
                        <div
                          style={s.modalItemInfo}
                          onClick={() => setExpandedFoodId(expandedFoodId === food.id ? null : food.id)}
                        >
                          <div style={s.modalItemNameRow}>
                            <span style={s.modalItemName}>{food.namebn}</span>
                            {mult !== 1 && (
                              <span style={s.modalItemMultBadge}>{mult}×</span>
                            )}
                          </div>
                          <span style={s.modalItemMeta}>
                            {food.name} · {food.serving} · {Math.round(food.calories * mult)} kcal · P {Math.round(food.protein * mult * 10) / 10}g
                          </span>
                        </div>
                        
                        {/* Minimalist circular Gray Add button instead of unappealing blue button */}
                        <button
                          style={s.modalAddBtn}
                          onClick={() => handleAdd(food, modalMeal)}
                        >
                          <Plus size={16} strokeWidth={2.5} />
                        </button>
                      </div>

                      {/* Expanded Details & Multipliers */}
                      {expandedFoodId === food.id && (
                        <div style={s.expandedContent}>
                          {/* Macro Details Grid - never cut off by width */}
                          <div style={s.macroGrid}>
                            <div style={s.macroDetailCellFull}>
                              <span style={s.macroDetailLabel}>Serving Size</span>
                              <span style={s.macroDetailVal}>{food.serving}</span>
                            </div>
                            <div style={s.macroDetailCell}>
                              <span style={s.macroDetailLabel}>Calories</span>
                              <span style={{ ...s.macroDetailVal, color: '#1C1C1E', fontWeight: 700 }}>
                                {Math.round(food.calories * mult)} kcal
                              </span>
                            </div>
                            <div style={s.macroDetailCell}>
                              <span style={s.macroDetailLabel}>Protein</span>
                              <span style={{ ...s.macroDetailVal, color: '#007AFF' }}>
                                {Math.round(food.protein * mult * 10) / 10}g
                              </span>
                            </div>
                            <div style={s.macroDetailCell}>
                              <span style={s.macroDetailLabel}>Carbohydrates</span>
                              <span style={{ ...s.macroDetailVal, color: '#FF9500' }}>
                                {Math.round(food.carbs * mult * 10) / 10}g
                              </span>
                            </div>
                            <div style={s.macroDetailCell}>
                              <span style={s.macroDetailLabel}>Fat</span>
                              <span style={{ ...s.macroDetailVal, color: '#FF3B30' }}>
                                {Math.round(food.fat * mult * 10) / 10}g
                              </span>
                            </div>
                          </div>

                          <div style={s.multLabel}>Serving Multiplier:</div>
                          <div style={s.multRow}>
                            {MULTIPLIERS.map(m => (
                              <button
                                key={m}
                                style={{ ...s.multBtn, ...(mult === m ? s.multBtnActive : {}) }}
                                onClick={() => setMultipliers(p => ({ ...p, [food.id]: m }))}
                              >
                                {m}×
                              </button>
                            ))}
                          </div>

                          {/* Custom Serving Multiplier Input */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                            <span style={{ fontSize: 12, color: '#636366', fontWeight: 600 }}>Custom Portion:</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.1"
                              min="0.1"
                              value={multipliers[food.id] !== undefined ? multipliers[food.id] : ''}
                              onChange={e => {
                                const val = parseFloat(e.target.value);
                                setMultipliers(p => ({ ...p, [food.id]: isNaN(val) ? '' : val }));
                              }}
                              onFocus={onFocusInput}
                              placeholder="1.0"
                              style={{
                                width: 70,
                                padding: '6px 10px',
                                border: '1px solid #E5E5EA',
                                borderRadius: 8,
                                background: '#FFFFFF',
                                fontSize: 13,
                                color: '#1C1C1E',
                                fontWeight: '600',
                                textAlign: 'center',
                                outline: 'none'
                              }}
                            />
                            <span style={{ fontSize: 12, color: '#8E8E93', fontWeight: '500' }}>servings</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Modal>
        )}
    </div>
  );
}

/* ──────────────────── sub-components ──────────────────── */
function MacroRow({ label, value, target, unit, color }) {
  const pct = target > 0 ? Math.min(value / target * 100, 100) : 0;
  return (
    <div style={s.macro}>
      <div style={s.macroHead}>
        <span style={s.macroLabel}>{label}</span>
        <span style={s.macroVal}>
          {Math.round(value)}{unit} <span style={s.macroTarget}>/ {target}{unit}</span>
        </span>
      </div>
      <div style={s.macroTrack}>
        <div style={{ ...s.macroFill, width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/* ──────────────────── styles ──────────────────── */
const font = "'Google Sans', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";

const s = {
  page: {
    maxWidth: 480,
    margin: '0 auto',
    fontFamily: font,
    letterSpacing: '-0.01em',
    paddingBottom: 'calc(var(--nav-height) + var(--safe-bottom) + 32px)', // prevent obstruction of last card
  },

  /* ── Elegant Toast Alert ── */
  toast: {
    position: 'fixed',
    bottom: 'calc(var(--nav-height) + var(--safe-bottom) + 16px)', // perfectly sits above bottom nav bar
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    zIndex: 2000,
    pointerEvents: 'none',
    animation: 'dietToastSlideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  toastInner: {
    padding: '10px 20px',
    borderRadius: 24,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 600,
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },

  /* ── Warning Banner ── */
  warning: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#FFF9E6',
    color: '#B7791F',
    padding: '12px 14px',
    borderRadius: 14,
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 16,
    lineHeight: 1.45,
    border: '1px solid rgba(255, 149, 0, 0.1)',
  },
  warningText: {
    flex: 1,
  },

  /* ── Date Navigator ── */
  dateNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateBtn: {
    width: 40,
    height: 40,
    background: '#FFFFFF',
    border: '1px solid #E5E5EA',
    borderRadius: 12,
    color: '#3A3A3C',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    transition: 'all 0.15s ease',
  },
  dateBtnDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
  },
  dateLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  dateText: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1C1C1E',
  },
  dateBadge: {
    fontSize: 9,
    fontWeight: 700,
    color: '#FFFFFF',
    background: '#007AFF',
    padding: '1px 8px',
    borderRadius: 10,
    letterSpacing: '0.4px',
    textTransform: 'uppercase',
  },

  /* ── Daily Summary Card ── */
  summaryCard: {
    background: '#FFFFFF',
    borderRadius: 18,
    border: '1px solid #E5E5EA',
    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
    padding: 16,
    marginBottom: 16,
  },
  summaryTop: {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
  },
  ringWrap: {
    position: 'relative',
    width: 110,
    height: 110,
    flexShrink: 0,
  },
  ringSvg: {
    width: '100%',
    height: '100%',
  },
  ringInner: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringVal: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1C1C1E',
    lineHeight: 1,
  },
  ringUnit: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: 500,
    marginTop: 1,
  },
  ringLabel: {
    fontSize: 9,
    color: '#8E8E93',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    marginTop: 2,
  },
  macros: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  macro: {},
  macroHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  macroLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#3A3A3C',
  },
  macroVal: {
    fontSize: 11,
    fontWeight: 600,
    color: '#1C1C1E',
  },
  macroTarget: {
    fontWeight: 400,
    color: '#8E8E93',
  },
  macroTrack: {
    height: 5,
    background: '#F2F2F7',
    borderRadius: 4,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.4s cubic-bezier(0.1, 0.76, 0.55, 0.94)',
  },
  remaining: {
    textAlign: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid #F2F2F7',
    fontSize: 12,
    fontWeight: 500,
    color: '#8E8E93',
  },
  overText: {
    color: '#FF3B30',
    fontWeight: 600,
  },

  /* ── Section Title ── */
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 13,
    fontWeight: 600,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    margin: '0 0 8px 4px',
  },
  sectionTitleIcon: {
    display: 'flex',
    alignItems: 'center',
  },

  /* ── Favorites Section ── */
  favSection: {
    marginBottom: 16,
  },
  favChips: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 4,
    scrollbarWidth: 'none',
    WebkitOverflowScrolling: 'touch',
  },
  favChip: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
    background: '#FFFFFF',
    border: '1px solid #E5E5EA',
    borderRadius: 12,
    padding: '8px 14px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: font,
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  },
  favName: {
    fontSize: 12,
    fontWeight: 600,
    color: '#1C1C1E',
    whiteSpace: 'nowrap',
    maxWidth: 90,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  favCal: {
    fontSize: 9,
    color: '#8E8E93',
    fontWeight: 500,
  },

  /* ── Meal Logs ── */
  mealList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginBottom: 16,
  },
  mealCard: {
    background: '#FFFFFF',
    borderRadius: 16,
    border: '1px solid #E5E5EA',
    boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
    overflow: 'hidden',
  },
  mealHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '12px 14px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: font,
  },
  mealLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  mealIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 10,
    background: '#F2F2F7',
    color: '#3A3A3C',
    flexShrink: 0,
  },
  mealTitle: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: '#1C1C1E',
    textAlign: 'left',
  },
  mealTitleBn: {
    display: 'block',
    fontSize: 10,
    color: '#8E8E93',
    textAlign: 'left',
    marginTop: 1,
  },
  mealRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#AEAEB2',
  },
  mealCal: {
    fontSize: 13,
    fontWeight: 600,
    color: '#007AFF',
  },
  mealBody: {
    padding: '0 14px 12px',
    borderTop: '0.5px solid #F2F2F7',
    animation: 'dietMealExpand 0.25s ease',
    overflow: 'hidden',
  },
  mealEmpty: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    padding: '8px 0',
    margin: 0,
  },
  foodRows: {
    display: 'flex',
    flexDirection: 'column',
  },
  foodItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '0.5px solid #F2F2F7',
    animation: 'dietRowInsert 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  },
  foodInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
  },
  foodName: {
    fontSize: 13,
    fontWeight: 500,
    color: '#1C1C1E',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  foodMeta: {
    fontSize: 10.5,
    color: '#8E8E93',
    marginTop: 1.5,
  },
  foodDel: {
    background: 'none',
    border: 'none',
    color: '#C7C7CC',
    cursor: 'pointer',
    padding: 8,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    width: '100%',
    padding: '10px',
    marginTop: 8,
    border: 'none',
    borderRadius: 10,
    background: '#F2F2F7',
    color: '#007AFF',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: font,
    transition: 'background 0.15s ease',
  },

  /* ── Hydration Card ── */
  hydrationCard: {
    background: '#FFFFFF',
    borderRadius: 16,
    border: '1px solid #E5E5EA',
    boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
    padding: 14,
    marginBottom: 16,
  },
  hydrationHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  hydrationLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  waterIconBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 10,
    background: '#E5F1FF',
    flexShrink: 0,
  },
  hydrationTitle: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: '#1C1C1E',
  },
  hydrationSub: {
    display: 'block',
    fontSize: 10.5,
    color: '#8E8E93',
    marginTop: 1,
  },
  hydrationBtns: {
    display: 'flex',
    gap: 6,
  },
  waterBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    border: 'none',
    fontSize: 18,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: font,
  },
  waterBtnPlus: {
    background: '#007AFF',
    color: '#FFFFFF',
  },
  waterBtnMinus: {
    background: '#F2F2F7',
    color: '#8E8E93',
  },
  waterBtnDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
  },
  waterGlasses: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    margin: '10px 0 8px 2px',
  },
  glass: {
    width: 26,
    height: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    background: '#F2F2F7',
    transition: 'all 0.2s ease',
  },
  glassFilled: {
    background: '#E5F1FF',
  },
  waterBarWrap: {
    height: 4,
    background: '#F2F2F7',
    borderRadius: 4,
    overflow: 'hidden',
  },
  waterBar: {
    height: '100%',
    background: '#007AFF',
    borderRadius: 4,
    transition: 'width 0.4s cubic-bezier(0.1, 0.76, 0.55, 0.94)',
  },

  /* ── Search Food Modal (Premium floating sheet design) ── */
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.3)',
    zIndex: 90, // lower than bottom navigation's zIndex 100 to keep it visible
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    WebkitBackdropFilter: 'blur(3px)',
    backdropFilter: 'blur(3px)',
    animation: 'dietModalOverlayIn 0.22s ease-out',
  },
  modal: {
    background: '#FFFFFF',
    width: '94%',
    maxWidth: 440,
    maxHeight: '75vh',
    borderRadius: 24,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    marginBottom: 'calc(var(--nav-height) + var(--safe-bottom) + 12px)', // FLOATING ABOVE bottom tabs
    boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    animation: 'dietModalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  modalHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 18px 12px',
    borderBottom: '1.5px solid #F2F2F7',
    flexShrink: 0, // prevent Android keyboard shrink
  },
  modalTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 15,
    fontWeight: 700,
    color: '#1C1C1E',
    margin: 0,
    fontFamily: font,
  },
  modalTitleIcon: {
    display: 'flex',
    alignItems: 'center',
    color: '#007AFF',
  },
  modalClose: {
    background: '#F2F2F7',
    border: 'none',
    color: '#8E8E93',
    cursor: 'pointer',
    borderRadius: '50%',
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    flexShrink: 0,
  },
  modalSearchWrap: {
    position: 'relative',
    padding: '10px 18px',
    flexShrink: 0, // prevent Android keyboard shrink
  },
  modalSearchIcon: {
    position: 'absolute',
    left: 28,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#8E8E93',
    pointerEvents: 'none',
  },
  modalSearchInput: {
    width: '100%',
    padding: '10px 32px 10px 36px',
    border: 'none',
    borderRadius: 10,
    fontSize: 13.5,
    fontFamily: font,
    color: '#1C1C1E',
    background: '#F2F2F7',
    outline: 'none',
    minHeight: 40,
  },
  modalSearchClear: {
    position: 'absolute',
    right: 24,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#8E8E93',
    cursor: 'pointer',
    padding: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catChips: {
    display: 'flex',
    gap: 6,
    padding: '0 18px 10px',
    overflowX: 'auto',
    scrollbarWidth: 'none',
    WebkitOverflowScrolling: 'touch',
    flexShrink: 0, // prevent Android keyboard shrink
  },
  catChip: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 12px',
    borderRadius: 16,
    border: 'none',
    background: '#F2F2F7',
    fontSize: 11,
    fontWeight: 600,
    color: '#3A3A3C',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontFamily: font,
    transition: 'all 0.15s ease',
  },
  catChipActive: {
    background: '#007AFF',
    color: '#FFFFFF',
  },
  catDot: {
    display: 'inline-block',
    width: 6,
    height: 6,
    borderRadius: '50%',
    flexShrink: 0,
  },
  modalList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 18px 16px',
    scrollbarWidth: 'none',
    WebkitOverflowScrolling: 'touch',
  },
  modalEmpty: {
    textAlign: 'center',
    color: '#8E8E93',
    padding: '24px 0',
    fontSize: 13,
  },
  modalItem: {
    padding: '10px 0',
    borderBottom: '0.5px solid #F2F2F7',
  },
  modalItemTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  modalItemDot: {
    display: 'inline-block',
    width: 6,
    height: 6,
    borderRadius: '50%',
    flexShrink: 0,
  },
  modalItemInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
    cursor: 'pointer',
  },
  modalItemNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  modalItemName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1C1C1E',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  modalItemMultBadge: {
    fontSize: 9.5,
    fontWeight: 700,
    color: '#007AFF',
    background: '#E5F1FF',
    padding: '0.5px 5px',
    borderRadius: 6,
  },
  modalItemMeta: {
    fontSize: 10.5,
    color: '#8E8E93',
    marginTop: 1.5,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  starBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    transition: 'transform 0.15s ease',
  },
  modalAddBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    background: '#F2F2F7',
    color: '#1C1C1E',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
    flexShrink: 0,
  },
  multRow: {
    display: 'flex',
    gap: 6,
    marginTop: 8,
    paddingLeft: 12,
    animation: 'dietMealExpand 0.2s cubic-bezier(0.1, 0.76, 0.55, 0.94)',
  },
  multBtn: {
    padding: '5px 10px',
    borderRadius: 8,
    border: 'none',
    background: '#F2F2F7',
    fontSize: 11,
    fontWeight: 600,
    color: '#6B7280',
    cursor: 'pointer',
    minHeight: 28,
    minWidth: 38,
    transition: 'all 0.15s ease',
    fontFamily: font,
  },
  multBtnActive: {
    background: '#E5F1FF',
    color: '#007AFF',
  },
  expandedContent: {
    marginTop: 10,
    padding: '12px',
    background: '#F8F9FA',
    borderRadius: 12,
    border: '1px solid #E5E5EA',
    animation: 'dietMealExpand 0.22s cubic-bezier(0.1, 0.76, 0.55, 0.94)',
  },
  macroGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
    marginBottom: 4,
  },
  macroDetailCellFull: {
    gridColumn: '1 / span 2',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '6px 8px',
    background: '#FFFFFF',
    borderRadius: 8,
    border: '1px solid #E5E5EA',
  },
  macroDetailCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '6px 8px',
    background: '#FFFFFF',
    borderRadius: 8,
    border: '1px solid #E5E5EA',
  },
  macroDetailLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  macroDetailVal: {
    fontSize: 12,
    fontWeight: 600,
    color: '#1C1C1E',
  },
  multLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#3A3A3C',
    margin: '8px 0 6px 2px',
  },
};
