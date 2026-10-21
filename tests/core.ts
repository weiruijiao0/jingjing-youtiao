import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import * as L from "../src/learning.ts";
const results: { test: string; status: string }[] = [];
const test = (name: string, fn: () => void) => {
  fn();
  results.push({ test: name, status: "passed" });
};
const pack = L.validatePack(
  await L.readEnvelope(
    JSON.parse(
      readFileSync("../content/四经典_基础核定切片.jjcontent.json", "utf8"),
    ),
    "content",
  ),
);
const now = "2026-09-29T04:00:00.000Z";
let base = L.installPack(L.freshState(now), pack);
base.profile.name = "小叶";
base.profile.ready = true;
const unit = pack.units[0],
  key = L.packKey(pack),
  q = unit.questions.find((q) => q.type === "cloze")!;
const copy = <T>(v: T): T => structuredClone(v);
const attempt = (
  day: number,
  id = String(day),
  assisted = false,
): L.Attempt => ({
  id,
  session: id,
  task: id,
  unit: unit.id,
  pack: key,
  question: q.id,
  family: unit.family,
  dimension: q.dimension,
  level: 1,
  response: q.answers[0],
  score: 1,
  assisted,
  at: `2026-09-${String(day).padStart(2, "0")}T04:00:00.000Z`,
  date: `2026-09-${String(day).padStart(2, "0")}`,
  activeSeconds: 4,
});
test("四经典4单元20项目，只有4个训练家族", () => {
  assert.equal(pack.units.length, 4);
  assert.equal(
    pack.units.reduce((n, u) => n + u.questions.length, 0),
    20,
  );
  assert.equal(new Set(pack.units.map((u) => u.family)).size, 4);
  assert.equal(L.available(base).length, 4);
});
test("挖空跨度错位拒绝", () => {
  const p = copy(pack);
  p.units[0].questions.find((x) => x.type === "cloze")!.span = [0, 1];
  assert.throws(() => L.validatePack(p));
});
test("稳定选项标识不受选项顺序影响", () => {
  const c = copy(unit.questions.find((q) => q.type === "single")!);
  c.options.reverse();
  assert.equal(L.grade(c, c.answers[0]), 1);
  assert.equal(L.grade(c, "A"), 0);
});
test("同原文不得跨版本分池", () => {
  const p = copy(pack);
  p.version++;
  p.units[0].pool = "final_assessment";
  assert.throws(() => L.installPack(base, p));
});
test("同版本不可静默改答案", () => {
  const p = copy(pack);
  p.units[0].title += "修改";
  assert.throws(() => L.installPack(base, p));
});
test("隔离、待审与测评池均不进入训练", () => {
  const p = copy(pack);
  p.units[0].pool = "quarantine";
  p.units[1].status = "needs_review";
  p.units[2].pool = "stage_assessment";
  const s = L.installPack(L.freshState(now), p);
  assert.equal(L.available(s).length, 1);
});
test("前置关系循环拒绝", () => {
  const p = copy(pack);
  p.units[0].prerequisites = [p.units[1].id];
  p.units[1].prerequisites = [p.units[0].id];
  assert.throws(() => L.validatePack(p));
});
test("1至180分钟×3种状态计划不超预算", () => {
  for (let n = 1; n <= 180; n++)
    for (const mood of ["normal", "tired", "great"] as const) {
      const s = L.buildPlan(base, n, mood, false, now),
        p = s.plans.at(-1)!;
      assert.ok(
        p.tasks.reduce((n, t) => n + t.seconds, 0) <=
          L.budgetSeconds(n, mood).capacity,
      );
      L.validateState(s);
    }
});
test("暂停与过期考试阻止新计划", () => {
  assert.throws(() =>
    L.buildPlan(L.pause(base, true, now), 20, "normal", false, now),
  );
  const s = copy(base);
  s.profile.exam = "2026-09-28";
  assert.throws(() => L.buildPlan(s, 20, "normal", false, now));
});
test("同日同家族重复首答不堆掌握", () => {
  const s = copy(base);
  s.attempts = [attempt(29, "a"), attempt(29, "b"), attempt(29, "c")];
  assert.equal(L.evidence(s, unit.id, "recall", now).count, 1);
  assert.equal(L.evidence(s, unit.id, "recall", now).score, null);
});
test("跨三天无帮助回忆产生有限证据", () => {
  const s = copy(base);
  s.attempts = [attempt(27), attempt(28), attempt(29)];
  assert.equal(L.evidence(s, unit.id, "recall", now).score, 0.8);
});
test("提示不形成独立掌握，第一次提示后当日再答也不累加", () => {
  const s = copy(base);
  s.attempts = [
    attempt(27, "a", true),
    attempt(27, "b"),
    attempt(28, "c", true),
    attempt(29, "d", true),
  ];
  assert.equal(L.evidence(s, unit.id, "recall", now).count, 0);
});
test("理解单一家族不会宣布掌握", () => {
  const s = copy(base),
    m = unit.questions.find((q) => q.type === "single")!;
  s.attempts = [27, 28, 29].map((d) => ({
    ...attempt(d),
    question: m.id,
    dimension: "understand",
    response: m.answers[0],
  }));
  assert.equal(L.evidence(s, unit.id, "understand", now).score, null);
});
test("同日改对不能抹去首次错误", () => {
  const s = copy(base);
  s.attempts = [
    { ...attempt(29, "a"), response: "错", score: 0 },
    attempt(29, "b"),
  ];
  assert.equal(L.reviewState(s, unit.id, now).weak, true);
});
let completed: L.LearningState;
test("真实学习阅读、首答、完成与奖励原子状态", () => {
  let s = L.buildPlan(base, 20, "normal", true, now);
  s = L.startTask(s, s.plans.at(-1)!.tasks[0], now);
  assert.throws(() => L.finishSession(s, now));
  assert.throws(() => L.buildPlan(s, 20, "normal", false, now));
  s = L.markRead(s, now);
  s = { ...s, session: { ...s.session!, stage: "question", draft: "不知道" } };
  s = L.submit(s, now);
  assert.equal(s.attempts.length, 1);
  assert.equal(s.attempts[0].assisted, true);
  assert.equal(L.submit(s, now).attempts.length, 1);
  s = L.nextQuestion(s, now);
  assert.equal(s.session!.stage, "done");
  assert.equal(s.grants.filter((g) => g.kind === "small").length, 1);
  assert.deepEqual(L.finishSession(s, now), s);
  completed = s;
  L.validateState(s);
});
test("重排保留已完成任务且不重新领日奖", () => {
  const s = L.buildPlan(completed, 20, "normal", false, now);
  assert.equal(
    s.plans.at(-1)!.tasks.filter((t) => t.status === "completed").length,
    1,
  );
  assert.equal(s.grants.length, completed.grants.length);
});
test("撤回影响出题与重算，保留原始首答", () => {
  const s = { ...completed, withdrawn: [completed.attempts[0].unit] };
  assert.equal(L.effectiveScore(s, s.attempts[0]), null);
  assert.equal(L.available(s).length, 3);
  assert.equal(s.attempts.length, 1);
});
test("旧存档恢复保留曝光、奖励、宝箱与撤回", () => {
  const current = { ...completed, withdrawn: [unit.id] };
  const s = L.mergeRestore(current, base);
  assert.deepEqual(s.exposures, current.exposures);
  assert.deepEqual(s.chests, current.chests);
  assert.deepEqual(s.grants, current.grants);
  assert.ok(s.withdrawn.includes(unit.id));
});
test("同版本篡改存档拒绝", () => {
  const incoming = copy(base);
  incoming.packs[0].units[0].title += "冲突";
  assert.throws(() => L.mergeRestore(base, incoming));
});
test("新版本重评分但原始分数不可变", () => {
  const s = copy(base),
    m = unit.questions.find((q) => q.type === "single")!;
  s.attempts = [
    {
      ...attempt(29),
      question: m.id,
      dimension: "understand",
      response: m.answers[0],
    },
  ];
  const p = copy(pack);
  p.version++;
  p.units[0].questions.find((q) => q.id === m.id)!.answers = [
    m.options.find((o) => o.id !== m.answers[0])!.id,
  ];
  const n = L.installPack(s, p);
  assert.equal(n.attempts[0].score, 1);
  assert.equal(L.effectiveScore(n, n.attempts[0]), 0);
});
test("存档缺失引用、模式不符与未知版本拒绝", () => {
  const s = copy(base);
  s.covered = [{ unit: "missing", pack: key, at: now, date: "2026-09-29" }];
  assert.throws(() => L.validateState(s));
  assert.throws(() => L.validateState({ ...base, mode: "demo" }));
  assert.throws(() => L.validateState({ ...base, schema: 2 }));
});
const envelope = await L.makeEnvelope(completed!);
assert.deepEqual(
  L.validateState(await L.readEnvelope(envelope, "archive")),
  completed!,
);
await assert.rejects(() =>
  L.readEnvelope({ ...envelope, payload: envelope.payload + " " }, "archive"),
);
results.push({ test: "存档摘要往返与损坏拒绝", status: "passed" });
mkdirSync("../verification", { recursive: true });
writeFileSync(
  "../verification/core-results.json",
  JSON.stringify(
    { checks: results.length, budgetScenarios: 540, results },
    null,
    2,
  ),
);
console.log(
  `${results.length} core checks passed, including 540 budget scenarios.`,
);
