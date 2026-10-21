import { z } from "zod";

const text = z.string().max(12000),
  id = z.string().min(1).max(160),
  date = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (v) =>
        !Number.isNaN(Date.parse(v)) &&
        new Date(v).toISOString().slice(0, 10) === v,
    ),
  instant = z.string().datetime();
const questionSchema = z.object({
  id,
  family: id,
  dimension: z.enum(["recall", "understand"]),
  type: z.enum(["single", "cloze"]),
  level: z.number().int().min(1).max(3),
  stem: text,
  options: z.array(z.object({ id, text })).max(10),
  answers: z.array(text).min(1).max(8),
  explanation: text,
  span: z
    .tuple([z.number().int().nonnegative(), z.number().int().positive()])
    .nullable(),
});
const unitSchema = z.object({
  id,
  revision: z.number().int().positive(),
  classic: z.number().int().min(0).max(3),
  title: text,
  chapter: text,
  passage: text.min(1),
  explanation: text.min(1),
  source: id,
  page: z.number().int().positive(),
  printedPage: z.number().int().positive(),
  requirement: z.object({
    id,
    text,
    page: z.number().int().positive(),
    mapping: z.enum(["partial", "complete"]),
  }),
  family: id,
  pool: z.enum([
    "training",
    "stage_assessment",
    "final_assessment",
    "quarantine",
  ]),
  status: z.enum(["published", "withdrawn", "needs_review", "conflicted"]),
  review: z.enum(["single-source-visual", "dual-reviewed", "cross-source-text"]),
  prerequisites: z.array(id).max(50),
  questions: z.array(questionSchema).min(1).max(100),
  estimatedSeconds: z.number().int().min(30).max(1800),
  core: z.number().min(0).max(1),
});
export const packSchema = z.object({
  format: z.literal("jingjing-content"),
  schema: z.literal(1),
  id,
  version: z.number().int().positive(),
  release: z.enum(["local_only", "public_allowed"]),
  syllabus: id,
  scopeTotal: z.number().int().positive(),
  scopeStatus: z.literal("candidate"),
  coreVerified: z.boolean(),
  blueprintVerified: z.boolean(),
  sources: z
    .array(
      z.object({
        id,
        title: text,
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
        distribution: z.enum(["local_only", "public_allowed"]),
      }),
    )
    .min(1)
    .max(1000),
  units: z.array(unitSchema).min(1).max(10000),
  reviewedAt: date,
  reviewRecords: z
    .array(
      z.object({
        unitId: id,
        reviewer: text,
        sourceCheck: text,
        scopeCheck: text,
        answerCheck: text,
        familyCheck: text,
        limitations: text,
      }),
    )
    .max(10000),
});
export type Pack = z.infer<typeof packSchema>;
export type Unit = Pack["units"][number];
export type Question = Unit["questions"][number];
const taskSchema = z.object({
  id,
  unit: id,
  pack: id,
  kind: z.enum(["learn", "review", "train", "minimum"]),
  seconds: z.number().int().min(1).max(1800),
  reason: text,
  status: z.enum(["planned", "active", "completed", "deferred", "cancelled"]),
});
const planSchema = z.object({
  id,
  date,
  revision: z.number().int().positive(),
  minutes: z.number().int().min(1).max(180),
  mood: z.enum(["tired", "normal", "great"]),
  capacity: z.number().int().positive(),
  tasks: z.array(taskSchema).max(200),
  note: text,
  createdAt: instant,
});
const grantSchema = z.object({
  key: id,
  title: text,
  kind: z.enum(["small", "medium", "large", "chest"]),
  date,
  redeemed: z.boolean(),
});
const exposureSchema = z.object({
  id,
  family: id,
  unit: id,
  kind: z.enum(["stem", "read", "answer"]),
  at: instant,
  date,
});
const attemptSchema = z.object({
  id,
  session: id,
  task: id,
  unit: id,
  pack: id,
  question: id,
  family: id,
  dimension: z.enum(["recall", "understand"]),
  level: z.number().int().min(1).max(3),
  response: text,
  score: z.number().min(0).max(1),
  assisted: z.boolean(),
  at: instant,
  date,
  activeSeconds: z.number().int().min(0).max(3600),
});
const sessionSchema = z.object({
  id,
  task: id,
  unit: id,
  pack: id,
  stage: z.enum(["read", "explain", "question", "feedback", "done"]),
  queue: z.array(id).min(1).max(10),
  index: z.number().int().nonnegative(),
  draft: z.string().max(1000),
  help: z.boolean(),
  startedAt: instant,
  activeSeconds: z.number().int().nonnegative(),
  mode: z.enum(["learn", "review", "train", "minimum", "placement"]),
});
const stateSchema = z.object({
  format: z.literal("jingjing-learning-state"),
  schema: z.literal(1),
  mode: z.literal("learning"),
  algorithm: z.literal("coach-v1"),
  revision: z.number().int().nonnegative(),
  profile: z.object({
    id,
    name: z.string().max(40),
    exam: z.union([date, z.literal("")]),
    timezone: z.string().max(80),
    ready: z.boolean(),
    defaultMinutes: z.number().int().min(1).max(180),
  }),
  cycle: z.object({
    id,
    start: date,
    paused: z.boolean(),
    pauseLog: z
      .array(z.object({ start: instant, end: instant.nullable() }))
      .max(10000),
  }),
  settings: z.object({
    sound: z.boolean(),
    reducedMotion: z.boolean(),
    chest: z.boolean(),
  }),
  packs: z.array(packSchema).max(50),
  withdrawn: z.array(id).max(10000),
  plans: z.array(planSchema).max(10000),
  session: sessionSchema.nullable(),
  attempts: z.array(attemptSchema).max(100000),
  courseAnswers: z.array(z.object({ id, question: id, response: text, at: instant, score: z.number().min(0).max(1).nullable(), revealed: z.boolean(), coach: z.object({requirement:id,kind:z.enum(['practice','retest']),closedBook:z.boolean(),delayedEligible:z.boolean()}).optional(), errorCause:z.enum(['recall','confusion','condition','unsure']).optional(), correction:text.optional(),correctionAt:instant.optional() })).max(100000).default([]),
  courseDraft: z.object({ question: id, response: text }).nullable().default(null),
  courseRecall: z.array(z.object({ id, requirement: id, response: text, at: instant, confidence: z.enum(['again','unsure','recalled']), nextReviewAt: instant })).max(100000).default([]),
  courseRecallDraft: z.object({queue:z.array(id).max(100),response:text,show:z.boolean(),phase:z.enum(['read','recall']).optional(),total:z.number().int().min(1).max(100).optional()}).nullable().default(null),
  courseMode: z.enum(['guided','sprint']).default('guided'),
  restartToken: id.optional(),
  courseSchedule: z.object({dailyMinutes:z.number().int().min(20).max(240),days:z.array(z.object({day:z.number().int().min(1).max(24),requirements:z.array(id).max(1000)})).length(24)}).nullable().default(null),
  courseReviewTasks: z.array(id).max(100).default([]),
  courseExposures: z.array(z.object({question:id,at:instant})).max(100000).default([]),
  courseExams: z.array(z.object({id,questionIds:z.array(id).min(1).max(100),startedAt:instant,submittedAt:instant.nullable(),responses:z.record(id,text)})).max(1000).default([]),
  courseCoach: z.object({id,date,minutes:z.number().int().min(20).max(240),createdAt:instant,index:z.number().int().min(0).max(100),tasks:z.array(z.object({id,requirement:id,kind:z.enum(['learn','review','repair']),question:id.nullable(),phase:z.enum(['read','recall','compare','question','feedback','repair','done']),response:text,recallResponse:text,confidence:z.enum(['again','unsure','recalled']),writtenConfidence:z.enum(['unsure','recalled']).optional(),attemptId:id.optional()})).min(1).max(100)}).nullable().default(null),
  exposures: z.array(exposureSchema).max(100000),
  covered: z
    .array(z.object({ unit: id, pack: id, at: instant, date }))
    .max(10000),
  rewards: z
    .array(
      z.object({
        id,
        title: z.string().min(1).max(60),
        size: z.enum(["small", "medium", "large"]),
      }),
    )
    .max(100),
  grants: z.array(grantSchema).max(10000),
  chests: z
    .array(z.object({ key: id, result: z.string().max(60).nullable() }))
    .max(10000),
  reports: z
    .array(
      z.object({
        id,
        at: instant,
        stage: text,
        summary: text,
        covered: z.number().int().nonnegative(),
        attempts: z.number().int().nonnegative(),
      }),
    )
    .max(10000),
  placement: z.object({
    status: z.enum(["not_started", "active", "done", "skipped"]),
    startedAt: instant.nullable(),
    activeSeconds: z.number().int().nonnegative(),
    families: z.array(id).max(24),
    message: text,
  }),
});
export type LearningState = z.infer<typeof stateSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Plan = z.infer<typeof planSchema>;
export type Attempt = z.infer<typeof attemptSchema>;
export const classicNames = ["黄帝内经", "伤寒论", "金匮要略", "温病学"];
export const nowISO = () => new Date().toISOString();
export function dayAt(now: string, zone: string) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(now));
  return ["year", "month", "day"]
    .map((x) => p.find((v) => v.type === x)!.value)
    .join("-");
}
export const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(a) - Date.parse(b)) / 86400000);
export const addDays = (d: string, n: number) =>
  new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10);
export const todayFor = (s: LearningState, now = nowISO()) =>
  dayAt(now, s.profile.timezone);
export function assertClock(s: LearningState, now: string) {
  let latest = 0;
  for (const a of [...s.attempts, ...s.exposures])
    latest = Math.max(latest, Date.parse(a.at));
  for (const p of s.plans) latest = Math.max(latest, Date.parse(p.createdAt));
  if (Date.parse(now) + 60000 < latest)
    throw Error(
      "设备时间早于已保存的学习记录，请校正时间后继续。原记录已保留。",
    );
}
export const packKey = (p: Pick<Pack, "id" | "version">) =>
  `${p.id}@${p.version}`;
export function freshState(now = nowISO()): LearningState {
  const zone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai";
  return {
    format: "jingjing-learning-state",
    schema: 1,
    mode: "learning",
    algorithm: "coach-v1",
    courseAnswers: [],
    courseDraft: null,
    courseRecall: [],
    courseSchedule: null,
    courseMode: 'guided',
    courseReviewTasks: [],
    courseRecallDraft: null,
    courseExposures: [],
    courseExams: [],
    courseCoach: null,
    revision: 0,
    profile: {
      id: crypto.randomUUID(),
      name: "",
      exam: "",
      timezone: zone,
      ready: false,
      defaultMinutes: 20,
    },
    cycle: {
      id: crypto.randomUUID(),
      start: dayAt(now, zone),
      paused: false,
      pauseLog: [],
    },
    settings: { sound: false, reducedMotion: false, chest: true },
    packs: [],
    withdrawn: [],
    plans: [],
    session: null,
    attempts: [],
    exposures: [],
    covered: [],
    grants: [],
    chests: [],
    reports: [],
    rewards: [
      { id: "tea", title: "慢慢喝一杯喜欢的茶", size: "small" },
      { id: "walk", title: "去公园散一会儿步", size: "medium" },
      { id: "book", title: "给自己选一本新书", size: "large" },
    ],
    placement: {
      status: "not_started",
      startedAt: null,
      activeSeconds: 0,
      families: [],
      message: "",
    },
  };
}
function unique(values: string[], label: string) {
  if (new Set(values).size !== values.length)
    throw Error(`${label}存在重复标识。`);
}
export function validatePack(raw: unknown): Pack {
  const p = packSchema.parse(raw);
  unique(
    p.units.map((u) => u.id),
    "学习单元",
  );
  unique(
    p.sources.map((s) => s.id),
    "来源",
  );
  unique(
    p.units.flatMap((u) => u.questions.map((q) => q.id)),
    "题目",
  );
  const pools = new Map<string, string>();
  for (const u of p.units) {
    if (
      !p.sources.some((s) => s.id === u.source) ||
      !p.reviewRecords.some((r) => r.unitId === u.id) ||
      !u.requirement.text
    )
      throw Error("学习单元缺少来源、范围或审查记录。");
    if (pools.has(u.family) && pools.get(u.family) !== u.pool)
      throw Error("同一家族不能进入不同题库。");
    pools.set(u.family, u.pool);
    if (
      u.prerequisites.some(
        (x) => x === u.id || !p.units.some((a) => a.id === x),
      )
    )
      throw Error("前置知识点引用无效。");
    for (const q of u.questions) {
      if (q.family !== u.family) throw Error("派生题家族与原文家族不一致。");
      unique(
        q.options.map((o) => o.id),
        "选项",
      );
      if (
        q.type === "single" &&
        (q.dimension !== "understand" ||
          q.answers.length !== 1 ||
          q.options.length < 2 ||
          !q.options.some((o) => o.id === q.answers[0]))
      )
        throw Error("单选评分规则不完整。");
      if (
        q.type === "cloze" &&
        (q.dimension !== "recall" ||
          !q.span ||
          q.span[0] >= q.span[1] ||
          q.span[1] > u.passage.length ||
          q.answers.length !== 1 ||
          q.answers[0] !== u.passage.slice(...q.span))
      )
        throw Error("挖空跨度与原文不一致。");
    }
  }
  const visiting = new Set<string>(),
    visited = new Set<string>();
  const visit = (u: Unit) => {
    if (visiting.has(u.id)) throw Error("前置关系不能成环。");
    if (visited.has(u.id)) return;
    visiting.add(u.id);
    u.prerequisites.forEach((x) => visit(p.units.find((a) => a.id === x)!));
    visiting.delete(u.id);
    visited.add(u.id);
  };
  p.units.forEach(visit);
  return p;
}
export async function sha256(text: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
    ),
  )
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
export async function readEnvelope(raw: unknown, kind: "content" | "archive") {
  const e = z
    .object({
      format: z.literal(
        kind === "content"
          ? "jingjing-content-envelope"
          : "jingjing-learning-archive",
      ),
      version: z.literal(1),
      payload: z.string().max(25 * 1024 * 1024),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .parse(raw);
  if ((await sha256(e.payload)) !== e.sha256)
    throw Error("文件摘要不一致，可能已损坏；当前记录未改变。");
  return JSON.parse(e.payload) as unknown;
}
export async function makeEnvelope(s: LearningState) {
  const payload = JSON.stringify(s);
  return {
    format: "jingjing-learning-archive",
    version: 1,
    payload,
    sha256: await sha256(payload),
  };
}
export function getUnit(s: LearningState, key: string, id: string) {
  return s.packs
    .find((p) => packKey(p) === key)
    ?.units.find((u) => u.id === id);
}
export function available(s: LearningState) {
  const newest = new Map<string, Pack>();
  for (const p of s.packs)
    if (!newest.has(p.id) || newest.get(p.id)!.version < p.version)
      newest.set(p.id, p);
  return [...newest.values()].flatMap((p) =>
    p.units
      .filter(
        (u) =>
          u.status === "published" &&
          u.pool === "training" &&
          !s.withdrawn.includes(u.id),
      )
      .map((u) => ({ u, pack: packKey(p) })),
  );
}
export function validateState(raw: unknown): LearningState {
  const s = stateSchema.parse(raw);
  try {
    new Intl.DateTimeFormat("en", { timeZone: s.profile.timezone });
  } catch {
    throw Error("存档时区无效。");
  }
  if (
    s.profile.ready &&
    (!s.profile.name.trim() || Array.from(s.profile.name).length > 20)
  )
    throw Error("伙伴名称无效。");
  s.packs.forEach(validatePack);
  if(s.courseCoach){
    unique(s.courseCoach.tasks.map(t=>t.id),'领学任务');
    if(s.courseCoach.index>s.courseCoach.tasks.length)throw Error('领学进度超出任务范围。');
    for(const t of s.courseCoach.tasks)if(t.attemptId&&!s.courseAnswers.some(a=>a.id===t.attemptId&&a.question===t.question))throw Error('领学作答记录缺失。');
  }
  const pools = new Map<string, string>();
  for (const p of s.packs)
    for (const u of p.units) {
      if (pools.has(u.family) && pools.get(u.family) !== u.pool)
        throw Error("存档家族分池冲突。");
      pools.set(u.family, u.pool);
    }
  for (const c of s.covered)
    if (!getUnit(s, c.pack, c.unit)) throw Error("阅读记录缺少来源快照。");
  for (const e of s.exposures)
    if (
      !s.packs.some((p) =>
        p.units.some((u) => u.id === e.unit && u.family === e.family),
      )
    )
      throw Error("曝光记录引用断裂。");
  unique(s.packs.map(packKey), "内容包");
  unique(
    s.attempts.map((a) => a.id),
    "作答",
  );
  unique(
    s.exposures.map((e) => e.id),
    "曝光",
  );
  unique(
    s.grants.map((g) => g.key),
    "奖励",
  );
  unique(
    s.chests.map((c) => c.key),
    "宝箱",
  );
  unique(
    s.reports.map((r) => r.id),
    "报告",
  );
  unique(
    s.plans.map((p) => p.id),
    "计划",
  );
  unique(
    s.rewards.map((r) => r.id),
    "奖励定义",
  );
  for (const p of s.plans) {
    unique(
      p.tasks.map((t) => t.id),
      "任务",
    );
    if (
      p.tasks
        .filter((t) => !["deferred", "cancelled"].includes(t.status))
        .reduce((n, t) => n + t.seconds, 0) > p.capacity
    )
      throw Error("存档任务超过预算。");
    for (const t of p.tasks)
      if (!getUnit(s, t.pack, t.unit)) throw Error("存档缺少任务内容快照。");
  }
  for (const a of s.attempts) {
    const u = getUnit(s, a.pack, a.unit),
      q = u?.questions.find((q) => q.id === a.question);
    if (!u || !q || q.family !== a.family || q.dimension !== a.dimension)
      throw Error("存档作答引用断裂。");
  }
  if (s.session) {
    const x = s.session,
      u = getUnit(s, x.pack, x.unit);
    if (
      !u ||
      x.index >= x.queue.length ||
      x.queue.some((q) => !u.questions.some((a) => a.id === q))
    )
      throw Error("当前会话快照不完整。");
  }
  return s;
}
export function installPack(s: LearningState, pack: Pack) {
  const p = validatePack(pack),
    old = s.packs.find((x) => packKey(x) === packKey(p));
  if (old) {
    if (JSON.stringify(old) !== JSON.stringify(p))
      throw Error("同版本内容不能被静默替换，请使用新的版本号。");
    return s;
  }
  const pools = new Map<string, string>();
  for (const x of [...s.packs, p])
    for (const u of x.units) {
      if (pools.has(u.family) && pools.get(u.family) !== u.pool)
        throw Error("跨版本家族用途冲突，需先人工处理。");
      pools.set(u.family, u.pool);
    }
  const next = {
    ...s,
    packs: [...s.packs, p],
    withdrawn: [
      ...new Set([
        ...s.withdrawn,
        ...p.units
          .filter((u) => u.status === "withdrawn" || u.status === "conflicted")
          .map((u) => u.id),
      ]),
    ],
  };
  return invalidateWithdrawn(next);
}
export function invalidateWithdrawn(s: LearningState) {
  const valid = new Set(available(s).map(({ u }) => u.id));
  return {
    ...s,
    plans: s.plans.map((p) => ({
      ...p,
      tasks: p.tasks.map((t) =>
        !valid.has(t.unit) && t.status !== "completed"
          ? { ...t, status: "cancelled" as const }
          : t,
      ),
    })),
  };
}
export function clock(s: LearningState, now = nowISO()) {
  const day = todayFor(s, now),
    exam = s.profile.exam;
  const duration = exam
    ? Math.max(1, Math.min(30, daysBetween(exam, s.cycle.start)))
    : 30;
  const elapsed = Math.max(1, daysBetween(day, s.cycle.start) + 1);
  return {
    day,
    elapsed,
    duration,
    remaining: Math.max(0, duration - elapsed + 1),
    ended: elapsed > duration,
    summaryReady: elapsed >= duration,
    examToday: exam === day,
    examPast: !!exam && exam < day,
  };
}
export function budgetSeconds(
  minutes: number,
  mood: "tired" | "normal" | "great",
) {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180)
    throw Error("请选择 1—180 分钟整数。");
  const pause =
    minutes < 60
      ? 0
      : minutes < 90
        ? 5
        : Math.min(20, 5 * Math.floor(minutes / 45));
  const overhead = Math.min(3, Math.floor(minutes * 0.1));
  return {
    capacity: Math.max(
      60,
      Math.floor((minutes - pause - overhead) * (mood === "tired" ? 0.85 : 1)) *
        60,
    ),
    breakSeconds: pause * 60,
    overheadSeconds: overhead * 60,
  };
}
export function grade(q: Question, response: string) {
  if (q.type === "single") return q.answers.includes(response) ? 1 : 0;
  const norm = (v: string) =>
    v.replace(/[\s，。；：、！？,.!?:;“”‘’「」『』（）()]/g, "");
  return q.answers.some((a) => norm(a) === norm(response)) ? 1 : 0;
}
export function effectiveScore(s: LearningState, a: Attempt) {
  const item = available(s)
    .find((x) => x.u.id === a.unit)
    ?.u.questions.find((q) => q.id === a.question);
  return item ? grade(item, a.response) : null;
}
export function evidence(
  s: LearningState,
  unit: string,
  dimension: "understand" | "recall",
  now = nowISO(),
) {
  const seen = new Set<string>();
  const all = s.attempts
    .filter(
      (a) =>
        a.unit === unit &&
        a.dimension === dimension &&
        Date.parse(a.at) <= Date.parse(now) &&
        Date.parse(now) - Date.parse(a.at) <= 21 * 86400000,
    )
    .sort((a, b) => a.at.localeCompare(b.at));
  const first = all.filter((a) => {
    const key = `${a.family}:${a.date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const eligible = first
    .filter((a) => !a.assisted && effectiveScore(s, a) !== null)
    .slice(-20);
  const families = new Set(eligible.map((a) => a.family)),
    dates = new Set(eligible.map((a) => a.date));
  const spread = eligible.length
    ? Date.parse(eligible.at(-1)!.at) - Date.parse(eligible[0].at)
    : 0;
  const sufficient =
    eligible.length >= 3 &&
    (dimension === "understand"
      ? families.size >= 2
      : dates.size >= 2 && spread >= 86400000);
  return {
    count: eligible.length,
    families: families.size,
    dates: dates.size,
    score: sufficient
      ? (1 + eligible.reduce((n, a) => n + effectiveScore(s, a)!, 0)) /
        (2 + eligible.length)
      : null,
    items: eligible,
  };
}
export function reviewState(s: LearningState, unit: string, now = nowISO()) {
  const coverage = s.covered.find((c) => c.unit === unit);
  let interval = 1,
    due = coverage ? addDays(coverage.date, 1) : null,
    last = coverage?.date || null,
    weak = false;
  const seen = new Set<string>();
  const groups = new Map<string, Attempt[]>();
  for (const a of s.attempts
    .filter((a) => a.unit === unit)
    .sort((a, b) => a.at.localeCompare(b.at))) {
    const key = `${a.date}:${a.family}:${a.dimension}`;
    if (seen.has(key) || Date.parse(a.at) > Date.parse(now)) continue;
    seen.add(key);
    if (effectiveScore(s, a) === null) continue;
    groups.set(a.date, [...(groups.get(a.date) || []), a]);
  }
  for (const [date, attempts] of groups) {
    if (attempts.some((a) => effectiveScore(s, a) === 0)) {
      interval = 1;
      weak = true;
      due = addDays(date, 1);
    } else if (!due || date >= due) {
      if (due && attempts.some((a) => !a.assisted)) {
        interval = interval === 1 ? 3 : interval === 3 ? 7 : 14;
        weak = false;
      }
      due = addDays(date, interval);
    }
    last = date;
  }
  return { interval, due, last, weak };
}
export function recallLevel(s: LearningState, u: Unit, now = nowISO()) {
  const ev = evidence(s, u.id, "recall", now);
  const last = s.attempts
    .filter((a) => a.unit === u.id && a.dimension === "recall")
    .at(-1);
  if (last && effectiveScore(s, last) === 0) return Math.max(1, last.level - 1);
  if (!last || ev.score === null) return 1;
  const good = ev.items.filter(
    (a) => a.level === last.level && effectiveScore(s, a) === 1,
  );
  return new Set(good.map((a) => a.date)).size >= 2
    ? Math.min(3, last.level + 1)
    : last.level;
}
export function stage(s: LearningState, now = nowISO()) {
  const c = clock(s, now);
  if (c.summaryReady)
    return {
      name: "周期回顾",
      reason: "日历周期已结束；正式达标尚未验证。",
      ability: false,
    };
  if (c.remaining <= 7)
    return {
      name: "考前回顾",
      reason: "按剩余时间增加复习；不代表能力已达标。",
      ability: false,
    };
  return {
    name: "稳住基础",
    reason: "当前是四经典的最小切片，核心范围尚未完整核定。",
    ability: false,
  };
}
export function buildPlan(
  s: LearningState,
  minutes: number,
  mood: "tired" | "normal" | "great",
  minimum = false,
  now = nowISO(),
): LearningState {
  assertClock(s, now);
  if (s.session && s.session.stage !== "done")
    throw Error("请先完成当前片段，再重新安排。");
  if (s.cycle.paused) throw Error("请先恢复学习。");
  const c = clock(s, now);
  if (c.examPast) throw Error("考试日期已过，请先更新日期或改为自主学习。");
  const b = budgetSeconds(minutes, mood);
  const old = s.plans.filter((p) => p.date === c.day).at(-1);
  const completed = old?.tasks.filter((t) => t.status === "completed") || [];
  let used = completed.reduce((n, t) => n + t.seconds, 0);
  if (used > b.capacity)
    throw Error(
      "今日已完成任务的预计用时超过新预算。记录已保留，请为余下时间选择更大的总预算。",
    );
  const completedIds = new Set(completed.map((t) => t.unit));
  const candidates = available(s)
    .filter(
      ({ u }) =>
        !completedIds.has(u.id) &&
        u.prerequisites.every((x) => s.covered.some((c) => c.unit === x)),
    )
    .map((x) => {
      const r = reviewState(s, x.u.id, now),
        known = s.covered.some((c) => c.unit === x.u.id),
        ev = evidence(s, x.u.id, "recall", now);
      const d = r.due
        ? Math.max(
            0,
            Math.min(1, (r.interval + daysBetween(c.day, r.due)) / r.interval),
          )
        : 0;
      const score =
        (c.remaining <= 7 ? 0.35 : 0.3) * d +
        0.25 * (ev.score === null ? 0.5 : 1 - ev.score) +
        0.2 * x.u.core +
        0.15 * (r.weak ? 1 : 0) +
        (c.remaining <= 7 ? 0.05 : 0.1) * (known ? 0 : 1);
      return { ...x, r, known, score };
    })
    .sort(
      (a, b) =>
        Number(!!(b.r.weak || (b.r.due && b.r.due <= c.day))) -
          Number(!!(a.r.weak || (a.r.due && a.r.due <= c.day))) ||
        b.score - a.score ||
        (a.r.due || "9999").localeCompare(b.r.due || "9999") ||
        a.u.id.localeCompare(b.u.id),
    );
  const recentClassics = [1, 2, 3].map((offset) => {
    const ids = s.attempts
      .filter((a) => a.date === addDays(c.day, -offset))
      .map((a) => getUnit(s, a.pack, a.unit)?.classic);
    return ids.length && new Set(ids).size === 1 ? ids[0] : undefined;
  });
  const repeatedClassic = recentClassics.every(
    (x) => x !== undefined && x === recentClassics[0],
  )
    ? recentClassics[0]
    : undefined;
  const rotate =
    repeatedClassic === undefined ||
    candidates.some((x) => x.u.classic === repeatedClassic && x.r.weak)
      ? undefined
      : candidates.find((x) => x.u.classic !== repeatedClassic);
  if (rotate)
    candidates.splice(
      0,
      0,
      ...candidates.splice(candidates.indexOf(rotate), 1),
    );
  const cap = c.examToday
    ? Math.min(b.capacity, 180)
    : minimum
      ? Math.min(b.capacity, 180)
      : b.capacity;
  const ratio =
    c.remaining <= 7
      ? 0.2
      : mood === "tired"
        ? 0.2
        : mood === "great"
          ? 0.45
          : 0.4;
  let newSeconds = completed
    .filter(
      (t) =>
        t.kind === "learn" ||
        (t.kind === "minimum" &&
          s.covered.some((a) => a.unit === t.unit && a.date === c.day)),
    )
    .reduce((n, t) => n + t.seconds, 0);
  const reviewLoad = candidates.filter((x) => x.known &&
    (x.r.weak || (x.r.due && x.r.due <= c.day))).length * 120;
  // Reserve room for due reviews, then use otherwise idle time for new work.
  // Tired and final-week plans keep their conservative new-learning limit.
  const newLimit = mood !== "tired" && c.remaining > 7
    ? Math.max(b.capacity * ratio, cap - used - reviewLoad + newSeconds)
    : b.capacity * ratio;
  const tasks: Task[] = [...completed];
  let cold = false;
  for (const x of candidates) {
    if (x.known && !x.r.weak && x.r.due && x.r.due > c.day) continue;
    const kind: Task["kind"] =
      minimum || cap <= 60
        ? "minimum"
        : x.known
          ? (x.r.due && x.r.due <= c.day) || x.r.weak
            ? "review"
            : "train"
          : "learn";
    if (c.examToday && !x.known) continue;
    const secs =
      kind === "minimum"
        ? Math.min(60, cap)
        : kind === "learn"
          ? x.u.estimatedSeconds
          : 120;
    if (used + secs > cap) continue;
    if (!x.known && newSeconds + secs > newLimit) {
      if (
        newSeconds === 0 &&
        tasks.length === completed.length &&
        !candidates.some((a) => a.known)
      ) {
        cold = true;
      } else continue;
    }
    if (!x.known) newSeconds += secs;
    tasks.push({
      id: crypto.randomUUID(),
      unit: x.u.id,
      pack: x.pack,
      kind,
      seconds: secs,
      reason:
        x === rotate
          ? "换一部经典，照顾尚未涉及的内容"
          : x.r.weak
            ? "上次这里需要帮助"
            : x.r.due && x.r.due <= c.day
              ? "到期回顾"
              : x.known
                ? "保持熟悉感"
                : "本周期还没学过",
      status: "planned",
    });
    used += secs;
    if (minimum || cap <= 60) break;
  }
  const plan: Plan = {
    id: crypto.randomUUID(),
    date: c.day,
    revision: (old?.revision || 0) + 1,
    minutes,
    mood,
    capacity: Math.max(b.capacity, used),
    tasks,
    note: !tasks.length
      ? "暂时没有符合预算的核定任务。"
      : `${cold ? "本次为最小入门安排。" : ""}已安排约 ${Math.ceil(used / 60)} 分钟学习，学习预算 ${Math.floor(b.capacity / 60)} 分钟。${used < cap ? "尚有空余：可能受可用内容、任务长度或轻量/考前限额限制；不代表全天或考纲已完成。" : "完成一条后可继续下一条。"}预计用时不是实际计时。`,
    createdAt: now,
  };
  return {
    ...s,
    profile: { ...s.profile, defaultMinutes: minutes },
    plans: [
      ...s.plans.map((p) =>
        p.id === old?.id
          ? {
              ...p,
              tasks: p.tasks.map((t) =>
                t.status === "completed"
                  ? t
                  : { ...t, status: "deferred" as const },
              ),
            }
          : p,
      ),
      plan,
    ],
    session: s.session?.stage === "done" ? null : s.session,
  };
}
export function expose(
  s: LearningState,
  u: Unit,
  kind: "stem" | "read" | "answer",
  now = nowISO(),
) {
  const date = todayFor(s, now);
  return {
    ...s,
    exposures: [
      ...s.exposures,
      {
        id: crypto.randomUUID(),
        family: u.family,
        unit: u.id,
        kind,
        at: now,
        date,
      },
    ],
  };
}
export function startTask(
  s: LearningState,
  task: Task,
  now = nowISO(),
): LearningState {
  assertClock(s, now);
  if (s.cycle.paused) throw Error("请先恢复学习。");
  const planned = s.plans
    .filter((p) => p.date === todayFor(s, now))
    .at(-1)
    ?.tasks.find((t) => t.id === task.id);
  if (
    !planned ||
    planned.status !== "planned" ||
    JSON.stringify(planned) !== JSON.stringify(task)
  )
    throw Error("任务已完成或计划已改变，请返回今天重新安排。");
  if (s.session && s.session.stage !== "done")
    throw Error("先继续或结束当前片段，再开始新任务。");
  const u = getUnit(s, task.pack, task.unit);
  if (!u || !available(s).some((x) => x.u.id === u.id && x.pack === task.pack))
    throw Error("内容已更新或撤回，请重新安排任务。");
  const level = recallLevel(s, u, now),
    recall =
      u.questions.find((q) => q.type === "cloze" && q.level === level) ||
      u.questions.find((q) => q.type === "cloze"),
    understand = u.questions
      .filter((q) => q.type === "single")
      .sort(
        (a, b) =>
          s.attempts.filter((x) => x.question === a.id).length -
          s.attempts.filter((x) => x.question === b.id).length,
      )[0];
  const firstUnderstanding =
    daysBetween(todayFor(s, now), s.cycle.start) % 2 === 0;
  const queue = (
    task.kind === "minimum"
      ? [recall]
      : firstUnderstanding
        ? [understand, recall]
        : [recall, understand]
  )
    .filter((x): x is Question => !!x)
    .map((q) => q.id);
  if (!queue.length) throw Error("没有合格训练题。");
  const read =
    task.kind === "learn" ||
    (task.kind === "minimum" && !s.covered.some((c) => c.unit === u.id));
  let next = {
    ...s,
    session: {
      id: crypto.randomUUID(),
      task: task.id,
      unit: u.id,
      pack: task.pack,
      stage: read ? "read" : "question",
      queue,
      index: 0,
      draft: "",
      help: read,
      startedAt: now,
      activeSeconds: 0,
      mode: task.kind,
    } as NonNullable<LearningState["session"]>,
    plans: s.plans.map((p) => ({
      ...p,
      tasks: p.tasks.map((t) =>
        t.id === task.id ? { ...t, status: "active" as const } : t,
      ),
    })),
  };
  return expose(next, u, read ? "read" : "stem", now);
}
export function markRead(s: LearningState, now = nowISO()): LearningState {
  assertClock(s, now);
  if (s.cycle.paused) throw Error("学习已暂停。");
  const x = s.session;
  if (!x || x.stage !== "read") throw Error("没有待阅读的当前会话。");
  if (!available(s).some((u) => u.u.id === x.unit && u.pack === x.pack))
    throw Error("内容已更新或撤回。");
  return {
    ...s,
    covered: s.covered.some((c) => c.unit === x.unit)
      ? s.covered
      : [
          ...s.covered,
          { unit: x.unit, pack: x.pack, at: now, date: todayFor(s, now) },
        ],
    session: { ...x, stage: "explain", help: true },
  };
}
export function help(s: LearningState, now = nowISO()): LearningState {
  assertClock(s, now);
  if (s.cycle.paused) throw Error("学习已暂停。");
  if (!s.session) return s;
  if (
    !available(s).some(
      (u) => u.u.id === s.session!.unit && u.pack === s.session!.pack,
    )
  )
    throw Error("内容已更新或撤回。");
  const u = getUnit(s, s.session.pack, s.session.unit)!;
  return expose(
    { ...s, session: { ...s.session, help: true } },
    u,
    "answer",
    now,
  );
}
export function submit(s: LearningState, now = nowISO()): LearningState {
  assertClock(s, now);
  const x = s.session;
  if (!x || x.stage !== "question") return s;
  if (s.cycle.paused) throw Error("学习已暂停。");
  const current = available(s).find((a) => a.u.id === x.unit);
  if (!current || current.pack !== x.pack)
    throw Error("当前内容已撤回或更新，请结束片段后重新安排。");
  const u = current.u,
    q = u.questions.find((q) => q.id === x.queue[x.index])!;
  const attemptId = `${x.id}:${x.index}`;
  if (s.attempts.some((a) => a.id === attemptId))
    return { ...s, session: { ...x, stage: "feedback" } };
  const day = todayFor(s, now);
  const assisted =
    x.help ||
    s.exposures.some(
      (e) => e.family === u.family && e.date === day && e.kind !== "stem",
    );
  const a: Attempt = {
    id: attemptId,
    session: x.id,
    task: x.task,
    unit: u.id,
    pack: x.pack,
    question: q.id,
    family: q.family,
    dimension: q.dimension,
    level: q.level,
    response: x.draft,
    score: grade(q, x.draft),
    assisted,
    at: now,
    date: day,
    activeSeconds: Math.min(3600, x.activeSeconds),
  };
  return expose(
    {
      ...s,
      attempts: [...s.attempts, a],
      session: { ...x, stage: "feedback" },
    },
    u,
    "answer",
    now,
  );
}
export function nextQuestion(s: LearningState, now = nowISO()): LearningState {
  assertClock(s, now);
  if (s.cycle.paused) throw Error("学习已暂停。");
  const x = s.session;
  if (!x) return s;
  if (x.stage !== "feedback") throw Error("请先提交当前题目。");
  if (!available(s).some((u) => u.u.id === x.unit && u.pack === x.pack))
    throw Error("内容已更新或撤回。");
  if (x.index + 1 >= x.queue.length) return finishSession(s, now);
  const u = getUnit(s, x.pack, x.unit)!;
  return expose(
    {
      ...s,
      session: {
        ...x,
        index: x.index + 1,
        stage: "question",
        draft: "",
        help: x.mode === "learn",
        activeSeconds: 0,
      },
    },
    u,
    "stem",
    now,
  );
}
export function finishSession(s: LearningState, now = nowISO()): LearningState {
  const x = s.session;
  if (!x || x.stage === "done") return s;
  assertClock(s, now);
  if (s.cycle.paused) throw Error("学习已暂停。");
  if (!available(s).some((u) => u.u.id === x.unit && u.pack === x.pack))
    throw Error("内容已更新或撤回，不能将旧片段标为完成。");
  if (
    x.stage !== "feedback" ||
    x.queue.some((_, i) => !s.attempts.some((a) => a.id === `${x.id}:${i}`))
  )
    throw Error("片段尚未完成，不能领取奖励。");
  const day = todayFor(s, now),
    key = `${s.cycle.id}:${day}:minimum`,
    small = s.rewards.filter((r) => r.size === "small");
  let grants = [...s.grants],
    chests = [...s.chests];
  if (x.mode !== "placement" && !grants.some((g) => g.key === key)) {
    grants.push({
      key,
      title: small[0]?.title || "把今天的一小步记在心里",
      kind: "small",
      date: day,
      redeemed: false,
    });
    const chestKey = `${s.cycle.id}:${day}:chest`;
    if (!chests.some((c) => c.key === chestKey)) {
      const random = new Uint32Array(2);
      crypto.getRandomValues(random);
      const result =
        s.settings.chest && small.length && random[0] / 4294967296 < 0.2
          ? small[random[1] % small.length].title
          : null;
      chests.push({ key: chestKey, result });
      if (result)
        grants.push({
          key: chestKey,
          title: result,
          kind: "chest",
          date: day,
          redeemed: false,
        });
    }
  }
  return {
    ...s,
    session: { ...x, stage: "done" },
    grants,
    chests,
    plans: s.plans.map((p) => ({
      ...p,
      tasks: p.tasks.map((t) =>
        t.id === x.task ? { ...t, status: "completed" as const } : t,
      ),
    })),
  };
}
export function mergeRestore(current: LearningState, incoming: LearningState) {
  const next = validateState(incoming);
  for (const p of next.packs) {
    const old = current.packs.find((c) => packKey(c) === packKey(p));
    if (old && JSON.stringify(old) !== JSON.stringify(p))
      throw Error("存档包含同版本不同内容，不能覆盖。");
  }
  if (current.profile.ready && next.profile.id !== current.profile.id)
    throw Error(
      "这份学习存档属于另一个本地档案。请在空白浏览器中恢复，避免混合两个人的曝光与奖励。",
    );
  const grants = [
    ...current.grants.map((g) => ({
      ...g,
      redeemed:
        g.redeemed || !!next.grants.find((n) => n.key === g.key)?.redeemed,
    })),
    ...next.grants.filter((g) => !current.grants.some((c) => c.key === g.key)),
  ];
  return validateState(
    invalidateWithdrawn({
      ...next,
      profile: {
        ...next.profile,
        timezone: current.profile.ready
          ? current.profile.timezone
          : next.profile.timezone,
      },
      revision: current.revision,
      attempts: [
        ...current.attempts,
        ...next.attempts.filter(
          (a) => !current.attempts.some((c) => c.id === a.id),
        ),
      ],
      covered: [
        ...current.covered,
        ...next.covered.filter(
          (a) => !current.covered.some((c) => c.unit === a.unit),
        ),
      ],
      exposures: [
        ...current.exposures,
        ...next.exposures.filter(
          (e) => !current.exposures.some((c) => c.id === e.id),
        ),
      ],
      grants,
      chests: [
        ...current.chests,
        ...next.chests.filter(
          (c) => !current.chests.some((n) => n.key === c.key),
        ),
      ],
      withdrawn: [...new Set([...current.withdrawn, ...next.withdrawn])],
      courseAnswers: [...current.courseAnswers, ...next.courseAnswers.filter((a) => !current.courseAnswers.some((c) => c.id === a.id))],
      courseRecall: [...current.courseRecall, ...next.courseRecall.filter((a) => !current.courseRecall.some((c) => c.id === a.id))],
      courseSchedule: current.courseSchedule || next.courseSchedule,
      courseReviewTasks: [...new Set([...current.courseReviewTasks,...next.courseReviewTasks])],
      courseExposures: [...current.courseExposures, ...next.courseExposures.filter((a) => !current.courseExposures.some((c) => c.question === a.question))],
      courseExams: [...current.courseExams.map(e=>{const saved=next.courseExams.find(a=>a.id===e.id);return saved?.submittedAt&&!e.submittedAt?saved:e}), ...next.courseExams.filter((a) => !current.courseExams.some((c) => c.id === a.id))],
      courseCoach: current.courseCoach || next.courseCoach,
      packs: [
        ...current.packs,
        ...next.packs.filter(
          (p) => !current.packs.some((c) => packKey(c) === packKey(p)),
        ),
      ],
    }),
  );
}
export function pause(
  s: LearningState,
  on: boolean,
  now = nowISO(),
): LearningState {
  if (on === s.cycle.paused) return s;
  return {
    ...s,
    cycle: {
      ...s.cycle,
      paused: on,
      pauseLog: on
        ? [...s.cycle.pauseLog, { start: now, end: null }]
        : s.cycle.pauseLog.map((p) => (p.end ? p : { ...p, end: now })),
    },
  };
}
export function report(s: LearningState, now = nowISO()): LearningState {
  const status = stage(s, now);
  return {
    ...s,
    reports: [
      ...s.reports,
      {
        id: crypto.randomUUID(),
        at: now,
        stage: status.name,
        summary: `${status.reason} 已阅读 ${s.covered.length} 个本地切片，留下 ${s.attempts.length} 次练习。不是考纲覆盖率或通过概率。`,
        covered: s.covered.length,
        attempts: s.attempts.length,
      },
    ],
  };
}

export function restartLearning(s:LearningState,mode:'guided'|'sprint',now=nowISO()):LearningState {
 if(mode==='sprint')return {...s,courseMode:'sprint',restartToken:crypto.randomUUID(),cycle:{...s.cycle,paused:false}};
 const fresh=freshState(now);
 return {...fresh,revision:s.revision,profile:{...s.profile},settings:{...s.settings},packs:s.packs,withdrawn:s.withdrawn,rewards:s.rewards,cycle:{...fresh.cycle,start:dayAt(now,s.profile.timezone)},restartToken:crypto.randomUUID()};
}
