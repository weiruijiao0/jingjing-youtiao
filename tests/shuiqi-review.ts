import historical from './historical-catalog.cjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assembleCourseExam,examObjectiveScore} from '../src/examEngine';
import {scoreCourse} from '../src/Course';
import {freshState,makeEnvelope,readEnvelope,validateState} from '../src/learning';
const d=historical.readHistoricalCatalog();
const a=d.questionSourceAudit,b=a.shuiqiBatch,bank=new Map<string,any>(d.questions.map((q:any)=>[q.id,q]));
const beforeBytes=readFileSync('../../../work/shuiqi-before-oct04-catalog.json');
const before=JSON.parse(beforeBytes.toString('utf8'));
const frozen=JSON.parse(readFileSync('../../../work/shuiqi-oct04-targets.json','utf8'));
assert.equal(frozen.catalogSha256,createHash('sha256').update(beforeBytes).digest('hex'));
assert.equal(d.questions.length,2417);assert.equal(bank.size,2417);assert.equal(a.checks.length,1052);assert.equal(a.heldQuestionIds.length,631);
assert.equal(b.questionIds.length,28);assert.equal(b.checkedQuestionIds.length,11);assert.equal(b.heldQuestionIds.length,17);assert.equal(b.repairQuestionIds.length,2);
assert.deepEqual(b.pendingChapterQuestionIds,[]);
assert.deepEqual([...b.checkedQuestionIds,...b.heldQuestionIds].sort(),frozen.questions.map((q:any)=>q.id).sort());
assert.equal(new Set([...b.checkedQuestionIds,...b.heldQuestionIds]).size,28);
for(const q of before.questions)if(!b.questionIds.includes(q.id)&&!a.all1099Batch.questionIds.includes(q.id)&&!d.authoredQuestionReviewAudit.questionIds.includes(q.id))assert.deepEqual(bank.get(q.id),q);
assert.deepEqual(d.questions.filter((q:any)=>!before.questions.some((p:any)=>p.id===q.id)).map((q:any)=>q.id),[...b.repairQuestionIds,...a.all1099Batch.repairQuestionIds,...a.all1099Batch.caseQuestionIds]);
for(const o of frozen.questions){
 const q=bank.get(o.id),decision=q.sourceCheck||q.professionalHold;
 assert.equal(q.review,'source-answer-unverified');assert.deepEqual(q.answers,o.answers);assert.equal(q.family,o.family);
 for(const k of ['stem','options','answers','explanation','reference','chapter','classic','family'])assert.deepEqual(decision.original[k],o[k]);
}
for(const id of [...b.checkedQuestionIds,...b.repairQuestionIds]){
 const q=bank.get(id),flag=q.sourceCheck||q;assert.ok(!q.professionalHold);
 for(const k of ['independentExpertReview','examCalibration','fullRequirementAbilityVerified'])assert.equal(flag[k],false);
 assert.deepEqual(Object.keys(q.optionReview).sort(),q.options.map((o:any)=>o.id).sort());
 for(const [key,r] of Object.entries(q.optionReview) as [string,any][]){assert.equal(r.selected,q.answers.includes(key));assert.ok(r.reason)}
 for(const rid of q.requirementIds){assert.ok(d.requirementGuides[rid].directQuestionIds.includes(id));assert.ok(d.requirementReadings[rid].questionIds.includes(id))}
 if(q.subjective)assert.equal(scoreCourse(q,'written response'),null);else {assert.equal(scoreCourse(q,q.answers.join(',')),1);if(q.answers.length>1)assert.equal(scoreCourse(q,q.answers[0]),0);}
 assert.ok(q.evidenceLinks.length);
}
for(const id of b.heldQuestionIds){
 const q=bank.get(id);assert.equal(q.professionalHold.batch,'shuiqi-28');assert.ok(!q.sourceCheck);
 assert.equal(scoreCourse(q,q.answers.join(',')),null);assert.equal(examObjectiveScore(q,q.answers.join(',')),null);
 assert.deepEqual(q.requirementIds,[]);assert.ok(d.courses.every((c:any)=>!c.questionIds.includes(id)));
 assert.ok(Object.values(d.requirementGuides).every((g:any)=>!g.directQuestionIds.includes(id)));
 assert.ok(Object.values(d.requirementReadings).every((r:any)=>![...r.questionIds,...(r.articleQuestionIds||[])].includes(id)));
}
for(const [file,hash] of Object.entries(b.sourceFileSha256))assert.equal(createHash('sha256').update(readFileSync(`public/${file}`)).digest('hex'),hash);
const get=(prefix:string)=>{const qs=[...bank.values()].filter(q=>q.id.startsWith(prefix));assert.equal(qs.length,1);return qs[0]};

assert.match(get('7fc773df').explanation,/旧解析.*发汗.*不符/);
assert.match(get('65b6fa8b').stem,/不把单个症状/);
assert.match(get('7d933821').professionalHold.reason,/原BC.*排除/);
assert.match(get('ed7428fb').professionalHold.reason,/浮肿.*互斥/);
assert.match(get('3807c810').professionalHold.reason,/风水加术/);
assert.match(get('694bed08').professionalHold.reason,/并非互斥/);
assert.match(get('ba61932b').professionalHold.reason,/所有肺胀/);
for(const prefix of ['233b7605','2e48d7e6','77159d44'])assert.match(get(prefix).professionalHold.reason,/没有3/);
for(const prefix of ['b49c9706','a98dcf6f'])assert.match(get(prefix).professionalHold.reason,/无4/);
for(const prefix of ['c5e96f71','85f98d2b','667602a1','292a8d3b','a7ed8e60'])assert.match(get(prefix).professionalHold.reason,/不含29/);
const written=get('62f6e1da');assert.ok(written.subjective);assert.equal(written.rubric.length,5);
assert.match(written.explanation,/不简单等同攻下逐水/);assert.match(written.explanation,/两义/);
assert.ok(written.evidenceLinks.some((e:any)=>e.page===63&&e.endPage===65));
for(const id of b.repairQuestionIds){const q=bank.get(id);assert.equal(q.review,'authored-image-checked');assert.deepEqual(q.answers,['A']);}
assert.deepEqual(bank.get('professional-K0666-shuiqi-oct04').requirementIds,['K0666']);
assert.deepEqual(bank.get('professional-K0486-shuiqi-oct04').requirementIds,['K0486']);
assert.deepEqual(d.courses.map((c:any)=>[c.id,c.requirements]),before.courses.map((c:any)=>[c.id,c.requirements]));assert.deepEqual(d.scheme,before.scheme);
assert.equal(b.heldQuestionIds.filter((id:string)=>bank.get(id).subjective).length,0);
assert.equal(Object.keys(b.variantGroups).length,2);
for(const ids of Object.values(b.variantGroups) as string[][]){
 const state=freshState();state.courseExposures=[{question:ids[0],at:new Date().toISOString()}];
 assert.ok(assembleCourseExam(d.questions,state,()=>0.5).questionIds.every(id=>!ids.includes(id)));
}
for(let seed=0;seed<40;seed++){
 const exam=assembleCourseExam(d.questions,freshState(),()=>seed/40);assert.equal(exam.questionIds.length,91);assert.deepEqual(exam.missing,[]);
 assert.ok(exam.questionIds.every(id=>!a.heldQuestionIds.includes(id)));
 const groups=exam.questionIds.map(id=>bank.get(id).variantGroup).filter(Boolean);assert.equal(groups.length,new Set(groups).size);
}
const state=freshState(),id=b.heldQuestionIds[0],now=new Date().toISOString();
state.courseDraft={question:id,response:'E'};state.courseAnswers=[{id:'legacy-shuiqi',question:id,response:'E',score:1,at:now,revealed:true}];
state.courseExams=[{id:'legacy-shuiqi-exam',questionIds:[id],responses:{[id]:'E'},startedAt:now,submittedAt:now}];
const restored=validateState(await readEnvelope(await makeEnvelope(state),'archive'));
assert.deepEqual(restored.courseDraft,state.courseDraft);assert.deepEqual(restored.courseAnswers,state.courseAnswers);assert.deepEqual(restored.courseExams,state.courseExams);
console.log('Shuiqi 28 dispositions: 11 compared (one written), 17 held, two in-scope repairs; original keys, source hashes, full-scope boundaries, medical conditions, 40 exam seeds, seen variants and legacy backup passed');
