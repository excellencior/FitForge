// Modified Greyskull LP - Personalized Workout Program
// Based on research: neural strength, 1-5 rep range, 3-5 min rest, deload every 6 weeks

export const userProfile = {
  height: "5'10\"",
  heightCm: 178,
  weightKg: 72.7,
  weightLbs: 160,
  tdee: 2700,
  bmr: 1720,
  proteinTarget: 160, // grams (1g per lb bodyweight)
  carbsTarget: 360,
  fatTarget: 80,
  calorieTarget: 2900, // lean bulk
};

export const exercises = {
  squat: {
    id: 'squat',
    name: 'Barbell Back Squat',
    nameShort: 'Squat',
    icon: '🦵',
    muscle: 'Legs, Core, Back',
    type: 'compound',
    formTips: [
      'Feet shoulder-width, toes slightly out',
      'Break at hips first, then knees',
      'Keep chest up, back neutral',
      'Depth: hip crease below knee (parallel+)',
      'Drive through heels, push knees out',
      'WHITE-KNUCKLE the bar — full body tension',
    ],
    warnings: [
      '⚠️ NEVER round your lower back under load',
      '⚠️ Knees caving inward = STOP and reduce weight',
      '⚠️ If you lose tension at the bottom, the weight is too heavy',
    ],
    startWeight: 20,
    increment: 2.5,
  },
  deadlift: {
    id: 'deadlift',
    name: 'Barbell Deadlift',
    nameShort: 'Deadlift',
    icon: '🏋️',
    muscle: 'Back, Legs, Core, Grip',
    type: 'compound',
    formTips: [
      'Bar over mid-foot, shins close to bar',
      'Hip hinge — push hips back, not down',
      'Shoulders slightly in front of the bar',
      'Engage lats — "protect your armpits"',
      'Drive through the floor, lock hips at top',
      'CRUSH the bar — irradiation from hands to core',
    ],
    warnings: [
      '⚠️ NEVER round your back — this is the #1 cause of back injuries',
      '⚠️ Do NOT jerk the bar off the floor — build tension first',
      '⚠️ If grip fails before muscles, use mixed grip',
    ],
    startWeight: 40,
    increment: 2.5,
  },
  bench: {
    id: 'bench',
    name: 'Barbell Bench Press',
    nameShort: 'Bench Press',
    icon: '💪',
    muscle: 'Chest, Shoulders, Triceps',
    type: 'compound',
    formTips: [
      'Retract shoulder blades — squeeze them together',
      'Slight arch in lower back, feet flat on floor',
      'Grip slightly wider than shoulder-width',
      'Lower to mid-chest, elbows at 45° (NOT flared)',
      'Press up and slightly back toward face',
      'SQUEEZE the bar like you\'re trying to snap it in half',
    ],
    warnings: [
      '⚠️ Flared elbows = shoulder impingement — tuck to 45°',
      '⚠️ ALWAYS use a spotter or safety pins for heavy sets',
      '⚠️ Never bounce bar off chest — use pause reps for real strength',
    ],
    startWeight: 20,
    increment: 1.25,
  },
  ohp: {
    id: 'ohp',
    name: 'Barbell Overhead Press',
    nameShort: 'Overhead Press',
    icon: '🙌',
    muscle: 'Shoulders, Triceps, Core',
    type: 'compound',
    formTips: [
      'Start with bar at collarbone, elbows in front',
      'Squeeze glutes and brace core HARD',
      'Press straight up, move head back then forward',
      'Lockout overhead — bar over mid-foot',
      'Full body tension — this is a full body lift',
      'Controlled descent back to starting position',
    ],
    warnings: [
      '⚠️ Do NOT lean back excessively — keep core braced',
      '⚠️ This lift progresses SLOWEST — use 1.25kg increments',
      '⚠️ Pain in shoulders? Check mobility before adding weight',
    ],
    startWeight: 20,
    increment: 1.25,
  },
  pullup: {
    id: 'pullup',
    name: 'Weighted Pull-ups',
    nameShort: 'Pull-ups',
    icon: '🔝',
    muscle: 'Back, Biceps, Core, Grip',
    type: 'compound',
    formTips: [
      'Grip slightly wider than shoulder-width',
      'Start from full dead hang — arms straight',
      'Pull elbows down and back toward hips',
      'Chin over bar at the top',
      'Slow, controlled descent (3 seconds)',
      'Add weight belt when bodyweight reps > 8',
    ],
    warnings: [
      '⚠️ No kipping — strict form only',
      '⚠️ Can\'t do 5? Use bands for assistance, NOT the machine',
      '⚠️ Shoulder pain at bottom? Don\'t go to full dead hang yet',
    ],
    startWeight: 0,
    increment: 1.25,
  },
  row: {
    id: 'row',
    name: 'Barbell Bent-Over Row',
    nameShort: 'Bent-Over Row',
    icon: '🚣',
    muscle: 'Back, Biceps, Rear Delts',
    type: 'compound',
    formTips: [
      'Hinge at hips — 45° angle torso',
      'Bar hangs at arm\'s length below shoulders',
      'Pull to lower chest / upper abs',
      'Squeeze shoulder blades at the top',
      'Keep core braced — no rocking',
      'Lower with control',
    ],
    warnings: [
      '⚠️ Do NOT jerk the weight up — if you must jerk, it\'s too heavy',
      '⚠️ Keep neutral spine — same rules as deadlift',
      '⚠️ This is NOT an ego lift — strict form matters more than weight',
    ],
    startWeight: 30,
    increment: 1.25,
  },
  curl: {
    id: 'curl',
    name: 'Barbell Curl',
    nameShort: 'Barbell Curl',
    icon: '💪',
    muscle: 'Biceps, Forearms',
    type: 'accessory',
    formTips: [
      'Stand straight, elbows pinned to sides',
      'Curl with control — no body swing',
      'Squeeze at the top for 1 second',
      'Slow eccentric (3 sec down)',
    ],
    warnings: [
      '⚠️ Swinging = too heavy — drop the weight',
    ],
    startWeight: 15,
    increment: 1.25,
  },
  farmerWalk: {
    id: 'farmerWalk',
    name: "Farmer's Walk",
    nameShort: "Farmer's Walk",
    icon: '🚶',
    muscle: 'Grip, Core, Shoulders, Full Body',
    type: 'conditioning',
    formTips: [
      'Pick up heavy dumbbells, one in each hand',
      'Stand tall — shoulders back, chest up',
      'Walk with short, quick steps',
      'Maintain tight core and neutral spine',
      'CRUSH the handles — irradiation effect',
    ],
    warnings: [],
    startWeight: 16,
    increment: 2,
  },
  kbSwing: {
    id: 'kbSwing',
    name: 'Kettlebell Swing',
    nameShort: 'KB Swing',
    icon: '🔔',
    muscle: 'Hips, Glutes, Core, Shoulders',
    type: 'conditioning',
    formTips: [
      'Hip hinge movement — NOT a squat',
      'Drive hips forward explosively',
      'Arms are just straps — power from hips',
      'Keep core braced throughout',
      'Control the swing on the way down',
    ],
    warnings: [
      '⚠️ Do NOT squat the swing — it\'s a HIP HINGE',
    ],
    startWeight: 12,
    increment: 4,
  },
  weightedDips: {
    id: 'weightedDips',
    name: 'Weighted Chest Dips',
    nameShort: 'Weighted Dips',
    icon: '💪',
    muscle: 'Chest, Shoulders, Triceps',
    type: 'compound',
    formTips: [
      'Grip bars firmly, keep elbows slightly tucked',
      'Leaning forward hits chest; upright hits triceps',
      'Lower until shoulders are below elbows',
      'Drive up explosively, lock out at top',
      'White-knuckle the bars to recruit shoulder stability',
    ],
    warnings: [
      '⚠️ Avoid shoulder shrugging — keep shoulders packed down',
      '⚠️ If you feel shoulder joint pain, reduce depth or weight',
    ],
    startWeight: 0,
    increment: 1.25,
  },
  frontSquat: {
    id: 'frontSquat',
    name: 'Barbell Front Squat',
    nameShort: 'Front Squat',
    icon: '🦵',
    muscle: 'Quads, Upper Back, Core',
    type: 'compound',
    formTips: [
      'Bar rests on front deltoids, elbows high',
      'Keep torso upright throughout the lift',
      'Squat deep — hip crease below knees',
      'Drive elbows up constantly to prevent bar roll',
      'Brace core like you are taking a punch',
    ],
    warnings: [
      '⚠️ Elbows dropping = back rounding. Keep elbows high!',
      '⚠️ Knees caving inward = reduce weight',
    ],
    startWeight: 20,
    increment: 2.5,
  },
  romanianDeadlift: {
    id: 'romanianDeadlift',
    name: 'Barbell Romanian Deadlift',
    nameShort: 'Romanian DL',
    icon: '🏋️',
    muscle: 'Hamstrings, Glutes, Lower Back',
    type: 'compound',
    formTips: [
      'Soft bend in knees, hinge backward at hips',
      'Keep bar sliding down your thighs close to body',
      'Hinge until you feel a deep stretch in hamstrings',
      'Squeeze glutes to pull yourself back up tall',
      'Neutral spine — do not look up or round back',
    ],
    warnings: [
      '⚠️ This is not a regular deadlift — do not touch floor',
      '⚠️ NEVER round the lower back under load',
    ],
    startWeight: 30,
    increment: 2.5,
  },
  pendlayRow: {
    id: 'pendlayRow',
    name: 'Barbell Pendlay Row',
    nameShort: 'Pendlay Row',
    icon: '🚣',
    muscle: 'Upper Back, Lats, Grip, Core',
    type: 'compound',
    formTips: [
      'Back completely flat, parallel to the floor',
      'Pull bar explosively from the floor to upper abs',
      'Squeeze shoulder blades, touch chest each rep',
      'Return bar to dead stop on the floor each rep',
      'Keep torso strict — no hip swing or standing up',
    ],
    warnings: [
      '⚠️ Jerking torso up destroys the neural benefit — stay flat',
      '⚠️ Lower back rounding is highly dangerous here',
    ],
    startWeight: 30,
    increment: 2.5,
  },
  chinup: {
    id: 'chinup',
    name: 'Weighted Chin-ups',
    nameShort: 'Chin-ups',
    icon: '🔝',
    muscle: 'Lats, Biceps, Core, Grip',
    type: 'compound',
    formTips: [
      'Underhand grip (palms facing you), shoulder-width',
      'Start from full dead hang with straight arms',
      'Pull chest up to the bar — squeeze shoulder blades',
      'Lower slowly and with absolute control',
      'Squeeze the bar with maximum white-knuckle force',
    ],
    warnings: [
      '⚠️ No swinging or kicking legs — strict pull only',
      '⚠️ Can\'t do 5? Practice bodyweight chin-ups first',
    ],
    startWeight: 0,
    increment: 1.25,
  },
};

// Personalized CNS Strength Blueprint template
export const workoutTemplates = {
  custom: {
    name: "CNS Strength Blueprint",
    exercises: [
      { exerciseId: 'squat', sets: 3, reps: 5, amrap: false, restMinutes: 4, notes: 'White-knuckle the bar and squeeze glutes. Rest 4m.' },
      { exerciseId: 'bench', sets: 3, reps: 5, amrap: true, restMinutes: 4, notes: 'Crush the bar, brace stomach. Last set AMRAP. Rest 4m.' },
      { exerciseId: 'row', sets: 3, reps: 5, amrap: false, restMinutes: 3, notes: 'Explode up, 2-sec slow eccentric control. Rest 3m.' },
      { exerciseId: 'ohp', sets: 3, reps: 5, amrap: true, restMinutes: 4, notes: 'Stand tall, squeeze glutes. Last set AMRAP. Rest 4m.' },
      { exerciseId: 'deadlift', sets: 1, reps: 5, amrap: true, restMinutes: 5, notes: 'Single high-effort work set. Pull with perfect form. Rest 5m.' },
    ],
    conditioning: ['farmerWalk', 'kbSwing'],
  }
};

// 3-day weekly schedule: Mon=A, Wed=B, Fri=A, then next week B/A/B
export const weeklySchedule = [
  { day: 0, name: 'Sunday', workout: null, type: 'rest' },
  { day: 1, name: 'Monday', workout: 'A', type: 'training' },
  { day: 2, name: 'Tuesday', workout: null, type: 'rest' },
  { day: 3, name: 'Wednesday', workout: 'B', type: 'training' },
  { day: 4, name: 'Thursday', workout: null, type: 'rest' },
  { day: 5, name: 'Friday', workout: 'A', type: 'training' },
  { day: 6, name: 'Saturday', workout: null, type: 'rest' },
];

export const warmupRoutine = [
  { 
    name: 'Light Cardio (Jump Rope / Brisk Walk)', 
    duration: '3-5 min', 
    icon: '🏃',
    instructions: 'Perform 3-5 minutes of light jumping rope, jumping jacks, or brisk walking to raise core body temperature and heart rate. You should build a light sweat.'
  },
  { 
    name: 'Leg Swings (front/back + side/side)', 
    duration: '10 each leg', 
    icon: '🦵',
    instructions: 'Stand near a wall for balance. Swing one leg front-to-back 10 times keeping your torso upright, then swing side-to-side 10 times to unlock hip capsule mobility.'
  },
  { 
    name: "World's Greatest Stretch", 
    duration: '5 each side', 
    icon: '🧘',
    instructions: 'Step into a deep lunge with your left foot forward. Place right hand flat on floor. Rotate your torso left and reach left hand to the sky. Hold 2 seconds, then swap sides.'
  },
  { 
    name: 'Wall Ankle Mobilizations', 
    duration: '10 each side', 
    icon: '🦶',
    instructions: 'Stand facing a wall, toes a few inches away. Keep your heel flat on the floor and drive your knee forward to tap the wall. Repeat 10 times to enhance dorsiflexion.'
  },
  { 
    name: 'Cat-Cow', 
    duration: '10 reps', 
    icon: '🐱',
    instructions: 'Get on hands and knees. Inhale, arch your back, look up (Cow). Exhale, round your spine toward the ceiling, tucking your chin (Cat). Move smoothly to lubricate the spine.'
  },
  { 
    name: 'Bodyweight Squats (squat prying)', 
    duration: '10 reps', 
    icon: '🏋️',
    instructions: 'Squat deep with heels flat. Place elbows inside knees, press knees outward, and rock gently side-to-side to pry open the hips. Stand and repeat 10 times.'
  },
  { 
    name: 'Arm Circles + Band Pass-Throughs', 
    duration: '10 reps', 
    icon: '🔄',
    instructions: 'Perform 10 large circles forward and backward with both arms. Grip a resistance band or stick wide, pass it slowly over your head to the back and return to open up shoulders.'
  },
];

export const warmupSets = [
  { label: 'Warm-up 1', load: '40%', reps: 10, purpose: 'Movement rehearsal' },
  { label: 'Warm-up 2', load: '60%', reps: 5, purpose: 'Build connection' },
  { label: 'Warm-up 3', load: '75%', reps: 3, purpose: 'Increase intensity' },
  { label: 'Warm-up 4', load: '85%', reps: 2, purpose: 'Prime nervous system' },
];

export const plateauTechniques = [
  {
    name: 'Isometrics (Static Holds)',
    icon: '🧱',
    description: 'Hold the bar completely still at your weakest point for 5 seconds.',
    when: 'When you fail at a specific point in the lift',
    how: 'Pause at sticking point, hold for 5-7 seconds under tension',
  },
  {
    name: 'Eccentric Negatives',
    icon: '⬇️',
    description: 'Lower 30% more weight than you can lift over 5 agonizing seconds.',
    when: 'When you need to train beyond your concentric max',
    how: 'Load 105% 1RM, spotter helps up, 5s controlled lower',
  },
  {
    name: 'Cluster Sets',
    icon: '🔗',
    description: 'Break sets into single reps with 20-second micro-rests.',
    when: 'When you can\'t complete target reps at a weight',
    how: '1 rep → rack → 20 sec → 1 rep → rack → 20 sec...',
  },
  {
    name: 'Pause Reps',
    icon: '⏸️',
    description: 'Kill all momentum with a 2-second dead stop at the bottom.',
    when: 'When momentum is doing the work instead of your muscles',
    how: 'Lower weight, pause 2 full seconds at bottom, explode up',
  },
];

export const irradiationChecklist = [
  { step: 1, text: 'CRUSH the bar — white-knuckle grip', emoji: '✊' },
  { step: 2, text: 'ROOT your feet — spread the floor', emoji: '🦶' },
  { step: 3, text: 'BIG BELLY BREATH — Valsalva maneuver', emoji: '💨' },
  { step: 4, text: 'BRACE your core — prepare for a punch', emoji: '🎯' },
  { step: 5, text: 'SQUEEZE your glutes', emoji: '🍑' },
  { step: 6, text: 'PULL lats tight', emoji: '💪' },
  { step: 7, text: 'LIFT with FULL body tension', emoji: '⚡' },
];

export const deloadConfig = {
  cycleWeeks: 6,
  volumeReduction: 0.5,
  intensityReduction: 0.6,
  tips: [
    '✅ Keep going to the gym — maintain the habit',
    '✅ Focus on mobility, stretching, foam rolling',
    '✅ Prioritize sleep — aim for 9+ hours',
    '✅ Eat well — don\'t cut calories during deload',
    '❌ Do NOT train to failure',
    '❌ Do NOT add new exercises',
    '❌ Do NOT feel guilty — this IS the program',
  ],
};
