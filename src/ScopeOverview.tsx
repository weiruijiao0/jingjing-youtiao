import { useState } from "react";
import { Link } from "react-router-dom";
import syllabus from "./content/syllabus.json";
import { available, budgetSeconds, clock, type LearningState } from "./learning";

export function ScopeOverview({ s, detailed = false }: { s: LearningState; detailed?: boolean }) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("全部");
  const units = available(s);
  const mapped = new Set(units.map(({ u }) => u.requirement.id));
  const c = clock(s);
  const minutes = s.plans.filter((p) => p.date === c.day).at(-1)?.minutes ?? s.profile.defaultMinutes;
  const days = c.remaining;
  const capacity = Math.floor(budgetSeconds(minutes, "normal").capacity / 60) * days;
  const unread = units.filter(({ u }) => !s.covered.some((x) => x.unit === u.id));
  const introMinutes = Math.ceil(unread.reduce((n, { u }) => n + u.estimatedSeconds, 0) / 60);
  const pending = syllabus.length - mapped.size;
  const filtered = syllabus.filter((x) => (level === "全部" || x.level === level) && `${x.id}${x.classic}${x.chapter}${x.text}`.includes(query));
  return <section className="panel scope-overview">
    <h2>原文记忆专项的范围与预算</h2>
    <p>这里统计下方的基础原文记忆专项。全国三级主课程、全部考纲要求和新版教材，请进入<Link to="/course">30 天领学课程</Link>。</p>
    <div className="scope-metrics">
      <div><strong>{units.length}</strong><span>本专项原文单元</span></div>
      <div><strong>{mapped.size} / {syllabus.length}</strong><span>本专项关联的考纲要求</span></div>
      <div><strong>{pending}</strong><span>未纳入本专项的要求</span></div>
    </div>
    <p>按每天 {minutes} 分钟，本周期剩余 {days} 天，扣除预留休息与切换后约有 {capacity} 分钟学习预算。
      当前未读内容的首轮预计需 {introMinutes} 分钟；还需另留复习、错题和测评时间。</p>
    <p className="muted small">以上仅统计本专项，不代表主课程的内容量。考点难度与篇幅不同，用时是估算；回忆记录和题型演练也不能直接换算考试通过率。</p>
    {!detailed ? <Link className="text-link" to="/course">查看完整领学路线与教材 →</Link> : <details>
      <summary>展开全部 {syllabus.length} 条考纲候选要求</summary>
      <label>检索考纲<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="章节、要求或 K 编号" /></label>
      <label>范围<select value={level} onChange={(e) => setLevel(e.target.value)}>{["全部", "一级", "二级", "三级"].map((l) => <option key={l}>{l}</option>)}</select></label>
      <p>匹配 {filtered.length} 条 · 一级 313 条、二级新增 233 条、三级新增 166 条</p>
      <div className="scope-list">{filtered.map((r) => <article key={r.id}>
        <b>{r.id} · {r.classic} · {r.level}{r.level === "一级" ? "" : "新增"}</b>
        <p>{r.chapter} · {r.text}</p>
        <small>考纲 F0003 · PDF 第 {r.page} 页 · {mapped.has(r.id) ? "已纳入本原文记忆专项" : "请在主课程学习本条"}</small>
        {units.filter(({ u }) => u.requirement.id === r.id).map(({ u }) => <Link key={u.id} to={`/knowledge/${u.id}`}>{u.title} →</Link>)}
      </article>)}</div>
    </details>}
  </section>;
}
