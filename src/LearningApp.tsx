import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Coffee,
  Download,
  Gift,
  Leaf,
  Pause,
  Settings,
  ShieldCheck,
  Sprout,
  Sun,
  Upload,
  Volume2,
} from "lucide-react";
import { Companion, Decoration, Modal, Title } from "./DemoApp";
import { readState } from "./store";
import { learningDB, loadLearning, saveLearning } from "./learningStore";
import { ScopeOverview } from "./ScopeOverview";
import Course from './Course';
import RestartControls from './RestartControls';
import StudyProgress from './StudyProgress';
import {
  available,
  buildPlan,
  classicNames,
  clock,
  dayAt,
  effectiveScore,
  evidence,
  expose,
  freshState,
  getUnit,
  grade,
  invalidateWithdrawn,
  makeEnvelope,
  markRead,
  nextQuestion,
  nowISO,
  packKey,
  pause,
  readEnvelope,
  recallLevel,
  report,
  reviewState,
  stage,
  startTask,
  submit,
  todayFor,
  validateState,
  type LearningState,
  type Task,
  type Unit,
} from "./learning";
type Mutate = (fn: (s: LearningState) => LearningState) => Promise<boolean>;
type Ctx = {
  s: LearningState;
  mutate: Mutate;
  busy: boolean;
  notify: (m: string) => void;
  tone: (n?: number) => void;
};
const moods = { tired: "有点累", normal: "刚刚好", great: "很有精神" };
function Note({ children }: { children: ReactNode }) {
  return (
    <div className="soft-note">
      <ShieldCheck size={18} />
      <span>{children}</span>
    </div>
  );
}
function Empty({ children }: { children: ReactNode }) {
  return (
    <section className="notice-card">
      <Sprout size={30} />
      <h2>从有依据的一小步开始</h2>
      <p>{children}</p>
      <Link to="/sources" className="primary">
        查看学习资料 <BookOpen size={17} />
      </Link>
    </section>
  );
}
export default function LearningApp({ onDemo }: { onDemo: () => void }) {
  const [s, setS] = useState<LearningState | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(""),
    [offline, setOffline] = useState(!navigator.onLine),
    [updater, setUpdater] = useState<ServiceWorkerRegistration | null>(null);
  const current = useRef<LearningState | null>(null),
    chain = useRef(Promise.resolve()),
    pending = useRef(0);
  const loc = useLocation();
  useEffect(() => {
    loadLearning()
      .then((v) => {
        current.current = v;
        setS(v);
      })
      .catch((e) =>
        setError(
          `无法读取学习存档：${String(e)}。旧数据未删除，请导出备份后重试。`,
        ),
      );
  }, []);
  useEffect(() => {
    const handler = () => setOffline(!navigator.onLine);
    window.addEventListener("online", handler);
    window.addEventListener("offline", handler);
    return () => {
      window.removeEventListener("online", handler);
      window.removeEventListener("offline", handler);
    };
  }, []);
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((r) => {
        if (r.waiting) setUpdater(r);
        r.addEventListener("updatefound", () => {
          r.installing?.addEventListener("statechange", () => {
            if (r.waiting) setUpdater(r);
          });
        });
      })
      .catch(() => setToast("离线缓存暂未建立，当前可继续在线学习。"));
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(id);
  }, [toast]);
  const mutate = useCallback<Mutate>((fn) => {
    pending.current++;
    setBusy(true);
    const run = chain.current.then(async () => {
      if (!current.current) return false;
      try {
        const next = await saveLearning(
          fn(current.current),
          current.current.revision,
        );
        current.current = next;
        setS(next);
        setError("");
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "保存失败，旧记录已保留。");
        return false;
      } finally {
        pending.current--;
        setBusy(pending.current > 0);
      }
    });
    chain.current = run.then(() => {});
    return run;
  }, []);
  const restore = async (value: LearningState) => {
    if (busy || !current.current) return false;
    setBusy(true);
    try {
      const saved = await saveLearning(value, current.current.revision, true);
      current.current = saved;
      setS(saved);
      setError("");
      setToast("学习存档已恢复，导入前备份已保留。");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  const tone = (n = 0) => {
    if (!current.current?.settings.sound) return;
    try {
      const c = new AudioContext(),
        o = c.createOscillator(),
        g = c.createGain();
      o.connect(g);
      g.connect(c.destination);
      o.frequency.value = [523, 659, 784, 880][n % 4];
      g.gain.setValueAtTime(0.035, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
      o.start();
      o.stop(c.currentTime + 0.32);
      o.onended = () => void c.close();
    } catch {
      setToast("此浏览器暂不能播放提示音。");
    }
  };
  if (!s)
    return (
      <div className="loading">
        <Sprout />
        <h1>经经有条</h1>
        <p>{error || "正在打开真实学习存档…"}</p>
        {error && <button onClick={() => location.reload()}>刷新重试</button>}
      </div>
    );
  const ctx: Ctx = { s, mutate, busy, notify: setToast, tone };
  return (
    <div className={s.settings.reducedMotion ? "app reduce-motion" : "app"}>
      <a
        className="skip"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        跳到主要内容
      </a>
      <aside className="sidebar">
        <Link className="brand" to="/today" aria-label="经经有条，回到今天">
          <span className="brand-icon">
            <Sprout />
          </span>
          <span>
            经经有条<small>一点一点，自有回响</small>
          </span>
        </Link>
        <div className="sidebar-label">我的小小书房</div>
        <nav aria-label="主要导航">
          {[
            ["/today", "今天", Sun],
            ["/classics", "经典", BookOpen],
            ["/growth", "成长", Sprout],
            ["/me", "我的", Settings],
          ].map(([url, label, Icon]) => {
            const I = Icon as typeof Sun;
            return (
              <Link
                key={String(url)}
                className={loc.pathname === url ? "active" : ""}
                to={String(url)}
              >
                <I size={21} />
                <span>{String(label)}</span>
              </Link>
            );
          })}
        </nav>
        <Link className="sidebar-gift" to="/rewards">
          <Gift />
          <b>给努力一点甜</b>
          <span>去看看今天的小美好</span>
        </Link>
        <div className="sidebar-bottom">
          <Leaf />
          <p>
            真实积累，
            <br />
            从一段核定原文开始。
          </p>
          <Link to="/sources">学习资料与来源</Link>
        </div>
      </aside>
      <div className="workspace">
        <div className="topbar">
          <span>✦ 中医经典 · 陪伴学习</span>
          <div>
            <span className="demo-badge">全国三级 · 本地学习</span>
            <span className="save-status">
              {busy
                ? "保存中…"
                : error
                  ? "保存异常"
                  : offline
                    ? "离线 · 使用本地内容"
                    : "记录保存在本机"}
            </span>
          </div>
        </div>
        {error && (
          <div role="alert" className="error-banner">
            {error} <Link to="/archive">导出当前记录</Link>
          </div>
        )}
        {updater && (
          <div className="update-banner">
            新版本已就绪。
            <button
              disabled={!!s.session && s.session.stage !== "done"}
              onClick={() => {
                if (!updater.waiting) { location.reload(); return; }
                navigator.serviceWorker.addEventListener(
                  "controllerchange",
                  () => location.reload(),
                  { once: true },
                );
                updater.waiting.postMessage("activate");
              }}
            >
              {s.session && s.session.stage !== "done"
                ? "结束当前片段后更新"
                : "保存完成，更新页面"}
            </button>
          </div>
        )}
        <main id="main" tabIndex={-1}>
          <Routes>
            <Route
              path="/today"
              element={s.profile.ready ? <Home {...ctx} /> : <Setup {...ctx} />}
            />
            <Route path="/welcome" element={<Setup {...ctx} />} />
            <Route path="/classics" element={<Library {...ctx} />} />
            <Route path="/course" element={<Course {...ctx} />} />
            <Route path="/knowledge/:id" element={<Knowledge {...ctx} />} />
            <Route path="/learn/:id" element={<Study {...ctx} />} />
            <Route path="/placement" element={<Placement {...ctx} />} />
            <Route path="/growth" element={<Growth {...ctx} />} />
            <Route path="/assessment/:id" element={<Assessment />} />
            <Route path="/graduation" element={<Graduation {...ctx} />} />
            <Route path="/rewards" element={<Rewards {...ctx} />} />
            <Route
              path="/me"
              element={<Preferences {...ctx} onDemo={onDemo} />}
            />
            <Route path="/sources" element={<Sources {...ctx} />} />
            <Route
              path="/archive"
              element={<Archive {...ctx} restore={restore} />}
            />
            <Route path="*" element={<Navigate to="/today" replace />} />
          </Routes>
          <footer>经经有条 · 学习可以认真，也可以温柔。</footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
function Setup({ s, mutate, busy, notify }: Ctx) {
  const [name, setName] = useState(s.profile.name),
    [exam, setExam] = useState(s.profile.exam),
    [minutes, setMinutes] = useState(s.profile.defaultMinutes),
    [err, setErr] = useState("");
  const nav = useNavigate();
  return (
    <div className="onboarding">
      <div className="onboard-story">
        <span className="eyebrow">真实积累 · 从这里开始</span>
        <h1>
          让经典，
          <br />
          一点一点走进心里。
        </h1>
        <Companion name={name} />
      </div>
      <section className="onboard-form panel">
        <Decoration kind="tea" className="onboarding-decoration" />
        <h2>把陪伴带进新的学习旅程</h2>
        <p>演示记录单独保留。这一页开始记录真正读过的原文与练习。</p>
        <button
          className="secondary wide"
          disabled={busy}
          onClick={async () => {
            try {
              const d = await readState();
              setName(d.profile.name);
              setExam(d.profile.exam);
              setMinutes(d.settings.minutes);
              await mutate((o) => ({
                ...o,
                settings: {
                  sound: d.settings.sound,
                  reducedMotion: d.settings.reducedMotion,
                  chest: d.settings.chest,
                },
                rewards: d.rewards,
              }));
              notify("已带入伙伴、奖励和偏好；演示成绩未转为学习证据。");
            } catch {
              setErr("未能读取演示设置，可在这里重新填写。");
            }
          }}
        >
          沿用我的伙伴与偏好
        </button>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim() || Array.from(name.trim()).length > 20) {
              setErr("名字需要 1—20 个字。");
              return;
            }
            if (exam && exam < todayFor(s)) {
              setErr("考试日期已过，请修改或留空。");
              return;
            }
            if (
              await mutate((o) => ({
                ...o,
                profile: {
                  ...o.profile,
                  name: name.trim(),
                  exam,
                  defaultMinutes: minutes,
                  ready: true,
                },
              }))
            )
              nav("/today");
          }}
        >
          <label>
            伙伴的名字
            <input
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label>
            考试日期（可选）
            <input
              type="date"
              min={todayFor(s)}
              value={exam}
              onChange={(e) => setExam(e.target.value)}
            />
          </label>
          <label>
            未来每天预计时间
            <select
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            >
              {[10, 20, 30, 60, 90].map((n) => (
                <option key={n} value={n}>
                  {n} 分钟
                </option>
              ))}
            </select>
          </label>
          {err && (
            <p role="alert" className="field-error">
              {err}
            </p>
          )}
          <button className="primary wide" disabled={busy}>
            保存并开始学习 <ArrowRight size={17} />
          </button>
        </form>
        <p className="small muted">
          当前有 {available(s).length} 个原文单元，不等于完整三级范围。
        </p>
      </section>
    </div>
  );
}
function Home(ctx: Ctx) {
  const { s, mutate, busy, notify } = ctx;
  const [planning, setPlanning] = useState(false),
    nav = useNavigate();
  const c = clock(s),
    st = stage(s),
    plan = s.plans.filter((p) => p.date === c.day).at(-1),
    live = s.session && s.session.stage !== "done",
    ready = available(s);
  return (
    <>
      <div className="day-heading">
        <div>
          <span className="eyebrow">{c.day} · 给自己一点时间</span>
          <h1>今天，也一起读书吧。</h1>
        </div>
        <span className="day-pill">
          <Sun size={18} />
          Day {Math.min(c.elapsed, c.duration)} / {c.duration}
        </span>
      </div>
      <section className="panel course-entry"><h2>全国三级 · 今日领学</h2><p><strong>从这里继续：到期复习 → 新内容 → 关联练习 → 错点订正。</strong></p><p>自动接上每一步；已学过、闭卷答对和隔天检验分别记录。30天总计划与每日进度也在同一页。</p><Link className="primary" to="/course">开始或继续今日领学 <ArrowRight size={18} /></Link><p className="small muted">下方为原文记忆专项；所有记录可随学习存档备份。</p></section>
      <section className="hero">
        <div className="hero-copy">
          <span className="tag">
            <Leaf size={13} />
            {s.cycle.paused ? "安心休息中" : st.name}
          </span>
          <h2>
            {s.cycle.paused ? (
              <>
                先歇一会儿，
                <br />
                书页替你留在这里。
              </>
            ) : (
              <>
                先读懂今天这一句，
                <br />
                再把它轻轻记住。
              </>
            )}
          </h2>
          <p>{s.profile.name}陪你，按今天的时间和精力来。</p>
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              if (s.cycle.paused) {
                if (await mutate((o) => pause(o, false))) {
                  if (live)
                    nav(
                      s.session!.mode === "placement"
                        ? "/placement"
                        : `/learn/${s.session!.id}`,
                    );
                  else setPlanning(true);
                }
              } else if (live)
                nav(
                  s.session!.mode === "placement"
                    ? "/placement"
                    : `/learn/${s.session!.id}`,
                );
              else if (!ready.length) nav("/sources");
              else setPlanning(true);
            }}
          >
            {s.cycle.paused
              ? "恢复并重新安排"
              : live
                ? "继续未完成的片段"
                : ready.length
                  ? "安排今天的学习"
                  : "查看学习资料"}
            <ArrowRight size={18} />
          </button>
          <span className="hero-hint">
            <Clock3 size={14} />
            读过不等于掌握，进步有真实依据
          </span>
        </div>
        <Companion
          name={s.profile.name}
          state={s.cycle.paused ? "rest_reminder" : "welcome"}
        />
      </section>

      <details><summary>查看原文训练的范围与时间预算</summary><ScopeOverview s={s} /></details>
      {!ready.length ? (
        <Empty>
          学习资料已随应用准备好；若暂不可用，请在资料页查看内容状态。
        </Empty>
      ) : (
        <div className="home-columns">
          <section className="panel today-card">
            <div className="section-heading">
              <h2>今天的原文专项</h2>
              <button
                className="text-button"
                disabled={busy || s.cycle.paused || !!live}
                onClick={() => setPlanning(true)}
              >
                重新安排 <ChevronRight size={15} />
              </button>
            </div>
            {plan ? (
              plan.tasks
                .filter(
                  (t) => t.status !== "cancelled" && t.status !== "deferred",
                )
                .map((t) => (
                  <div className="task-row" key={t.id}>
                    <span className="task-icon tint-0">
                      {t.status === "completed" ? <Check /> : <BookOpen />}
                    </span>
                    <div>
                      <b>{getUnit(s, t.pack, t.unit)?.title}</b>
                      <span>
                        {t.reason} · 约 {Math.ceil(t.seconds / 60)} 分钟
                      </span>
                    </div>
                    <button
                      className="text-button"
                      disabled={
                        busy ||
                        s.cycle.paused ||
                        t.status === "completed" ||
                        !!live
                      }
                      onClick={async () => {
                        if (await mutate((o) => startTask(o, t)))
                          nav("/learn/current");
                      }}
                    >
                      {t.status === "completed" ? "已完成" : "开始"}
                    </button>
                  </div>
                ))
            ) : (
              <p className="muted small">
                先选今天的时间与状态，我会安排合适的一小步。
              </p>
            )}
            {plan && <>
              <p><strong>已完成 {plan.tasks.filter((t) => t.status === "completed").length} / {plan.tasks.filter((t) => !["cancelled", "deferred"].includes(t.status)).length} 个单元</strong> · 选择 {plan.minutes} 分钟</p>
              <p className="small muted">{plan.note}</p>
            </>}
            <div className="minimum">
              <Coffee size={20} />
              <span>
                今天很忙？<small>只做一个最小任务。</small>
              </span>
              <button
                className="text-button"
                disabled={busy || s.cycle.paused || !!live}
                onClick={async () => {
                  if (
                    await mutate((o) =>
                      buildPlan(
                        o,
                        Math.max(1, plan?.minutes || 3),
                        plan?.mood || "tired",
                        true,
                      ),
                    )
                  )
                    notify("已安排最小任务，完成后可以安心休息。");
                }}
              >
                轻一点开始 <ArrowRight size={15} />
              </button>
            </div>
          </section>
          <div className="home-right">
            <Link to="/rewards" className="reward-preview">
              <span className="eyebrow">给认真一点甜</span>
              <div className="gift-drawing">
                <Decoration kind="gift" />
              </div>
              <h3>
                {s.rewards.find((r) => r.size === "small")?.title ||
                  "把这一小步记在心里"}
              </h3>
              <p>完成最小任务，每日收下一次小奖励。</p>
              <span className="text-link">
                我的奖励池 <ArrowRight size={16} />
              </span>
            </Link>
            <div className="gentle-note">
              <Decoration kind="tea" />
              <p>
                慢慢来，记忆也需要休息。
                <small>到期回顾会自然回到计划里。</small>
              </p>
            </div>
          </div>
        </div>
      )}
      {ready.length > 0 && s.placement.status === "not_started" && (
        <Note>
          也可以先做一次简短的起点了解。当前有 {new Set(ready.map(({u}) => u.family)).size}
          个训练家族，会在题目不足时提前结束。
          <Link className="text-link" to="/placement">
            了解我的起点 <ArrowRight size={14} />
          </Link>
        </Note>
      )}
      {c.summaryReady && (
        <Link className="secondary" to="/graduation">
          看看这一段旅程的总结
        </Link>
      )}
      {planning && <Planner {...ctx} close={() => setPlanning(false)} />}
    </>
  );
}
function Planner({ s, mutate, busy, close }: Ctx & { close: () => void }) {
  const [minutes, setMinutes] = useState(s.profile.defaultMinutes),
    [mood, setMood] = useState<"tired" | "normal" | "great">("normal");
  return (
    <Modal title="今天，按你的节奏来" onClose={close}>
      <fieldset>
        <legend>今天想学多久？</legend>
        <div className="chips">
          {[10, 20, 30, 60, 90].map((n) => (
            <button
              key={n}
              className={minutes === n ? "selected" : ""}
              aria-pressed={minutes === n}
              onClick={() => setMinutes(n)}
            >
              {n} 分钟
            </button>
          ))}
        </div>
        <label>
          自定义分钟
          <input
            type="number"
            min={1}
            max={180}
            value={minutes || ""}
            onChange={(e) => setMinutes(Number(e.target.value))}
          />
        </label>
      </fieldset>
      <fieldset>
        <legend>现在的状态呢？</legend>
        <div className="mood-options">
          {Object.entries(moods).map(([v, l]) => (
            <button
              key={v}
              className={mood === v ? "selected" : ""}
              aria-pressed={mood === v}
              onClick={() => setMood(v as typeof mood)}
            >
              {l}
            </button>
          ))}
        </div>
      </fieldset>
      <Note>
        先安排到期回顾与薄弱内容，再用可用时间安排新学。疲劳或考前一周会减少新学；资料不足会明确显示空余。
      </Note>
      <button
        className="primary wide"
        disabled={
          busy || !Number.isInteger(minutes) || minutes < 1 || minutes > 180
        }
        onClick={async () => {
          if (await mutate((o) => buildPlan(o, minutes, mood))) close();
        }}
      >
        生成今天的安排 <ArrowRight size={17} />
      </button>
    </Modal>
  );
}
function Library({ s }: Ctx) {
  const [query, setQuery] = useState("");
  const list = available(s).filter(({ u }) =>
    `${u.title}${u.chapter}${u.passage}`.includes(query),
  );
  return (
    <>
      <Title eyebrow="四部经典 · 有据可查" title="让经典，一页一页靠近。">
        当前开放 {available(s).length} 个核定切片；并非完整考纲覆盖。
      </Title>
      <ScopeOverview s={s} detailed />
      <p><Link className="primary" to="/course">按全部考纲章节学习与练题 →</Link></p>
      <p><Link className="text-link" to="/sources">阅读完整考纲、三级指南和重点条文 →</Link></p>
      <label>
        搜索已开放的训练内容
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="输入章节或原文中的字词"
        />
      </label>
      {!available(s).length ? (
        <Empty>目前没有可用的学习内容，请查看资料状态。</Empty>
      ) : (
        <div className="classic-grid">
          {classicNames.map((name, i) => (
            <section className={`classic-card classic-${i}`} key={name}>
              <span className="eyebrow">原文 · 理解 · 回忆</span>
              <h2>{name}</h2>
              {list
                .filter((x) => x.u.classic === i)
                .map(({ u }) => (
                  <Link
                    className="unit-link"
                    key={u.id}
                    to={`/knowledge/${u.id}`}
                  >
                    <span>
                      {u.title}
                      <small>
                        {s.covered.some((c) => c.unit === u.id)
                          ? "已读过 · 查看练习证据"
                          : "尚未阅读"}
                      </small>
                    </span>
                    <ChevronRight size={16} />
                  </Link>
                ))}
              {!list.some((x) => x.u.classic === i) && (
                <p>暂无匹配的核定切片</p>
              )}
            </section>
          ))}
        </div>
      )}
      <Note>
        搜索只访问可用训练池。待审核、冲突、阶段与毕业题库不会进入这里。
      </Note>
    </>
  );
}
function SourceInfo({ s, u }: { s: LearningState; u: Unit }) {
  const pack = s.packs.find((p) =>
    p.units.some((x) => x.id === u.id && x.revision === u.revision),
  );
  const source = pack?.sources.find((x) => x.id === u.source);
  return (
    <details className="source-details">
      <summary>原文、解析与考纲依据</summary>
      <p>
        {source?.title} · PDF 第 {u.page} 页／印刷页 {u.printedPage} ·{" "}
        {u.chapter}
      </p>
      <p>
        考纲候选 F0003 · 第 {u.requirement.page} 页 · {u.requirement.id}：
        {u.requirement.text}
      </p>
      <p>
        映射：
        {u.requirement.mapping === "partial"
          ? "只覆盖该条要求的一部分"
          : "完整条目映射"}
        。解析为依据原文整理的学习说明，非底本原话。练习为派生训练题，非真题。
      </p>
      <p>
        审核：Codex。{u.review === "cross-source-text"
          ? "两份本地资料去空白后文字一致；未逐页视觉复核，资料可能同源，非双人专业复核。"
          : "单次原页视觉核对及选项核验，非双人复核。"}资料仅保存在本地。
      </p>
      {u.source === "F0012" && <a className="text-link" href={`${import.meta.env.BASE_URL}library/F0012.pdf#page=${u.page}`} target="_blank" rel="noreferrer">打开三级指南原页（PDF 第 {u.page} 页）</a>}
      <small>底本 SHA-256：{source?.sha256}</small>
    </details>
  );
}
function Knowledge({ s, mutate, busy }: Ctx) {
  const { id } = useParams();
  const match = available(s).find((x) => x.u.id === id);
  const [visible, setVisible] = useState(false);
  if (!match) return <Empty>这个单元已更新或暂不可用。</Empty>;
  const { u } = match;
  return (
    <>
      <Link className="back-link" to="/classics">
        <ArrowLeft size={16} />
        回到经典
      </Link>
      <Title eyebrow={classicNames[u.classic]} title={u.title} />
      <section className="panel">
        {visible ? (
          <>
            <div className="reading-text">{u.passage}</div>
            <h2>理解这一段</h2>
            <p>{u.explanation}</p>
            <SourceInfo s={s} u={u} />
            <Note>
              浏览原文只记录阅读曝光，不增加掌握指标。今天随后练同一家族会标记为辅助练习。
            </Note>
          </>
        ) : (
          <>
            <p>
              打开原文会保存本次阅读曝光，避免把刚看过答案的练习计为独立回忆。
            </p>
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                if (await mutate((o) => expose(o, u, "read"))) setVisible(true);
              }}
            >
              打开原文与解释 <BookOpen size={17} />
            </button>
          </>
        )}
        <Link className="secondary" to="/today">
          回到今天安排学习
        </Link>
      </section>
    </>
  );
}
function optionRank(value: string) {
  let h = 2166136261;
  for (const ch of value) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
function Study(ctx: Ctx) {
  const { s, mutate, busy, tone, notify } = ctx;
  const nav = useNavigate();
  const x = s.session;
  const [draft, setDraft] = useState(x?.draft || ""),
    [elapsed, setElapsed] = useState(0);
  const draftRef = useRef(draft);
  const timeBase = useRef(x?.activeSeconds || 0);
  draftRef.current = draft;
  useEffect(() => {
    setDraft(x?.draft || "");
    timeBase.current = x?.activeSeconds || 0;
    setElapsed(0);
  }, [x?.id, x?.index]);
  useEffect(() => {
    const t = setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        !s.cycle.paused &&
        x?.stage === "question"
      )
        setElapsed((n) => n + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [x?.id, x?.index, x?.stage, s.cycle.paused]);
  useEffect(() => {
    if (!x || x.stage !== "question" || x.draft === draft) return;
    const t = setTimeout(
      () =>
        void mutate((o) =>
          o.session?.id === x.id
            ? { ...o, session: { ...o.session, draft: draftRef.current } }
            : o,
        ),
      300,
    );
    return () => clearTimeout(t);
  }, [draft, x?.id, x?.index, x?.stage, mutate]);
  useEffect(() => {
    if (!x || x.stage !== "question" || !elapsed || elapsed % 5) return;
    void mutate((o) =>
      o.session?.id === x.id &&
      o.session.index === x.index &&
      o.session.stage === "question"
        ? {
            ...o,
            session: {
              ...o.session,
              activeSeconds: Math.max(
                o.session.activeSeconds,
                timeBase.current + elapsed,
              ),
            },
          }
        : o,
    );
  }, [elapsed, mutate, x?.id, x?.index, x?.stage]);
  if (!x)
    return (
      <>
        <Title eyebrow="学习片段" title="从今天的安排开始吧。" />
        <Link className="primary" to="/today">
          回到今天
        </Link>
      </>
    );
  const u = getUnit(s, x.pack, x.unit),
    q = u?.questions.find((q) => q.id === x.queue[x.index]);
  if (!u || !q) return <Empty>当前片段的资料暂不可用，请返回今天重新安排。</Empty>;
  const active = available(s).some((a) => a.u.id === u.id && a.pack === x.pack);
  if (!active && x.stage !== "done")
    return (
      <section className="panel">
        <h2>这一片段已更新或暂停使用</h2>
        <p>旧作答会保留，掌握证据按当前可用内容重新计算。</p>
        <button
          className="primary"
          disabled={busy}
          onClick={async () => {
            if (await mutate((o) => ({ ...o, session: null }))) nav("/today");
          }}
        >
          结束片段并重新安排
        </button>
      </section>
    );
  if (s.cycle.paused)
    return (
      <section className="panel">
        <h2>当前正在休息</h2>
        <Link className="primary" to="/today">
          回到今天恢复
        </Link>
      </section>
    );
  const checkpoint = async () =>
    mutate((o) =>
      o.session?.id === x.id
        ? {
            ...o,
            session: {
              ...o.session,
              draft: draftRef.current,
              activeSeconds: Math.max(
                o.session.activeSeconds,
                timeBase.current + elapsed,
              ),
            },
          }
        : o,
    );
  const latest = s.attempts.find((a) => a.id === `${x.id}:${x.index}`);
  const renderCloze = () => {
    if (!q.span) return null;
    return (
      <div className="cloze real-cloze">
        {u.passage.slice(0, q.span[0])}
        <span>〔回忆这一段〕</span>
        {u.passage.slice(q.span[1])}
      </div>
    );
  };
  return (
    <div className="study">
      <div className="study-top">
        <button
          className="text-button"
          disabled={busy}
          onClick={async () => {
            if (await checkpoint()) {
              setElapsed(0);
              nav(x.mode === "placement" ? "/placement" : "/today");
            }
          }}
        >
          <ArrowLeft size={16} />
          保存并返回
        </button>
        <span className="tag">
          {classicNames[u.classic]} ·{" "}
          {x.mode === "placement" ? "起点了解" : "原文训练"}
        </span>
      </div>
      <StudyProgress label="本片段作答进度" done={x.stage === 'done' ? x.queue.length : x.index + (x.stage === 'feedback' ? 1 : 0)} total={x.queue.length} detail={`${x.stage === 'read' ? '先读原文 → 理解 → 闭卷作答 → 订正' : x.stage === 'explain' ? '理解 → 闭卷作答 → 订正' : x.stage === 'question' ? '闭卷作答中 · 提交后才能核对原文' : x.stage === 'feedback' ? '本题已提交 · 看完反馈再继续' : '本片段完成'}；剩余约 ${Math.max(0,x.queue.length-x.index-(x.stage === 'feedback'||x.stage === 'done'?1:0))} 题。阅读与作答合计预算约 ${Math.ceil(u.estimatedSeconds/60)} 分钟，按理解情况调整。`}/>
      {x.mode !== 'placement' && (()=>{const tasks=s.plans.filter(p=>p.date===todayFor(s)).at(-1)?.tasks.filter(t=>t.status!=='cancelled'&&t.status!=='deferred')||[];return <StudyProgress label="今日原文专项" done={tasks.filter(t=>t.status==='completed').length} total={tasks.length} detail={`剩余 ${tasks.filter(t=>t.status!=='completed').length} 个单元，按单元预算约 ${Math.ceil(tasks.filter(t=>t.status!=='completed').reduce((n,t)=>n+t.seconds,0)/60)} 分钟（含当前单元完整预算）；全国三级主课程进度请查看 30 天领学。`}/>})()}
      {x.stage === "done" ? (
        <section className="completion panel">
          <div className="completion-flower">
            <Decoration kind="gift" />
          </div>
          <h1>这个片段已完成，进度已保存。</h1>
          <p>已保存阅读、作答与反馈记录。辅助练习不计为独立掌握证据。</p>
          {x.mode !== "placement" && <p>今天还有 {s.plans.filter((p) => p.date === todayFor(s)).at(-1)?.tasks.filter((t) => t.status === "planned").length || 0} 个已安排单元待学。完成一个片段不等于完成当天预算或全部考纲。</p>}
          <div className="actions">
            {x.mode !== "placement" && s.plans.filter((p) => p.date === todayFor(s)).at(-1)?.tasks.some((t) => t.status === "planned") && <button className="primary" disabled={busy} onClick={async () => {
              const next = s.plans.filter((p) => p.date === todayFor(s)).at(-1)?.tasks.find((t) => t.status === "planned");
              if (next && await mutate((o) => startTask(o, next))) nav("/learn/current");
            }}>继续下一个单元 <ArrowRight size={17} /></button>}
            <Link
              className="primary"
              to={x.mode === "placement" ? "/placement" : "/today"}
            >
              {x.mode === "placement" ? "继续起点了解" : "回到今天"}
            </Link>
            <Link className="secondary" to="/growth">
              看看学习记录
            </Link>
          </div>
        </section>
      ) : (
        <div className="study-layout">
          <article className="panel reading-card">
            <span className="eyebrow">{u.chapter}</span>
            <h1>
              {x.stage === "read"
                ? "先把这一句，慢慢读一遍。"
                : x.stage === "explain"
                  ? "理解，比匆忙记住更重要。"
                  : u.title}
            </h1>
            {x.stage === "read" ? (
              <>
                <div className="reading-text">{u.passage}</div>
                <SourceInfo s={s} u={u} />
              </>
            ) : x.stage === "explain" ? (
              <>
                <blockquote>{u.explanation}</blockquote>
                <SourceInfo s={s} u={u} />
                <Note>
                  接下来的练习属于刚学后的巩固；明天不看提示回忆，才会产生独立检索证据。
                </Note>
              </>
            ) : (
              <>
                <span className="tag">
                  {q.dimension === "recall" ? `回忆 L${q.level}` : "原文理解"} ·{" "}
                  {x.index + 1}/{x.queue.length}
                </span>
                {q.type === "cloze" ? (
                  <>
                    {renderCloze()}
                    <label>
                      你的回忆
                      <input
                        maxLength={1000}
                        value={draft}
                        disabled={x.stage === "feedback"}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="暂时想不起来也没关系"
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <h3 className="question-heading">{q.stem}</h3>
                    <div className="answer-options">
                      {[...q.options]
                        .sort(
                          (a, b) =>
                            optionRank(a.id + x.id) - optionRank(b.id + x.id),
                        )
                        .map((a, i) => (
                          <button
                            key={a.id}
                            disabled={x.stage === "feedback"}
                            aria-pressed={draft === a.id}
                            className={draft === a.id ? "selected" : ""}
                            onClick={() => setDraft(a.id)}
                          >
                            <span>{String.fromCharCode(65 + i)}</span>
                            {a.text}
                          </button>
                        ))}
                    </div>
                  </>
                )}
                {x.stage === "feedback" && (
                  <div className="feedback">
                    <b>提交后核对原文</b>
                    <p>{u.passage}</p>
                  </div>
                )}
                {x.stage === "feedback" && latest && (
                  <div className="feedback" role="status">
                    <b>
                      {latest.score === 1
                        ? "这一次，回忆对了。"
                        : "这一处，下次再陪你巩固。"}
                    </b>
                    <p>
                      {q.type === "single"
                        ? q.options.find((o) => o.id === q.answers[0])?.text
                        : q.answers[0]}
                    </p>
                    <p>{q.explanation}</p>
                    <small>
                      {latest.assisted
                        ? "有原文或答案帮助：不计独立掌握证据。"
                        : "首答已留存；同一家族同一天不会反复累加。"}
                    </small>
                  </div>
                )}
              </>
            )}
            <div className="reading-actions">
              <button
                className="text-button"
                disabled={busy}
                onClick={async () => {
                  if (await checkpoint()) {
                    setElapsed(0);
                    notify("片段已保存，随时回来继续。");
                    nav("/today");
                  }
                }}
              >
                <Pause size={16} />
                先歇一下
              </button>
              <button
                className="primary"
                disabled={busy}
                onClick={async () => {
                  if (x.stage === "read") await mutate((o) => markRead(o));
                  else if (x.stage === "explain")
                    await mutate((o) =>
                      expose(
                        { ...o, session: { ...o.session!, stage: "question" } },
                        u,
                        "stem",
                      ),
                    );
                  else if (x.stage === "question") {
                    if (
                      await mutate((o) =>
                        submit({
                          ...o,
                          session: {
                            ...o.session!,
                            draft,
                            activeSeconds: Math.max(
                              o.session!.activeSeconds,
                              timeBase.current + elapsed,
                            ),
                          },
                        }),
                      )
                    ) {
                      setElapsed(0);
                      tone(1);
                    }
                  } else {
                    if (await mutate((o) => nextQuestion(o))) {
                      setElapsed(0);
                      tone(0);
                    }
                  }
                }}
              >
                {x.stage === "read"
                  ? "读过了，看看理解"
                  : x.stage === "explain"
                    ? "开始巩固"
                    : x.stage === "question"
                      ? draft
                        ? "提交并看反馈"
                        : "暂不确定，看看反馈"
                      : x.index + 1 === x.queue.length
                        ? "完成这个片段"
                        : "下一小步"}
                <ArrowRight size={16} />
              </button>
            </div>
          </article>
          <aside className="study-aside">
            <Companion name={s.profile.name} state="studying" compact />
            <div className="gentle-note">
              <Decoration kind="tea" />
              <p>
                一次只专注一小步。<small>内容与评分依据，都有来源。</small>
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
function Placement(ctx: Ctx) {
  const { s, mutate, busy } = ctx;
  const nav = useNavigate();
  const units = available(s);
  const x = s.session;
  const elapsed = s.placement.startedAt
    ? Date.now() - Date.parse(s.placement.startedAt)
    : 0;
  const used = s.placement.families;
  const candidates = units.filter((a) => !used.includes(a.u.family));
  const stop =
    elapsed >= 15 * 60000 ||
    s.placement.activeSeconds >= 12 * 60 ||
    used.length >= 24 ||
    !candidates.length;
  const pick = () => {
    const counts = [0, 0, 0, 0];
    used.forEach((f) => {
      const u = units.find((a) => a.u.family === f);
      if (u) counts[u.u.classic]++;
    });
    return [...candidates].sort(
      (a, b) =>
        counts[a.u.classic] - counts[b.u.classic] || a.u.classic - b.u.classic,
    )[0];
  };
  return (
    <div className="narrow">
      <Title eyebrow="认识起点" title="先了解一点，不急着下结论。">
        当前只用训练池。短测目标不超过 15 分钟，题库不足会提前结束。
      </Title>
      {s.placement.status === "not_started" ||
      s.placement.status === "skipped" ? (
        <section className="panel">
          <Note>
            当前 {units.length} 个家族，不足每科 3
            个家族的完整起点了解要求。结果会明确保留“证据不足”。
          </Note>
          <div className="actions">
            <button
              className="primary"
              disabled={busy || !units.length || (!!x && x.stage !== "done")}
              onClick={() =>
                void mutate((o) => ({
                  ...o,
                  placement: {
                    status: "active",
                    startedAt: nowISO(),
                    activeSeconds: 0,
                    families: [],
                    message: "",
                  },
                }))
              }
            >
              开始简短了解
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={async () => {
                if (
                  await mutate((o) => ({
                    ...o,
                    placement: {
                      ...o.placement,
                      status: "skipped",
                      message: "用户选择先从基础开始。",
                    },
                  }))
                )
                  nav("/today");
              }}
            >
              先从基础开始
            </button>
          </div>
        </section>
      ) : (
        <section className="panel">
          {s.placement.status === "done" ? (
            <>
              <h2>先从基础稳稳开始</h2>
              <p>{s.placement.message}</p>
              <p>样本少于每科 3 个不同家族时，不给出高低能力结论。</p>
              <Link className="primary" to="/today">
                回到今天
              </Link>
            </>
          ) : (
            <>
              <p>
                已选取 {used.length}{" "}
                个不同训练家族。主动结束与跳过都不会被记作答错。
              </p>
              {x?.mode === "placement" && x.stage !== "done" ? (
                <Link className="primary" to={`/learn/${x.id}`}>
                  继续当前题
                </Link>
              ) : (
                <button
                  className="primary"
                  disabled={busy || stop}
                  onClick={async () => {
                    if (
                      Date.now() -
                        Date.parse(s.placement.startedAt || nowISO()) >=
                        15 * 60000 ||
                      s.placement.activeSeconds +
                        (x?.mode === "placement" ? x.activeSeconds : 0) >=
                        720
                    ) {
                      ctx.notify("本次已达到时间上限，请结束并保存小结。");
                      return;
                    }
                    const item = pick();
                    if (!item) return;
                    const q = item.u.questions.find((q) => q.type === "single");
                    if (!q) return;
                    if (
                      await mutate((o) =>
                        expose(
                          {
                            ...o,
                            placement: {
                              ...o.placement,
                              families: [
                                ...o.placement.families,
                                item.u.family,
                              ],
                              activeSeconds:
                                o.placement.activeSeconds +
                                (o.session?.mode === "placement"
                                  ? o.session.activeSeconds
                                  : 0),
                            },
                            session: {
                              id: crypto.randomUUID(),
                              task: crypto.randomUUID(),
                              unit: item.u.id,
                              pack: item.pack,
                              stage: "question",
                              queue: [q.id],
                              index: 0,
                              draft: "",
                              help: false,
                              startedAt: nowISO(),
                              activeSeconds: 0,
                              mode: "placement",
                            },
                          },
                          item.u,
                          "stem",
                        ),
                      )
                    ) {
                      nav("/learn/placement");
                    }
                  }}
                >
                  下一道起点题
                </button>
              )}
              {stop && <Note>已达到时间或可用家族上限，不再出新题。</Note>}
              <button
                className="secondary"
                disabled={busy || (!!x && x.stage !== "done")}
                onClick={() =>
                  void mutate((o) => ({
                    ...o,
                    placement: {
                      ...o.placement,
                      status: "done",
                      message: `本次使用 ${o.placement.families.length} 个训练家族，当前内容较少，各经典证据仍不足。保留首答记录，建议从基础阅读开始。`,
                    },
                  }))
                }
              >
                结束并保存小结
              </button>
            </>
          )}
        </section>
      )}
    </div>
  );
}
function Growth({ s, mutate, busy, notify }: Ctx) {
  const list = available(s),
    st = stage(s);
  return (
    <>
      <Title eyebrow="成长手记 · 真实学习记录" title="小小的积累，都有依据。">
        阅读、辅助练习和独立回忆分别记录。
      </Title>
      <div className="stats-grid">
        <div className="panel stat">
          <span>读过的本地切片</span>
          <strong>
            {
              s.covered.filter((c) => list.some((x) => x.u.id === c.unit))
                .length
            }
            <small> / {list.length}</small>
          </strong>
        </div>
        <div className="panel stat">
          <span>已保存作答</span>
          <strong>
            {s.attempts.length}
            <small> 次</small>
          </strong>
        </div>
        <div className="panel stat">
          <span>正式考试达标</span>
          <strong className="unknown">尚未验证</strong>
        </div>
      </div>
      <Note>
        这不是考纲覆盖率。首批切片涉及{" "}
        {new Set(list.map((x) => x.u.requirement.id)).size}{" "}
        条本地考纲候选的部分内容；候选总数为 {s.packs.at(-1)?.scopeTotal || 712}
        ，其余范围尚待核定。
      </Note>
      <section className="panel">
        <div className="section-heading">
          <h2>{st.name}</h2>
          <button
            className="text-button"
            disabled={busy}
            onClick={async () => {
              if (await mutate((o) => report(o)))
                notify("已保存这一刻的报告快照。");
            }}
          >
            保存报告快照
          </button>
        </div>
        <p>{st.reason}</p>
        <div className="evidence-table">
          {list.map(({ u }) => {
            const a = evidence(s, u.id, "understand"),
              b = evidence(s, u.id, "recall"),
              r = reviewState(s, u.id);
            return (
              <div className="evidence-row" key={u.id}>
                <Link to={`/knowledge/${u.id}`}>
                  <b>{u.title}</b>
                  <small>{classicNames[u.classic]}</small>
                </Link>
                <span>
                  理解：
                  {a.score === null
                    ? `证据不足（${a.count} 次）`
                    : `近期指标 ${Math.round(a.score * 100)}%`}
                </span>
                <span>
                  背诵：
                  {b.score === null
                    ? `证据不足（${b.count} 次）`
                    : `近期指标 ${Math.round(b.score * 100)}%`}
                </span>
                <span>
                  {r.weak
                    ? "需要再巩固"
                    : r.due
                      ? `回顾日 ${r.due}`
                      : "尚未学习"}
                </span>
              </div>
            );
          })}
        </div>
      </section>
      <section className="panel">
        <h2>最近需要帮助的地方</h2>
        {s.attempts
          .filter((a) => effectiveScore(s, a) === 0)
          .slice(-8)
          .reverse()
          .map((a) => (
            <div className="history-row" key={a.id}>
              <b>{getUnit(s, a.pack, a.unit)?.title}</b>
              <span>
                {a.date} · {a.dimension === "recall" ? "原文回忆" : "原文理解"}{" "}
                · 自动关联本单元
              </span>
              <small>不推断粗心或记忆差等原因；后续会优先回顾。</small>
            </div>
          ))}
        {!s.attempts.some((a) => effectiveScore(s, a) === 0) && (
          <p>暂时没有需要纠错的首答记录。</p>
        )}
      </section>
      <section className="panel">
        <h2>留存的报告</h2>
        {s.reports
          .slice(-5)
          .reverse()
          .map((r) => (
            <div className="history-row" key={r.id}>
              <b>
                {r.at.slice(0, 10)} · {r.stage}
              </b>
              <p>{r.summary}</p>
            </div>
          ))}
        {!s.reports.length && (
          <p>可在上方保存当前学习情况，历史快照不会被后续成绩改写。</p>
        )}
        <div className="actions">
          <Link className="secondary" to="/assessment/stage">
            阶段测评条件
          </Link>
          <Link className="secondary" to="/graduation">
            周期总结与后续安排
          </Link>
        </div>
      </section>
    </>
  );
}
function Assessment() {
  return (
    <div className="narrow">
      <Title eyebrow="测评准备" title="让结论，等一等证据。" />
      <Note>
        已核对 2026 全国三级官方考试方案；题目逐项难度、级别及独立测评池尚未完成核验。正式测评暂不开启，不把已见训练题当作未见测评。
      </Note>
      <Link className="primary" to="/today">
        继续有依据的学习
      </Link>
    </div>
  );
}
function Graduation({ s, mutate, busy, notify }: Ctx) {
  const units = available(s);
  const weak = units.filter(({ u }) => reviewState(s, u.id).weak);
  const unknown = units.filter(
    ({ u }) =>
      evidence(s, u.id, "recall").score === null ||
      evidence(s, u.id, "understand").score === null,
  );
  return (
    <div className="narrow">
      <Title eyebrow="学习总结版" title="把这段认真，温柔地收好。" />
      <section className="panel">
        <Companion name={s.profile.name} state="stage_done" compact />
        <h2>
          已阅读 {s.covered.length} 个切片，留下 {s.attempts.length} 次作答
        </h2>
        <p>
          已接入全部考纲要求与新版教材章节。正式达标尚未验证，请用领学路线完成逐条回忆，并结合限时演练的错题补强。
        </p>
        <h3>接下来，把时间用在这些地方</h3>
        <p>
          当前可用 {units.length} 个本地切片，其中 {weak.length} 个仍需纠错，
          {unknown.length} 个尚缺充分证据。这些数字不是完整考纲覆盖率。
        </p>
        {weak.length > 0 ? (
          <ul>
            {weak.map(({ u }) => (
              <li key={u.id}>
                <Link to={`/knowledge/${u.id}`}>{u.title}</Link>
                ：先回看原文，再分日回忆。
              </li>
            ))}
          </ul>
        ) : (
          <p>当前没有标记中的错误单元，按到期安排保持少量回顾即可。</p>
        )}
        <p className="small muted">
          题源与核验限制可在资料页查看。正式测评所需的独立题目和评分规则尚未齐备，暂不发放达标奖励。
        </p>
        <button
          className="primary"
          disabled={busy}
          onClick={async () => {
            if (await mutate((o) => report(o)))
              notify("学习总结已保存到成长手记。");
          }}
        >
          保存学习总结
        </button>
        <Link className="text-link" to="/today">
          按现在的时间继续安排 <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}
function Rewards({ s, mutate, busy }: Ctx) {
  const [title, setTitle] = useState(""),
    [size, setSize] = useState<"small" | "medium" | "large">("small");
  return (
    <>
      <Title eyebrow="给努力一点甜" title="每一小步，都值得收下。" />
      <div className="reward-hero">
        <Decoration kind="gift" />
        <div>
          <h2>完成学习时，奖励已经为你记好了。</h2>
          <p>
            每天一次小奖励；开启惊喜时另有 20%
            机会得到小奖励池中的一项，结果保存后不重抽。
          </p>
        </div>
      </div>
      <section className="panel">
        <h2>已获得的小美好</h2>
        {s.grants.map((g) => (
          <div className="claim-row" key={g.key}>
            <Gift size={19} />
            <span>
              {g.title}
              <small>
                {g.date} · {g.kind === "chest" ? "惊喜宝箱" : "每日小奖励"}
              </small>
            </span>
            <button
              className="secondary"
              disabled={busy || g.redeemed}
              onClick={() =>
                void mutate((o) => ({
                  ...o,
                  grants: o.grants.map((x) =>
                    x.key === g.key ? { ...x, redeemed: true } : x,
                  ),
                }))
              }
            >
              {g.redeemed ? "已兑现" : "标记已兑现"}
            </button>
          </div>
        ))}
        {!s.grants.length && (
          <p>完成一个最小学习任务后，这里会留下第一份奖励。</p>
        )}
      </section>
      <section className="panel add-reward">
        <h2>我的奖励池</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim() || s.rewards.length >= 100) return;
            if (
              await mutate((o) => ({
                ...o,
                rewards: [
                  ...o.rewards,
                  { id: crypto.randomUUID(), title: title.trim(), size },
                ],
              }))
            )
              setTitle("");
          }}
        >
          <label>
            奖励内容
            <input
              maxLength={60}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>
          <label>
            大小
            <select
              value={size}
              onChange={(e) => setSize(e.target.value as typeof size)}
            >
              <option value="small">小奖励</option>
              <option value="medium">中奖励</option>
              <option value="large">大奖励</option>
            </select>
          </label>
          <button className="primary" disabled={busy}>
            放进奖励池
          </button>
        </form>
        {s.rewards.map((r) => (
          <div className="claim-row" key={r.id}>
            <span>
              {r.title}
              <small>
                {{ small: "小奖励", medium: "中奖励", large: "大奖励" }[r.size]}
              </small>
            </span>
            <button
              className="text-button"
              disabled={busy}
              onClick={() =>
                void mutate((o) => ({
                  ...o,
                  rewards: o.rewards.filter((x) => x.id !== r.id),
                }))
              }
            >
              移除
            </button>
          </div>
        ))}
        <Note>
          阶段能力与正式毕业条件尚未具备，中奖励和大奖励只保留定义，不虚构触发。奖励池为空时仍有文字鼓励。
        </Note>
      </section>
    </>
  );
}
function Preferences({
  s,
  mutate,
  busy,
  notify,
  tone,
  onDemo,
}: Ctx & { onDemo: () => void }) {
  const [name, setName] = useState(s.profile.name),
    [exam, setExam] = useState(s.profile.exam),
    [minutes, setMinutes] = useState(s.profile.defaultMinutes),
    [err, setErr] = useState(""),
    [confirm, setConfirm] = useState(false);
  return (
    <>
      <Title eyebrow="我的小小书房" title="把节奏，调成舒服的样子。" />
      <RestartControls s={s} mutate={mutate} busy={busy}/>
      <div className="settings-grid">
        <section className="panel">
          <h2>伙伴与未来安排</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!name.trim() || Array.from(name.trim()).length > 20) {
                setErr("名字需要 1—20 个字。");
                return;
              }
              if (exam && exam < todayFor(s)) {
                setErr("日期已过，请修改或留空。");
                return;
              }
              setErr("");
              if (
                await mutate((o) =>
                  report({
                    ...o,
                    profile: {
                      ...o.profile,
                      name: name.trim(),
                      exam,
                      defaultMinutes: minutes,
                    },
                  }),
                )
              )
                notify("设置已保存。已有学习和奖励不变，下次安排使用新日期。");
            }}
          >
            <label>
              伙伴的名字
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
              />
            </label>
            <label>
              考试日期
              <input
                type="date"
                value={exam}
                min={todayFor(s)}
                onChange={(e) => setExam(e.target.value)}
              />
            </label>
            <label>
              未来每日预计时间
              <select
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
              >
                {[10, 20, 30, 60, 90].map((n) => (
                  <option key={n} value={n}>
                    {n} 分钟
                  </option>
                ))}
              </select>
            </label>
            {err && (
              <p className="field-error" role="alert">
                {err}
              </p>
            )}
            <button className="primary" disabled={busy}>
              保存设置
            </button>
          </form>
          <p className="small muted">
            周期使用 {s.profile.timezone}{" "}
            计日。今天临时少学不会改写未来默认时间。
          </p>
        </section>
        <section className="panel">
          <h2>舒服的陪伴方式</h2>
          {[
            ["sound", "轻轻的提示音"],
            ["reducedMotion", "减少动态效果"],
            ["chest", "惊喜小盒子"],
          ].map(([key, label]) => (
            <label key={key} className="toggle-row">
              <span>{label}</span>
              <input
                type="checkbox"
                checked={s.settings[key as keyof typeof s.settings]}
                disabled={busy}
                onChange={(e) => {
                  const checked=e.currentTarget.checked;
                  void mutate((o) => ({
                    ...o,
                    settings: { ...o.settings, [key]: checked },
                  }));
                }}
              />
            </label>
          ))}
          <div className="sound-tests">
            {["完成", "答对", "宝箱", "阶段"].map((label, i) => (
              <button
                key={label}
                className="text-button"
                disabled={!s.settings.sound}
                onClick={() => tone(i)}
              >
                <Volume2 size={15} />
                {label}试听
              </button>
            ))}
          </div>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => setConfirm(true)}
          >
            {s.cycle.paused ? "恢复学习计划" : "暂停学习计划"}
          </button>
        </section>
      </div>
      <div className="settings-links">
        <Link className="panel" to="/archive">
          <Download />
          <div>
            <b>学习存档</b>
            <span>备份进度、错题、奖励与内容版本</span>
          </div>
        </Link>
        <Link className="panel" to="/sources">
          <BookOpen />
          <div>
            <b>本地内容包</b>
            <span>查看原文来源与核验说明</span>
          </div>
        </Link>
      </div>
      <button className="text-button" onClick={onDemo}>
        查看原来的交互演示（独立存档）
      </button>
      {confirm && (
        <Modal
          title={s.cycle.paused ? "准备好回来了吗？" : "先好好休息一会儿"}
          onClose={() => setConfirm(false)}
        >
          <p>
            暂停不删除任何记录，考试日与日历照常前进。恢复后按新的时间重新安排，不补任务债务。
          </p>
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              if (await mutate((o) => pause(o, !o.cycle.paused))) {
                setConfirm(false);
                notify("计划状态已保存。");
              }
            }}
          >
            确认{s.cycle.paused ? "恢复" : "暂停"}
          </button>
        </Modal>
      )}
    </>
  );
}
function Sources({ s, mutate, busy, notify }: Ctx) {
  const [withdraw, setWithdraw] = useState<Unit | null>(null);
  return (
    <div className="narrow">
      <Title eyebrow="来源与内容准入" title="有据可查，才安心学习。">
        已内置三份完整阅读资料和可用训练内容；其余资料仍在整理，不代表整个学习包已转换成课程。
      </Title>
      <section className="panel">
        <h2>完整阅读资料</h2>
        <p>从你提供的学习包直接内置，无需导入。全文阅读与已审核的训练单元分开标示。</p>
        {[
          ["F0003", "2026 年考试大纲", "38 页 · 核对考试范围"],
          ["F0012", "三级考试指南", "129 页 · 较早版本，范围以 2026 考纲为准"],
          ["F0918", "重点条文（新大纲）", "27 页 · 与指南有异文，未全部转换为训练"],
        ].map(([id, title, note]) => <div className="history-row" key={id}>
          <a className="text-link" href={`${import.meta.env.BASE_URL}library/${id}.pdf`} target="_blank" rel="noreferrer">{title} · 打开完整 PDF →</a>
          <p>{note}</p>
        </div>)}
      </section>
      <section className="panel">
        <h2>已准备好的学习资料</h2>
        {s.packs.map((p) => (
          <div className="history-row" key={packKey(p)}>
            <b>
              {p.id} · v{p.version}
            </b>
            <p>
              {
                p.units.filter(
                  (u) => u.status === "published" && u.pool === "training",
                ).length
              }{" "}
              个训练切片 ·{" "}
              {p.release === "local_only" ? "仅本地使用" : "可公开内容"} ·{" "}
              {p.reviewedAt}
            </p>
          </div>
        ))}
        {!s.packs.length && <p>当前资料暂不可用，请刷新重试。</p>}
        <Note>
          主课程使用已对照官方文件的 2026 考纲目录，三级包含一级、二级与新增条目。教材按章节接入；题目和逐考点覆盖仍须核验，不冒称专业双重复核。
        </Note>
      </section>
      <section className="panel">
        <h2>内容疑问与撤回</h2>
        <p>
          发现原文或答案有疑问，可先暂停这一单元。停止新任务，保留历史作答，相关掌握指标不再作为有效证据。
        </p>
        {available(s).map(({ u }) => (
          <div className="claim-row" key={u.id}>
            <span>{u.title}</span>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => setWithdraw(u)}
            >
              暂停此内容
            </button>
          </div>
        ))}
        {s.withdrawn.length > 0 && (
          <p className="small muted">
            已暂停 {s.withdrawn.length} 个单元；旧存档导入不会偷偷恢复它们。
          </p>
        )}
      </section>
      <section className="panel">
        <h2>仍未开放的部分</h2>
        <p>
          旧题中“大小便／魄门”等冲突家族未纳入学习。当前无已核实三级真题，无独立阶段题库与毕业题库，2026 官方方案已接入课程页，但尚未形成符合其级别和难度比例的独立试卷。
        </p>
        <p>
          本项目用于经典学习与备考；首批题只核对原文表述，不用于个人诊断或用药决策。
        </p>
        <p>伙伴与治愈装饰由内置 image 生成功能绘制，保留已确认的 Q 版风格。</p>
      </section>
      {withdraw && (
        <Modal title="暂停使用这一单元" onClose={() => setWithdraw(null)}>
          <p>
            {withdraw.title}
            ：历史记录保留，后续需核实内容后发布新版本。不会扣回已经获得的奖励。
          </p>
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              if (
                await mutate((o) =>
                  invalidateWithdrawn({
                    ...o,
                    withdrawn: [...new Set([...o.withdrawn, withdraw.id])],
                  }),
                )
              ) {
                setWithdraw(null);
                notify("内容已暂停，历史记录仍保留。");
              }
            }}
          >
            确认暂停此内容
          </button>
        </Modal>
      )}
    </div>
  );
}
function Archive({
  s,
  busy,
  restore,
  notify,
}: Ctx & { restore: (s: LearningState) => Promise<boolean> }) {
  const [pending, setPending] = useState<LearningState | null>(null),
    [err, setErr] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const download = async (value: LearningState, suffix = "") => {
    const data = await makeEnvelope(value),
      url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
    const a = document.createElement("a");
    a.href = url;
    a.download = `经经有条-学习存档-${todayFor(s)}${suffix}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("已发起下载，请确认浏览器中的文件已保存。");
  };
  return (
    <div className="narrow">
      <Title eyebrow="把积累，好好收好" title="真实学习存档">
        包含学习记录、错题、曝光、奖励、设置与恢复所需的内容快照。与演示格式完全分开。
      </Title>
      <div className="archive-grid">
        <section className="panel">
          <Download size={28} />
          <h2>导出完整学习存档</h2>
          <p>包含本地学习内容，仅保存到你选择的位置。</p>
          <button
            className="primary"
            disabled={busy}
            onClick={() => void download(s)}
          >
            下载学习存档
          </button>
        </section>
        <section className="panel">
          <Upload size={28} />
          <h2>恢复已有积累</h2>
          <p>先检查摘要与所有引用，再预览确认。原有存档会先备份。</p>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => file.current?.click()}
          >
            选择学习存档
          </button>
          <input
            ref={file}
            className="hidden"
            type="file"
            accept=".json"
            aria-label="选择学习存档文件"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              try {
                if (f.size > 25 * 1024 * 1024) throw Error("存档超过 25 MB。");
                const v = validateState(
                  await readEnvelope(JSON.parse(await f.text()), "archive"),
                );
                setPending(v);
                setErr("");
              } catch (e) {
                setErr(e instanceof Error ? e.message : "无法读取存档。");
              }
            }}
          />
        </section>
      </div>
      {err && (
        <p className="field-error" role="alert">
          {err}
        </p>
      )}
      <Note>
        恢复旧档不会清除本机已知的曝光、奖励、固定宝箱结果与已暂停内容。不同人的学习档案不混合；跨设备可在空白浏览器恢复。
      </Note>
      <button
        className="text-button"
        onClick={async () => {
          const record = await learningDB.records.get("before-import");
          if (record) await download(record.value, "-恢复前备份");
          else notify("首次导入学习存档时，将自动生成一份恢复前备份。");
        }}
      >
        下载上一次恢复前备份
      </button>
      {pending && (
        <Modal title="确认恢复这份学习存档" onClose={() => setPending(null)}>
          <div className="import-preview">
            <p>
              伙伴 <b>{pending.profile.name}</b>
            </p>
            <p>
              作答 <b>{pending.attempts.length} 条</b>
            </p>
            <p>
              内容快照 <b>{pending.packs.length} 个版本</b>
            </p>
            <p>
              奖励 <b>{pending.grants.length} 条</b>
            </p>
          </div>
          <p>这会替换学习进度与设置。事务备份失败时不会执行替换。</p>
          <div className="actions">
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                if (await restore(pending)) setPending(null);
              }}
            >
              备份当前并恢复学习
            </button>
            <button className="secondary" onClick={() => setPending(null)}>
              暂不导入
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
