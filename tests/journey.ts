import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import * as L from "../src/learning.ts";
const out = "../verification";
mkdirSync(out, { recursive: true });
let seed = 20260929,
  serial = 0;
const original = globalThis.crypto;
const rand = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed;
};
Object.defineProperty(globalThis, "crypto", {
  configurable: true,
  value: {
    subtle: original.subtle,
    randomUUID: () =>
      `00000000-0000-4000-8000-${String(++serial).padStart(12, "0")}`,
    getRandomValues: (a: Uint32Array) => {
      for (let i = 0; i < a.length; i++) a[i] = rand();
      return a;
    },
  },
});
const pack = L.validatePack(
  await L.readEnvelope(
    JSON.parse(
      readFileSync("../content/四经典_基础核定切片.jjcontent.json", "utf8"),
    ),
    "content",
  ),
);
const at = (d: number) => `${L.addDays("2026-10-01", d - 1)}T04:00:00.000Z`;
const fresh = () => {
  let s = L.installPack(L.freshState(at(1)), pack);
  s.profile = {
    ...s.profile,
    name: "合成测试档案",
    timezone: "Asia/Shanghai",
    ready: true,
  };
  s.cycle.start = "2026-10-01";
  return s;
};
const copy = <T>(x: T): T => structuredClone(x);
function complete(
  s: L.LearningState,
  task: L.Task,
  d: number,
  correct = true,
  hint = false,
) {
  s = L.startTask(s, task, at(d));
  if (s.session!.stage === "read") {
    s = L.markRead(s, at(d));
    s = { ...s, session: { ...s.session!, stage: "question" } };
  }
  while (s.session!.stage !== "done") {
    const x = s.session!,
      u = L.getUnit(s, x.pack, x.unit)!,
      q = u.questions.find((q) => q.id === x.queue[x.index])!;
    if (hint) s = L.help(s, at(d));
    s = {
      ...s,
      session: {
        ...s.session!,
        draft: correct ? q.answers[0] : "测试错误",
        activeSeconds: 20,
      },
    };
    s = L.submit(s, at(d));
    s = L.nextQuestion(s, at(d));
  }
  return s;
}
const cases: { name: string; status: string; error?: string }[] = [];
function test(name: string, fn: () => void) {
  try {
    fn();
    cases.push({ name, status: "passed" });
  } catch (e) {
    cases.push({ name, status: "failed", error: String(e) });
  }
}
const unit = pack.units[0],
  key = L.packKey(pack),
  recall = unit.questions.find((q) => q.type === "cloze")!,
  mc = unit.questions.find((q) => q.type === "single")!;
function attempt(d: number, q = recall, correct = true): L.Attempt {
  return {
    id: crypto.randomUUID(),
    session: crypto.randomUUID(),
    task: crypto.randomUUID(),
    unit: unit.id,
    pack: key,
    question: q.id,
    family: unit.family,
    dimension: q.dimension,
    level: q.level,
    response: correct ? q.answers[0] : "错",
    score: correct ? 1 : 0,
    assisted: false,
    at: at(d),
    date: L.addDays("2026-10-01", d - 1),
    activeSeconds: 20,
  };
}
test("提前复习不不断推迟原定到期日", () => {
  const s = fresh();
  s.covered = [{ unit: unit.id, pack: key, at: at(1), date: "2026-10-01" }];
  s.attempts = [attempt(2), attempt(3)];
  assert.equal(L.reviewState(s, unit.id, at(3)).due, "2026-10-05");
});
test("同日第二维度答错不能被第一维度答对遮住", () => {
  const s = fresh();
  s.attempts = [attempt(2, mc, true), attempt(2, recall, false)];
  assert.equal(L.reviewState(s, unit.id, at(2)).weak, true);
});
test("已经完成的任务不能被再次启动", () => {
  let s = L.buildPlan(fresh(), 20, "normal", true, at(1));
  const t = s.plans.at(-1)!.tasks[0];
  s = complete(s, t, 1);
  assert.throws(() => L.startTask(s, t, at(1)));
});
test("时钟倒退不能在历史日期生成奖励任务", () => {
  let s = L.buildPlan(fresh(), 20, "normal", true, at(3));
  s = complete(s, s.plans.at(-1)!.tasks[0], 3);
  assert.throws(() => L.buildPlan(s, 20, "normal", false, at(2)));
});
test("暂停后反馈页不能继续完成并发奖励", () => {
  let s = L.buildPlan(fresh(), 20, "normal", true, at(1));
  s = L.startTask(s, s.plans.at(-1)!.tasks[0], at(1));
  s = L.markRead(s, at(1));
  s = { ...s, session: { ...s.session!, stage: "question" } };
  s = L.submit(s, at(1));
  s = L.pause(s, true, at(1));
  assert.throws(() => L.nextQuestion(s, at(1)));
});
test("回退时区存档不改变当前周期日期规则", () => {
  const current = fresh(),
    old = copy(current);
  old.profile.timezone = "America/Los_Angeles";
  assert.equal(
    L.mergeRestore(current, old).profile.timezone,
    current.profile.timezone,
  );
});
test("暂停重复调用不产生多个未闭合区间", () => {
  let s = L.pause(fresh(), true, at(2));
  s = L.pause(s, true, at(3));
  assert.equal(s.cycle.pauseLog.length, 1);
});
test("Day30已经提供周期总结条件", () => {
  assert.equal((L.clock(fresh(), at(30)) as any).summaryReady, true);
});
test("空奖励池仍庆祝但不凭空发宝箱奖品", () => {
  let s = fresh();
  s.rewards = [];
  s = L.buildPlan(s, 1, "tired", true, at(1));
  s = complete(s, s.plans.at(-1)!.tasks[0], 1);
  assert.equal(s.grants.length, 1);
  assert.equal(s.chests[0].result, null);
});
test("关闭惊喜保持空宝箱结果且复读不重抽", () => {
  let s = fresh();
  s.settings.chest = false;
  s = L.buildPlan(s, 1, "tired", true, at(1));
  s = complete(s, s.plans.at(-1)!.tasks[0], 1);
  assert.equal(s.chests[0].result, null);
  assert.deepEqual(L.finishSession(s, at(1)).chests, s.chests);
});
test("21天之外只保留历史不计近期熟练", () => {
  const s = fresh();
  s.attempts = [attempt(1), attempt(2), attempt(3)];
  assert.equal(L.evidence(s, unit.id, "recall", at(30)).score, null);
  assert.equal(s.attempts.length, 3);
});
test("提前与延后考试不移动周期起点", () => {
  let s = fresh();
  s.profile.exam = "2026-10-20";
  assert.equal(L.clock(s, at(19)).examPast, false);
  assert.equal(L.clock(s, at(21)).examPast, true);
  s.profile.exam = "2026-11-20";
  assert.equal(L.clock(s, at(30)).duration, 30);
  assert.equal(s.cycle.start, "2026-10-01");
});
const scenarios = [
  { id: "standard-mixed", days: 30 },
  { id: "beginner", days: 30 },
  { id: "proficient", days: 30 },
  { id: "busy-minimum", days: 30 },
  { id: "pause-day12-15", days: 30 },
  { id: "pause-across-end", days: 35 },
  { id: "exam-changes", days: 30 },
  { id: "empty-content", days: 30 },
  { id: "synthetic-expanded", days: 30 },
  { id: "replan-half-budget", days: 30 },
  { id: "content-updates", days: 30 },
];
const journals = [];
for (const config of scenarios) {
  let s = fresh();
  if (config.id === "empty-content") s.packs = [];
  if (config.id === "synthetic-expanded") {
    const p = copy(pack);
    p.id = "synthetic-software-fixture";
    p.units = Array.from({ length: 6 }, (_, i) =>
      pack.units.map((u) => ({
        ...copy(u),
        id: `fixture-${i}-${u.id}`,
        family: `fixture-${i}-${u.family}`,
        questions: u.questions.map((q) => ({
          ...copy(q),
          id: `fixture-${i}-${q.id}`,
          family: `fixture-${i}-${q.family}`,
        })),
      })),
    ).flat();
    p.reviewRecords = p.units.map((u) => ({
      ...pack.reviewRecords[0],
      unitId: u.id,
    }));
    s = { ...s, packs: [L.validatePack(p)] };
  }
  const daily = [];
  for (let d = 1; d <= config.days; d++) {
    const before = s.attempts.length;
    const busy = config.id === "busy-minimum",
      minutes = busy ? (d % 3 ? 10 : 1) : 20,
      mood = busy ? ("tired" as const) : ("normal" as const);
    let action = "learn";
    try {
      if (
        (config.id === "pause-day12-15" && d === 12) ||
        (config.id === "pause-across-end" && d === 28)
      )
        s = L.pause(s, true, at(d));
      if (config.id === "pause-day12-15" && d === 16)
        s = L.pause(s, false, at(d));
      if (config.id === "exam-changes") {
        if (d === 8) s.profile.exam = "2026-10-18";
        if (d === 12) s.profile.exam = "2026-11-05";
        if (d === 20) s.profile.exam = "2026-10-19";
        if (d === 22) s.profile.exam = "";
      }
      if(config.id==='content-updates') {
        if(d===10){const p=copy(pack);p.version=2;const q=p.units[0].questions.find(q=>q.type==='single')!;q.answers=[q.options.find(o=>o.id!==q.answers[0])!.id];const before=JSON.stringify(s.attempts);s=L.installPack(s,p);assert.equal(JSON.stringify(s.attempts),before);}
        if(d===15){const p=copy(s.packs.at(-1)!);p.version=3;p.units[1].status='withdrawn';s=L.installPack(s,p);assert.ok(!L.available(s).some(x=>x.u.id===p.units[1].id));}
        if(d===20){const p=copy(s.packs.at(-1)!);p.version=4;p.units[2].requirement.text+='（测试映射修订）';const before=JSON.stringify(s.attempts);s=L.installPack(s,p);assert.equal(JSON.stringify(s.attempts),before);}
      }
      if (s.cycle.paused) {
        assert.throws(() => L.buildPlan(s, minutes, mood, busy, at(d)));
        action = "paused";
      } else if (L.clock(s, at(d)).examPast) {
        assert.throws(() => L.buildPlan(s, minutes, mood, busy, at(d)));
        action = "exam-past-blocked";
      } else {
        s = L.buildPlan(s, minutes, mood, busy, at(d));
        const plan = s.plans.at(-1)!;
        assert.ok(
          plan.tasks.reduce((n, t) => n + t.seconds, 0) <=
            L.budgetSeconds(minutes, mood).capacity,
        );
        let selected = [...plan.tasks];
        if(config.id==='replan-half-budget'&&selected.length){s=complete(s,selected[0],d,true);const done=selected[0].id;const obsolete=selected[1];s=L.buildPlan(s,10,mood,false,at(d));assert.ok(s.plans.at(-1)!.tasks.some(t=>t.id===done&&t.status==='completed'));if(obsolete)assert.throws(()=>L.startTask(s,obsolete,at(d)));selected=s.plans.at(-1)!.tasks.filter(t=>t.status==='planned');assert.ok(s.plans.at(-1)!.tasks.reduce((n,t)=>n+t.seconds,0)<=L.budgetSeconds(10,mood).capacity);}
        for (const t of selected) {
          assert.ok(L.available(s).some((x) => x.u.id === t.unit));
          const ok =
            config.id === "proficient" ||
            (config.id === "beginner"
              ? d % 4 === 0
              : (d + s.attempts.length) % 5 !== 0);
          s = complete(s, t, d, ok, d % 11 === 0);
        }
        if (d % 7 === 0) {
          const before = JSON.stringify(s.grants);
          s = L.mergeRestore(s, L.validateState(JSON.parse(JSON.stringify(s))));
          assert.equal(JSON.stringify(s.grants), before);
        }
      }
      L.validateState(s);
      assert.equal(new Set(s.grants.map((g) => g.key)).size, s.grants.length);
      assert.equal(
        new Set(s.attempts.map((a) => a.id)).size,
        s.attempts.length,
      );
      assert.equal(
        s.grants.filter((g) => g.kind === "medium" || g.kind === "large")
          .length,
        0,
      );
      assert.ok(s.attempts.length >= before);
      if (s.cycle.paused) assert.equal(s.attempts.length, before);
      daily.push({
        day: d,
        date: L.todayFor(s, at(d)),
        action,
        minutes,
        capacity: L.budgetSeconds(minutes, mood).capacity,
        stage: L.stage(s, at(d)),
        tasks:
          s.plans.filter((p) => p.date === L.todayFor(s, at(d))).at(-1)
            ?.tasks || [],
        coverage: s.covered.length,
        attempts: s.attempts.length,
        exposures: s.exposures.length,
        rewards: s.grants.length,
        chests: s.chests.length,
        evidence: L.available(s).map(({ u }) => ({
          unit: u.id,
          recall: L.evidence(s, u.id, "recall", at(d)).score,
          understand: L.evidence(s, u.id, "understand", at(d)).score,
          review: L.reviewState(s, u.id, at(d)),
        })),
      });
    } catch (e) {
      daily.push({ day: d, error: String(e) });
      cases.push({
        name: `${config.id} Day${d}`,
        status: "failed",
        error: String(e),
      });
      break;
    }
  }
  if(config.id==='busy-minimum')test('忙碌的30天不会永远困在同一经典',()=>assert.ok(s.covered.length>1));
  if (daily.length === config.days && !daily.some((x) => "error" in x))
    cases.push({
      name: `${config.id}: ${config.days}日状态不变量`,
      status: "passed",
    });
  journals.push({
    scenario: config.id,
    syntheticOnly: config.id === "synthetic-expanded",
    daily,
  });
}
writeFileSync(
  `${out}/journey-days.json`,
  JSON.stringify(
    {
      seed: 20260929,
      clock:
        "injected UTC instants; Asia/Shanghai cycle timezone; no OS clock change",
      journals,
    },
    null,
    2,
  ),
);
writeFileSync(
  `${out}/journey-results.json`,
  JSON.stringify(
    {
      cases,
      daysExecuted: journals.reduce((n, j) => n + j.daily.length, 0),
      passed: cases.filter((c) => c.status === "passed").length,
      failed: cases.filter((c) => c.status === "failed").length,
    },
    null,
    2,
  ),
);
Object.defineProperty(globalThis, "crypto", {
  configurable: true,
  value: original,
});
console.log(
  JSON.stringify(
    cases.filter((c) => c.status === "failed"),
    null,
    2,
  ),
);
if (cases.some((c) => c.status === "failed")) process.exitCode = 1;
