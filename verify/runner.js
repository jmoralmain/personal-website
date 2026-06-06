import * as envCheck      from './checks/env.js';
import * as coordsCheck   from './checks/coords.js';
import * as manifestCheck from './checks/manifest.js';
import * as sceneCheck    from './checks/scene.js';

const SUITES = [envCheck, coordsCheck, manifestCheck, sceneCheck];

export async function runAll() {
  const suiteResults = [];

  for (const suite of SUITES) {
    let results;
    try {
      results = await suite.run();
    } catch (e) {
      results = [{
        label:    `Suite threw an uncaught exception`,
        passed:   false,
        severity: 'error',
        detail:   e.message,
      }];
    }
    suiteResults.push({ name: suite.name, results });
  }

  return suiteResults;
}

export function summarise(suiteResults) {
  let passed = 0, failed = 0, warned = 0, info = 0;
  suiteResults.forEach(({ results }) => {
    results.forEach(r => {
      if (r.passed === true)  passed++;
      else if (r.passed === false && r.severity === 'warn') warned++;
      else if (r.passed === false) failed++;
      else info++;
    });
  });
  return { passed, failed, warned, info,
           total: passed + failed + warned + info,
           allPassed: failed === 0 };
}
