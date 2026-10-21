import {useEffect, useRef, useState} from 'react';
import {type LearningState} from './learning';
import GuideReader,{type NewGuide} from './GuideReader';
import StudyProgress from './StudyProgress';
import PlanOverview from './PlanOverview';
import {courseRoute,validRoute} from './courseRoute';
import SourceTeaching,{RecallTasks,type RequirementGuide} from './SourceTeaching';
export type Requirement = {id:string;level:string;text:string;page:number};
export type Reading = {source:string;chapterPages:number[];articlePages:number[];articleNumbers:number[];unlocatedNumbers:number[];status:string;questionIds:string[];lecturePages:number[];lectureBasis?:string;lessonIds?:string[];lessonBasis?:string;sourceNote?:string;articleQuestionIds?:string[];newGuidePages?:number[];newGuideFocusPages?:number[];supplement?:{title:string;text:string;url:string;source:string;note:string}};
export type Lesson={id:string;classic:string;citation:string;original:string;summary:string;commentary:string;source:string;page:number;endPage:number};
export type StudyData = {courses:{id:string;classic:string;title:string;requirements:Requirement[]}[];requirementReadings:Record<string,Reading>;requirementGuides?:Record<string,RequirementGuide>;pages:{page:number;text:string}[];lecturePages:{page:number;text:string}[];lessons?:Lesson[];newGuide?:NewGuide};
type Props = {practiceActive?:boolean;data:StudyData;s:LearningState;mutate:(fn:(s:LearningState)=>LearningState)=>Promise<boolean>;busy:boolean;onPractice?:(id:string)=>void;onClosedBookChange?:(active:boolean)=>void};
export function recallQueue(data:StudyData, s:LearningState, now:number, minutes:number, scope='') {
 const latest=new Map(s.courseRecall.map(a=>[a.requirement,a]));
 const all=data.courses.filter(c=>!scope||c.id===scope).flatMap(c=>c.requirements);
 const due=all.filter(r=>latest.has(r.id)&&Date.parse(latest.get(r.id)!.nextReviewAt)<=now)
  .sort((a,b)=>Date.parse(latest.get(a.id)!.nextReviewAt)-Date.parse(latest.get(b.id)!.nextReviewAt));
 const unseen=all.filter(r=>!latest.has(r.id));
 return [...due,...unseen].slice(0,Math.max(1,Math.floor(minutes/5))).map(r=>r.id);
}
export function nextRecallDate(s:LearningState,id:string,confidence:string,now:number) {
 const recent=s.courseRecall.filter(r=>r.requirement===id).slice(-2);
 const days=confidence==='recalled'?(recent.length===2&&recent.every(r=>r.confidence==='recalled')?7:3):1;
 return new Date(now+days*86400000).toISOString();
}
export default function RequirementStudy({data,s,mutate,busy,onPractice,onClosedBookChange,practiceActive=false}:Props) {
 const [scope,setScope]=useState('');
 const [minutes,setMinutes]=useState(20),[queue,setQueue]=useState<string[]>(s.courseRecallDraft?.queue||[]),[response,setResponse]=useState(s.courseRecallDraft?.response||''),[show,setShow]=useState(s.courseRecallDraft?.show||false),[saved,setSaved]=useState(false),[error,setError]=useState('');
 const [phase,setPhase]=useState<'read'|'recall'>(s.courseRecallDraft?.phase||(s.courseRecallDraft?.response?'recall':'read'));
 const [total,setTotal]=useState(s.courseRecallDraft?.total||s.courseRecallDraft?.queue.length||0);
 useEffect(()=>{onClosedBookChange?.(!practiceActive&&phase==='recall'&&!show&&queue.length>0);return()=>onClosedBookChange?.(false)},[phase,show,queue.length,onClosedBookChange,practiceActive]);
 const saving=useRef(false);
 useEffect(()=>{if(!queue.length||saved)return;const t=setTimeout(()=>{if(!saving.current)void mutate(o=>({...o,courseRecallDraft:{queue,response,show,phase,total}}))},400);return()=>clearTimeout(t)},[queue,response,show,phase,total,saved,mutate]);
 const all=data.courses.flatMap(c=>c.requirements.map(r=>({...r,classic:c.classic,chapter:c.title})));
 const completed=new Set(s.courseRecall.map(r=>r.requirement));
 const route=s.courseSchedule&&validRoute(s.courseSchedule.days,data)?s.courseSchedule.days:courseRoute(data);
 const [routeDay,setRouteDay]=useState(()=>s.courseMode==='sprint'?25:route.find(d=>d.requirements.some(id=>!completed.has(id)))?.day||25);
 const routeRequirements=route.find(d=>d.day===routeDay)?.requirements||[];
 const scoped=data.courses.filter(c=>!scope||c.id===scope).flatMap(c=>c.requirements);
 const remaining=scoped.filter(r=>!completed.has(r.id)).length;
 const r=all.find(r=>r.id===queue[0]);const a=r?data.requirementReadings[r.id]:null;
 const guidance=r?data.requirementGuides?.[r.id]:undefined;
 const pages=a?(a.articlePages.length?a.articlePages:a.chapterPages):[];
 const reset=()=>{setResponse('');setShow(false);setPhase('read');setSaved(false);setError('')};
 const save=async(confidence:'again'|'unsure'|'recalled')=>{
  if(!r||saving.current||!response.trim())return;saving.current=true;setError('');
  try{const now=Date.now();const ok=await mutate(o=>({...o,courseRecallDraft:queue.length>1?{queue:queue.slice(1),response:'',show:false,phase:'read',total}:null,courseRecall:[...o.courseRecall,{id:crypto.randomUUID(),requirement:r.id,response,at:new Date(now).toISOString(),confidence,nextReviewAt:nextRecallDate(o,r.id,confidence,now)}]}));if(ok)setSaved(true);else setError('未保存成功，请保留作答并重试。')}
  finally{saving.current=false}
 };
 return <section className="panel requirement-study">
  {s.courseMode==='sprint'&&<p className="tag">冲刺模式 · 从第25天巩固开始，未学内容仍保留原进度</p>}
  <PlanOverview route={route} completed={completed} day={routeDay} onDay={setRouteDay} onStart={budget=>{reset();setMinutes(budget);const next=routeRequirements.filter(id=>!completed.has(id)).slice(0,Math.min(100,Math.floor(budget/5)));setTotal(next.length);setQueue(next)}} s={s} mutate={mutate} disabled={practiceActive||!!r||busy||s.cycle.paused}/>
  {!practiceActive&&<><h2>逐条原文与回忆</h2><p>已记录 {completed.size} / {all.length} 条考纲要求的回忆；这表示学习经过，不是考试掌握率。</p>
  <StudyProgress label="考纲首轮回忆进度" done={completed.size} total={all.length} detail={`还剩 ${all.length-completed.size} 条，按每条 5 分钟估算约 ${Math.ceil((all.length-completed.size)*5/60)} 小时；另计练题与复习。记录过回忆不等于掌握。`}/>
  <details><summary>30 天完整路线：24 天首轮 + 6 天巩固</summary><p>每天兼顾四部经典，前 24 天分配全部 {all.length} 条要求，最后 6 天用于辨证归纳、整卷演练和错题回忆。每天首轮 {Math.min(...route.map(d=>d.requirements.length))}—{Math.max(...route.map(d=>d.requirements.length))} 条，按每条 5 分钟估算约 {Math.min(...route.map(d=>d.requirements.length))*5}—{Math.max(...route.map(d=>d.requirements.length))*5} 分钟，另留练题和复习时间。20 分钟可作为分段学习，不会被标记成全天完成。</p>
   <label>路线日<select value={routeDay} disabled={!!r} onChange={e=>setRouteDay(Number(e.target.value))}>{Array.from({length:30},(_,i)=><option key={i} value={i+1}>第 {i+1} 天{i<24?' · 首轮':' · 巩固'}</option>)}</select></label>
   {routeDay<=24?<><p>本日 {routeRequirements.length} 条，已记录回忆 {routeRequirements.filter(id=>completed.has(id)).length} 条。</p><ul>{data.courses.filter(c=>c.requirements.some(r=>routeRequirements.includes(r.id))).map(c=><li key={c.id}>{c.classic} · {c.title}：{c.requirements.filter(r=>routeRequirements.includes(r.id)).map(r=>r.id).join('、')}</li>)}</ul><button disabled={!!r||busy||s.cycle.paused||routeRequirements.every(id=>completed.has(id))} onClick={()=>{reset();setMinutes(150);setTotal(Math.min(100,routeRequirements.filter(id=>!completed.has(id)).length));setQueue(routeRequirements.filter(id=>!completed.has(id)).slice(0,100))}}>按本日路线开始（可保存后分段继续）</button></>:<p>{['第25天：归纳内经理论与伤寒六经辨证，优先回忆漏项。','第26天：归纳金匮杂病与温病卫气营血、三焦辨证，做病例鉴别。','第27天：完成一套100分钟题型演练，独立写能力题后再对照。','第28天：按错题回到原文与释义，闭卷重述，补足鉴别条件。','第29天：完成另一套未使用题演练，对照两轮的薄弱章节。','第30天：轻量回忆高频错点、治禁与易混方证，整理仍需复核的能力题。'][routeDay-25]}</p>}
  </details>
  {routeDay<=24&&<StudyProgress label={`路线第 ${routeDay} 天`} done={routeRequirements.filter(id=>completed.has(id)).length} total={routeRequirements.length} detail={`本日还剩 ${routeRequirements.filter(id=>!completed.has(id)).length} 条，阅读与回忆预算约 ${routeRequirements.filter(id=>!completed.has(id)).length*5} 分钟。可拆成多个小段。`}/>}
  <label>带学范围<select value={scope} disabled={!!r} onChange={e=>setScope(e.target.value)}><option value="">全部考纲 · 按章推进</option>{data.courses.map(c=><option key={c.id} value={c.id}>{c.classic} · {c.title}</option>)}</select></label>
  <label>本轮时间预算<select value={minutes} disabled={!!r} onChange={e=>setMinutes(Number(e.target.value))}>{[20,40,60,90,120,150,180].map(v=><option value={v} key={v}>{v} 分钟</option>)}</select></label>
  <p>暂按每条阅读与回忆 5 分钟安排，每轮最多 {Math.floor(minutes/5)} 条，到期复习优先。按每天一轮，剩余首轮约 {Math.ceil(remaining*5/minutes)} 天；若用 30 天走完剩余首轮，约每天 {Math.ceil(remaining*5/30)} 分钟，另需题目训练和复习。复杂条目可自行延长。</p>
  <button className="primary" disabled={busy||s.cycle.paused||!!r} onClick={()=>{reset();const next=recallQueue(data,s,Date.now(),minutes,scope);setTotal(next.length);setQueue(next);if(!next.length)setError('当前范围没有未学条目或到期复习，可以选择其他章节。')}}>开始本轮逐条学习</button>
  {!r&&error&&<p role="status">{error}</p>}
  {r&&a&&<div className="requirement-session" id="current-guided-session">
   <p className="eyebrow">{r.classic} · {r.chapter} · {r.level} · {r.id}</p><h3>{r.text}</h3>
   <p>考纲 PDF 第 {r.page} 页。本轮含当前还剩 {queue.length} 条。</p>
   <StudyProgress label="本轮领学进度" done={Math.max(0,total-queue.length)+(saved?1:0)} total={total||queue.length} detail={`还剩 ${queue.length-(saved?1:0)} 条，阅读与回忆预算约 ${(queue.length-(saved?1:0))*5} 分钟（含当前条完整预算，可分段保存）。${show?'正在对照订正':phase==='read'?'先阅读，再进入闭卷回忆':'闭卷回忆中，教材已隐藏'}`}/>
   {guidance&&<RecallTasks guide={guidance}/>}
   {(phase==='read'||show)&&<div className="study-materials">
   {a.sourceNote&&a.sourceNote!==guidance?.sourceNote&&<p>{a.sourceNote}</p>}
   {data.newGuide&&guidance&&<SourceTeaching guide={guidance} textbook={data.newGuide}/>}
   {data.newGuide&&!!a.newGuidePages?.length&&<details><summary>本章完整教材：原文与释义</summary><GuideReader key={r.id} guide={data.newGuide} pages={a.newGuidePages} focusPages={a.newGuideFocusPages}/></details>}
   {!!a.lessonIds?.length&&<details className="guided-lesson"><summary>第一步：原文与讲解（{a.lessonIds.length} 段）</summary><p>{a.lessonBasis==='requirement-source-image'?'本条已加入教材原页对照补讲，按讲解、易混点和回忆清单学习。':a.lessonBasis==='chapter-citation'?'以下为本章配套讲解，请围绕当前考纲要求阅读。':'以下按本条引用的条文号关联讲解。'}</p>{a.lessonIds.map(id=>data.lessons?.find(l=>l.id===id)).filter((l):l is Lesson=>!!l).map(l=><details key={l.id}><summary>{l.summary.replace(/\s+/g,' ').slice(0,100)}</summary><blockquote className="course-reading">{l.original}</blockquote><p>{l.citation}</p><pre className="course-reading">{l.commentary}</pre>{l.source==='F0007'?<div className="actions">{Array.from({length:l.endPage-l.page+1},(_,i)=>l.page+i).map(n=><a key={n} href={`${import.meta.env.BASE_URL}library/F0007/${String(n).padStart(4,'0')}.jpg`} target="_blank" rel="noreferrer">教材原页：PDF 第 {n} 页</a>)}</div>:<a href={`${import.meta.env.BASE_URL}library/${l.source}.pdf#page=${l.page}`} target="_blank" rel="noreferrer">讲解出处：PDF 第 {l.page}—{l.endPage} 页</a>}</details>)}</details>}
   <details><summary>阅读对应原文（读后合上，再回忆）</summary>
    {a.supplement&&<div><h4>{a.supplement.title}</h4><p>{a.supplement.text}</p><a href={a.supplement.url} target="_blank" rel="noreferrer">{a.supplement.source}</a><p>{a.supplement.note}</p></div>}
    <p>{a.status==='number-located'?`已按本章条文号 ${a.articleNumbers.join('、')} 定位。`:'以下为章节原文，请按当前要求阅读对应段落。'}{a.unlocatedNumbers.length?`其中 ${a.unlocatedNumbers.join('、')} 号尚未在此版本准确定位。`:''}</p>
    {pages.map(n=><details key={n}><summary>三级指南 PDF 第 {n} 页</summary><pre className="course-reading">{data.pages.find(p=>p.page===n)?.text}</pre><a target="_blank" rel="noreferrer" href={`${import.meta.env.BASE_URL}library/F0012.pdf#page=${n}`}>核对完整原页及前后方药</a></details>)}
    <p className="small muted">较早版本原始文本；缺字请核对 PDF，不据此推定新版条文全部覆盖。</p>
   </details>
   </div>}
   {phase==='read'&&!show&&<button className="primary" onClick={()=>setPhase('recall')}>读好了，隐藏资料开始回忆</button>}
   {(phase==='recall'||show)&&<><label>合上原文，写出本条要点<textarea rows={6} value={response} maxLength={12000} disabled={show||saved||busy} onChange={e=>setResponse(e.target.value)} placeholder="根据本条要求，回忆原文关键词；证治类再写主症、病机、治法与鉴别。作答后展开资料核对。"/></label>
   </>}{phase==='recall'&&!show&&<button disabled={!response.trim()} onClick={()=>setShow(true)}>完成回忆，展开对照</button>}
   {show&&<div className="feedback"><p>请逐项核对要求与原文，补上漏项。自评只用于复习安排，不计为考试通过证据。</p>
    {guidance&&<RecallTasks guide={guidance} comparison/>}
    {a.lectureBasis==='chapter-citation'&&!!a.lecturePages.length&&<p>以下按章节出处定位讲解，需从中查找本条要求对应的内容。</p>}
    {a.lecturePages.map(n=><details key={n}><summary>配套讲解 PDF 第 {n} 页</summary><pre className="course-reading">{data.lecturePages.find(p=>p.page===n)?.text}</pre><a target="_blank" rel="noreferrer" href={`${import.meta.env.BASE_URL}library/F0016.pdf#page=${n}`}>核对讲解原页</a></details>)}
    {!a.lecturePages.length&&<p>{guidance?'本条按上方新版教材原页的词解、释义进行对照。':'本条尚无已定位的配套讲解，可在下方章节中检索资料原文。'}</p>}
    {!saved?<div className="actions"><button disabled={busy||s.cycle.paused} onClick={()=>void save('again')}>未能回忆 · 明天复习</button><button disabled={busy||s.cycle.paused} onClick={()=>void save('unsure')}>有漏项 · 明天复习</button><button disabled={busy||s.cycle.paused} onClick={()=>void save('recalled')}>对照基本完整 · 间隔复习</button></div>:<><p role="status">回忆已保存，下次到期优先安排。</p>{!![...a.questionIds,...(a.articleQuestionIds||[])].length&&<button onClick={()=>onPractice?.([...a.questionIds,...(a.articleQuestionIds||[])][0])}>下一步：做关联练习（题目在下方）</button>}<button className="primary" onClick={()=>{setQueue(queue.slice(1));reset()}}>{queue.length>1?'继续下一条':'结束本轮'}</button></>}
    {error&&<p role="alert">{error}</p>}
   </div>}
  </div>}
 </>}</section>;
}
