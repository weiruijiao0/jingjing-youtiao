import historical from './historical-catalog.cjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {freshState,makeEnvelope,readEnvelope,validateState} from '../src/learning';
import {assembleCourseExam} from '../src/examEngine';
const d=historical.readHistoricalCatalog();
const a=d.questionSourceAudit,bank=new Map<string,any>(d.questions.map((q:any)=>[q.id,q]));
assert.equal(a.checks.length,1052);assert.equal(a.heldQuestionIds.length,631);
assert.equal(a.writtenChecked,41);assert.equal(a.writtenHeld,7);assert.equal(a.writtenRemaining.length,0);
assert.equal(a.writtenChecked+a.writtenHeld+a.writtenRemaining.length,48);
for(const id of a.checks){
 const q=bank.get(id);assert.equal(q.family,q.sourceCheck.original.family);
 assert.deepEqual(q.answers,q.sourceCheck.original.answers);
 assert.equal(q.sourceCheck.independentExpertReview,false);
 if(q.source!=='F0007')assert.equal(q.review,'source-answer-unverified');
 assert.ok(q.reference);
}
const held=new Set(a.heldQuestionIds);
for(const c of d.courses)assert.ok(c.questionIds.every((i:string)=>!held.has(i)));
for(const r of Object.values(d.requirementReadings) as any[])assert.ok([...r.questionIds,...(r.articleQuestionIds||[])].every((i:string)=>!held.has(i)));
const moved=bank.get('3ab86826bc12d202bea254f9171397b73bcc35bd8b21c6169407cb3ea3ad8e07');
assert.match(moved.explanation,/春夏脉沉涩/);assert.equal(moved.chapter,'玉机真脏论篇第十九');
assert.deepEqual(moved.requirementIds,['K0580']);
assert.ok(d.courses.find((c:any)=>c.title===moved.chapter).questionIds.includes(moved.id));
assert.ok(!d.courses.find((c:any)=>c.title==='脉要精微论篇第十七').questionIds.includes(moved.id));
const rush=bank.get('a1392cf04c022d65d1d349c384958830d4517477ff578f2329d14d531a268954');
assert.match(rush.explanation,/治宜温通心阳、平冲降逆/);assert.ok(!rush.explanation.includes('治宜温通心阴'));
assert.equal(rush.evidenceLinks.length,6);
const hyp=bank.get('2128e235002efccc80f736f6dfc4ea2a8c33abc281346b6417b8d8d96a93da55');
assert.match(hyp.explanation,/阴指脾胃、虚指气虚/);
// The final 22 have traceable evidence and non-official self-check points.
assert.equal(a.latestBatch.questionIds.length,22);assert.equal(a.latestBatch.syllabusAdaptedIds.length,3);
for(const id of a.latestBatch.questionIds){
 const q=bank.get(id);assert.ok(q.subjective&&q.rubric.length>=3&&q.evidenceLinks.length);
 assert.equal(q.sourceCheck.fullRequirementAbilityVerified,false);
 assert.equal(q.sourceCheck.rubricStatus,'textbook-comparison-only');
 assert.ok(q.requirementIds.every((rid:string)=>d.requirementReadings[rid].questionIds.includes(id)));
 assert.ok(q.evidenceLinks.every((e:any)=>e.source==='F0007'&&e.endPage>=e.page));
}
const dates=bank.get('30dcf24c258b8db1e003e5b47f6159c45d895cbb1f747acb751da1e31733de15');
assert.match(dates.explanation,/各别捣为散/);assert.match(dates.explanation,/并非把四药一并煎煮/);assert.match(dates.explanation,/表解者乃可攻之/);
const soup=bank.get('1ded65375b712eef0462e7e2ad1e0a81a0f9c60f0dac9174202ac614bb942863');
assert.ok(soup.explanation.indexOf('先煮大黄')<soup.explanation.indexOf('再内芒硝'));
assert.ok(soup.explanation.indexOf('再内芒硝')<soup.explanation.indexOf('然后内甘遂末'));
assert.match(bank.get('19e335821b52d802389ff204d75cdadec7547a3c69872cb156dbf79a9a24c8cf').explanation,/可以相兼/);
assert.deepEqual(bank.get(a.latestBatch.syllabusAdaptedIds[0]).requirementIds,['K0680','K0260']);
for(const id of a.latestBatch.syllabusAdaptedIds.slice(1)){
 assert.deepEqual(bank.get(id).requirementIds,['K0059']);assert.equal(bank.get(id).evidenceLinks[0].page,105);
}
for(const id of a.latestBatch.syllabusAdaptedIds)assert.notEqual(bank.get(id).stem,bank.get(id).sourceCheck.original.stem);
for(let seed=0;seed<20;seed++)assert.ok(assembleCourseExam(d.questions,freshState(),()=>seed/20).questionIds.every(i=>!held.has(i)));
// Eligibility must survive accidental reclassification and a copied same-family variant.
const original=bank.get(a.heldQuestionIds[0]),copy={...original,id:'held-family-copy',type:'A1型题',professionalHold:undefined};
assert.ok(!assembleCourseExam([copy,...d.questions],freshState(),()=>0).questionIds.includes(copy.id));
const state=freshState(),now=new Date().toISOString();state.courseDraft={question:original.id,response:'保留旧草稿'};
state.courseAnswers=[{id:'old-answer',question:original.id,response:'保留历史作答',score:null,at:now,revealed:true}];
state.courseExams=[{id:'old-exam',questionIds:[original.id],responses:{[original.id]:'保留卷内草稿'},startedAt:now,submittedAt:null}];
const restored=validateState(await readEnvelope(await makeEnvelope(state),'archive'));
assert.deepEqual(restored.courseDraft,state.courseDraft);assert.deepEqual(restored.courseAnswers,state.courseAnswers);assert.deepEqual(restored.courseExams,state.courseExams);
console.log('Source corrections, scope exclusions, moved chapter, family continuity, new exam eligibility and preserved old records passed');
