import Dexie, { type Table } from "dexie";

export type Mood = "tired" | "normal" | "great";
export type Reward = {
  id: string;
  title: string;
  size: "small" | "medium" | "large";
};
export type Session = {
  id: string;
  step: number;
  answer: string;
  choice: string;
  feedback: boolean;
  minimum: boolean;
  completed: boolean;
  date: string;
};
export type State = {
  format: "jingjing-archive";
  version: 1;
  mode: "demo";
  revision: number;
  profile: {
    name: string;
    exam: string;
    started: string;
    ready: boolean;
    onboardingStep: number;
  };
  settings: {
    minutes: number;
    mood: Mood;
    sound: boolean;
    reducedMotion: boolean;
    chest: boolean;
    paused: boolean;
  };
  session: Session | null;
  completed: { id: string; date: string; minimum: boolean }[];
  rewards: Reward[];
  claims: { key: string; title: string; redeemed: boolean }[];
};
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const initialState = (): State => ({
  format: "jingjing-archive",
  version: 1,
  mode: "demo",
  revision: 0,
  profile: { name: "", exam: "", started: "", ready: false, onboardingStep: 0 },
  settings: {
    minutes: 20,
    mood: "normal",
    sound: false,
    reducedMotion: false,
    chest: true,
    paused: false,
  },
  session: null,
  completed: [],
  claims: [],
  rewards: [
    { id: "tea", title: "慢慢喝一杯喜欢的茶", size: "small" },
    { id: "walk", title: "去公园散一会儿步", size: "medium" },
    { id: "book", title: "给自己选一本新书", size: "large" },
  ],
});
class Store extends Dexie {
  records!: Table<{ id: string; value: State }, string>;
  constructor() {
    super(
      `jingjing-youtiao:phase2:demo:${new URL(import.meta.env.BASE_URL, window.location.href).pathname}`,
    );
    this.version(1).stores({ records: "id" });
  }
}
export const db = new Store();
export async function readState() {
  return (await db.records.get("current"))?.value ?? initialState();
}
export async function writeState(state: State, expectedRevision: number) {
  return db.transaction("rw", db.records, async () => {
    const current = (await db.records.get("current"))?.value;
    if (current && current.revision !== expectedRevision)
      throw new Error("另一个页面更新了存档，请刷新后继续。");
    const saved = { ...state, revision: expectedRevision + 1 };
    await db.records.put({ id: "current", value: saved });
    return saved;
  });
}
export async function restoreState(next: State, current: State) {
  return db.transaction("rw", db.records, async () => {
    const disk = (await db.records.get("current"))?.value;
    if (disk && disk.revision !== current.revision)
      throw new Error("存档已被另一个页面更新，请刷新后导入。");
    await db.records.put({ id: "before-import", value: current });
    // 已领取奖励不会因回退旧存档而重复产生。
    const claims = [
      ...current.claims,
      ...next.claims.filter(
        (c) => !current.claims.some((x) => x.key === c.key),
      ),
    ];
    const saved = { ...next, claims, revision: current.revision + 1 };
    await db.records.put({ id: "current", value: saved });
    return saved;
  });
}
export function validateArchive(raw: unknown): State {
  const fail = () => {
    throw new Error("存档格式不完整或不兼容；请选择本原型导出的演示存档。");
  };
  if (!raw || typeof raw !== "object") return fail();
  const s = raw as State;
  const str = (v: unknown, max = 200): v is string =>
    typeof v === "string" && v.length <= max && !/[\u0000-\u001f]/.test(v);
  const date = (v: unknown, empty = false) =>
    str(v, 10) &&
    ((empty && v === "") ||
      (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
        !Number.isNaN(Date.parse(v)) &&
        new Date(v).toISOString().slice(0, 10) === v));
  const bool = (v: unknown) => typeof v === "boolean";
  if (
    s.format !== "jingjing-archive" ||
    s.version !== 1 ||
    s.mode !== "demo" ||
    !Number.isSafeInteger(s.revision) ||
    s.revision < 0
  )
    return fail();
  if (
    !s.profile ||
    !str(s.profile.name, 40) ||
    !date(s.profile.exam, true) ||
    !date(s.profile.started, true) ||
    !bool(s.profile.ready) ||
    !Number.isInteger(s.profile.onboardingStep) ||
    s.profile.onboardingStep < 0 ||
    s.profile.onboardingStep > 4
  )
    return fail();
  if (
    s.profile.ready &&
    (!s.profile.name.trim() ||
      Array.from(s.profile.name).length > 20 ||
      !s.profile.started)
  )
    return fail();
  if (
    !s.settings ||
    !Number.isInteger(s.settings.minutes) ||
    s.settings.minutes < 1 ||
    s.settings.minutes > 180 ||
    !["tired", "normal", "great"].includes(s.settings.mood) ||
    !["sound", "reducedMotion", "chest", "paused"].every((k) =>
      bool(s.settings[k as keyof State["settings"]]),
    )
  )
    return fail();
  if (
    !Array.isArray(s.rewards) ||
    s.rewards.length > 100 ||
    !s.rewards.every(
      (r) =>
        r &&
        str(r.id, 100) &&
        str(r.title, 60) &&
        r.title.trim() &&
        ["small", "medium", "large"].includes(r.size),
    ) ||
    new Set(s.rewards.map((r) => r.id)).size !== s.rewards.length
  )
    return fail();
  if (
    !Array.isArray(s.claims) ||
    s.claims.length > 10000 ||
    !s.claims.every(
      (c) => c && str(c.key, 150) && str(c.title, 100) && bool(c.redeemed),
    ) ||
    new Set(s.claims.map((c) => c.key)).size !== s.claims.length
  )
    return fail();
  if (
    !Array.isArray(s.completed) ||
    s.completed.length > 10000 ||
    !s.completed.every(
      (c) => c && str(c.id, 100) && date(c.date) && bool(c.minimum),
    ) ||
    new Set(s.completed.map((c) => c.id)).size !== s.completed.length
  )
    return fail();
  if (s.session !== null) {
    const x = s.session;
    if (
      !x ||
      !str(x.id, 100) ||
      !Number.isInteger(x.step) ||
      x.step < 0 ||
      x.step > 4 ||
      !str(x.answer, 100) ||
      !str(x.choice, 100) ||
      !bool(x.feedback) ||
      !bool(x.minimum) ||
      !bool(x.completed) ||
      !date(x.date)
    )
      return fail();
  }
  // 只返回已知字段，未知属性不能进入应用状态。
  return {
    format: s.format,
    version: s.version,
    mode: s.mode,
    revision: s.revision,
    profile: {
      name: s.profile.name,
      exam: s.profile.exam,
      started: s.profile.started,
      ready: s.profile.ready,
      onboardingStep: s.profile.onboardingStep,
    },
    settings: {
      minutes: s.settings.minutes,
      mood: s.settings.mood,
      sound: s.settings.sound,
      reducedMotion: s.settings.reducedMotion,
      chest: s.settings.chest,
      paused: s.settings.paused,
    },
    session: s.session
      ? {
          id: s.session.id,
          step: s.session.step,
          answer: s.session.answer,
          choice: s.session.choice,
          feedback: s.session.feedback,
          minimum: s.session.minimum,
          completed: s.session.completed,
          date: s.session.date,
        }
      : null,
    rewards: s.rewards.map(({ id, title, size }) => ({ id, title, size })),
    claims: s.claims.map(({ key, title, redeemed }) => ({
      key,
      title,
      redeemed,
    })),
    completed: s.completed.map(({ id, date, minimum }) => ({
      id,
      date,
      minimum,
    })),
  };
}
export function cycle(profile: State["profile"]) {
  const diff = (a: string, b: string) =>
    Math.round((Date.parse(a) - Date.parse(b)) / 86400000);
  const duration =
    profile.exam && profile.started
      ? Math.max(1, Math.min(30, diff(profile.exam, profile.started)))
      : 30;
  const elapsed = profile.started
    ? Math.max(1, diff(today(), profile.started) + 1)
    : 1;
  return {
    day: Math.min(duration, elapsed),
    duration,
    ended: elapsed > duration,
  };
}
export function budget(minutes: number, mood: Mood) {
  const pause =
    minutes < 60
      ? 0
      : minutes < 90
        ? 5
        : Math.min(20, 5 * Math.floor(minutes / 45));
  return Math.max(
    1,
    Math.floor(
      (minutes - pause - Math.min(3, Math.floor(minutes * 0.1))) *
        (mood === "tired" ? 0.85 : 1),
    ),
  );
}
