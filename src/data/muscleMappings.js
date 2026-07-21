// Curated Exercise-to-Muscle SVG Path Mapping for FitForge

export const FRONT_PATH_IDS = new Set([
  'head',
  'sternocleidomastoid',
  'trapezius_upper_front',
  'pectoralis_major',
  'pectoralis_minor',
  'deltoid_anterior',
  'deltoid_middle_front',
  'biceps_long',
  'biceps_short',
  'brachioradialis_front',
  'flexor_carpi_front',
  'extensor_carpi_front',
  'hands_front',
  'serratus_anterior',
  'obliques_upper',
  'obliques_lower',
  'upper_abs',
  'middle_abs',
  'lower_abs',
  'six_pack',
  'tensor_fasciae',
  'pectineus',
  'adductor_longus',
  'gracilis_front',
  'sartorius',
  'rectus_femoris',
  'vastus_lateralis_front',
  'vastus_medialis',
  'knees_front',
  'peroneus_longus',
  'gastrocnemius_front',
  'tibialis_anterior',
  'extensor_digitorum',
  'feet_front',
]);

export const BACK_PATH_IDS = new Set([
  'head_back',
  'trapezius_upper_back',
  'trapezius_back',
  'infraspinatus',
  'teres_major',
  'deltoid_posterior',
  'deltoid_middle_back',
  'triceps_lateral_long',
  'triceps_medial',
  'extensor_carpi_back',
  'flexor_carpi_back',
  'brachioradialis_back',
  'hands_back',
  'latissimus_dorsi',
  'erector_spinae',
  'gluteus_medius',
  'gluteus_maximus',
  'vastus_lateralis_back',
  'biceps_femoris',
  'semitendinosus',
  'adductor_magnus',
  'gracilis_back',
  'soleus',
  'gastrocnemius_back',
  'feet_back',
]);

// Derive which views are needed from primary + secondary path IDs
export function deriveViews(pathIds) {
  let hasFront = false,
    hasBack = false;
  for (const id of pathIds) {
    if (FRONT_PATH_IDS.has(id)) hasFront = true;
    if (BACK_PATH_IDS.has(id)) hasBack = true;
    if (hasFront && hasBack) break;
  }
  return [...(hasFront ? ['front'] : []), ...(hasBack ? ['back'] : [])];
}

export const muscleMappings = {
  squat: {
    primary: ['rectus_femoris', 'vastus_lateralis_front', 'vastus_medialis', 'gluteus_maximus'],
    secondary: ['erector_spinae', 'upper_abs', 'six_pack', 'adductor_longus', 'vastus_lateralis_back'],
    views: ['front', 'back'],
  },
  deadlift: {
    primary: ['erector_spinae', 'gluteus_maximus', 'biceps_femoris', 'semitendinosus', 'trapezius_back'],
    secondary: ['latissimus_dorsi', 'trapezius_upper_back', 'rectus_femoris', 'vastus_lateralis_front', 'flexor_carpi_front', 'hands_front', 'six_pack'],
    views: ['front', 'back'],
  },
  bench: {
    primary: ['pectoralis_major', 'pectoralis_minor'],
    secondary: ['deltoid_anterior', 'triceps_lateral_long', 'triceps_medial', 'serratus_anterior'],
    views: ['front', 'back'],
  },
  ohp: {
    primary: ['deltoid_anterior', 'deltoid_middle_front', 'deltoid_middle_back', 'trapezius_upper_front', 'trapezius_upper_back'],
    secondary: ['triceps_lateral_long', 'triceps_medial', 'pectoralis_minor', 'serratus_anterior', 'upper_abs', 'six_pack'],
    views: ['front', 'back'],
  },
  pullup: {
    primary: ['latissimus_dorsi', 'teres_major', 'infraspinatus', 'trapezius_back'],
    secondary: ['biceps_long', 'biceps_short', 'brachioradialis_back', 'flexor_carpi_back', 'hands_back', 'six_pack', 'lower_abs'],
    views: ['front', 'back'],
  },
  row: {
    primary: ['latissimus_dorsi', 'trapezius_back', 'infraspinatus', 'teres_major', 'deltoid_posterior'],
    secondary: ['biceps_long', 'biceps_short', 'erector_spinae', 'biceps_femoris', 'brachioradialis_front', 'flexor_carpi_front'],
    views: ['front', 'back'],
  },
  curl: {
    primary: ['biceps_long', 'biceps_short'],
    secondary: ['brachioradialis_front', 'flexor_carpi_front', 'extensor_carpi_front'],
    views: ['front'],
  },
  farmerWalk: {
    primary: [],
    secondary: [],
    views: [],
  },
  kbSwing: {
    primary: [],
    secondary: [],
    views: [],
  },
  weightedDips: {
    primary: ['pectoralis_major', 'pectoralis_minor', 'triceps_lateral_long', 'triceps_medial'],
    secondary: ['deltoid_anterior', 'serratus_anterior'],
    views: ['front', 'back'],
  },
  frontSquat: {
    primary: ['rectus_femoris', 'vastus_lateralis_front', 'vastus_medialis', 'gluteus_maximus'],
    secondary: ['trapezius_upper_back', 'trapezius_back', 'upper_abs', 'middle_abs', 'six_pack', 'erector_spinae'],
    views: ['front', 'back'],
  },
  romanianDeadlift: {
    primary: ['biceps_femoris', 'semitendinosus', 'gluteus_maximus'],
    secondary: ['erector_spinae', 'trapezius_back', 'latissimus_dorsi', 'adductor_magnus'],
    views: ['back'],
  },
  pendlayRow: {
    primary: ['latissimus_dorsi', 'trapezius_back', 'deltoid_posterior', 'teres_major'],
    secondary: ['biceps_long', 'biceps_short', 'erector_spinae', 'brachioradialis_back', 'flexor_carpi_back'],
    views: ['front', 'back'],
  },
  chinup: {
    primary: ['latissimus_dorsi', 'biceps_long', 'biceps_short'],
    secondary: ['teres_major', 'infraspinatus', 'brachioradialis_front', 'flexor_carpi_front', 'hands_front', 'six_pack', 'upper_abs'],
    views: ['front', 'back'],
  },
  dumbbellPress: {
    primary: ['pectoralis_major', 'pectoralis_minor'],
    secondary: ['deltoid_anterior', 'triceps_lateral_long', 'triceps_medial'],
    views: ['front', 'back'],
  },
  inclineDbPress: {
    primary: ['pectoralis_minor', 'deltoid_anterior'],
    secondary: ['pectoralis_major', 'triceps_lateral_long', 'triceps_medial', 'serratus_anterior'],
    views: ['front', 'back'],
  },
  latPulldown: {
    primary: ['latissimus_dorsi', 'teres_major', 'infraspinatus'],
    secondary: ['biceps_long', 'biceps_short', 'deltoid_posterior', 'brachioradialis_back', 'flexor_carpi_back'],
    views: ['front', 'back'],
  },
  seatedCableRow: {
    primary: ['trapezius_back', 'latissimus_dorsi', 'teres_major', 'infraspinatus'],
    secondary: ['biceps_long', 'biceps_short', 'deltoid_posterior', 'brachioradialis_front'],
    views: ['front', 'back'],
  },
  lateralRaise: {
    primary: ['deltoid_middle_front', 'deltoid_middle_back'],
    secondary: ['deltoid_anterior', 'deltoid_posterior', 'trapezius_upper_front', 'trapezius_upper_back'],
    views: ['front', 'back'],
  },
  facePull: {
    primary: ['deltoid_posterior', 'infraspinatus', 'teres_major', 'trapezius_back'],
    secondary: ['deltoid_middle_back', 'trapezius_upper_back', 'biceps_long'],
    views: ['front', 'back'],
  },
  hammerCurl: {
    primary: ['brachioradialis_front', 'brachioradialis_back', 'biceps_long'],
    secondary: ['biceps_short', 'flexor_carpi_front', 'extensor_carpi_front'],
    views: ['front', 'back'],
  },
  tricepPushdown: {
    primary: ['triceps_lateral_long', 'triceps_medial'],
    secondary: ['flexor_carpi_back', 'extensor_carpi_back', 'upper_abs'],
    views: ['front', 'back'],
  },
  skullCrusher: {
    primary: ['triceps_lateral_long', 'triceps_medial'],
    secondary: ['extensor_carpi_back', 'flexor_carpi_back', 'deltoid_anterior'],
    views: ['front', 'back'],
  },
  legPress: {
    primary: ['rectus_femoris', 'vastus_lateralis_front', 'vastus_medialis', 'gluteus_maximus'],
    secondary: ['biceps_femoris', 'semitendinosus', 'adductor_longus', 'adductor_magnus', 'gastrocnemius_front'],
    views: ['front', 'back'],
  },
  legCurl: {
    primary: ['biceps_femoris', 'semitendinosus'],
    secondary: ['gastrocnemius_back', 'soleus', 'gracilis_back'],
    views: ['back'],
  },
  calfRaise: {
    primary: ['gastrocnemius_front', 'gastrocnemius_back', 'soleus'],
    secondary: ['tibialis_anterior', 'peroneus_longus', 'feet_front', 'feet_back'],
    views: ['front', 'back'],
  },
  pushup: {
    primary: ['pectoralis_major', 'pectoralis_minor', 'triceps_lateral_long', 'triceps_medial'],
    secondary: ['deltoid_anterior', 'serratus_anterior', 'upper_abs', 'middle_abs', 'lower_abs', 'six_pack'],
    views: ['front', 'back'],
  },
  declinePushup: {
    primary: ['pectoralis_minor', 'deltoid_anterior', 'triceps_lateral_long', 'triceps_medial'],
    secondary: ['pectoralis_major', 'serratus_anterior', 'six_pack', 'upper_abs'],
    views: ['front', 'back'],
  },
  dips: {
    primary: ['pectoralis_major', 'pectoralis_minor', 'triceps_lateral_long', 'triceps_medial'],
    secondary: ['deltoid_anterior', 'serratus_anterior'],
    views: ['front', 'back'],
  },
  invertedRow: {
    primary: ['latissimus_dorsi', 'trapezius_back', 'infraspinatus', 'deltoid_posterior'],
    secondary: ['biceps_long', 'biceps_short', 'brachioradialis_front', 'flexor_carpi_front', 'six_pack', 'erector_spinae'],
    views: ['front', 'back'],
  },
  pistolSquat: {
    primary: ['rectus_femoris', 'vastus_lateralis_front', 'vastus_medialis', 'gluteus_maximus', 'gluteus_medius'],
    secondary: ['biceps_femoris', 'semitendinosus', 'gastrocnemius_front', 'soleus', 'six_pack', 'lower_abs', 'tensor_fasciae', 'pectineus'],
    views: ['front', 'back'],
  },
  bulgarianSplitSquat: {
    primary: ['rectus_femoris', 'vastus_lateralis_front', 'vastus_medialis', 'gluteus_maximus', 'gluteus_medius'],
    secondary: ['biceps_femoris', 'semitendinosus', 'adductor_longus', 'adductor_magnus', 'gastrocnemius_front', 'soleus'],
    views: ['front', 'back'],
  },
  lunges: {
    primary: ['rectus_femoris', 'vastus_lateralis_front', 'vastus_medialis', 'gluteus_maximus'],
    secondary: ['biceps_femoris', 'semitendinosus', 'gastrocnemius_front', 'soleus', 'six_pack', 'obliques_upper'],
    views: ['front', 'back'],
  },
  hangingLegRaise: {
    primary: ['lower_abs', 'six_pack', 'middle_abs', 'tensor_fasciae', 'pectineus'],
    secondary: ['obliques_lower', 'obliques_upper', 'flexor_carpi_front', 'hands_front', 'latissimus_dorsi'],
    views: ['front', 'back'],
  },
  abWheelRollout: {
    primary: ['upper_abs', 'middle_abs', 'lower_abs', 'six_pack'],
    secondary: ['latissimus_dorsi', 'serratus_anterior', 'pectoralis_minor', 'deltoid_anterior'],
    views: ['front', 'back'],
  },
  plank: {
    primary: ['upper_abs', 'middle_abs', 'lower_abs', 'six_pack', 'obliques_upper', 'obliques_lower'],
    secondary: ['deltoid_anterior', 'serratus_anterior', 'gluteus_maximus', 'rectus_femoris'],
    views: ['front', 'back'],
  },
  russianTwist: {
    primary: ['obliques_upper', 'obliques_lower', 'middle_abs', 'lower_abs', 'six_pack'],
    secondary: ['tensor_fasciae', 'upper_abs', 'erector_spinae'],
    views: ['front', 'back'],
  },
  jumpRope: {
    primary: [],
    secondary: [],
    views: [],
  },
  running: {
    primary: [],
    secondary: [],
    views: [],
  },
  rowingMachine: {
    primary: [],
    secondary: [],
    views: [],
  },
  burpees: {
    primary: [],
    secondary: [],
    views: [],
  },
  legSwings: {
    primary: [],
    secondary: [],
    views: [],
  },
  armCircles: {
    primary: [],
    secondary: [],
    views: [],
  },
  catCow: {
    primary: [],
    secondary: [],
    views: [],
  },
  worldsGreatestStretch: {
    primary: [],
    secondary: [],
    views: [],
  },
  legExtension: {
    primary: ['rectus_femoris', 'vastus_lateralis_front', 'vastus_medialis'],
    secondary: ['tensor_fasciae', 'sartorius'],
    views: ['front'],
  },
  hangingKneeRaise: {
    primary: ['lower_abs', 'six_pack', 'tensor_fasciae', 'pectineus', 'adductor_longus'],
    secondary: ['obliques_lower', 'middle_abs', 'flexor_carpi_front', 'hands_front', 'latissimus_dorsi'],
    views: ['front', 'back'],
  },
  rearDeltFly: {
    primary: ['deltoid_posterior', 'infraspinatus', 'trapezius_back', 'teres_major'],
    secondary: ['deltoid_middle_back', 'trapezius_upper_back'],
    views: ['back'],
  },
  dbShrugs: {
    primary: ['trapezius_upper_front', 'trapezius_upper_back'],
    secondary: ['trapezius_back', 'flexor_carpi_front', 'extensor_carpi_front', 'hands_front', 'hands_back', 'sternocleidomastoid'],
    views: ['front', 'back'],
  },
  preacherCurl: {
    primary: ['biceps_short', 'biceps_long'],
    secondary: ['brachioradialis_front', 'flexor_carpi_front'],
    views: ['front'],
  },
  inclineDbCurl: {
    primary: ['biceps_long', 'biceps_short'],
    secondary: ['brachioradialis_front', 'flexor_carpi_front', 'deltoid_anterior'],
    views: ['front'],
  },
  reverseWristCurl: {
    primary: ['extensor_carpi_front', 'extensor_carpi_back', 'brachioradialis_front', 'brachioradialis_back'],
    secondary: ['hands_front', 'hands_back'],
    views: ['front', 'back'],
  },
  cableFly: {
    primary: ['pectoralis_major', 'pectoralis_minor'],
    secondary: ['deltoid_anterior', 'biceps_short', 'serratus_anterior'],
    views: ['front'],
  },
  hipThrust: {
    primary: ['gluteus_maximus', 'gluteus_medius'],
    secondary: ['biceps_femoris', 'semitendinosus', 'rectus_femoris', 'vastus_lateralis_front', 'adductor_magnus', 'adductor_longus', 'erector_spinae', 'lower_abs'],
    views: ['front', 'back'],
  },
  seatedLegCurl: {
    primary: ['biceps_femoris', 'semitendinosus'],
    secondary: ['gastrocnemius_back', 'soleus', 'gracilis_back'],
    views: ['back'],
  },
  hipAbduction: {
    primary: ['gluteus_medius', 'tensor_fasciae'],
    secondary: ['gluteus_maximus', 'sartorius'],
    views: ['front', 'back'],
  },
  seatedCalfRaise: {
    primary: ['soleus'],
    secondary: ['gastrocnemius_back', 'gastrocnemius_front', 'peroneus_longus', 'feet_back'],
    views: ['front', 'back'],
  },
  chestSupportedDbRow: {
    primary: ['trapezius_back', 'latissimus_dorsi', 'infraspinatus', 'teres_major', 'deltoid_posterior'],
    secondary: ['biceps_long', 'biceps_short', 'brachioradialis_back', 'flexor_carpi_back'],
    views: ['front', 'back'],
  },
  reverseEzCurl: {
    primary: ['brachioradialis_front', 'brachioradialis_back', 'extensor_carpi_front', 'extensor_carpi_back'],
    secondary: ['biceps_long', 'biceps_short'],
    views: ['front', 'back'],
  },
  wristCurl: {
    primary: ['flexor_carpi_front', 'flexor_carpi_back'],
    secondary: ['hands_front', 'hands_back', 'brachioradialis_front'],
    views: ['front', 'back'],
  },
  gobletSquat: {
    primary: ['rectus_femoris', 'vastus_lateralis_front', 'vastus_medialis', 'gluteus_maximus'],
    secondary: ['upper_abs', 'middle_abs', 'six_pack', 'biceps_long', 'trapezius_upper_front', 'erector_spinae', 'adductor_longus'],
    views: ['front', 'back'],
  },
  dbRomanianDeadlift: {
    primary: ['biceps_femoris', 'semitendinosus', 'gluteus_maximus'],
    secondary: ['erector_spinae', 'flexor_carpi_front', 'hands_front', 'hands_back', 'trapezius_back', 'latissimus_dorsi'],
    views: ['front', 'back'],
  },
  dbOverheadPress: {
    primary: ['deltoid_anterior', 'deltoid_middle_front', 'deltoid_middle_back', 'trapezius_upper_front', 'trapezius_upper_back'],
    secondary: ['triceps_lateral_long', 'triceps_medial', 'pectoralis_minor', 'upper_abs', 'six_pack'],
    views: ['front', 'back'],
  },
  deadHang: {
    primary: ['flexor_carpi_front', 'flexor_carpi_back', 'hands_front', 'hands_back', 'brachioradialis_front', 'brachioradialis_back'],
    secondary: ['latissimus_dorsi', 'trapezius_upper_back', 'deltoid_posterior', 'deltoid_anterior', 'six_pack'],
    views: ['front', 'back'],
  },
  dbRow: {
    primary: ['latissimus_dorsi', 'trapezius_back', 'infraspinatus', 'teres_major', 'deltoid_posterior'],
    secondary: ['biceps_long', 'biceps_short', 'brachioradialis_front', 'flexor_carpi_front', 'obliques_upper'],
    views: ['front', 'back'],
  },
  dbFloorPress: {
    primary: ['pectoralis_major', 'pectoralis_minor', 'triceps_lateral_long', 'triceps_medial'],
    secondary: ['deltoid_anterior'],
    views: ['front', 'back'],
  },
  proneYRaise: {
    primary: ['trapezius_back', 'trapezius_upper_back', 'deltoid_posterior', 'infraspinatus'],
    secondary: ['deltoid_middle_back', 'erector_spinae'],
    views: ['back'],
  },
  scapularPullup: {
    primary: ['trapezius_back', 'latissimus_dorsi', 'serratus_anterior'],
    secondary: ['flexor_carpi_front', 'hands_front', 'hands_back', 'infraspinatus', 'teres_major', 'trapezius_upper_back'],
    views: ['front', 'back'],
  },
  bandAssistedPullup: {
    primary: ['latissimus_dorsi', 'teres_major', 'infraspinatus', 'trapezius_back'],
    secondary: ['biceps_long', 'biceps_short', 'brachioradialis_back', 'flexor_carpi_back', 'hands_back', 'six_pack', 'lower_abs'],
    views: ['front', 'back'],
  },
};
