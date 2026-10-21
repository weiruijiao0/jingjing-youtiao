import {dayAt,type LearningState} from './learning';
import {courseRoute,validRoute} from './courseRoute';
import type {StudyData} from './RequirementStudy';
import type {OptionReview} from './ObjectiveOptionReview';
import type {OriginalQuestion} from './OriginalQuestionRecord';

export type CoachQuestion={id:string;family:string;classic?:string;chapter?:string;variantGroup?:string;subjective:boolean;type:string;stem:string;options:{id:string;text:string}[];answers:string[];explanation:string;reference:string;rubric?:unknown[];professionalHold?:{reason:string};sourceCheck?:{original:OriginalQuestion};assessmentOnly?:boolean;requirementIds?:string[];budgetMinutes?:number;optionReview?:OptionReview;evidenceLinks?:{source:string;page:number;endPage:number;citation:string;quote:string;note:string;excerptKind?:string}[]};
export type CoachData=StudyData&{questions:CoachQuestion[]};
export const DAY=86400000;
export type CoachTask=NonNullable<LearningState['courseCoach']>['tasks'][number];
export function coachTaskMinutes(kind:CoachTask['kind'],q?:CoachQuestion){return Math.ceil((kind==='learn'?5:2)+(q?(q.budgetMinutes??(q.subjective?8:q.type==='X型题'||q.type==='多选题'?2.5:1.5)):3))}
const time=(value:string)=>Date.parse(value);
const relations=new WeakMap<CoachData,{byRequirement:Map<string,CoachQuestion[]>;eligible:Map<string,CoachQuestion>}>();
function relationIndex(data:CoachData){
 const cached=relations.get(data);if(cached)return cached;
 const heldFamilies=new Set(data.questions.filter(q=>q.professionalHold).map(q=>q.family)),heldVariants=new Set(data.questions.filter(q=>q.professionalHold&&q.variantGroup).map(q=>q.variantGroup));
 const eligible=new Map(data.questions.filter(q=>!q.professionalHold&&!heldFamilies.has(q.family)&&(!q.variantGroup||!heldVariants.has(q.variantGroup))).map(q=>[q.id,q]));
 const byRequirement=new Map<string,CoachQuestion[]>();
 for(const r of data.courses.flatMap(c=>c.requirements)){
  const reading=data.requirementReadings[r.id],guide=data.requirementGuides?.[r.id],ids=new Set([...(guide?.directQuestionIds||[]),...(reading?.questionIds||[]),...(reading?.articleQuestionIds||[])]);
  byRequirement.set(r.id,[...ids].flatMap(id=>eligible.has(id)?[eligible.get(id)!]:[]));
 }
 const index={byRequirement,eligible};relations.set(data,index);return index;
}
export function requirementQuestions(data:CoachData,id:string){
 const index=relationIndex(data);
 if(id.startsWith('question:')){const q=index.eligible.get(id.slice(9));return q?[q]:[]}
 return index.byRequirement.get(id)||[];
}
export function requirementMemory(data:CoachData,s:LearningState,id:string,now:number){
 const questions=requirementQuestions(data,id),ids=new Set(questions.map(q=>q.id));
 const answers=s.courseAnswers.filter(a=>ids.has(a.question)&&time(a.at)<=now).sort((a,b)=>time(a.at)-time(b.at));
 const recalls=s.courseRecall.filter(a=>a.requirement===id&&time(a.at)<=now).sort((a,b)=>time(a.at)-time(b.at));
 const last=answers.at(-1),recall=recalls.at(-1);
 const wrong=answers.filter(a=>a.score===0).at(-1);
 const resetAt=Math.max(wrong?time(wrong.at):-Infinity,recall&&recall.confidence!=='recalled'?time(recall.at):-Infinity);
 const closed=answers.filter(a=>a.coach?.requirement===id&&a.coach.closedBook&&a.score===1&&time(a.at)>resetAt);
 const retained=closed.some(a=>a.coach?.kind==='retest'&&a.coach.delayedEligible);
 // Last material exposure supersedes an old answer for scheduling, but never manufactures a score.
 const lastAt=Math.max(last?time(last.at):-Infinity,last?.correctionAt?time(last.correctionAt):-Infinity,recall?time(recall.at):-Infinity);
 const weak=!!(last?.score===0||recall&&recall.confidence!=='recalled'&&time(recall.at)>= (last?time(last.at):-Infinity));
 const nextAt=Number.isFinite(lastAt)?(!weak&&recall&&time(recall.at)===lastAt?Math.max(lastAt+DAY,time(recall.nextReviewAt)):lastAt+(retained&&!weak?3:1)*DAY):Infinity;
 return {learned:!!(answers.length||recalls.length),closed:closed.length>0,retained,weak,nextAt,lastAt,answers,questions};
}
export function delayedEligible(data:CoachData,s:LearningState,id:string,now:number){
 const memory=requirementMemory(data,s,id,now);
 const task=s.courseCoach?.tasks[s.courseCoach.index];
 const q=data.questions.find(q=>q.id===task?.question);
 const same=new Set(data.questions.filter(item=>q&&(item.family===q.family||q.variantGroup&&item.variantGroup===q.variantGroup)).map(item=>item.id));
 const exposed=s.courseAnswers.some(a=>same.has(a.question)&&time(a.at)>now-DAY);
 // A resumed first-reading session is still a practice session, even when left open overnight.
 return task?.requirement===id&&task.kind!=='learn'&&!exposed&&Number.isFinite(memory.lastAt)&&now-memory.lastAt>=DAY;
}
export function coachOverview(data:CoachData,s:LearningState,now=Date.now()){
 const requirements=data.courses.flatMap(c=>c.requirements.map(r=>({...r,classic:c.classic,chapter:c.title})));
 const states=new Map(requirements.map(r=>[r.id,requirementMemory(data,s,r.id,now)]));
 const bound=new Set([...relationIndex(data).byRequirement.values()].flatMap(qs=>qs.map(q=>q.id))),latest=new Map(s.courseAnswers.filter(a=>time(a.at)<=now).sort((a,b)=>time(a.at)-time(b.at)).map(a=>[a.question,a]));
 const chapterWrong=data.questions.filter(q=>!q.subjective&&!q.professionalHold&&!bound.has(q.id)&&latest.get(q.id)?.score===0).filter(q=>requirementQuestions(data,`question:${q.id}`).length).map(q=>({id:`question:${q.id}`,classic:q.classic||'章节练习',chapter:q.chapter||'',level:'章节错题',page:0,text:`章节错题：${q.stem}`}));
 const official=[...states.values()];for(const r of chapterWrong)states.set(r.id,requirementMemory(data,s,r.id,now));
 return {requirements,states,total:requirements.length,learned:official.filter(m=>m.learned).length,closed:official.filter(m=>m.closed).length,retained:official.filter(m=>m.retained).length,due:[...requirements,...chapterWrong].filter(r=>states.get(r.id)!.nextAt<=now),weak:[...requirements,...chapterWrong].filter(r=>states.get(r.id)!.weak),chapterWrong};
}
export function buildCoachSession(data:CoachData,s:LearningState,minutes:number,now=Date.now()){
 if(s.cycle.paused)throw Error('学习已暂停，请先恢复。');
 if(s.courseCoach&&s.courseCoach.index<s.courseCoach.tasks.length)return s.courseCoach;
 if(s.courseDraft||s.courseRecallDraft?.queue.length||s.courseExams.some(e=>!e.submittedAt))throw Error('先继续或完成已保存的练习、回忆或整卷，再开始今日领学。');
 const budget=Math.min(240,Math.max(20,Math.floor(minutes))),overview=coachOverview(data,s,now);
 const due=overview.due.sort((a,b)=>Number(overview.states.get(b.id)!.weak)-Number(overview.states.get(a.id)!.weak)||overview.states.get(a.id)!.nextAt-overview.states.get(b.id)!.nextAt);
 const route=s.courseSchedule&&validRoute(s.courseSchedule.days,data)?s.courseSchedule.days:courseRoute(data);
 const unseen=route.flatMap(d=>d.requirements).filter(id=>!overview.states.get(id)!.learned);
 // Keep some room for new content when a review backlog is large; sprint prioritizes consolidation.
 const dueIds=due.map(r=>r.id),newSlots=s.courseMode==='sprint'?0:Math.min(1,unseen.length),tasks:CoachTask[]=[];
 const seenFamilies=new Set<string>(),seenVariants=new Set<string>();let used=0;
 let reservedNew:CoachTask|undefined;
 const choose=(id:string)=>{
  const qs=requirementQuestions(data,id).filter(q=>!seenFamilies.has(q.family)&&(!q.variantGroup||!seenVariants.has(q.variantGroup)));
  const answered=new Set(s.courseAnswers.map(a=>a.question));
  const q=qs.sort((a,b)=>Number(a.subjective)-Number(b.subjective)||Number(answered.has(a.id))-Number(answered.has(b.id))||Number(!!b.sourceCheck)-Number(!!a.sourceCheck))[0];
  return q;
 };
 const add=(id:string,kind:CoachTask['kind'],limit:number)=>{
  const q=choose(id),cost=coachTaskMinutes(kind,q);
  if(used+cost>limit||tasks.length>=30-(reservedNew?1:0))return false;
  if(q){seenFamilies.add(q.family);if(q.variantGroup)seenVariants.add(q.variantGroup)}
  tasks.push({id:crypto.randomUUID(),requirement:id,kind,question:q?.id||null,phase:kind==='learn'||!q?'read':'question',response:'',recallResponse:'',confidence:'unsure'});used+=cost;return true;
 };
 // Reserve both the actual cost and a task slot, including longer written items.
 // The reserved item is shown after due work; its family is already excluded.
 if(newSlots&&add(unseen[0],'learn',budget))reservedNew=tasks.pop();
 for(const id of dueIds){if(!add(id,overview.states.get(id)!.weak?'repair':'review',budget))break}
 for(const id of unseen.filter(id=>id!==reservedNew?.requirement)){if(!add(id,'learn',budget))break}
 // Fill any remaining room without displacing the reserved new item.
 for(const id of dueIds.filter(id=>!tasks.some(t=>t.requirement===id))){if(!add(id,overview.states.get(id)!.weak?'repair':'review',budget))break}
 if(reservedNew){const firstLearn=tasks.findIndex(t=>t.kind==='learn');tasks.splice(firstLearn<0?tasks.length:firstLearn,0,reservedNew)}
 if(!tasks.length)return null;
 return {id:crypto.randomUUID(),date:dayAt(new Date(now).toISOString(),s.profile.timezone),minutes:budget,createdAt:new Date(now).toISOString(),index:0,tasks};
}
export function updateCoachTask(s:LearningState,patch:Partial<CoachTask>){
 const session=s.courseCoach;if(!session)return s;
 return {...s,courseCoach:{...session,tasks:session.tasks.map((t,i)=>i===session.index?{...t,...patch}:t)}};
}
export function advanceCoach(s:LearningState){
 const session=s.courseCoach;if(!session)return s;
 return {...updateCoachTask(s,{phase:'done'}),courseCoach:{...session,index:Math.min(session.index+1,session.tasks.length),tasks:session.tasks.map((t,i)=>i===session.index?{...t,phase:'done' as const}:t)}};
}
