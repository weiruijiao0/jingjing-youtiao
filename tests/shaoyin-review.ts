import historical from './historical-catalog.cjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assembleCourseExam,examObjectiveScore} from '../src/examEngine';
import {freshState,validateState,readEnvelope,makeEnvelope} from '../src/learning';
import {scoreCourse} from '../src/Course';
const d=historical.readHistoricalCatalog();
const bank=new Map<string,any>(d.questions.map((q:any)=>[q.id,q])),a=d.questionSourceAudit,b=a.shaoyinBatch;
assert.equal(a.checks.length,1052);assert.equal(a.heldQuestionIds.length,631);
assert.equal(b.questionIds.length,42);assert.equal(new Set(b.questionIds).size,42);
assert.equal(b.checkedQuestionIds.length,37);assert.equal(b.heldQuestionIds.length,5);
for(const id of b.checkedQuestionIds){
 const q=bank.get(id);assert.equal(q.sourceCheck.batch,'shaoyin-42');assert.equal(q.sourceCheck.status,'single-source-comparison');
 assert.equal(q.review,'source-answer-unverified');assert.ok(!q.professionalHold);
 assert.deepEqual(q.answers,q.sourceCheck.original.answers);assert.equal(q.family,q.sourceCheck.original.family);
 assert.equal(q.sourceCheck.independentExpertReview,false);assert.equal(q.sourceCheck.examCalibration,false);assert.equal(q.sourceCheck.fullRequirementAbilityVerified,false);
 assert.deepEqual(Object.keys(q.optionReview).sort(),q.options.map((o:any)=>o.id).sort());
 for(const [key,r] of Object.entries(q.optionReview) as [string,any][]){assert.equal(r.selected,q.answers.includes(key));assert.ok(r.reason.trim())}
 assert.ok(q.requirementIds.every((rid:string)=>d.requirementReadings[rid].questionIds.includes(id)&&d.requirementGuides[rid].directQuestionIds.includes(id)));
}
for(const [page,hash] of Object.entries(b.sourceImageSha256))assert.equal(createHash('sha256').update(readFileSync(`public/library/F0007/${page.padStart(4,'0')}.jpg`)).digest('hex'),hash);
const get=(prefix:string)=>[...bank.values()].find(q=>q.id.startsWith(prefix));
assert.match(get('61fe').stem,/312.*少少含咽/);assert.match(get('61fe').optionReview.D.reason,/313.*少少咽/);
assert.match(get('e84').options[3].text,/连黄/);assert.match(get('e84').explanation,/原D.*不能直接当作错误/);
assert.match(get('b8e').optionReview.C.reason,/泛称可相容/);assert.match(get('709').explanation,/原B.*不是必然错误/);
assert.match(get('bba4').explanation,/219三阳合病/);assert.match(get('bba4').optionReview.E.reason,/阳郁经气壅滞/);
assert.match(get('d97d117724').professionalHold.reason,/桃花汤.*虚寒/);
assert.match(get('244').stem,/或.*列表/);assert.match(get('244').optionReview.B.reason,/前段也有自下利/);
for(const prefix of ['e912','719','7fe','0cfc','bc99','38a'])assert.ok(get(prefix).sourceCheck.original.stem!==get(prefix).stem);
for(const id of b.heldQuestionIds){
 const q=bank.get(id);assert.equal(q.professionalHold.batch,'shaoyin-42');assert.ok(!q.sourceCheck);
 assert.deepEqual(q.answers,q.professionalHold.original.answers);assert.equal(q.family,q.professionalHold.original.family);
 assert.equal(scoreCourse(q,q.answers.join(',')),null);assert.equal(examObjectiveScore(q,q.answers.join(',')),null);
 assert.ok(d.courses.every((c:any)=>!c.questionIds.includes(id)));
 assert.ok(Object.values(d.requirementGuides).every((g:any)=>!g.directQuestionIds.includes(id)));
 assert.ok(Object.values(d.requirementReadings).every((r:any)=>![...r.questionIds,...(r.articleQuestionIds||[])].includes(id)));
}
assert.equal(Object.keys(b.variantGroups).length,3);
for(let seed=0;seed<40;seed++){
 const e=assembleCourseExam(d.questions,freshState(),()=>seed/40);assert.equal(e.questionIds.length,91);assert.equal(e.missing.length,0);
 assert.ok(e.questionIds.every(id=>!a.heldQuestionIds.includes(id)));
 const groups=e.questionIds.map(id=>bank.get(id).variantGroup).filter(Boolean);assert.equal(groups.length,new Set(groups).size);
}
for(const ids of Object.values(b.variantGroups) as string[][]){
 const s=freshState();s.courseExposures=[{question:ids[0],at:new Date().toISOString()}];
 assert.ok(assembleCourseExam(d.questions,s,()=>0.5).questionIds.every(id=>!ids.includes(id)));
 s.courseExposures=[];s.courseDraft={question:ids[0],response:'A'};
 assert.ok(assembleCourseExam(d.questions,s,()=>0.5).questionIds.every(id=>!ids.includes(id)));
}
// Every pending old objective question in this chapter was dispositioned.
assert.ok(d.questions.filter((q:any)=>q.classic==='伤寒论'&&q.chapter==='少阴'&&!q.subjective&&q.review==='source-answer-unverified').every((q:any)=>q.sourceCheck||q.professionalHold));
const old=freshState(),id=b.heldQuestionIds[4],now=new Date().toISOString();
old.courseDraft={question:id,response:'B,C,D'};old.courseAnswers=[{id:'old-graded-held',question:id,response:'B,C,D',score:1,at:now,revealed:true}];
old.courseExams=[{id:'old-submitted',questionIds:[id],responses:{[id]:'B,C,D'},startedAt:now,submittedAt:now}];
assert.deepEqual(validateState(await readEnvelope(await makeEnvelope(old),'archive')).courseAnswers,old.courseAnswers);
console.log('42 Shaoyin dispositions: 37 comparisons, five exclusions, source images, clinical wording, ambiguity regressions, three variant groups, old records and 91-item assembly passed');
