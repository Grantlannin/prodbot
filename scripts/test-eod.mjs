/**
 * EOD smoke test — validates night prep snapshot + report text shape.
 * Run: node scripts/test-eod.mjs
 */

const NIGHT_PREP_KEY = 'agentHQ_nightPrep';

function readNightPrepRaw(store) {
  try {
    const raw = store.get(NIGHT_PREP_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readNightPrepForEod(store) {
  const parsed = readNightPrepRaw(store);
  return {
    tomorrow: parsed?.tomorrowTasks?.trim() ?? '',
    previousDayContext: parsed?.previousDayContext?.trim() ?? '',
  };
}

function buildEodReportText(report) {
  const lines = [
    'END OF DAY REPORT',
    '',
    'WHAT YOU GOT DONE TODAY',
    report.completed || '—',
  ];
  if (report.previousDayContext) {
    lines.push('', "PREVIOUS DAY'S CONTEXT", report.previousDayContext);
  }
  lines.push('', 'TOMORROW', report.tomorrow || '—');
  lines.push('', 'INSIGHTS / LEARNINGS', report.learnings || '—');
  return lines.join('\n');
}

const store = new Map();
store.set(
  NIGHT_PREP_KEY,
  JSON.stringify({
    tomorrowTasks: 'Ship landing page\nEmail client',
    previousDayContext: 'Left off on hero section copy',
  })
);

const nightPrep = readNightPrepForEod(store);
assert(nightPrep.tomorrow.includes('Ship landing page'), 'tomorrow captured');
assert(nightPrep.previousDayContext === 'Left off on hero section copy', 'previousDayContext captured');

const report = {
  completed: 'Finished wireframes',
  tomorrow: nightPrep.tomorrow,
  previousDayContext: nightPrep.previousDayContext,
  learnings: 'Batch similar tasks',
};

const text = buildEodReportText(report);
assert(text.includes("PREVIOUS DAY'S CONTEXT"), 'report has context section');
assert(text.includes('Left off on hero section copy'), 'report has context body');
assert(text.includes('Ship landing page'), 'report has tomorrow');
assert(text.includes('Finished wireframes'), 'report has completed');
assert(text.includes('Batch similar tasks'), 'report has learnings');

console.log('EOD smoke test passed.');
console.log('--- sample report ---');
console.log(text);

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
}
