import { useEffect, useRef, useState } from 'react';
import RequirementStudy, {type Reading,type Lesson} from './RequirementStudy';
import CourseExam from './CourseExam';
import GuideReader,{type NewGuide} from './GuideReader';
import { Link } from 'react-router-dom';
import { type LearningState, classicNames } from './learning';
import {type RequirementGuide} from './SourceTeaching';
import ReviewOverview from './ReviewOverview';
import StudyProgress from './StudyProgress';
import WrittenAnswerPoints from './WrittenAnswerPoints';
import SourcePageLinks from './SourcePageLinks';
import ObjectiveOptionReview,{type OptionReview} from './ObjectiveOptionReview';
import OriginalQuestionRecord,{type OriginalQuestion} from './OriginalQuestionRecord';
import QuestionReviewSummary,{type QuestionSourceAudit} from './QuestionReviewSummary';
import GuidedCoach from './GuidedCoach';

type Q = {id:string;family:string;classic:string;chapter:string;type:string;stem:string;options:{id:string;text:string}[];answers:string[];explanation:string;reference:string;source:string;sheet:string;row:number;subjective:boolean;review:string;assessmentGroup?:string;assessmentOnly?:boolean;budgetMinutes?:number;rubric?:unknown[];optionReview?:OptionReview;professionalHold?:{reason:string};sourceCheck?:{date:string;issue:string;status:string;original:OriginalQuestion};evidenceLinks?:{source:string;page:number;endPage:number;citation:string;quote:string;note:string;excerptKind?:string}[]};
type Chapter = {id:string;classic:string;title:string;requirements:{id:string;level:string;text:string;page:number}[];questionIds:string[];sourcePages:number[];newGuidePages?:number[]};
type Data = {courses:Chapter[];questions:Q[];pages:{page:number;text:string}[];lecturePages:{page:number;text:string}[];requirementReadings:Record<string,Reading>;requirementGuides?:Record<string,RequirementGuide>;lessons?:Lesson[];newGuide?:NewGuide;questionSourceAudit?:QuestionSourceAudit};
type Props = {s:LearningState;mutate:(fn:(s:LearningState)=>LearningState)=>Promise<boolean>;busy:boolean};
export function scoreCourse(q: Pick<Q,'answers'|'subjective'|'professionalHold'>, response:string) {
  if(q.subjective||q.professionalHold)return null;
  const picked=[...new Set(response.split(',').filter(Boolean))].sort();
  return JSON.stringify(picked)===JSON.stringify([...q.answers].sort())?1:0;
}
export default function Course({s,mutate,busy}:Props) {
 const submitting=useRef(false);
 const [closedBook,setClosedBook]=useState(false);
 const [coachParked,setCoachParked]=useState(false);
 const [data,setData]=useState<Data|null>(null),[err,setErr]=useState(''),[filter,setFilter]=useState('全部'),[search,setSearch]=useState(''),[selected,setSelected]=useState(''),[question,setQuestion]=useState(s.courseDraft?.question||''),[response,setResponse]=useState(s.courseDraft?.response||''),[submitted,setSubmitted]=useState(false),[wrongOnly,setWrongOnly]=useState(false),[page,setPage]=useState(0),[readingSearch,setReadingSearch]=useState('');
 useEffect(()=>{fetch(`${import.meta.env.BASE_URL}course/catalog.json`).then(r=>{if(!r.ok)throw Error('课程资料读取失败');return r.json()}).then(d=>{setData(d);const restored=d.courses.find((c:Chapter)=>c.questionIds.includes(s.courseDraft?.question||''));if(restored)setSelected(restored.id)}).catch(e=>setErr(String(e)))},[]);
 useEffect(()=>{if(!question||submitted)return;const t=setTimeout(()=>void mutate(o=>({...o,courseDraft:{question,response}})),400);return()=>clearTimeout(t)},[question,response,submitted,mutate]);
 useEffect(()=>{if(question&&data)requestAnimationFrame(()=>document.getElementById('active-course-question')?.scrollIntoView({behavior:'smooth',block:'start'}))},[question,data]);
 if(err)return <section className="panel"><p>{err}。学习记录保留，请刷新重试。</p></section>;
 if(!data)return <p role="status">正在打开全考纲课程…</p>;
 if(s.courseExams.some(e=>!e.submittedAt))return <div><h1>全国三级 · 限时题型演练</h1><CourseExam bank={data.questions} s={s} mutate={mutate} busy={busy}/></div>;
 const chapter=data.courses.find(c=>c.id===selected);
 const latest=new Map(s.courseAnswers.map(a=>[a.question,a]));
 const activeGroup=data.questions.find(q=>q.id===question)?.assessmentGroup;
 const list=data.questions.filter(q=>!q.professionalHold&&(activeGroup?q.assessmentGroup===activeGroup:(!chapter||chapter.questionIds.includes(q.id))&&(filter==='全部'||q.classic===filter)&&(!wrongOnly||latest.get(q.id)?.score===0)));
 const storedQuestion=data.questions.find(q=>q.id===question);
 const heldQuestion=storedQuestion?.professionalHold?storedQuestion:null;
 const q=storedQuestion?.professionalHold?undefined:storedQuestion;
 const coachActive=!!s.courseCoach&&s.courseCoach.index<s.courseCoach.tasks.length&&!coachParked&&!q;
 const coach=<GuidedCoach data={data} s={s} mutate={mutate} busy={busy} active={coachActive} onOpen={()=>setCoachParked(false)} onPark={()=>setCoachParked(true)}/>;
 if(coachActive)return <div className="course-view"><span className="eyebrow">全国三级 · 自动领学</span><h1>一步一步，跟着今天的安排。</h1>{coach}</div>;
 const courses=data.courses.filter(c=>(filter==='全部'||c.classic===filter)&&`${c.title}${c.requirements.map(r=>r.text).join('')}`.includes(search));
 const enter=(q:Q)=>{if(q.professionalHold)return;setQuestion(q.id);setResponse('');setSubmitted(false);void mutate(o=>({...o,courseDraft:{question:q.id,response:''},courseExposures:o.courseExposures.some(e=>e.question===q.id)?o.courseExposures:[...o.courseExposures,{question:q.id,at:new Date().toISOString()}]}));};
 const sourcePage=data.pages.find(p=>p.page===page);
 const availableQuestions=data.questions.filter(q=>!q.professionalHold);
 const pendingQuestions=availableQuestions.filter(q=>!latest.has(q.id));
 const practiceMinutes=Math.ceil(pendingQuestions.reduce((sum,q)=>sum+(q.budgetMinutes??(q.subjective?8:q.type==='X型题'||q.type==='多选题'?2.5:1.5)),0));
 return <div className="course-view">
  <span className="eyebrow">全国中医药经典能力等级考试 · 三级</span><h1>按考纲，逐章学与练。</h1>
  <div className="actions"><Link to="/today" className="text-link">返回今天</Link><Link to="/archive" className="text-link">备份学习记录</Link>{!closedBook&&(!q||submitted)&&data.requirementGuides&&<button className="text-button" onClick={()=>document.getElementById('review-overview')?.scrollIntoView({behavior:'smooth'})}>查看逐项核对与专项测评</button>}</div>
  {!closedBook&&(!q||submitted)&&coach}
  {heldQuestion&&<section className="panel held-question" role="status"><h2>这道旧题已暂移出训练</h2><p>{heldQuestion.professionalHold!.reason}</p><p>原草稿与已有作答保留。这道题不计入当前练习任务，继续学习本次考纲即可。</p><button className="primary" onClick={()=>{setQuestion('');setSubmitted(false)}}>返回领学计划</button></section>}
  {q&&!submitted&&<section className="panel"><p>有一题未提交的练习。30 天计划仍可查看；原文与讲解在提交前隐藏。</p><button className="primary" disabled={busy} onClick={async()=>{if(await mutate(o=>({...o,courseDraft:{question:q.id,response}})))setQuestion('')}}>保存练习并返回领学计划</button><button className="text-button" onClick={()=>document.getElementById('active-course-question')?.scrollIntoView({behavior:'smooth'})}>继续这道题</button></section>}
  {data.requirementReadings&&<RequirementStudy practiceActive={!!q&&!submitted} onClosedBookChange={setClosedBook} data={data} s={s} mutate={mutate} busy={busy} onPractice={id=>{const item=data.questions.find(q=>q.id===id);if(item){setFilter('全部');setWrongOnly(false);setSelected(data.courses.find(c=>c.questionIds.includes(id))?.id||'');enter(item)}}}/>}
  {!closedBook&&(!q||submitted)&&data.requirementGuides&&<ReviewOverview guides={data.requirementGuides} questions={data.questions} s={s} onPractice={id=>{const item=data.questions.find(q=>q.id===id);if(item){setFilter('全部');setWrongOnly(false);setSelected(data.courses.find(c=>c.questionIds.includes(id))?.id||'');enter(item)}}}/>}
  {!closedBook&&<details className="panel"><summary>整套限时演练与交卷订正</summary><CourseExam bank={data.questions} s={s} mutate={mutate} busy={busy}/></details>}
  {!closedBook&&<section className="panel">
   <h2>课程地图</h2><p>712 条要求 · {data.courses.length} 个归并章节 · {availableQuestions.length} 道可用资料练习。已提交 {s.courseAnswers.length} 次作答，其中 {s.courseAnswers.filter(a=>a.score===null).length} 次主观题待对照复核。</p>
   {data.requirementGuides&&<p>教材领学路径已接入 {Object.keys(data.requirementGuides).length} / 712 条：每条包含指定原页、学习范围和闭卷对照清单。范围包含三级所需的一、二级累计要求；资料接入不等于掌握或逐题专业核准。</p>}
   <p>先选择章节查看三级累计要求，再做原文、辨析与病例练习。包括你提供的题库，以及有原文依据的补充题，尚未逐题专业复核；不以题量或做题次数换算考纲掌握率。</p>
   {data.questionSourceAudit&&<QuestionReviewSummary audit={data.questionSourceAudit}/>}
   <details><summary>规划这批练习需要的时间</summary><p>尚未作答 {pendingQuestions.length} 道。按单选每题 1.5 分钟、多选 2.5 分钟、主观分析 8 分钟、新增专项简答 3 分钟作预算，首轮练习约 {practiceMinutes} 分钟；分到 30 天约每天 {Math.ceil(practiceMinutes/30)} 分钟，尚未计入原文学习、详细解析和错题复习。</p><p>这是明确假设下的粗估，不是实际用时或通过率预测。已有基础时可优先练薄弱章节；不要把完成题库当成唯一备考目标。</p></details>
   <details><summary>考试要求与内容核验状态</summary><p>2026 全国三级：100 分钟，100 分，60 分及格。A1 型 48 题、A2 型 24 题、多选 9 题、A3 型 9 题、能力题 1 题（10 分）；一级、二级、三级原文内容占比为 30%、30%、40%。</p><a href="https://www.tcmtest.org.cn/content/1727" target="_blank" rel="noreferrer">官方考试通知</a><p><a href={`${import.meta.env.BASE_URL}course/scheme-2026.docx`}>查看官方考试方案</a> · <a href={`${import.meta.env.BASE_URL}course/syllabus-2026.docx`}>查看官方完整考纲</a></p><p>当前章节归类不是逐条完整覆盖认证；题目未核定难度与考纲级别，不能把随机组题称为符合蓝图的正式模拟。已隔离资料中的答案冲突；能力题先独立作答，再对照解析，不自动判为掌握。</p></details>
   <div className="course-filters"><label>经典<select value={filter} onChange={e=>{setFilter(e.target.value);setSelected('');setQuestion('')}}>{['全部',...classicNames].map(n=><option key={n}>{n}</option>)}</select></label><label>查找章节或考点<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="如：少阴、治未病、卫气营血"/></label></div>
   <label><input type="checkbox" checked={wrongOnly} onChange={e=>setWrongOnly(e.target.checked)}/> 只练尚未订正的客观错题</label>
   <div className="chapter-list">{courses.map(c=><button key={c.id} className={c.id===selected?'selected':''} onClick={()=>{setSelected(c.id);setQuestion('');setPage(c.sourcePages[0]||0)}}><b>{c.classic} · {c.title}</b><small>{c.requirements.length} 条要求 · {c.questionIds.length} 道资料题{!c.questionIds.length?' · 需补充专项题':''}</small></button>)}</div>
  </section>}
  {chapter&&!closedBook&&(!q||submitted)&&<section className="panel"><h2>{chapter.title}</h2><details open><summary>本章累计考纲要求（含一、二级）</summary><ol>{chapter.requirements.map(r=><li key={r.id}><b>{r.id} · {r.level}：</b>{r.text}<small>考纲 PDF 第 {r.page} 页</small></li>)}</ol></details>
   {data.newGuide&&!!chapter.newGuidePages?.length&&<details><summary>打开新版教材本章原页</summary><GuideReader key={chapter.id} guide={data.newGuide} pages={chapter.newGuidePages}/></details>}
   {!!chapter.sourcePages.length&&<p>指南中提及本章的页码：{chapter.sourcePages.map(n=><button className="text-button" key={n} onClick={()=>setPage(n)}>{n}</button>)}（较早版本，用于定位，未自动认定覆盖本章全部要求）</p>}
   {sourcePage&&<details><summary>展开指南第 {page} 页摘录</summary><pre className="course-reading">{sourcePage.text}</pre><a href={`${import.meta.env.BASE_URL}library/F0012.pdf#page=${page}`} target="_blank" rel="noreferrer">核对 PDF 原页</a><div className="actions"><button disabled={page<=5} onClick={()=>setPage(page-1)}>上一页</button><button disabled={page>=129} onClick={()=>setPage(page+1)}>下一页</button></div><p className="small muted">这是原始文本提取，缺字和异体字未擅自补改。</p></details>}
   <label>检索配套讲解（原资料全文）<input value={readingSearch} onChange={e=>setReadingSearch(e.target.value)} placeholder="输入具体方名、条文或术语，至少两个字"/></label>
   {readingSearch.trim().length>=2&&data.lecturePages.filter(p=>p.text.replace(/\s/g,'').includes(readingSearch.replace(/\s/g,''))).slice(0,12).map(p=><details key={p.page}><summary>《中医经典等级测试指南》PDF 第 {p.page} 页</summary><pre className="course-reading">{p.text}</pre><a href={`${import.meta.env.BASE_URL}library/F0016.pdf#page=${p.page}`} target="_blank" rel="noreferrer">核对配套讲解 PDF 原页</a></details>)}
   <p>{list.length} 道符合当前条件的练习</p>{list.length>0?<button className="primary" disabled={busy} onClick={()=>enter(list.find(q=>!latest.has(q.id))||list[0])}>从未做题开始本章练习</button>:<p>当前筛选无可练题；本章仍可阅读考纲和原文。</p>}
  </section>}
  {q&&<section className="panel course-question" id="active-course-question" key={q.id}>
   {activeGroup&&<StudyProgress label={`${activeGroup} 专项测评进度`} done={list.filter(item=>latest.has(item.id)).length} total={list.length} detail={`本组 ${list.length} 题，已写或已提交 ${list.filter(item=>latest.has(item.id)).length} 题；书面题需对照评分点，完成不等于掌握。`}/>}
   <span className="eyebrow">{q.classic} · {q.type} · 资料训练</span><h2>{q.stem}</h2>
   {q.subjective?<label>先写下你的分析<textarea value={response} disabled={submitted||busy} maxLength={12000} onChange={e=>setResponse(e.target.value)} rows={8} placeholder="可按主症、病机、治法、方药及鉴别组织；不要只点击“已掌握”。"/></label>:<div className="answer-options">{q.options.map(o=><button key={o.id} disabled={submitted||busy} aria-pressed={response.split(',').includes(o.id)} className={response.split(',').includes(o.id)?'selected':''} onClick={()=>setResponse(q.type==='X型题'||q.type==='多选题'?(response.split(',').includes(o.id)?response.split(',').filter(a=>a!==o.id):[...response.split(',').filter(Boolean),o.id]).sort().join(','):o.id)}>{o.id}. {o.text}</button>)}</div>}
   {!submitted?<button className="primary" disabled={busy||!response.trim()||s.cycle.paused} onClick={async()=>{if(submitting.current)return;submitting.current=true;try{const score=scoreCourse(q,response);if(await mutate(o=>({...o,courseAnswers:[...o.courseAnswers,{id:crypto.randomUUID(),question:q.id,response,score,at:new Date().toISOString(),revealed:true}],courseDraft:null})))setSubmitted(true)}finally{submitting.current=false}}}>提交并查看解析</button>:<><div className="feedback"><b>{q.subjective?'已保存独立作答，请逐点对照资料解析':scoreCourse(q,response)===1?'与资料答案一致':'已记入错题，请查看差异'}</b>{!q.subjective&&<p>资料答案：{q.answers.map(a=>q.options.find(o=>o.id===a)?.text).join('；')}</p>}<p className="course-reading">{q.explanation}</p>{q.subjective&&<WrittenAnswerPoints points={q.rubric}/>}<ObjectiveOptionReview review={q.optionReview}/>{q.sourceCheck&&<p className="small">{q.sourceCheck.date} 教材核对：{q.sourceCheck.issue}。保留独立教师复核待办；原题已有作答不重新算作未见题。</p>}<p className="small muted">资料引用：{q.reference||'本题未附独立参考出处'}</p>{q.evidenceLinks?.map((e,i)=><details key={i}><summary>已定位引用：{e.citation} · PDF第{e.page}页</summary>{e.excerptKind&&<p className="small muted">{e.excerptKind}</p>}<p>{e.quote}</p><p className="small muted">{e.note}</p><SourcePageLinks e={e}/></details>)}<OriginalQuestionRecord original={q.sourceCheck?.original} current={q}/><small>来源：{q.source} · {q.sheet} · {q.row}；{q.review === 'authored-image-checked' ? '教材原页对照编写的学习题，单轮核对；未校准考试难度，非真题' : q.review === 'authored-source-grounded' ? '按本条教材依据编写的专项简答，附参考答案；书面题需对照核查，未校准考试难度' : q.review === 'authored-source-text' ? '本应用编写的原文辨析题，单次文本核验，非真题' : '用户资料题，答案尚未逐题专业复核，非经核实的历年真题'}。再次练习属于已见题。</small></div><button className="primary" disabled={busy||s.cycle.paused} onClick={()=>{const i=list.findIndex(a=>a.id===q.id);const next=list[i+1];if(next)enter(next);else{setQuestion('');setSubmitted(false)}}}>{list.findIndex(a=>a.id===q.id)<list.length-1?'继续下一题':'本组已到末尾，返回章节'}</button></>}
  </section>}
 </div>;
}

