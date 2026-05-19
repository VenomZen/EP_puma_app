// PUMA AE II EP — Emergency Procedures
// Answers are preserved EXACTLY as specified in the official procedure document.

const QUESTIONS = [
  {
    id: 1,
    code: 'EP-01',
    title: 'Loss of Link',
    steps: [
      'Check orientation of RF unit and reconnect Patch antenna, if required.'
    ]
  },
  {
    id: 2,
    code: 'EP-02',
    title: 'GPS Failure',
    steps: [
      'Select ALT Mode.',
      'Set CMD alt to a safe altitude.',
      'Turn aircraft toward GCS.'
    ]
  },
  {
    id: 3,
    code: 'EP-03',
    title: 'Structural or Flight Control Failure',
    steps: [
      'Return to base, if able.',
      'If unable, command Autoland.'
    ]
  },
  {
    id: 4,
    code: 'EP-04',
    title: 'Altitude Hold Failure',
    steps: [
      'Switch to MAN mode and control altitude with % of power.'
    ]
  },
  {
    id: 5,
    code: 'EP-05',
    title: 'Extreme Low Air Vehicle Battery',
    steps: [
      'Switch to MAN mode and control altitude with % of power.',
      'Recover aircraft at Home location if able, or select suitable landing area.'
    ]
  },
  {
    id: 6,
    code: 'EP-06',
    title: 'Propulsion Failed Warning',
    steps: [
      'Command Autoland.',
      'Hot Key to MAN mode and control altitude with % of power.',
      'If control is regained, continue mission.',
      'If control is ot regained, command Autoland.'
    ]
  },
  {
    id: 7,
    code: 'EP-07',
    title: 'SEE DIAG Warning Message Received',
    steps: [
      'Push Menu Select right three times to enter Diagnostics screen 6.'
    ]
  },
  {
    id: 8,
    code: 'EP-08',
    title: 'Over Speed',
    steps: [
      'Switch to MAN mode and control altitude with % of power.',
      'If control is regained, continue mission.',
      'If control is ot regained, command Autoland.'
    ]
  },
  {
    id: 9,
    code: 'EP-09',
    title: 'Avionics Over Temperature',
    steps: [
      'Return to base, if able.',
      'If unable, command Autoland.'
    ]
  },
  {
    id: 10,
    code: 'EP-10',
    title: 'Motor Controller or Li-Ion Aircraft Battery Over Temp',
    steps: [
      'Reduce & of power as appropriate.',
      'Clear warning message.',
      'If message does not clear, Return to base, if able.',
      'If unable, command Autoland.'
    ]
  },
  {
    id: 11,
    code: 'EP-11',
    title: 'Mid-Air Avoidance',
    steps: [
      'Estimate intruding aircraft altitude.',
      'Climb/Decend as applicable to aviod aircraft.'
    ]
  },
  {
    id: 12,
    code: 'EP-12',
    title: 'FalconView Interrupted',
    steps: [
      'Select ALT Mode.',
      'Set CMD alt to a safe altitude.',
      'Turn aircraft toward GCS.'
    ]
  }
];

const TOTAL_STEPS = QUESTIONS.reduce((sum, q) => sum + q.steps.length, 0); // 28
