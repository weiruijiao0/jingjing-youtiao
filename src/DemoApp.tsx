import { useEffect, useRef, useState, type ReactNode } from "react";
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
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Sprout,
  Sun,
  Gift,
  Settings,
  ChevronRight,
  Check,
  Leaf,
  Coffee,
  Pause,
  Download,
  Upload,
  ShieldCheck,
  X,
  Volume2,
  Heart,
  Sparkles,
  Clock3,
  Archive,
  CircleHelp,
  CheckCircle2,
} from "lucide-react";
import {
  budget,
  cycle,
  db,
  readState,
  restoreState,
  today,
  validateArchive,
  writeState,
  type Mood,
  type State,
} from "./store";

const portrait = `${import.meta.env.BASE_URL}assets/mascot/companion-chibi.png`;
export function Decoration({kind,className=""}:{kind:"tea"|"gift";className?:string}) {
  return <img className={`cozy-art ${className}`} src={`${import.meta.env.BASE_URL}assets/decor/${kind==='tea'?'tea-bunny':'sprout-gift'}.png`} alt="" aria-hidden="true" loading="lazy"/>;
}
const classicNames = ["黄帝内经", "伤寒论", "金匮要略", "温病学"];
const moodLabels = { tired: "有点累", normal: "刚刚好", great: "很有精神" };
const sizeLabels = { small: "小奖励", medium: "中奖励", large: "大奖励" };
type Commit = (update: (s: State) => State) => Promise<boolean>;
type Context = {
  s: State;
  commit: Commit;
  busy: boolean;
  notify: (text: string) => void;
  sound: (kind?: number) => void;
};

export function Companion({
  name,
  state = "welcome",
  compact = false,
}: {
  name: string;
  state?: string;
  compact?: boolean;
}) {
  const lines: Record<string, string> = {
    welcome: "不用一口气走很远。\n今天，我陪你读一点点。",
    studying: "慢慢来，先把这一句读进心里。",
    task_done: "这一小步，也算数。",
    happy: "你的认真，值得一个小小的庆祝。",
    rest_reminder: "先歇一会儿，我在这里等你。",
    chest_open: "给今天的自己，一点惊喜。",
    stage_done: "回头看看，你已经走过一段路。",
  };
  return (
    <div className={`companion ${compact ? "compact" : ""}`} data-state={state}>
      <img
        src={portrait}
        alt={`${name || "学习伙伴"}的 Q 版形象：黑发、白衬衫、黑马甲，抱着书向你招手`}
      />
      <span className="portrait-label">
        <span className="online-dot" />
        {name || "你的学习伙伴"} · 一直都在
      </span>
      <div className="speech">{lines[state] || lines.welcome}</div>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prior = document.activeElement as HTMLElement;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab") {
        const els = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]',
          ) || [],
        );
        const first = els[0],
          last = els.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = bodyOverflow;
      prior?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <button
          className="icon-button modal-close"
          aria-label="关闭"
          onClick={onClose}
        >
          <X />
        </button>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}
export function Title({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-title">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </header>
  );
}
function EmptyNotice({
  title = "这部分资料，还在认真校对",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="notice-card">
      <ShieldCheck size={30} />
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}

export default function App() {
  const [s, setState] = useState<State | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState("");
  const current = useRef<State | null>(null),
    locked = useRef(false);
  const location = useLocation();
  useEffect(() => {
    readState()
      .then((v) => {
        current.current = v;
        setState(v);
      })
      .catch(() =>
        setError("无法打开本地存档。请允许此浏览器使用本地存储，再刷新重试。"),
      );
  }, []);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(id);
    }
  }, [toast]);
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById("main")?.focus();
  }, [location.pathname]);
  const commit: Commit = async (update) => {
    if (locked.current || !current.current) return false;
    locked.current = true;
    setBusy(true);
    try {
      const next = await writeState(
        update(current.current),
        current.current.revision,
      );
      current.current = next;
      setState(next);
      setError("");
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "保存失败，请导出当前数据并重试。",
      );
      return false;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const sound = (kind = 0) => {
    if (!current.current?.settings.sound) return;
    try {
      const audio = new AudioContext();
      const osc = audio.createOscillator(),
        gain = audio.createGain();
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.frequency.setValueAtTime(
        [523, 659, 784, 880][kind % 4],
        audio.currentTime,
      );
      osc.frequency.exponentialRampToValueAtTime(
        1046,
        audio.currentTime + 0.18,
      );
      gain.gain.setValueAtTime(0.035, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.35);
      osc.start();
      osc.stop(audio.currentTime + 0.36);
      osc.onended = () => void audio.close();
    } catch {
      setToast("当前浏览器暂时无法播放音效。");
    }
  };
  if (!s)
    return (
      <div className="loading">
        <Sprout size={40} />
        <h1>经经有条</h1>
        <p>{error || "正在打开你的小小书房…"}</p>
        {error && (
          <button onClick={() => window.location.reload()}>刷新重试</button>
        )}
      </div>
    );
  const ctx: Context = { s, commit, busy, notify: setToast, sound };
  return (
    <div className={s.settings.reducedMotion ? "app reduce-motion" : "app"}>
      <a
        href="#main"
        className="skip"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        跳到主要内容
      </a>
      <aside className="sidebar">
        <Link to="/today" className="brand" aria-label="经经有条，回到今天">
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
            ["/today", Sun, "今天"],
            ["/classics", BookOpen, "经典"],
            ["/growth", Sprout, "成长"],
            ["/me", Settings, "我的"],
          ].map(([path, Icon, label]) => {
            const I = Icon as typeof Sun;
            return (
              <Link
                key={String(path)}
                to={String(path)}
                className={location.pathname === path ? "active" : ""}
              >
                <I size={21} />
                <span>{String(label)}</span>
                {location.pathname === path && <i />}
              </Link>
            );
          })}
        </nav>
        <Link className="sidebar-gift" to="/rewards">
          <Gift />
          <b>给努力一点甜</b>
          <span>
            打开我的奖励池 <ArrowRight size={14} />
          </span>
        </Link>
        <div className="sidebar-bottom">
          <Leaf size={17} />
          <p>
            按自己的节奏，
            <br />
            把经典读进心里。
          </p>
          <Link to="/sources">
            资料与说明 <ChevronRight size={14} />
          </Link>
        </div>
      </aside>
      <div className="workspace">
        <div className="topbar">
          <span>
            <span className="tiny-leaf">✦</span> 中医经典 · 陪伴学习
          </span>
          <div>
            <span className="demo-badge">交互原型 · 演示模式</span>
            <span className="save-status" aria-live="polite">
              {busy ? "保存中…" : error ? "保存异常" : "本地存档已就绪"}
            </span>
          </div>
        </div>
        {error && (
          <div className="error-banner" role="alert">
            {error} <Link to="/archive">打开存档管理</Link>
          </div>
        )}
        <main id="main" tabIndex={-1}>
          <Routes>
            <Route path="/welcome" element={<Onboarding {...ctx} />} />
            <Route path="/placement" element={<Placement />} />
            <Route path="/plan" element={<Plan {...ctx} />} />
            <Route
              path="/today"
              element={
                s.profile.ready ? (
                  <Today {...ctx} />
                ) : (
                  <Navigate to="/welcome" replace />
                )
              }
            />
            <Route path="/learn/:sessionId" element={<Learn {...ctx} />} />
            <Route path="/classics" element={<Classics />} />
            <Route path="/knowledge/:id" element={<Knowledge />} />
            <Route path="/growth" element={<Growth {...ctx} />} />
            <Route path="/assessment/:id" element={<Assessment />} />
            <Route path="/graduation" element={<Graduation {...ctx} />} />
            <Route path="/rewards" element={<Rewards {...ctx} />} />
            <Route path="/me" element={<SettingsPage {...ctx} />} />
            <Route
              path="/archive"
              element={
                <ArchivePage
                  {...ctx}
                  onRestore={async (value) => {
                    if (locked.current || !current.current) return false;
                    locked.current = true;
                    setBusy(true);
                    try {
                      const restored = await restoreState(
                        value,
                        current.current,
                      );
                      current.current = restored;
                      setState(restored);
                      setError("");
                      setToast("演示存档已恢复，导入前的备份已保留。");
                      return true;
                    } catch (e) {
                      setError(String(e));
                      return false;
                    } finally {
                      locked.current = false;
                      setBusy(false);
                    }
                  }}
                />
              }
            />
            <Route path="/sources" element={<Sources />} />
            <Route path="*" element={<Navigate to="/today" replace />} />
          </Routes>
          <footer>
            经经有条 <span>·</span> 学习可以认真，也可以温柔。
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}

function Onboarding({ s, commit, busy }: Context) {
  const [name, setName] = useState(s.profile.name),
    [exam, setExam] = useState(s.profile.exam),
    [reward, setReward] = useState(
      s.rewards.find((r) => r.size === "small")?.title || "",
    ),
    [err, setErr] = useState("");
  const nav = useNavigate();
  const step = s.profile.onboardingStep;
  const next = async () => {
    if (step === 0 && (!name.trim() || Array.from(name.trim()).length > 20)) {
      setErr("请给伙伴取一个 1—20 字的名字。");
      return;
    }
    if (step === 1 && exam && exam < today()) {
      setErr("这个日期已经过去了，请选今天或未来，也可以留空自主学习。");
      return;
    }
    setErr("");
    const ok = await commit((old) => ({
      ...old,
      profile: {
        ...old.profile,
        name: name.trim(),
        exam,
        onboardingStep: Math.min(4, step + 1),
      },
      rewards:
        step === 2 && reward.trim()
          ? [
              { id: "tea", title: reward.trim(), size: "small" },
              ...old.rewards.filter((r) => r.id !== "tea"),
            ]
          : old.rewards,
    }));
    if (ok && step === 3) nav("/plan");
  };
  if (s.profile.ready) return <Navigate to="/today" replace />;
  return (
    <div className="onboarding">
      <div className="onboard-story">
        <span className="eyebrow">一段新的学习旅程</span>
        <h1>
          有条不紊，
          <br />
          也有温柔相伴。
        </h1>
        <p>为中医经典备考，留一段属于自己的时间。</p>
        <Companion name={name} />
        <span className="photo-note">熟悉的伙伴，变成软乎乎的陪伴</span>
      </div>
      <div className="onboard-form panel">
        <Decoration kind="tea" className="onboarding-decoration" />
        <div
          className="step-dots"
          role="group"
          aria-label={`引导第 ${Math.min(step + 1, 4)} 步，共 4 步`}
        >
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={i <= step ? "done" : ""} />
          ))}
        </div>
        <span className="eyebrow">
          初次见面 · {String(Math.min(step + 1, 4)).padStart(2, "0")} / 04
        </span>
        {step === 0 ? (
          <>
            <h2>你好，我叫什么名字呢？</h2>
            <p>以后读书、休息和庆祝，都会有我陪着你。</p>
            <label>
              伙伴的名字
              <input
                autoComplete="off"
                value={name}
                maxLength={40}
                placeholder="取一个你喜欢的名字"
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          </>
        ) : step === 1 ? (
          <>
            <h2>这一次，我们何时出发？</h2>
            <p>选好考试日期，我会据此安排周期。还没确定也没关系。</p>
            <label>
              考试日期（可选）
              <input
                type="date"
                min={today()}
                value={exam}
                onChange={(e) => setExam(e.target.value)}
              />
            </label>
            <button className="text-button" onClick={() => setExam("")}>
              先自主学习，使用 30 天周期
            </button>
          </>
        ) : step === 2 ? (
          <>
            <h2>给努力，留一点甜。</h2>
            <p>不一定要花钱。一次散步、一杯热茶，就很好。</p>
            <label>
              我的小奖励
              <input
                maxLength={60}
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder="写下让你开心的一件小事"
              />
            </label>
            <div className="chips">
              {["慢慢喝一杯喜欢的茶", "晒十分钟太阳", "听一首喜欢的歌"].map(
                (r) => (
                  <button
                    className={reward === r ? "selected" : ""}
                    key={r}
                    onClick={() => setReward(r)}
                  >
                    {r}
                  </button>
                ),
              )}
            </div>
          </>
        ) : (
          <>
            <h2>先了解起点，再慢慢走。</h2>
            <p>正式水平了解会在核定题库后开放，预计不超过 15 分钟。</p>
            <div className="soft-note">
              <ShieldCheck />
              这部分测试资料还在校对，我们先从基础开始。
            </div>
            <p className="muted">
              接下来可体验学习流程；演示练习不判断你的医学知识水平。
            </p>
          </>
        )}
        {err && (
          <p className="field-error" role="alert">
            {err}
          </p>
        )}
        <button
          className="primary wide"
          disabled={busy}
          onClick={() => void next()}
        >
          {step >= 3 ? "看看我的计划" : "继续"}
          <ArrowRight size={18} />
        </button>
        {step > 0 && (
          <button
            className="text-button"
            disabled={busy}
            onClick={() =>
              void commit((o) => ({
                ...o,
                profile: { ...o.profile, onboardingStep: step - 1 },
              }))
            }
          >
            返回上一步
          </button>
        )}
        <div className="privacy">
          <ShieldCheck size={15} /> 无需注册 · 设置保存在当前浏览器
        </div>
      </div>
    </div>
  );
}
function Placement() {
  return (
    <>
      <Title eyebrow="了解起点" title="先从安心开始">
        测评题库尚未核定，因此不会生成水平或分数。
      </Title>
      <EmptyNotice>
        正式测评将控制在 15 分钟内，可随时跳过。目前先使用基础起点体验界面。
      </EmptyNotice>
      <Link className="primary" to="/plan">
        使用基础起点 <ArrowRight size={18} />
      </Link>
    </>
  );
}
function Plan({ s, commit, busy }: Context) {
  const nav = useNavigate();
  const [minutes, setMinutes] = useState(s.settings.minutes);
  const p = cycle({ ...s.profile, started: s.profile.started || today() });
  return (
    <div className="narrow">
      <Title eyebrow="你的学习计划" title="一点一点，开始就很好。">
        {s.profile.name || "伙伴"}会陪你，把每一天拆成可完成的小步。
      </Title>
      <section className="panel plan-card">
        <span className="tag">
          {s.profile.exam ? "按考试日期安排" : "自主学习"}
        </span>
        <h2>{p.duration} 天的陪伴旅程</h2>
        <div className="plan-line">
          <span>起点</span>
          <b>基础起步 · 尚未测评</b>
        </div>
        <div className="plan-line">
          <span>内容状态</span>
          <b>交互演示 · 正式资料待核验</b>
        </div>
        <label>
          预计每天留给自己的时间
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
        <p className="muted">
          每天都可以按精力重新选择。忙的时候，只做一件小事也可以。
        </p>
        <button
          className="primary wide"
          disabled={busy || !s.profile.name}
          onClick={async () => {
            if (
              await commit((o) => ({
                ...o,
                profile: {
                  ...o.profile,
                  ready: true,
                  started: o.profile.started || today(),
                  onboardingStep: 4,
                },
                settings: { ...o.settings, minutes },
              }))
            )
              nav("/today");
          }}
        >
          开启我的小小书房 <ArrowRight size={18} />
        </button>
        {!s.profile.name && <Link to="/welcome">先给伙伴取个名字</Link>}
      </section>
    </div>
  );
}

function Today(ctx: Context) {
  const { s, commit, busy } = ctx;
  const [planning, setPlanning] = useState(false);
  const nav = useNavigate();
  const p = cycle(s.profile),
    done = s.completed.some((c) => c.date === today()),
    unfinished = s.session && !s.session.completed;
  return (
    <>
      <div className="day-heading">
        <div>
          <span className="eyebrow">
            {new Intl.DateTimeFormat("zh-CN", {
              month: "long",
              day: "numeric",
              weekday: "long",
            }).format(new Date())}{" "}
            · 给自己一点时间
          </span>
          <h1>今天，也一起读书吧。</h1>
        </div>
        <span className="day-pill">
          <Sun size={19} /> Day {p.day}
          <span>/ {p.duration}</span>
        </span>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <span className="tag">
            <Leaf size={13} />
            {s.settings.paused
              ? "暂停中 · 安心休息"
              : p.ended
                ? "本轮结束 · 回顾与保持"
                : "基础起步 · 慢慢建立节奏"}
          </span>
          <h2>
            {s.settings.paused ? (
              <>
                休息，也是一种
                <br />
                好好照顾自己。
              </>
            ) : done ? (
              <>
                今天的一小步，
                <br />
                已经稳稳落下。
              </>
            ) : (
              <>
                不必一下子记住所有，
                <br />
                先读懂今天这一句。
              </>
            )}
          </h2>
          <p>
            {s.settings.paused
              ? "记录都为你留着。准备好了，我们再接着读。"
              : `${s.profile.name}陪你，从一段阅读开始，把一点点积累留给明天。`}
          </p>
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              if (s.settings.paused) {
                if (
                  await commit((o) => ({
                    ...o,
                    settings: { ...o.settings, paused: false },
                  }))
                )
                  setPlanning(true);
              } else if (unfinished) nav(`/learn/${s.session!.id}`);
              else setPlanning(true);
            }}
          >
            {s.settings.paused
              ? "恢复学习"
              : unfinished
                ? "接着上次继续"
                : done
                  ? "再温习一小会儿"
                  : "开始今天的学习"}
            <ArrowRight size={18} />
          </button>
          <span className="hero-hint">
            <Clock3 size={14} /> 按今天的时间和精力来，不赶进度
          </span>
        </div>
        <Companion
          name={s.profile.name}
          state={
            s.settings.paused ? "rest_reminder" : done ? "task_done" : "welcome"
          }
        />
      </section>
      <div className="home-columns">
        <section className="today-card panel">
          <div className="section-heading">
            <h2>今天的小安排</h2>
            <button
              className="text-button"
              disabled={s.settings.paused}
              onClick={() => setPlanning(true)}
            >
              调整安排 <ChevronRight size={15} />
            </button>
          </div>
          <p className="muted small">交互示例 · 不计入真实备考进度</p>
          {[
            ["01", "读一句，想一想", "阅读与理解 · 约 1 分钟", BookOpen],
            ["02", "试着回忆一下", "挖空与练习 · 约 2 分钟", Sprout],
            ["03", "把努力好好收下", "回顾与反馈 · 约 1 分钟", Gift],
          ].map(([n, t, d, Icon], i) => {
            const I = Icon as typeof Sun;
            return (
              <div className="task-row" key={String(n)}>
                <div className={`task-icon tint-${i}`}>
                  <I size={21} />
                </div>
                <div>
                  <b>{String(t)}</b>
                  <span>{String(d)}</span>
                </div>
                {s.completed.some(
                  (c) => c.date === today() && (!c.minimum || i === 0),
                ) ? (
                  <CheckCircle2 className="task-check" size={21} />
                ) : (
                  <span className="task-number">{String(n)}</span>
                )}
              </div>
            );
          })}
          <div className="minimum">
            <Coffee size={20} />
            <span>
              今天有点忙？<small>做一个最小任务，也很好。</small>
            </span>
            <button
              className="text-button"
              disabled={s.settings.paused || busy}
              onClick={async () => {
                const id = crypto.randomUUID();
                if (
                  await commit((o) => ({
                    ...o,
                    session: {
                      id,
                      step: 0,
                      answer: "",
                      choice: "",
                      feedback: false,
                      minimum: true,
                      completed: false,
                      date: today(),
                    },
                  }))
                )
                  nav(`/learn/${id}`);
              }}
            >
              只读一句 <ArrowRight size={15} />
            </button>
          </div>
        </section>
        <div className="home-right">
          <Link to="/rewards" className="reward-preview">
            <span className="eyebrow">值得期待的小美好</span>
            <div className="gift-drawing">
              <Decoration kind="gift" />
            </div>
            <h3>
              {s.rewards.find((r) => r.size === "small")?.title ||
                "给自己留一点好心情"}
            </h3>
            <p>完成演示小任务后，来收下它。</p>
            <span className="text-link">
              我的奖励池 <ArrowRight size={16} />
            </span>
          </Link>
          <div className="gentle-note">
            <Decoration kind="tea" />
            <p>
              一点点积累，也是一种前进。
              <small>今天的认真，不必用匆忙证明。</small>
            </p>
          </div>
        </div>
      </div>
      {planning && <Planner {...ctx} close={() => setPlanning(false)} />}
    </>
  );
}
function Planner({ s, commit, busy, close }: Context & { close: () => void }) {
  const [minutes, setMinutes] = useState(s.settings.minutes),
    [mood, setMood] = useState<Mood>(s.settings.mood),
    [err, setErr] = useState("");
  const nav = useNavigate();
  const valid = Number.isInteger(minutes) && minutes >= 1 && minutes <= 180;
  return (
    <Modal title="今天，按你的节奏来" onClose={close}>
      <p>留一段舒服的时间，精力也由你说了算。</p>
      <fieldset>
        <legend>今天想学多久？</legend>
        <div className="chips">
          {[10, 20, 30, 60, 90].map((n) => (
            <button
              className={minutes === n ? "selected" : ""}
              aria-pressed={minutes === n}
              key={n}
              onClick={() => setMinutes(n)}
            >
              {n} 分钟
            </button>
          ))}
        </div>
        <label className="inline-label">
          自定义分钟
          <input
            type="number"
            min="1"
            max="180"
            value={minutes || ""}
            onChange={(e) => setMinutes(Number(e.target.value))}
          />
        </label>
      </fieldset>
      <fieldset>
        <legend>现在的状态呢？</legend>
        <div className="mood-options">
          {(["tired", "normal", "great"] as Mood[]).map((v, i) => (
            <button
              key={v}
              aria-pressed={mood === v}
              className={mood === v ? "selected" : ""}
              onClick={() => setMood(v)}
            >
              <span aria-hidden="true">{["☁", "◒", "☀"][i]}</span>
              {moodLabels[v]}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="soft-note">
        <Leaf />
        <span>
          {valid
            ? `预留休息后，可用学习时间约 ${budget(minutes, mood)} 分钟。`
            : "请输入 1—180 之间的整数。"}
          <small>当前演示约 4 分钟，不会用重复内容填满时间。</small>
        </span>
      </div>
      {err && (
        <p role="alert" className="field-error">
          {err}
        </p>
      )}
      <button
        className="primary wide"
        disabled={busy || !valid}
        onClick={async () => {
          if (!valid) {
            setErr("请输入 1—180 之间的整数。");
            return;
          }
          const id = crypto.randomUUID();
          if (
            await commit((o) => ({
              ...o,
              settings: { ...o.settings, minutes, mood },
              session: {
                id,
                step: 0,
                answer: "",
                choice: "",
                feedback: false,
                minimum: minutes < 4,
                completed: false,
                date: today(),
              },
            }))
          ) {
            close();
            nav(`/learn/${id}`);
          }
        }}
      >
        就这样开始 <ArrowRight size={18} />
      </button>
    </Modal>
  );
}

function Learn({ s, commit, busy, notify, sound }: Context) {
  const { sessionId } = useParams();
  const x = s.session;
  const nav = useNavigate();
  const [answer, setAnswer] = useState(x?.answer || ""),
    [choice, setChoice] = useState(x?.choice || "");
  useEffect(() => {
    setAnswer(x?.answer || "");
    setChoice(x?.choice || "");
  }, [x?.id]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!x || x.completed || (answer === x.answer && choice === x.choice))
      return;
    timer.current = setTimeout(() => {
      void commit((o) =>
        o.session && o.session.id === sessionId
          ? { ...o, session: { ...o.session, answer, choice } }
          : o,
      );
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [answer, choice, x, sessionId, commit]);
  if (!x || x.id !== sessionId)
    return (
      <>
        <EmptyNotice title="这个学习片段暂时不在当前存档中">
          可以回到今天，开始一个新的演示任务。
        </EmptyNotice>
        <Link className="primary" to="/today">
          回到今天
        </Link>
      </>
    );
  if (s.settings.paused)
    return (
      <>
        <EmptyNotice title="书页替你留在这里">
          学习计划已暂停。回到今天恢复后，就能继续这个片段。
        </EmptyNotice>
        <Link className="primary" to="/today">
          回到今天
        </Link>
      </>
    );
  const update = async (fields: Partial<NonNullable<State["session"]>>) =>
    commit((o) => ({
      ...o,
      session: o.session ? { ...o.session, answer, choice, ...fields } : null,
    }));
  const finish = async () => {
    if (
      await commit((o) => ({
        ...o,
        session: o.session ? { ...o.session, step: 4, completed: true } : null,
        completed: o.completed.some((c) => c.id === x.id)
          ? o.completed
          : [...o.completed, { id: x.id, date: today(), minimum: x.minimum }],
      }))
    ) {
      sound(0);
      notify("这次演示完成了，记录已保存在本机。");
    }
  };
  const labels = ["阅读", "理解", "回忆", "练习"];
  return (
    <div className="study">
      <div className="study-top">
        <Link
          to="/today"
          onClick={(e) => {
            e.preventDefault();
            void update({}).then((ok) => {
              if (ok) nav("/today");
            });
          }}
        >
          <ArrowLeft size={17} /> 保存并返回
        </Link>
        <span className="tag">交互示例 · 非医学内容</span>
      </div>
      {!x.completed ? (
        <>
          <div
            className="study-progress"
            role="group"
            aria-label={`第 ${x.step + 1} 步，共 ${x.minimum ? 1 : 4} 步`}
          >
            {(x.minimum ? ["读一句"] : labels).map((l, i) => (
              <span className={i <= x.step ? "active" : ""} key={l}>
                <b>{i < x.step ? <Check size={14} /> : i + 1}</b>
                {l}
              </span>
            ))}
          </div>
          <div className="study-layout">
            <article className="reading-card panel">
              <span className="eyebrow">
                {x.minimum ? "最小任务 · 约 1 分钟" : "学习流程演示"} /{" "}
                {labels[x.step]}
              </span>
              <h1>
                {
                  [
                    "先把这一句，慢慢读一遍。",
                    "给这句话，找一个自己的理解。",
                    "合上书页，试着想一想。",
                    "最后，把方法用起来。",
                  ][x.step]
                }
              </h1>
              {x.step === 0 ? (
                <>
                  <div className="reading-text">
                    今天，完成一点点。
                    <br />
                    先读一句，再想一想，最后回顾。
                  </div>
                  <p className="source-note">
                    来源：本应用原创交互示例文案 · 非经典原文
                  </p>
                  <div className="soft-note">
                    <BookOpen />
                    这里将呈现核定的经典原文、章节和底本出处。
                  </div>
                </>
              ) : x.step === 1 ? (
                <>
                  <blockquote>
                    “一点点”，不是不认真，
                    <br />
                    而是给自己一个能开始的小台阶。
                  </blockquote>
                  <p>
                    这个示例带你依次体验阅读、理解、回忆和练习。真实学习内容会附上可追溯的解释与来源。
                  </p>
                  <div className="note-paper">
                    <b>试着在心里说一遍</b>
                    <p>今天只需要开始，不需要一次做完所有。</p>
                  </div>
                </>
              ) : x.step === 2 ? (
                <>
                  <p>根据刚才读到的示例文案，补上空白。</p>
                  <div className="cloze">
                    今天，完成 <span>＿＿＿</span>。
                  </div>
                  <label>
                    你的回忆
                    <input
                      value={answer}
                      maxLength={100}
                      placeholder="想不起来也没关系"
                      onChange={(e) => setAnswer(e.target.value)}
                    />
                  </label>
                  {x.feedback && (
                    <div className="feedback" role="status">
                      <b>
                        {answer.trim() === "一点点"
                          ? "记起来了。"
                          : "一起再看一眼。"}
                      </b>
                      <p>
                        示例原句是“今天，完成一点点。”这里不形成真实考试成绩。
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h3>今天很忙时，可以怎么做？</h3>
                  <div className="answer-options">
                    {[
                      "先完成一个最小任务",
                      "必须补完所有任务",
                      "取消之前的努力",
                    ].map((a, i) => (
                      <button
                        aria-pressed={choice === a}
                        className={choice === a ? "selected" : ""}
                        key={a}
                        onClick={() => {
                          setChoice(a);
                          void update({ choice: a, feedback: false });
                        }}
                      >
                        <span>{["A", "B", "C"][i]}</span>
                        {a}
                      </button>
                    ))}
                  </div>
                  {x.feedback && (
                    <div className="feedback" role="status">
                      <b>
                        {choice === "先完成一个最小任务"
                          ? "没错，按自己的节奏来。"
                          : "试试给自己一个更轻松的开始。"}
                      </b>
                      <p>
                        可以先完成一个最小任务。暂停与少学不会删除之前的记录。
                      </p>
                    </div>
                  )}
                </>
              )}
              <div className="reading-actions">
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={async () => {
                    if (await update({})) {
                      notify("已保存当前片段，随时回来继续。");
                      nav("/today");
                    }
                  }}
                >
                  <Pause size={16} /> 先歇一下
                </button>
                <button
                  className="primary"
                  disabled={busy || (x.step === 3 && !choice && !x.feedback)}
                  onClick={async () => {
                    if (x.minimum || (x.step === 3 && x.feedback)) {
                      await finish();
                      return;
                    }
                    if (x.step >= 2 && !x.feedback) {
                      if (await update({ feedback: true })) sound(1);
                    } else await update({ step: x.step + 1, feedback: false });
                  }}
                >
                  {x.minimum
                    ? "读完了，收下这一小步"
                    : x.step === 3 && x.feedback
                      ? "完成这次小练习"
                      : x.step >= 2 && !x.feedback
                        ? x.step === 2 && !answer
                          ? "暂时想不起来"
                          : "看看反馈"
                        : "继续"}
                  <ArrowRight size={17} />
                </button>
              </div>
            </article>
            <aside className="study-aside">
              <Companion name={s.profile.name} state="studying" compact />
              <div className="gentle-note">
                <Decoration kind="tea" />
                <p>
                  一次只专注一小步。
                  <small>刷新页面后，也可以接着这里继续。</small>
                </p>
              </div>
            </aside>
          </div>
        </>
      ) : (
        <div className="completion panel">
          <div className="completion-flower">
            <Decoration kind="gift" />
          </div>
          <span className="eyebrow">今天的小小收获</span>
          <h1>
            {x.minimum
              ? "读完一句，也值得庆祝。"
              : "认真走过的每一步，都算数。"}
          </h1>
          <p>
            已完成 {x.minimum ? "一个最小阅读任务" : "阅读、理解、回忆和练习"}
            的演示体验。
          </p>
          <p className="muted">这是一条演示记录，不计入医学知识掌握度。</p>
          <div className="actions">
            <Link className="primary" to="/rewards">
              收下小奖励 <Gift size={18} />
            </Link>
            <Link className="secondary" to="/today">
              回到今天
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Classics() {
  return (
    <>
      <Title eyebrow="四时读书 · 四部经典" title="让经典，一页一页靠近。">
        正式学习内容正在校对；目前可浏览目录与体验学习流程。
      </Title>
      <div className="classic-grid">
        {classicNames.map((name, i) => (
          <Link
            className={`classic-card classic-${i}`}
            key={name}
            to={`/knowledge/${i}`}
          >
            <span className="eyebrow">
              {
                [
                  "辨阴阳 · 明医理",
                  "辨六经 · 察病机",
                  "识杂病 · 悟方证",
                  "察卫气 · 辨营血",
                ][i]
              }
            </span>
            <div className="book-spine">
              <span>{["內", "傷", "金", "溫"][i]}</span>
            </div>
            <h2>{name}</h2>
            <p>原文 · 理解 · 回忆 · 应用</p>
            <div>
              <span>内容校对中</span>
              <ChevronRight size={19} />
            </div>
          </Link>
        ))}
      </div>
      <div className="soft-note">
        <ShieldCheck />
        <span>
          三级范围需覆盖一级、二级及新增要求。未核定的原文和答案暂不进入训练。
          <Link to="/sources">
            查看资料说明 <ArrowRight size={14} />
          </Link>
        </span>
      </div>
    </>
  );
}
function Knowledge() {
  const { id } = useParams();
  const i = Number(id);
  return (
    <>
      <Link className="back-link" to="/classics">
        <ArrowLeft size={16} /> 四部经典
      </Link>
      <Title eyebrow="经典书架" title={classicNames[i] || "经典目录"}>
        从原文出发，把理解落在有据可查的地方。
      </Title>
      <EmptyNotice>
        此书的正式学习单元尚未发布。底本、章节映射与解析校读通过后，会在这里逐项开放。这里不把“内容未开放”当作“你尚未掌握”。
      </EmptyNotice>
      <div className="actions">
        <Link className="primary" to="/today">
          体验学习流程 <ArrowRight size={17} />
        </Link>
        <Link className="secondary" to="/sources">
          查看内容依据
        </Link>
      </div>
    </>
  );
}
function Growth({ s }: Context) {
  const days = new Set(s.completed.map((c) => c.date)).size;
  return (
    <>
      <Title eyebrow="成长手记" title="小小的积累，都有回响。">
        记录用来认识自己，不用来催促自己。
      </Title>
      <div className="stats-grid">
        <div className="panel stat">
          <span>演示学习片段</span>
          <strong>
            {s.completed.length}
            <small> 次</small>
          </strong>
        </div>
        <div className="panel stat">
          <span>留下记录的日子</span>
          <strong>
            {days}
            <small> 天</small>
          </strong>
        </div>
        <div className="panel stat">
          <span>真实知识掌握</span>
          <strong className="unknown">尚未测评</strong>
        </div>
      </div>
      <div className="report-grid">
        <section className="panel">
          <div className="section-heading">
            <h2>这段时间的足迹</h2>
            <Sprout size={21} />
          </div>
          {s.completed.length ? (
            <ol className="timeline">
              {s.completed
                .slice(-6)
                .reverse()
                .map((c) => (
                  <li key={c.id}>
                    <span>{c.date}</span>
                    <b>
                      {c.minimum
                        ? "读完一句 · 最小任务"
                        : "走完一轮 · 流程体验"}
                    </b>
                    <small>演示记录，不代表考纲覆盖</small>
                  </li>
                ))}
            </ol>
          ) : (
            <div className="empty-small">
              <Leaf size={35} />
              <p>
                还没有学习记录。
                <br />
                从今天的一小步开始就好。
              </p>
              <Link to="/today">
                去今天看看 <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </section>
        <section className="panel stage-card">
          <span className="tag">基础起步</span>
          <h2>先找到自己的节奏</h2>
          <p>
            真实阶段报告需要核定知识点与学习证据。目前不会根据演示点击生成掌握率或通过概率。
          </p>
          <Link className="secondary wide" to="/assessment/stage">
            阶段测评说明 <ArrowRight size={16} />
          </Link>
          <Link className="text-link" to="/graduation">
            查看周期总结与后续安排 <ChevronRight size={16} />
          </Link>
        </section>
      </div>
      <section className="panel coverage">
        <h2>四部经典的学习状态</h2>
        {classicNames.map((n) => (
          <div key={n}>
            <span>{n}</span>
            <span className="muted">资料校对中 · 尚无有效学习证据</span>
          </div>
        ))}
      </section>
    </>
  );
}
function Assessment() {
  return (
    <div className="narrow">
      <Title eyebrow="阶段测评" title="在合适的时候，再认识自己。" />
      <EmptyNotice title="正式测评暂未开放">
        核定题库、评分规则和未曝光测试题家族尚未就绪。为避免误导，这里暂不出题，也不估计分数。
      </EmptyNotice>
      <Link className="primary" to="/growth">
        回到成长手记
      </Link>
    </div>
  );
}
function Graduation({ s }: Context) {
  return (
    <div className="narrow">
      <Title eyebrow="周期回顾" title="把走过的路，温柔地收好。" />
      <section className="panel">
        <Companion name={s.profile.name} state="stage_done" compact />
        <h2>当前只提供演示学习总结</h2>
        <p>
          你已留下 {s.completed.length}{" "}
          次演示记录。真实考试方案与封存题库尚未核定，正式模拟暂未开放，也不会据此判断是否“毕业”。
        </p>
        <div className="soft-note">
          <ShieldCheck />
          历史通知不等于目标年度考试规则。
        </div>
        <div className="actions">
          <Link className="primary" to="/today">
            继续保持节奏
          </Link>
          <Link className="secondary" to="/growth">
            查看已有记录
          </Link>
        </div>
      </section>
    </div>
  );
}

function Rewards({ s, commit, busy, notify, sound }: Context) {
  const [title, setTitle] = useState(""),
    [size, setSize] = useState<"small" | "medium" | "large">("small"),
    [celebrate, setCelebrate] = useState("");
  const eligible = s.completed.some((c) => c.date === today()),
    key = `demo-day:${today()}`,
    claimed = s.claims.some((c) => c.key === key);
  return (
    <>
      <Title eyebrow="给努力一点甜" title="认真生活，也记得奖励自己。">
        奖励可以很轻，很小。只要是你喜欢的，就值得期待。
      </Title>
      <div className="reward-hero">
        <Decoration kind="gift" />
        <div>
          <h2>
            {claimed
              ? "今天的小奖励，已经为你留好了。"
              : eligible
                ? "今天的小奖励，可以收下啦。"
                : "给今天的自己，准备一点小美好。"}
          </h2>
          <p>每日首次完成演示任务可领取一次；演示奖励不代表正式阶段达标。</p>
        </div>
        <button
          className="primary"
          disabled={
            busy ||
            !eligible ||
            claimed ||
            !s.rewards.some((r) => r.size === "small")
          }
          onClick={async () => {
            const r = s.rewards.find((r) => r.size === "small");
            if (!r) return;
            if (
              await commit((o) =>
                o.claims.some((c) => c.key === key)
                  ? o
                  : {
                      ...o,
                      claims: [
                        ...o.claims,
                        { key, title: r.title, redeemed: false },
                      ],
                    },
              )
            ) {
              setCelebrate(r.title);
              sound(2);
            }
          }}
        >
          {claimed ? "今天已领取" : "领取小奖励"}
        </button>
      </div>
      <div className="reward-grid">
        {(["small", "medium", "large"] as const).map((v, i) => (
          <section className={`panel reward-tier tint-${i}`} key={v}>
            <span className="eyebrow">
              {["每一小步", "一段积累", "一个里程碑"][i]}
            </span>
            <h2>{sizeLabels[v]}</h2>
            <p>
              {
                [
                  "一次演示任务之后",
                  "正式阶段达标后开放",
                  "正式周期目标达成后开放",
                ][i]
              }
            </p>
            {s.rewards
              .filter((r) => r.size === v)
              .map((r) => (
                <div className="reward-item" key={r.id}>
                  <Heart size={17} />
                  <span>{r.title}</span>
                  <button
                    aria-label={`移除奖励：${r.title}`}
                    className="icon-button"
                    disabled={busy}
                    onClick={() =>
                      void commit((o) => ({
                        ...o,
                        rewards: o.rewards.filter((x) => x.id !== r.id),
                      }))
                    }
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            {!s.rewards.some((r) => r.size === v) && (
              <p className="muted">留给下一件让你开心的小事。</p>
            )}
          </section>
        ))}
      </div>
      <section className="panel add-reward">
        <h2>放进一件你喜欢的事</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim()) return;
            if (s.rewards.length >= 100) {
              notify("奖励池最多保留 100 项，请先整理已有奖励。");
              return;
            }
            if (
              await commit((o) => ({
                ...o,
                rewards: [
                  ...o.rewards,
                  { id: crypto.randomUUID(), title: title.trim(), size },
                ],
              }))
            ) {
              setTitle("");
              notify("已经放进奖励池。");
            }
          }}
        >
          <label>
            奖励内容
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
              placeholder="比如：看一场日落"
              required
            />
          </label>
          <label>
            奖励大小
            <select
              value={size}
              onChange={(e) => setSize(e.target.value as typeof size)}
            >
              {Object.entries(sizeLabels).map(([v, l]) => (
                <option value={v} key={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <button className="primary" disabled={busy}>
            放进奖励池 <Heart size={16} />
          </button>
        </form>
        <div className="chips">
          {["看一场日落", "睡一个舒服的午觉", "去逛喜欢的书店"].map((t) => (
            <button key={t} onClick={() => setTitle(t)}>
              ＋ {t}
            </button>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>我的惊喜小盒子</h2>
          <Sparkles />
        </div>
        <p className="muted">
          原型提供一次手动开箱体验，不代表真实学习随机掉落。
        </p>
        <button
          className="secondary"
          disabled={
            busy ||
            !s.settings.chest ||
            s.claims.some((c) => c.key === "demo-chest")
          }
          onClick={async () => {
            const choices = [
              "给自己写一句鼓励",
              "打开窗，看看天空",
              "听一首喜欢的歌",
            ];
            const random = new Uint32Array(1);
            crypto.getRandomValues(random);
            const prize = choices[random[0] % choices.length];
            if (
              await commit((o) =>
                o.claims.some((c) => c.key === "demo-chest")
                  ? o
                  : {
                      ...o,
                      claims: [
                        ...o.claims,
                        { key: "demo-chest", title: prize, redeemed: false },
                      ],
                    },
              )
            ) {
              setCelebrate(prize);
              sound(2);
            }
          }}
        >
          {!s.settings.chest
            ? "小盒子已关闭"
            : s.claims.some((c) => c.key === "demo-chest")
              ? "惊喜已收藏"
              : "体验打开惊喜盒子"}
        </button>
      </section>
      <section className="panel">
        <h2>已经收下的小美好</h2>
        {s.claims.length ? (
          s.claims.map((c) => (
            <div className="claim-row" key={c.key}>
              <Gift size={18} />
              <span>
                {c.title}
                <small>
                  {c.key === "demo-chest" ? "开箱演示" : "每日演示奖励"}
                </small>
              </span>
              <button
                className="secondary"
                disabled={busy || c.redeemed}
                onClick={() =>
                  void commit((o) => ({
                    ...o,
                    claims: o.claims.map((x) =>
                      x.key === c.key ? { ...x, redeemed: true } : x,
                    ),
                  }))
                }
              >
                {c.redeemed ? "已兑现" : "标记已兑现"}
              </button>
            </div>
          ))
        ) : (
          <p className="muted">还没有领取记录。你的奖励会安稳地留在这里。</p>
        )}
      </section>
      {celebrate && (
        <Modal title="这一刻，值得小小庆祝" onClose={() => setCelebrate("")}>
          <Companion
            name={s.profile.name}
            state={
              celebrate === s.claims.find((c) => c.key === "demo-chest")?.title
                ? "chest_open"
                : "happy"
            }
            compact
          />
          <h3 className="center">{celebrate}</h3>
          <p className="center">按你舒服的方式兑现，不着急。</p>
          <button className="primary wide" onClick={() => setCelebrate("")}>
            开心收下 <Heart size={17} />
          </button>
        </Modal>
      )}
    </>
  );
}

function SettingsPage({ s, commit, busy, notify, sound }: Context) {
  const [name, setName] = useState(s.profile.name),
    [exam, setExam] = useState(s.profile.exam),
    [err, setErr] = useState(""),
    [pause, setPause] = useState(false);
  const nav = useNavigate();
  return (
    <>
      <Title eyebrow="我的小小书房" title="把陪伴，调成你喜欢的样子。" />
      <div className="settings-grid">
        <section className="panel">
          <h2>伙伴与学习安排</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!name.trim() || Array.from(name.trim()).length > 20) {
                setErr("伙伴名字需要 1—20 个字。");
                return;
              }
              if (exam && exam < today()) {
                setErr("考试日期已过去，请重新选择或留空。");
                return;
              }
              setErr("");
              if (
                await commit((o) => ({
                  ...o,
                  profile: { ...o.profile, name: name.trim(), exam },
                }))
              )
                notify("伙伴与日期已保存。");
            }}
          >
            <label>
              伙伴的名字
              <input
                maxLength={40}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              考试日期（留空为自主学习）
              <input
                type="date"
                min={today()}
                value={exam}
                onChange={(e) => setExam(e.target.value)}
              />
            </label>
            {err && (
              <p role="alert" className="field-error">
                {err}
              </p>
            )}
            <button className="primary" disabled={busy}>
              保存设置 <Check size={16} />
            </button>
          </form>
        </section>
        <section className="panel">
          <h2>舒服的陪伴方式</h2>
          {[
            ["sound", "轻轻的提示音", "默认关闭，只在操作后播放"],
            ["reducedMotion", "减少动态效果", "让界面更安静一些"],
            ["chest", "惊喜小盒子", "随时可以关闭开箱体验"],
          ].map(([key, label, desc]) => (
            <label className="toggle-row" key={key}>
              <span>
                <b>{label}</b>
                <small>{desc}</small>
              </span>
              <input
                type="checkbox"
                checked={Boolean(s.settings[key as keyof State["settings"]])}
                disabled={busy}
                onChange={(e) =>
                  void commit((o) => ({
                    ...o,
                    settings: { ...o.settings, [key]: e.target.checked },
                  }))
                }
              />
            </label>
          ))}
          <div className="sound-tests">
            {["完成", "答对", "宝箱", "阶段"].map((l, i) => (
              <button
                className="text-button"
                disabled={!s.settings.sound}
                key={l}
                onClick={() => sound(i)}
              >
                <Volume2 size={15} />
                {l}试听
              </button>
            ))}
          </div>
        </section>
      </div>
      <section className="panel pause-panel">
        <Decoration kind="tea" />
        <div>
          <h2>
            {s.settings.paused ? "正在安心休息" : "需要歇一歇，也没关系。"}
          </h2>
          <p>
            暂停会保留所有记录。日历与考试日期照常前进，恢复时重新选择时间。
          </p>
        </div>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => (s.settings.paused ? nav("/today") : setPause(true))}
        >
          {s.settings.paused ? "去恢复学习" : "暂停学习计划"}
        </button>
      </section>
      <div className="settings-links">
        <Link className="panel" to="/archive">
          <Archive />
          <div>
            <b>存档管理</b>
            <span>导出备份、导入与恢复</span>
          </div>
          <ChevronRight />
        </Link>
        <Link className="panel" to="/sources">
          <CircleHelp />
          <div>
            <b>资料与关于</b>
            <span>内容依据、原型边界</span>
          </div>
          <ChevronRight />
        </Link>
      </div>
      {pause && (
        <Modal title="先好好休息一会儿" onClose={() => setPause(false)}>
          <p>
            之前的学习片段和奖励会保留。考试日期不会顺延，恢复后可以重新安排今天。
          </p>
          <div className="actions">
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                if (
                  await commit((o) => ({
                    ...o,
                    settings: { ...o.settings, paused: true },
                  }))
                ) {
                  setPause(false);
                  notify("已暂停，记录都在。");
                }
              }}
            >
              确认暂停
            </button>
            <button className="secondary" onClick={() => setPause(false)}>
              我再读一会儿
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function ArchivePage({
  s,
  busy,
  notify,
  onRestore,
}: Context & { onRestore: (v: State) => Promise<boolean> }) {
  const [pending, setPending] = useState<State | null>(null),
    [err, setErr] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const download = (state: State, suffix = "") => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `经经有条-演示存档-${today()}${suffix}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("已发起下载，请在浏览器下载记录中确认文件已保存。");
  };
  return (
    <div className="narrow">
      <Title eyebrow="把积累，好好收好" title="你的小小学习存档">
        数据保存在当前浏览器，不会自动同步到其他设备。
      </Title>
      <div className="archive-grid">
        <section className="panel">
          <Download size={28} />
          <h2>导出一份备份</h2>
          <p>包含伙伴设置、演示片段、奖励与偏好。换设备前，先留一份。</p>
          <button
            className="primary"
            disabled={busy}
            onClick={() => download(s)}
          >
            下载演示存档 <Download size={17} />
          </button>
        </section>
        <section className="panel">
          <Upload size={28} />
          <h2>接上之前的记录</h2>
          <p>选择本原型导出的 JSON 存档，先预览，再决定是否恢复。</p>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => file.current?.click()}
          >
            选择存档文件 <Upload size={17} />
          </button>
          <input
            className="hidden"
            type="file"
            accept=".json,application/json"
            ref={file}
            aria-label="选择演示存档"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setErr("");
              try {
                if (f.size > 25 * 1024 * 1024)
                  throw new Error("文件超过 25 MB，请选择较小的演示存档。");
                setPending(validateArchive(JSON.parse(await f.text())));
              } catch (e) {
                setErr(e instanceof Error ? e.message : "无法读取这个文件。");
              }
            }}
          />
        </section>
      </div>
      {err && (
        <p role="alert" className="field-error">
          {err}
        </p>
      )}
      <div className="soft-note">
        <ShieldCheck />
        <span>
          演示存档与未来正式学习存档分开保存。导入前会自动保留一份本机备份；已领取奖励合并保留，避免反复领取。
        </span>
      </div>
      <button
        className="text-button"
        onClick={async () => {
          try {
            const backup = await db.records.get("before-import");
            if (backup) download(backup.value, "-导入前备份");
            else notify("还没有导入前备份，首次恢复时会自动生成。");
          } catch {
            setErr("读取本机备份失败，请稍后重试。");
          }
        }}
      >
        下载上一次导入前的备份 <Download size={16} />
      </button>
      <p className="muted small">
        清除浏览器数据可能删除本机记录。下载后建议保留文件，并试着在另一浏览器导入核对。原型尚未提供离线安装。
      </p>
      {pending && (
        <Modal title="确认这份演示存档" onClose={() => setPending(null)}>
          <div className="import-preview">
            <p>
              伙伴 <b>{pending.profile.name || "尚未命名"}</b>
            </p>
            <p>
              学习记录 <b>{pending.completed.length} 次演示</b>
            </p>
            <p>
              奖励记录 <b>{pending.claims.length} 条</b>
            </p>
            <p>
              模式 <b>演示 · 格式版本 1</b>
            </p>
          </div>
          <p>
            恢复会替换当前设置与学习记录。导入前备份保留在本机，已领取奖励合并保留。
          </p>
          <div className="actions">
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                if (await onRestore(pending)) setPending(null);
              }}
            >
              备份当前并恢复
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setPending(null)}
            >
              暂不导入
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function Sources() {
  return (
    <div className="narrow">
      <Title eyebrow="有据可查，才安心学习" title="关于这间小小书房" />
      <section className="panel">
        <span className="tag">Phase 2 · 交互原型 0.2.0</span>
        <h2>现在可以体验什么？</h2>
        <p>
          角色命名、每日安排、完整学习流程、奖励、暂停恢复与本机存档。示例文字由本应用编写，不是医学原文，不生成真实知识掌握度或考试分数。
        </p>
        <h2>资料从哪里来？</h2>
        <p>
          前期审计了你提供的 919 份资料。2026 考纲候选列出 712
          条要求，三级范围包含一级、二级和新增内容；这些数字是审计候选，不等于已上线的知识点。
        </p>
        <p>
          扫描资料仍需识别与校读，候选题存在答案冲突。现有回忆材料不能支撑三级真题频次，也不足以建立目标年度的正式模拟试卷。
        </p>
        <div className="soft-note">
          <ShieldCheck />
          未核定的题目、答案与考试规则不会进入这份原型。
        </div>
        <h2>陪伴形象与隐私</h2>
        <p>
          伙伴形象由内置 image 生成功能参考你提供的照片绘制成 Q 版插画，保留黑发、白衬衫和黑马甲特征。界面不再直接展示原始照片。七种陪伴状态暂共用 Q 版插画，配合不同文案展示；热茶小兔与礼物小芽也由同一生成功能绘制。
        </p>
        <p>
          无账号、无云同步、无在线模型调用。应用不主动上传你的学习记录；本地存储可能被浏览器清理，请定期备份。
        </p>
        <h2>后面会怎样？</h2>
        <p>
          下一阶段接入核定内容与真正的学习调度，随后执行 30
          天情景测试。当前不宣称离线安装、正式考试或完整学习算法已经完成。
        </p>
        <Link className="text-link" to="/archive">
          打开存档管理 <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}
