import {useState} from 'react';
import StudyProgress from './StudyProgress';
import {rebalanceRoute,type RouteDay} from './courseRoute';
import type {LearningState} from './learning';
const review=[
 ['归纳内经与伤寒','闭卷梳理内经主要理论','对照六经提纲与易混方证','完成薄弱章节练习并订正'],
 ['归纳金匮与温病','闭卷梳理杂病证治','辨析卫气营血与三焦证候','完成薄弱章节练习并订正'],
 ['第一次整卷演练','独立完成一套100分钟演练','对照能力题列出遗漏','记录需要回炉的章节'],
 ['错题回炉','回到错题对应教材','闭卷重述错因与鉴别条件','重做并核对仍不确定的题'],
 ['第二次整卷演练','完成另一套未使用题演练','比较两轮薄弱章节','补学共同错误涉及的原文'],
 ['最后梳理','闭卷回忆高频错点','核对治禁与易混方证','整理尚需复核的能力题'],
];
type Props={route:RouteDay[];completed:Set<string>;day:number;onDay:(n:number)=>void;s:LearningState;mutate:(fn:(s:LearningState)=>LearningState)=>Promise<boolean>;disabled:boolean;onStart:(minutes:number)=>void};
export default function PlanOverview({route,completed,day,onDay,s,mutate,disabled,onStart}:Props){
 const [minutes,setMinutes]=useState(s.courseSchedule?.dailyMinutes||150),[notice,setNotice]=useState('');
 const total=route.reduce((n,d)=>n+d.requirements.length,0),left=total-completed.size;
 const pending=route.find(d=>d.day===day)?.requirements.filter(id=>!completed.has(id)).length||0;
 const preview=day<=24?rebalanceRoute(route,completed,day):route;
 const maxMinutes=Math.max(0,...preview.map(d=>d.requirements.filter(id=>!completed.has(id)).length*5));
 return <section className="plan-overview" aria-label="30天主学习计划">
  <span className="eyebrow">备考主线 · 每次从这里继续</span><h2>我的 30 天学习计划</h2>
  <p>前24天读原文、理解和闭卷回忆，后6天归纳、演练与订正。点击任意一天查看安排；完成记录会保留。</p>
  <StudyProgress label="30天首轮内容" done={completed.size} total={total} detail={`剩余 ${left} 条，阅读与回忆预算约 ${Math.ceil(left*5/60)} 小时。巩固任务另行记录，进度不等于考试掌握率。`}/>

  <h3>第 {day} 天 · {day<=24?'阅读与闭卷回忆':review[day-25][0]}</h3>
  {day<=24?<p>本日还剩 {pending} 条，预算约 {pending*5} 分钟，可拆为 {Math.ceil(pending*5/minutes)} 个不超过 {minutes} 分钟的时间段。每次只安排当前时间段，完成后再继续，不把一个小段算成全天完成。</p>:<div className="review-checklist"><p>完成后勾选记录；勾选用于安排复习，不自动产生考试成绩。</p>{review[day-25].slice(1).map((task,i)=>{const id=`day${day}-${i}`;return <label key={id}><input type="checkbox" disabled={disabled} checked={s.courseReviewTasks.includes(id)} onChange={e=>{const checked=e.target.checked;void mutate(o=>({...o,courseReviewTasks:checked?[...new Set([...o.courseReviewTasks,id])]:o.courseReviewTasks.filter(x=>x!==id)}))}}/>{task}</label>})}</div>}
  {day<=24&&<button className="primary" disabled={disabled||!pending} onClick={()=>onStart(minutes)}>开始第 {day} 天的下一小段（最多 {minutes} 分钟）</button>}
  {s.courseRecallDraft?.queue.length&&<button className="primary" onClick={()=>document.getElementById('current-guided-session')?.scrollIntoView({behavior:'smooth',block:'start'})}>继续已保存的学习小段</button>}
  <div className="plan-days">{Array.from({length:30},(_,i)=>{const d=i+1,items=route.find(x=>x.day===d)?.requirements||[],max=d<=24?items.length:3,done=d<=24?items.filter(id=>completed.has(id)).length:s.courseReviewTasks.filter(id=>id.startsWith(`day${d}-`)).length;return <button key={d} className={d===day?'selected':''} aria-pressed={d===day} onClick={()=>onDay(d)}><b>第 {d} 天{d===day?' · 当前':''}</b><span>{d<=24?'阅读与回忆':review[d-25][0]}</span><progress aria-label={`第${d}天进度`} value={done} max={max||1}/><small>{done}/{max} {d<=24?'条':'项自记任务'}{d<=24?` · 剩余约 ${(max-done)*5} 分钟`:''}</small>{d<=24&&max===0&&<small>未学内容已重新分配</small>}</button>})}</div>
  <details><summary>时间不够？调整剩余计划</summary><label>每天可用于阅读与回忆的分钟数<select disabled={disabled} value={minutes} onChange={e=>setMinutes(Number(e.target.value))}>{[20,40,60,90,120,150,180,240].map(n=><option key={n} value={n}>{n} 分钟</option>)}</select></label><p>按此预算，剩余首轮至少需要 {Math.ceil(left*5/minutes)} 个学习日，另外保留6天巩固；练题、深入理解和错题复习另计。</p>{day<=24&&<><p>从第 {day} 天重排至第24天：已完成内容留在原日，所有未完成条目（含此前遗漏）重新均分。最多的一天需约 {maxMinutes} 分钟。{maxMinutes>minutes?`当前每天 ${minutes} 分钟不足；需增加到约 ${maxMinutes} 分钟，或接受延长首轮。`:'当前阅读预算可容纳，仍须另留练题时间。'}</p><button disabled={disabled} onClick={async()=>{if(await mutate(o=>({...o,courseSchedule:{dailyMinutes:minutes,days:preview}})))setNotice(`已从第 ${day} 天重排未学内容；已完成记录保留，每日进度已更新。`)}}>保存预算并重排未学内容</button></>}{day>24&&<p>需要重排首轮时，请先选择第1—24天中的起始日。</p>}{notice&&<p role="status">{notice}</p>}</details>
 </section>;
}
