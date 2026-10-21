import historical from './historical-catalog.cjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assembleCourseExam,examObjectiveScore} from '../src/examEngine';
import {freshState,validateState,readEnvelope,makeEnvelope} from '../src/learning';
import {scoreCourse} from '../src/Course';
const d=historical.readHistoricalCatalog();
const bank=new Map<string,any>(d.questions.map((q:any)=>[q.id,q])),a=d.questionSourceAudit,b=a.yangmingBatch;
assert.equal(a.checks.length,1052);assert.equal(a.heldQuestionIds.length,631);
assert.equal(b.questionIds.length,44);assert.equal(new Set(b.questionIds).size,44);
assert.equal(b.checkedQuestionIds.length,32);assert.equal(b.heldQuestionIds.length,12);
const partitions=[...b.questionIds,...b.pendingAfterBatchQuestionIds];
assert.equal(partitions.length,100);assert.equal(new Set(partitions).size,100);
assert.deepEqual([...partitions].sort(),[...b.frozenChapterQuestionIds].sort());
assert.equal(b.pendingChapterQuestionIds.length,0);for(const id of b.pendingAfterBatchQuestionIds){const q=bank.get(id);assert.ok(!q.subjective&&(q.sourceCheck||q.professionalHold));assert.ok(a.yangmingCompletionBatch.questionIds.includes(id))}
for(const id of b.checkedQuestionIds){
 const q=bank.get(id);assert.equal(q.sourceCheck.batch,'yangming-44');assert.equal(q.sourceCheck.status,'single-source-comparison');
 assert.equal(q.review,'source-answer-unverified');assert.ok(!q.professionalHold);
 assert.deepEqual(q.answers,q.sourceCheck.original.answers);assert.equal(q.family,q.sourceCheck.original.family);
 assert.equal(q.sourceCheck.independentExpertReview,false);assert.equal(q.sourceCheck.examCalibration,false);assert.equal(q.sourceCheck.fullRequirementAbilityVerified,false);
 assert.deepEqual(Object.keys(q.optionReview).sort(),q.options.map((o:any)=>o.id).sort());
 for(const [key,r] of Object.entries(q.optionReview) as [string,any][]){assert.equal(r.selected,q.answers.includes(key));assert.ok(r.reason.trim())}
 assert.ok(q.requirementIds.every((rid:string)=>d.requirementReadings[rid].questionIds.includes(id)&&d.requirementGuides[rid].directQuestionIds.includes(id)));
 assert.equal(scoreCourse(q,q.answers.join(',')),1);assert.equal(examObjectiveScore(q,q.answers.join(',')),1);
}
for(const [page,hash] of Object.entries(b.sourceImageSha256))assert.equal(createHash('sha256').update(readFileSync(`public/library/F0007/${page.padStart(4,'0')}.jpg`)).digest('hex'),hash);
const get=(prefix:string)=>{const found=[...bank.values()].filter(q=>q.id.startsWith(prefix));assert.equal(found.length,1);return found[0]};
assert.equal(get('cf834').sourceCheck.original.options[1].text,'大下后，六七日不大便，烦不解，腹满痛者');assert.equal(get('cf834').options[1].text,'发汗不解，腹满痛者，急下之');
assert.match(get('cf834').optionReview.B.reason,/254.*241/);
assert.match(get('b86d9').professionalHold.reason,/两个未列项/);
assert.match(get('2614c').options[2].text,/热结旁流/);assert.equal(get('2614c').options[0].text,'手足濈然汗出');
assert.match(get('d3105').options[4].text,/燥屎.*大便.*腹部/);assert.match(get('d3105').explanation,/纯津伤|津伤/);
assert.match(get('49a93').explanation,/不等于一定用大承气/);
assert.match(get('a1663').explanation,/同煮符合208小承气.*上三味/);assert.match(get('5df15').explanation,/得下余勿服/);
assert.match(get('211c4').optionReview.E.reason,/蜜和丸/);
assert.match(get('525a5').explanation,/必须有可下证/);assert.match(get('d72d6').explanation,/229明确.*大便溏/);
assert.match(get('edd93').optionReview.A.reason,/旧泛称本可相容/);
for(const id of b.heldQuestionIds){
 const q=bank.get(id);assert.equal(q.professionalHold.batch,'yangming-44');assert.ok(!q.sourceCheck);
 assert.deepEqual(q.answers,q.professionalHold.original.answers);assert.equal(q.family,q.professionalHold.original.family);
 assert.equal(scoreCourse(q,q.answers.join(',')),null);assert.equal(examObjectiveScore(q,q.answers.join(',')),null);
 assert.ok(d.courses.every((c:any)=>!c.questionIds.includes(id)));
 assert.ok(Object.values(d.requirementGuides).every((g:any)=>!g.directQuestionIds.includes(id)));
 assert.ok(Object.values(d.requirementReadings).every((r:any)=>![...r.questionIds,...(r.articleQuestionIds||[])].includes(id)));
}
assert.equal(Object.keys(b.variantGroups).length,2);
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
const old=freshState(),id=get('b86d9').id,now=new Date().toISOString();
old.courseDraft={question:id,response:'D'};old.courseAnswers=[{id:'old-graded-held',question:id,response:'D',score:1,at:now,revealed:true}];
old.courseExams=[{id:'old-submitted',questionIds:[id],responses:{[id]:'D'},startedAt:now,submittedAt:now}];
const restored=validateState(await readEnvelope(await makeEnvelope(old),'archive'));
assert.deepEqual(restored.courseAnswers,old.courseAnswers);assert.deepEqual(restored.courseExams,old.courseExams);assert.deepEqual(restored.courseDraft,old.courseDraft);
console.log('44 Yangming dispositions: 32 comparisons, 12 exclusions, 56 subsequent dispositions retained, scope/ambiguity/contraindication regressions, old records, source images, variants and 91-item assembly passed');
