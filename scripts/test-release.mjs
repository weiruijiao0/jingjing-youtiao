import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
mkdirSync('../verification/current-audit', { recursive: true });
for (const suite of ['course-route.ts', 'requirement-study.ts', 'course-exam.ts', 'course-coach.ts', 'course-coach-longitudinal.ts']) {
  const result = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', `tests/${suite}`], { stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  console.log(`PASS ${suite}`);
}
