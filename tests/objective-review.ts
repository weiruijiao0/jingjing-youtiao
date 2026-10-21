import historical from './historical-catalog.cjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {freshState,makeEnvelope,readEnvelope,validateState} from '../src/learning';
import {assembleCourseExam,examObjectiveScore} from '../src/examEngine';
import {scoreCourse} from '../src/Course';
const d=historical.readHistoricalCatalog();
const bank=new Map<string,any>(d.questions.map((q:any)=>[q.id,q])),a=d.questionSourceAudit.objectiveBatch;
assert.equal(a.questionIds.length,33);assert.equal(a.checkedQuestionIds.length,29);assert.equal(a.heldQuestionIds.length,4);
assert.equal(new Set(a.questionIds).size,33);
for(const id of a.checkedQuestionIds){
 const q=bank.get(id),original=q.sourceCheck.original;
 assert.equal(q.subjective,false);assert.equal(q.sourceCheck.batch,'objective-33');
 assert.deepEqual(q.answers,original.answers);assert.equal(q.family,original.family);
 assert.equal(q.review,'source-answer-unverified');
 assert.equal(q.sourceCheck.independentExpertReview,false);assert.equal(q.sourceCheck.examCalibration,false);assert.equal(q.sourceCheck.fullRequirementAbilityVerified,false);
 assert.deepEqual(Object.keys(q.optionReview).sort(),q.options.map((o:any)=>o.id).sort());
 for(const [letter,item] of Object.entries(q.optionReview) as [string,any][]){assert.equal(item.selected,q.answers.includes(letter));assert.ok(item.reason.trim())}
 assert.ok(q.evidenceLinks.every((e:any)=>e.source==='F0007'&&e.page<=e.endPage));
 assert.ok(q.requirementIds.length&&q.requirementIds.every((rid:string)=>d.requirementReadings[rid].questionIds.includes(id)));
 assert.equal(examObjectiveScore(q,q.answers.join(',')),1);
 assert.equal(examObjectiveScore(q,''),0);
}
for(const id of a.heldQuestionIds){
 const q=bank.get(id);assert.ok(q.professionalHold.reason);assert.deepEqual(q.answers,q.professionalHold.original.answers);
 assert.equal(examObjectiveScore(q,q.answers.join(',')),null);assert.equal(scoreCourse(q,q.answers.join(',')),null);
 assert.ok(!d.courses.some((c:any)=>c.questionIds.includes(id)));
 assert.ok(!Object.values(d.requirementReadings).some((r:any)=>[...r.questionIds,...r.articleQuestionIds].includes(id)));
}
const take=(prefix:string)=>[...bank.values()].find(q=>q.id.startsWith(prefix));
assert.match(take('e5dac').stem,/上冲心胸及胃脘/);assert.ok(!take('e5dac').stem.includes('从背'));
assert.match(take('652644').stem,/误下后的变证/);assert.match(take('652644').options[3].text,/误下/);
assert.match(take('d23cd').options[2].text,/不清热安蛔/);
assert.match(take('227adf').stem,/373/);assert.ok(d.requirementReadings.K0444.questionIds.includes(take('227adf').id));
assert.match(take('3af175').optionReview.A.reason,/不把邪热说成阳虚/);
for(const prefix of ['015cb','c4dd8']){assert.match(take(prefix).stem,/肺热叶焦/);assert.notDeepEqual(take(prefix).options,take(prefix).sourceCheck.original.options)}
const state=freshState(),held=take('69da8048'),now=new Date().toISOString();
state.courseAnswers=[{id:'history-grade',question:held.id,response:held.answers.join(','),score:1,at:now,revealed:true}];
state.courseDraft={question:held.id,response:'A'};
state.courseExams=[{id:'historic-objective',questionIds:[held.id],responses:{[held.id]:'A'},startedAt:now,submittedAt:now}];
const restored=validateState(await readEnvelope(await makeEnvelope(state),'archive'));
assert.deepEqual(restored.courseAnswers,state.courseAnswers);assert.deepEqual(restored.courseDraft,state.courseDraft);assert.deepEqual(restored.courseExams,state.courseExams);
for(let seed=0;seed<20;seed++){
 const exam=assembleCourseExam(d.questions,freshState(),()=>seed/20);
 assert.equal(exam.missing.length,0);assert.equal(exam.questionIds.length,91);
 assert.ok(exam.questionIds.every(id=>!bank.get(id).professionalHold));
}
console.log('33 objective decisions: source/option traceability, scope conditions, held grading, exam exclusion and old score preservation passed');
