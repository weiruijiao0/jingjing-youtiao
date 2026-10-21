import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import * as L from "../src/learning.ts";
const pack = L.validatePack(await L.readEnvelope(JSON.parse(readFileSync("src/content/builtin.jjcontent.json", "utf8")), "content"));
const old = L.validatePack(await L.readEnvelope(JSON.parse(readFileSync("../content/四经典_基础核定切片.jjcontent.json", "utf8")), "content"));
const at = (d: number) => `${L.addDays("2026-10-01", d - 1)}T04:00:00.000Z`;
const make = () => L.installPack(L.freshState(at(1)), pack);
function complete(s: L.LearningState, task: L.Task, d: number) {
  s = L.startTask(s, task, at(d));
  if (s.session!.stage === "read") { s = L.markRead(s, at(d)); s.session!.stage = "question"; }
  while (s.session!.stage !== "done") {
    const x = s.session!, u = L.getUnit(s, x.pack, x.unit)!;
    const q = u.questions.find((q) => q.id === x.queue[x.index])!;
    s.session!.draft = q.answers[0]; s.session!.activeSeconds = 20;
    s = L.nextQuestion(L.submit(s, at(d)), at(d));
  }
  return s;
}
assert.equal(pack.units.length, 40);
assert.equal(new Set(pack.units.map((u) => u.requirement.id)).size, 40);
assert.equal(pack.units.filter((u) => u.review === "cross-source-text").length, 36);
assert.equal(new Set(pack.units.map((u) => u.classic)).size, 4);
let s = L.buildPlan(make(), 20, "normal", false, at(1));
const first = s.plans.at(-1)!;
assert.ok(first.tasks.length >= 5, "20-minute start must not stop at two units");
assert.ok(first.tasks.reduce((n,t) => n+t.seconds,0) >= 960);
assert.ok(first.tasks.reduce((n,t) => n+t.seconds,0) <= 1080);
const firstTasks = first.tasks.length;
s = complete(s, first.tasks[0], 1);
s = L.buildPlan(s, 20, "normal", false, at(1));
assert.equal(s.plans.at(-1)!.tasks.filter((t) => t.status === "completed").length, 1);
assert.equal(new Set(s.plans.at(-1)!.tasks.map((t) => t.unit)).size, s.plans.at(-1)!.tasks.length);
assert.equal(s.profile.defaultMinutes,20);
let legacy = L.buildPlan(L.installPack(L.freshState(at(1)), old),20,"normal",false,at(1));
legacy = complete(legacy,legacy.plans.at(-1)!.tasks[0],1);
legacy.profile.name = "保留伙伴";
const upgraded = L.installPack(legacy,pack);
assert.deepEqual(upgraded.attempts,legacy.attempts);
assert.deepEqual(upgraded.covered,legacy.covered);
assert.equal(upgraded.profile.name,"保留伙伴");
assert.equal(L.available(upgraded).length,40);
assert.equal(L.installPack(upgraded,pack),upgraded);
L.validateState(upgraded);
const days=[];
s=make();
for(let d=1;d<=30;d++) {
  s=L.buildPlan(s,20,"normal",false,at(d));
  const p=s.plans.at(-1)!;
  days.push({day:d,new:p.tasks.filter((t)=>t.kind==='learn').length,review:p.tasks.filter((t)=>t.kind==='review').length,minutes:p.tasks.reduce((n,t)=>n+t.seconds,0)/60,read:s.covered.length});
  for(const t of p.tasks) s=complete(s,t,d);
  L.validateState(s);
}
assert.equal(s.covered.length,40);
writeFileSync('../verification/workload-results.json',JSON.stringify({firstTasks,units:40,partialRequirements:40,unmappedRequirements:672,days,readAfter30Days:s.covered.length,note:'Synthetic always-correct answers; not a mastery or full-syllabus feasibility forecast.'},null,2));
console.log(`20-minute start: ${firstTasks} tasks; 30-day simulation read ${s.covered.length}/40 available units; 672 requirements remain unserved.`);
