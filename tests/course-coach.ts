import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {freshState,validateState,makeEnvelope,readEnvelope,mergeRestore,restartLearning} from '../src/learning';
import {buildCoachSession,coachOverview,coachTaskMinutes,requirementMemory,requirementQuestions,delayedEligible,advanceCoach,DAY,type CoachData} from '../src/courseCoach';
const data:CoachData=JSON.parse(readFileSync('public/course/catalog.json','utf8'));
const now=Date.parse('2026-10-05T00:00:10Z'),stamp=(n:number)=>new Date(n).toISOString();
const s=freshState(stamp(now));s.profile.timezone='Asia/Shanghai';
const q=data.questions.find(q=>q.id.startsWith('78e5b'))!,rid='K0163';
assert.ok(requirementQuestions(data,rid).some(item=>item.id===q.id));
assert.equal(coachOverview(data,s,now).total,712);assert.equal(coachOverview(data,s,now).retained,0);
// An old score, a written answer or a self-rating never becomes closed-book or delayed evidence.
s.courseAnswers=[{id:'old',question:q.id,response:'B,D',score:1,at:stamp(now-2*DAY),revealed:true}];
let m=requirementMemory(data,s,rid,now);assert.ok(m.learned);assert.ok(!m.closed&&!m.retained);
s.courseRecall=[{id:'self',requirement:rid,response:'回忆',confidence:'recalled',at:stamp(now-2*DAY),nextReviewAt:stamp(now-DAY)}];
assert.ok(!requirementMemory(data,s,rid,now).retained);
const session=buildCoachSession(data,s,20,now)!;assert.equal(session.tasks[0].requirement,rid);assert.equal(session.tasks[0].phase,'question');
s.courseCoach=session;assert.equal(buildCoachSession(data,s,240,now)?.id,session.id);assert.ok(delayedEligible(data,s,rid,now));
const correct={id:'closed',question:q.id,response:'B,D',score:1,at:stamp(now-1000),revealed:true,coach:{requirement:rid,kind:'practice' as const,closedBook:true,delayedEligible:false}};
s.courseAnswers.push(correct);m=requirementMemory(data,s,rid,now);assert.ok(m.closed&&!m.retained);assert.ok(!delayedEligible(data,s,rid,now));
assert.ok(delayedEligible(data,s,rid,now+DAY));
s.courseAnswers.push({...correct,id:'retained',at:stamp(now+DAY),coach:{...correct.coach,kind:'retest',delayedEligible:true}});
m=requirementMemory(data,s,rid,now+DAY);assert.ok(m.closed&&m.retained);
// A later error invalidates older success; instant correction does not recreate retained evidence.
s.courseAnswers.push({...correct,id:'wrong',score:0,at:stamp(now+DAY+1)});m=requirementMemory(data,s,rid,now+DAY+2);assert.ok(m.weak&&!m.closed&&!m.retained);
s.courseAnswers.push({...correct,id:'same-day-correction',at:stamp(now+DAY+3)});m=requirementMemory(data,s,rid,now+DAY+4);assert.ok(m.closed&&!m.retained);
// Midnight alone is insufficient: require a full 24 hours, and new learning is never a retest.
assert.ok(!delayedEligible(data,s,rid,now+DAY+100));s.courseCoach.tasks[0].kind='learn';assert.ok(!delayedEligible(data,s,rid,now+3*DAY));
// Recent exposure to the same variant/family outside this requirement blocks delayed evidence too.
const sibling={...q,id:'same-family-other',requirementIds:[]};const variantData={...data,questions:[...data.questions,sibling]};
s.courseCoach.tasks[0].kind='review';s.courseCoach.tasks[0].question=q.id;
s.courseAnswers.push({...correct,id:'outside',question:sibling.id,at:stamp(now+2*DAY)});assert.ok(!delayedEligible(variantData,s,rid,now+2*DAY+10));
// Wrong answers take tomorrow priority even when an older self-rating had a 7-day interval.
const weak=freshState(stamp(now));weak.courseRecall=[{id:'long',requirement:rid,response:'旧回忆',confidence:'recalled',at:stamp(now-2*DAY),nextReviewAt:stamp(now+5*DAY)}];
weak.courseAnswers=[{...correct,id:'weak',score:0,at:stamp(now-DAY-1)}];
assert.ok(requirementMemory(data,weak,rid,now).nextAt<=now);assert.equal(buildCoachSession(data,weak,20,now)!.tasks[0].requirement,rid);
const unbound={...q,id:'unbound-question',family:'unbound-family'},chapterData={...data,questions:[...data.questions,unbound]};
const chapter=freshState(stamp(now));chapter.courseAnswers=[{...correct,id:'chapter-wrong',question:unbound.id,score:0,at:stamp(now-DAY-1)}];
assert.equal(coachOverview(chapterData,chapter,now).learned,0);assert.equal(buildCoachSession(chapterData,chapter,20,now)!.tasks[0].requirement,`question:${unbound.id}`);
chapter.courseAnswers[0].correctionAt=stamp(now);assert.ok(!coachOverview(chapterData,chapter,now).due.length);assert.equal(coachOverview(chapterData,chapter,now+DAY).due[0].id,`question:${unbound.id}`);
for(const minutes of [20,40,60,120,240]){
 const plan=buildCoachSession(data,weak,minutes,now)!;assert.ok(plan.tasks.length);
 assert.ok(plan.tasks.reduce((n,t)=>n+coachTaskMinutes(t.kind,data.questions.find(q=>q.id===t.question)),0)<=minutes);
 assert.equal(plan.tasks.length,new Set(plan.tasks.map(t=>t.requirement)).size);
 const qs=plan.tasks.flatMap(t=>t.question?[data.questions.find(q=>q.id===t.question)!]:[]);
 assert.equal(qs.length,new Set(qs.map(q=>q.family)).size);assert.ok(qs.every(q=>!q.professionalHold));
 assert.ok(plan.tasks.some(t=>t.kind==='learn'),'Review backlog must leave some new-content room');
}
const old:any=structuredClone(freshState());delete old.courseCoach;assert.equal(validateState(old).courseCoach,null);
weak.courseCoach=buildCoachSession(data,weak,20,now);weak.courseCoach!.tasks[0].response='A';
const copy=validateState(await readEnvelope(await makeEnvelope(weak),'archive'));assert.deepEqual(copy.courseCoach,weak.courseCoach);assert.deepEqual(copy.courseAnswers,weak.courseAnswers);
assert.equal(mergeRestore(weak,copy).courseAnswers.length,weak.courseAnswers.length);assert.deepEqual(mergeRestore(weak,copy).courseCoach,weak.courseCoach);
assert.equal(restartLearning(weak,'guided',stamp(now)).courseCoach,null);assert.deepEqual(restartLearning(weak,'sprint',stamp(now)).courseCoach,weak.courseCoach);
assert.equal(advanceCoach(weak).courseCoach!.index,1);assert.equal(advanceCoach(weak).courseCoach!.tasks[0].phase,'done');
const bad=structuredClone(weak);bad.courseCoach!.index=99;assert.throws(()=>validateState(bad),/超出任务范围/);
const draft=freshState();draft.courseDraft={question:q.id,response:'A'};assert.throws(()=>buildCoachSession(data,draft,20,now),/已保存/);draft.courseDraft=null;draft.cycle.paused=true;assert.throws(()=>buildCoachSession(data,draft,20,now),/暂停/);
const held=structuredClone(data);held.questions.find(item=>item.id===q.id)!.professionalHold={reason:'test hold'};assert.ok(!requirementQuestions(held,rid).some(item=>item.id===q.id));
console.log('Coach scheduling, budget, backlog/new balance, historical evidence limits, 24h retest, error reset, family exposure, hold exclusions, archive/restart/draft safety passed');
