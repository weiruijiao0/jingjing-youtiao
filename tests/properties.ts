import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import * as L from "../src/learning.ts";
const pack = L.validatePack(
  await L.readEnvelope(
    JSON.parse(
      readFileSync("../content/四经典_基础核定切片.jjcontent.json", "utf8"),
    ),
    "content",
  ),
);
let seed = 4042026;
const rand = (n: number) => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed % n;
};
const results = [];
const now = "2026-10-20T04:00:00.000Z";
for (let i = 0; i < 1000; i++) {
  const p = structuredClone(pack);
  p.units.forEach((u) => {
    u.status = (
      [
        "published",
        "published",
        "needs_review",
        "conflicted",
        "withdrawn",
      ] as const
    )[rand(5)];
    u.pool = (
      [
        "training",
        "training",
        "stage_assessment",
        "final_assessment",
        "quarantine",
      ] as const
    )[rand(5)];
  });
  let s = L.installPack(L.freshState(now), p);
  s.profile.name = "随机软件测试";
  s.profile.ready = true;
  s.cycle.start = "2026-10-01";
  s.covered = p.units
    .filter(() => rand(2) === 1)
    .map((u) => ({
      unit: u.id,
      pack: L.packKey(p),
      date: "2026-10-02",
      at: "2026-10-02T04:00:00.000Z",
    }));
  const n = 1 + rand(180),
    mood = (["tired", "normal", "great"] as const)[rand(3)];
  s = L.buildPlan(s, n, mood, rand(3) === 0, now);
  const plan = s.plans.at(-1)!;
  assert.ok(
    plan.tasks.reduce((sum, t) => sum + t.seconds, 0) <=
      L.budgetSeconds(n, mood).capacity,
  );
  for (const t of plan.tasks)
    assert.ok(
      L.available(s).some((a) => a.u.id === t.unit && a.pack === t.pack),
    );
  const frozen = JSON.stringify(s);
  const paused = L.pause(s, true, now);
  assert.throws(() => L.buildPlan(paused, n, mood, false, now));
  assert.equal(JSON.stringify(s), frozen);
  const restored = L.mergeRestore(
    s,
    L.validateState(JSON.parse(JSON.stringify(s))),
  );
  assert.deepEqual(restored.attempts, s.attempts);
  assert.deepEqual(restored.grants, s.grants);
  assert.deepEqual(restored.exposures, s.exposures);
  L.validateState(restored);
  results.push({
    case: i,
    minutes: n,
    mood,
    eligible: L.available(s).length,
    scheduled: plan.tasks.length,
    status: "passed",
  });
}
const a = L.installPack(L.freshState(now), pack),
  other = structuredClone(pack);
other.id = "other-version";
other.units[0].pool = "final_assessment";
const b = L.installPack(L.freshState(now), other);
b.profile.id = a.profile.id;
assert.throws(() => L.mergeRestore(a, b));
const malformed = structuredClone(a);
malformed.packs[0].units[0].questions[0].answers = ["missing-id"];
assert.throws(() => L.validateState(malformed));
mkdirSync("../verification", { recursive: true });
writeFileSync(
  "../verification/property-results.json",
  JSON.stringify(
    {
      seed: 4042026,
      randomCases: 1000,
      extraChecks: ["合并存档跨包家族冲突拒绝", "损坏评分引用拒绝"],
      failed: 0,
      results,
    },
    null,
    2,
  ),
);
console.log("1000 seeded property scenarios and 2 restore guards passed.");
