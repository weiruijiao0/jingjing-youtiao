import {useEffect,useMemo,useRef,useState} from 'react';
import {type LearningState} from './learning';
import {advanceCoach,buildCoachSession,coachOverview,coachTaskMinutes,delayedEligible,updateCoachTask,type CoachData,type CoachTask} from './courseCoach';
import SourceTeaching,{RecallTasks} from './SourceTeaching';
import StudyProgress from './StudyProgress';
import WrittenAnswerPoints from './WrittenAnswerPoints';
import ObjectiveOptionReview from './ObjectiveOptionReview';
import OriginalQuestionRecord from './OriginalQuestionRecord';
import SourcePageLinks from './SourcePageLinks';

type Props={data:CoachData;s:LearningState;mutate:(fn:(s:LearningState)=>LearningState)=>Promise<boolean>;busy:boolean;active:boolean;onOpen:()=>void;onPark:()=>void};
const causeNames={recall:'原文没记住',confusion:'方证或概念混淆',condition:'漏看鉴别条件',unsure:'暂时说不清'};
export default function GuidedCoach({data,s,mutate,busy,active,onOpen,onPark}:Props){
 const session=s.courseCoach,task=session?.tasks[session.index],q=task?data.questions.find(q=>q.id===task.question&&!q.professionalHold):undefined;
 const overview=useMemo(()=>coachOverview(data,s),[data,s]),requirement=[...overview.requirements,...overview.chapterWrong].find(r=>r.id===task?.requirement),guide=task?data.requirementGuides?.[task.requirement]:undefined;
 const [minutes,setMinutes]=useState(Math.max(20,s.courseSchedule?.dailyMinutes||s.profile.defaultMinutes)),[notice,setNotice]=useState('');
 const [draft,setDraft]=useState(''),[cause,setCause]=useState<keyof typeof causeNames>('unsure'),[confidence,setConfidence]=useState<CoachTask['confidence']>('unsure');
 const lock=useRef(false);
 const answer=task?.attemptId?s.courseAnswers.find(a=>a.id===task.attemptId):undefined;
 useEffect(()=>{setDraft(task?.phase==='recall'||task?.phase==='compare'?task.recallResponse:task?.phase==='repair'?answer?.correction||'':task?.response||'');setCause(answer?.errorCause||'unsure');setConfidence(task?.phase==='feedback'?task.writtenConfidence||'unsure':task?.confidence||'unsure');setNotice('')},[task?.id,task?.phase]);
 useEffect(()=>{
  if(!active||!task||!session||!['question','recall','repair'].includes(task.phase))return;
  const timer=setTimeout(()=>{if(!lock.current)void mutate(o=>{
   if(o.courseCoach?.id!==session.id||o.courseCoach.tasks[o.courseCoach.index]?.id!==task.id||o.courseCoach.tasks[o.courseCoach.index]?.phase!==task.phase)return o;
   if(task.phase==='repair')return {...o,courseAnswers:o.courseAnswers.map(a=>a.id===task.attemptId?{...a,correction:draft,errorCause:cause}:a)};
   return updateCoachTask(o,task.phase==='recall'?{recallResponse:draft}:{response:draft});
  })},400);return()=>clearTimeout(timer);
 },[draft,cause,task?.id,task?.phase,active,session?.id,mutate]);
 const change=async(fn:(s:LearningState)=>LearningState)=>{
  if(lock.current||busy||s.cycle.paused)return false;lock.current=true;
  try{const ok=await mutate(fn);if(!ok)setNotice('这一步未保存成功，请保留作答并重试。');return ok}finally{lock.current=false}
 };
 const material=guide&&data.newGuide?<SourceTeaching key={task?.id} guide={guide} textbook={data.newGuide}/>:task?.requirement.startsWith('question:')&&q?<><p>本题尚无精确逐条关联，按已有解析与出处订正；不补算为考纲条目已学或已掌握。</p><p className="course-reading">{q.explanation}</p>{q.evidenceLinks?.map((e,i)=><details key={i}><summary>本题教材出处：{e.citation}</summary><p>{e.quote}</p><SourcePageLinks e={e}/></details>)}<p>{q.reference||'本题尚缺精确出处，保留待专业核对状态。'}</p></>:<p>本条教材暂未能打开，先保存并返回计划核对资料。</p>;
 const blocked=!!(s.courseDraft||s.courseRecallDraft?.queue.length||s.courseExams.some(e=>!e.submittedAt));
 if(!active||!task)return <section className="panel guided-coach" id="today-guided" aria-label="今日自动领学">
  <span className="eyebrow">今天从这里继续 · 原文 → 回忆 → 练习 → 订正</span><h2>今日领学</h2>
  <p>已安排到期复习优先，再推进30天主线；每条自动接上关联练习。错题订正后，隔天再闭卷检验。</p>
  <div className="memory-meters">
   <StudyProgress label="已学过的考纲条目" done={overview.learned} total={overview.total} detail="有回忆或关联作答记录；不表示完整掌握。"/>
   <StudyProgress label="闭卷练习答对的条目" done={overview.closed} total={overview.total} detail="今日领学隐藏资料后的客观题结果；同日练习不证明记牢。"/>
   <StudyProgress label="隔天检验仍答对的条目" done={overview.retained} total={overview.total} detail="至少间隔24小时后，先闭卷检验再看资料；仅证明所练题点，非整条能力或考试通过率。"/>
  </div>
  <p>现在有 {overview.due.length} 条到期复习，{overview.weak.length} 条需要回炉。旧作答保留，不自动补算为闭卷或隔天检验。</p>
  {!!overview.chapterWrong.length&&<p>其中 {overview.chapterWrong.length} 道章节错题尚无精确考纲关联，也会单独回炉；不自动归章到某条要求，不增加上方条目进度。</p>}
  {session&&session.index===session.tasks.length&&<p role="status">本小段已完成，作答与订正都已保存。还可以开始下一小段；这不代表整天内容已完成。</p>}
  {session&&session.index<session.tasks.length?<><p>有已保存的小段，还剩 {session.tasks.length-session.index} 条；优先继续，不重新安排。</p><button className="primary" disabled={busy||blocked||s.cycle.paused} onClick={onOpen}>继续已保存的今日领学</button></>:<><label>本次小段时间<select value={minutes} disabled={busy} onChange={e=>setMinutes(Number(e.target.value))}>{[20,40,60,90,120,150,180,240].map(n=><option key={n} value={n}>{n} 分钟</option>)}</select></label><button className="primary" disabled={busy||blocked||s.cycle.paused} onClick={async()=>{
   let planned=false;const ok=await change(o=>{const next=buildCoachSession(data,o,minutes);if(!next)return o;planned=true;return {...o,courseCoach:next}});
   if(ok&&planned)onOpen();else if(ok)setNotice('当前没有到期复习或未学内容，可查看计划或选择章节专项。');
  }}>开始今日领学</button></>}
  {blocked&&<p role="status">先继续已保存的练习、原文回忆或整卷，完成后再开始今日领学。原草稿保留。</p>}
  {s.cycle.paused&&<p>学习已暂停，请在“我的”中恢复后继续。</p>}
  <p className="small muted">这是一个时间小段，不是整天任务。30天总计划和每日进度仍在下方；阅读、回忆、练题用时为粗预算，可以分段继续。</p>
  <details><summary>查看到期复习与回炉安排</summary>{overview.due.slice(0,12).map(r=><p key={r.id}>{r.classic} · {r.chapter} · {r.text}（{overview.states.get(r.id)?.weak?'错点回炉':'间隔检验'}）</p>)}{!overview.due.length&&<p>当前没有到期条目，先推进未学内容。</p>}</details>
  {notice&&<p role="status">{notice}</p>}
 </section>;
 const index=session!.index,left=session!.tasks.slice(index).reduce((sum,t)=>sum+coachTaskMinutes(t.kind,data.questions.find(q=>q.id===t.question)),0);
 const isQuestion=task.phase==='question',isRecall=task.phase==='recall';
 return <section className="panel guided-coach coach-session" id="today-guided" aria-label="今日自动领学">
  <span className="eyebrow">{task.kind==='learn'?'30天主线 · 新内容':task.kind==='repair'?'错点回炉 · 先闭卷检验':'到期间隔检验'} · {requirement?.classic} · {requirement?.chapter}</span>
  <h2>今日领学 · 第 {index+1} / {session!.tasks.length} 条</h2><h3>{requirement?.text||'当前考纲条目'}</h3>
  <StudyProgress label="今日领学小段进度" done={index} total={session!.tasks.length} detail={`还剩 ${session!.tasks.length-index} 条，完整步骤预算约 ${left} 分钟；当前：${({read:'读原文与释义',recall:'闭卷回忆',compare:'对照漏项',question:'闭卷做关联练习',feedback:'核对练习',repair:'回看并订正',done:'已完成'} as const)[task.phase]}。可以保存后继续。`}/>
  <div className="coach-steps" aria-label="领学步骤"><span>读与理解</span><span>闭卷回忆</span><span>关联练习</span><span>订正与隔天检验</span></div>
  {notice&&<p role="alert">{notice}</p>}
  {['read','compare','repair'].includes(task.phase)&&<div className="coach-materials">{guide&&<RecallTasks guide={guide} comparison={task.phase!=='read'}/>} {material}</div>}
  {task.phase==='read'&&<button className="primary" disabled={busy||s.cycle.paused} onClick={()=>void change(o=>updateCoachTask(o,{phase:'recall'}))}>读好了，合上资料回忆</button>}
  {(isRecall||task.phase==='compare')&&<label>合上资料，写出本条关键点<textarea rows={5} maxLength={12000} disabled={!isRecall||busy} value={draft} onChange={e=>setDraft(e.target.value)}/></label>}
  {isRecall&&<button className="primary" disabled={busy||!draft.trim()||s.cycle.paused} onClick={()=>void change(o=>updateCoachTask(o,{phase:'compare',recallResponse:draft}))}>写好了，对照漏项</button>}
  {task.phase==='compare'&&<><label>这次回忆情况<select value={confidence} disabled={busy} onChange={e=>setConfidence(e.target.value as CoachTask['confidence'])}><option value="unsure">有漏项</option><option value="again">未能回忆</option><option value="recalled">对照基本完整</option></select></label><button className="primary" disabled={busy||s.cycle.paused} onClick={()=>void change(o=>{
   const now=new Date().toISOString(),t=o.courseCoach!.tasks[o.courseCoach!.index];
   const next={...o,courseRecall:[...o.courseRecall,{id:crypto.randomUUID(),requirement:t.requirement,response:t.recallResponse,at:now,confidence,nextReviewAt:new Date(Date.parse(now)+86400000).toISOString()}]};
   return q?updateCoachTask(next,{phase:'question',confidence,response:q.subjective?t.recallResponse:''}):advanceCoach(next);
  })}>{q?'记下漏项，做关联练习':'保存回忆，继续下一条'}</button></>}
  {isQuestion&&q&&<div className="coach-question"><p>资料已隐藏。{task.kind==='learn'?'这是刚学内容的闭卷练习，隔天还会复查。':'先独立作答，再打开解析；未间隔满24小时的结果不计隔天检验。'}</p><h3>{q.stem}</h3>{q.subjective?<label>独立写出关联练习的答案<textarea rows={6} maxLength={12000} value={draft} disabled={busy} onChange={e=>setDraft(e.target.value)}/></label>:<div className="answer-options">{q.options.map(option=><button key={option.id} disabled={busy||s.cycle.paused} aria-pressed={draft.split(',').includes(option.id)} onClick={()=>{const multi=['X型题','多选题'].includes(q.type),old=draft.split(',').filter(Boolean);setDraft(multi?(old.includes(option.id)?old.filter(i=>i!==option.id):[...old,option.id]).sort().join(','):option.id)}}>{option.id}. {option.text}</button>)}</div>}<button className="primary" disabled={!draft.trim()||busy||s.cycle.paused} onClick={()=>void change(o=>{
   const at=new Date().toISOString(),id=crypto.randomUUID(),picked=[...new Set(draft.split(',').filter(Boolean))].sort(),score=q.subjective?null:JSON.stringify(picked)===JSON.stringify([...q.answers].sort())?1:0;
   return updateCoachTask({...o,courseAnswers:[...o.courseAnswers,{id,question:q.id,response:draft,score,at,revealed:true,coach:{requirement:task.requirement,kind:task.kind==='learn'?'practice':'retest',closedBook:true,delayedEligible:delayedEligible(data,o,task.requirement,Date.parse(at))}}],courseExposures:[...o.courseExposures,{question:q.id,at}]},{phase:'feedback',response:draft,attemptId:id});
  })}>提交，进入订正</button></div>}
  {isQuestion&&!q&&<div role="status"><p>本条关联题已暂停或缺失，不展示旧答案、不计成绩；草稿随小段保留。</p><button disabled={busy||s.cycle.paused} onClick={()=>void change(o=>advanceCoach(o))}>保留草稿，跳过暂停题</button></div>}
  {task.phase==='feedback'&&q&&<div className="coach-feedback"><h3>{answer?.score===1?'这次闭卷与资料答案一致':q.subjective?'已保存书面作答，逐点核对漏项':'这次有错点，先弄清再继续'}</h3><p>你的作答：{task.response}</p>{!q.subjective&&<p>资料答案：{q.answers.join('、')}</p>}<p className="course-reading">{q.explanation}</p>{q.subjective&&<WrittenAnswerPoints points={q.rubric}/>}<ObjectiveOptionReview review={q.optionReview}/>{q.evidenceLinks?.map((e,i)=><details key={i}><summary>核对教材：{e.citation}</summary><p>{e.quote}</p><SourcePageLinks e={e}/></details>)}<OriginalQuestionRecord original={q.sourceCheck?.original} current={q}/><p className="small muted">{q.reference}。学习题仍待独立教师审定；再次见到本题属于已见题，不是未见题测评。</p>
   {q.subjective&&<label>书面题核对情况<select value={confidence} disabled={busy} onChange={e=>{const value=e.target.value as 'unsure'|'recalled';setConfidence(value);void change(o=>updateCoachTask(o,{writtenConfidence:value}))}}><option value="unsure">有漏项，需要订正</option><option value="recalled">对照基本完整</option></select></label>}
   {(answer?.score!==1&&(!q.subjective||confidence!=='recalled'))&&<label>{q.subjective?'核对后，主要漏项是什么？':'这次主要错在哪里？'}<select value={cause} disabled={busy} onChange={e=>setCause(e.target.value as keyof typeof causeNames)}>{Object.entries(causeNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>}
   <p>{answer?.coach?.delayedEligible&&answer.score===1?'本题通过了间隔至少24小时的闭卷检验；不等于整条能力已掌握。':'本次结果已保存，隔天会再安排闭卷检验；看过解析不算记牢。'}</p>
   {q.subjective&&<p>书面自评只用于安排复习，不自动给分，不增加客观闭卷或隔天答对进度。</p>}
   <button className="primary" disabled={busy||s.cycle.paused} onClick={()=>void change(o=>{
    if(answer?.score===1)return advanceCoach(o);
    if(q.subjective&&confidence==='recalled'){
     const now=new Date().toISOString();return advanceCoach({...o,courseRecall:task.requirement.startsWith('question:')?o.courseRecall:[...o.courseRecall,{id:crypto.randomUUID(),requirement:task.requirement,response:task.response,at:now,confidence:'recalled',nextReviewAt:new Date(Date.parse(now)+86400000).toISOString()}]});
    }
    return updateCoachTask({...o,courseAnswers:o.courseAnswers.map(a=>a.id===task.attemptId?{...a,errorCause:cause}:a)},{phase:'repair'});
   })}>{answer?.score===1?'继续下一步':q.subjective&&confidence==='recalled'?'保存自评，继续下一步':'回看这一条，写下订正'}</button>
  </div>}
  {task.phase==='repair'&&<><p>本次错因：{causeNames[cause]}。只写最需要记住的一点，隔天再合上资料检验。</p><label>我的订正：关键点或鉴别条件<textarea rows={4} value={draft} maxLength={12000} disabled={busy} onChange={e=>setDraft(e.target.value)} placeholder="例如：我漏看了哪条限定？两种方证最关键的区别是什么？"/></label><button className="primary" disabled={busy||!draft.trim()||s.cycle.paused} onClick={()=>void change(o=>{
   const now=new Date().toISOString();return advanceCoach({...o,courseAnswers:o.courseAnswers.map(a=>a.id===task.attemptId?{...a,errorCause:cause,correction:draft,correctionAt:now}:a),courseRecall:task.requirement.startsWith('question:')?o.courseRecall:[...o.courseRecall,{id:crypto.randomUUID(),requirement:task.requirement,response:draft,at:now,confidence:'unsure',nextReviewAt:new Date(Date.parse(now)+86400000).toISOString()}]});
  })}>订正已记下，继续下一步</button></>}
  <button className="text-button coach-park" disabled={busy} onClick={async()=>{
   if(lock.current)return;lock.current=true;try{const ok=await mutate(o=>task.phase==='repair'?{...o,courseAnswers:o.courseAnswers.map(a=>a.id===task.attemptId?{...a,correction:draft,errorCause:cause}:a)}:task.phase==='feedback'&&answer?.score!==1?{...o,courseAnswers:o.courseAnswers.map(a=>a.id===task.attemptId?{...a,errorCause:cause}:a)}:updateCoachTask(o,isRecall?{recallResponse:draft}:isQuestion?{response:draft}:task.phase==='compare'?{recallResponse:draft,confidence}:{}));if(ok)onPark();else setNotice('未保存成功，请保留作答并重试。')}finally{lock.current=false}
  }}>保存小段，先歇一下</button>
 </section>;
}
