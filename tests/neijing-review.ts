import historical from './historical-catalog.cjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assembleCourseExam} from '../src/examEngine';
import {freshState} from '../src/learning';
const d=historical.readHistoricalCatalog();
const bank=new Map<string,any>(d.questions.map((q:any)=>[q.id,q])),batch=d.questionSourceAudit.neijingBatch;
assert.equal(batch.questionIds.length,32);assert.equal(new Set(batch.questionIds).size,32);
assert.equal(d.questionSourceAudit.checks.length,1052);assert.equal(d.questionSourceAudit.heldQuestionIds.length,631);
for(const id of batch.questionIds){
 const q=bank.get(id);assert.equal(q.sourceCheck.batch,'neijing-32');assert.equal(q.review,'source-answer-unverified');
 assert.deepEqual(q.answers,q.sourceCheck.original.answers);assert.equal(q.family,q.sourceCheck.original.family);
 assert.equal(q.sourceCheck.independentExpertReview,false);assert.equal(q.sourceCheck.examCalibration,false);assert.equal(q.sourceCheck.fullRequirementAbilityVerified,false);
 assert.equal(q.subjective,false);assert.ok(!q.professionalHold);
 assert.deepEqual(Object.keys(q.optionReview).sort(),q.options.map((o:any)=>o.id).sort());
 for(const [key,value] of Object.entries(q.optionReview) as [string,any][]){assert.equal(value.selected,q.answers.includes(key));assert.ok(value.reason)}
 assert.ok(q.requirementIds.every((rid:string)=>d.requirementReadings[rid].questionIds.includes(id)));
 assert.ok(q.evidenceLinks.every((e:any)=>e.source==='F0007'&&e.endPage>=e.page));
}
const get=(prefix:string)=>[...bank.values()].find(q=>q.id.startsWith(prefix));
assert.match(get('286dd').stem,/六腑者.*之后直接/);assert.match(get('286dd').optionReview.B.reason,/确有此表述/);
assert.match(get('b1d409').explanation,/最高超的医疗技术/);assert.notEqual(get('b1d409').options[1].text,'高妙的医疗技术');
assert.match(get('3d086').explanation,/《太素》必察其上下/);
assert.match(get('611377').optionReview.D.reason,/不判其.*一概错误/);
assert.match(get('29388').stem,/不是.*直接列出/);
assert.match(get('5c3da').explanation,/不是完全禁止胃肠正常充实/);
assert.equal(get('d998').optionReview.B.selected,true);assert.equal(get('265926').optionReview.B.selected,false);
assert.match(get('cf901').stem,/原文对举/);assert.match(get('cf901').optionReview.E.reason,/不据此否认/);
assert.equal(get('b6eb0').options[1].text,'因其重而减之');assert.match(get('a4eb7').explanation,/不从本句推出现实所有气虚/);
assert.equal(Object.keys(batch.variantGroups).length,5);
for(let seed=0;seed<40;seed++){
 const exam=assembleCourseExam(d.questions,freshState(),()=>seed/40);assert.equal(exam.missing.length,0);assert.equal(exam.questionIds.length,91);
 const groups=exam.questionIds.map(id=>bank.get(id).variantGroup).filter(Boolean);assert.equal(groups.length,new Set(groups).size);
}
// A seen member blocks the other source variants even when old family IDs differ.
for(const ids of Object.values(batch.variantGroups) as string[][]){
 const s=freshState();s.courseExposures=[{question:ids[0],at:new Date().toISOString()}];
 assert.ok(assembleCourseExam(d.questions,s,()=>0.4).questionIds.every(id=>!ids.includes(id)));
 s.courseExposures=[];s.courseDraft={question:ids[0],response:'A'};
 assert.ok(assembleCourseExam(d.questions,s,()=>0.4).questionIds.every(id=>!ids.includes(id)));
}
console.log('32 Neijing comparisons: scope/wording regressions, unchanged identities/keys, complete reasons, five variant exclusions and 91-item assembly passed');
