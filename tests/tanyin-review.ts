import historical from './historical-catalog.cjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assembleCourseExam,examObjectiveScore} from '../src/examEngine';
import {scoreCourse} from '../src/Course';
import {freshState,makeEnvelope,readEnvelope,validateState} from '../src/learning';
const d=historical.readHistoricalCatalog();
const a=d.questionSourceAudit,b=a.tanyinBatch,bank=new Map<string,any>(d.questions.map((q:any)=>[q.id,q]));
const beforeBytes=readFileSync('../../../work/tanyin-before-oct04-catalog.json');
const before=JSON.parse(beforeBytes.toString('utf8'));
const frozen=JSON.parse(readFileSync('../../../work/tanyin-oct04-targets.json','utf8'));
assert.equal(frozen.catalogSha256,createHash('sha256').update(beforeBytes).digest('hex'));
assert.equal(d.questions.length,2417);assert.equal(bank.size,2417);assert.equal(a.checks.length,1052);assert.equal(a.heldQuestionIds.length,631);
assert.equal(b.questionIds.length,56);assert.equal(b.checkedQuestionIds.length,26);assert.equal(b.heldQuestionIds.length,30);assert.equal(b.repairQuestionIds.length,1);
assert.deepEqual(b.pendingChapterQuestionIds,[]);
assert.deepEqual([...b.checkedQuestionIds,...b.heldQuestionIds].sort(),frozen.questions.map((q:any)=>q.id).sort());
assert.equal(new Set([...b.checkedQuestionIds,...b.heldQuestionIds]).size,56);
for(const q of before.questions)if(!b.questionIds.includes(q.id)&&!a.shuiqiBatch.questionIds.includes(q.id)&&!a.all1099Batch.questionIds.includes(q.id)&&!d.authoredQuestionReviewAudit.questionIds.includes(q.id))assert.deepEqual(bank.get(q.id),q);
assert.deepEqual(d.questions.filter((q:any)=>!before.questions.some((p:any)=>p.id===q.id)).map((q:any)=>q.id),[...b.repairQuestionIds,...a.shuiqiBatch.repairQuestionIds,...a.all1099Batch.repairQuestionIds,...a.all1099Batch.caseQuestionIds]);
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
 assert.equal(scoreCourse(q,q.answers.join(',')),1);if(q.answers.length>1)assert.equal(scoreCourse(q,q.answers[0]),0);
 assert.ok(q.evidenceLinks.length);
}
for(const id of b.heldQuestionIds){
 const q=bank.get(id);assert.equal(q.professionalHold.batch,'tanyin-56');assert.ok(!q.sourceCheck);
 assert.equal(scoreCourse(q,q.answers.join(',')),null);assert.equal(examObjectiveScore(q,q.answers.join(',')),null);
 assert.deepEqual(q.requirementIds,[]);assert.ok(d.courses.every((c:any)=>!c.questionIds.includes(id)));
 assert.ok(Object.values(d.requirementGuides).every((g:any)=>!g.directQuestionIds.includes(id)));
 assert.ok(Object.values(d.requirementReadings).every((r:any)=>![...r.questionIds,...(r.articleQuestionIds||[])].includes(id)));
}
for(const [file,hash] of Object.entries(b.sourceFileSha256))assert.equal(createHash('sha256').update(readFileSync(`public/${file}`)).digest('hex'),hash);
const get=(prefix:string)=>{const qs=[...bank.values()].filter(q=>q.id.startsWith(prefix));assert.equal(qs.length,1);return qs[0]};

assert.match(get('d54bcf93').explanation,/不把本方误说为水停下焦/);
assert.match(get('3d198542').stem,/第17条/);assert.match(get('3d198542').explanation,/不是所有.*合用/);
assert.match(get('ca7c61ab').optionReview.D.reason,/非.*解毒/);
assert.match(get('046a4fc3').explanation,/脉伏.*脉沉弦.*不能假说逐字/);
assert.match(get('046a4fc3').optionReview.B.reason,/不能擅称风水兼表实/);
assert.equal(get('eb41ea33').options.find((o:any)=>o.id==='E').text,'其人振振身瞤剧');
assert.match(get('fe58a78a').stem,/身瞤剧/);assert.match(get('c8ba0bf6').stem,/身瞤剧/);
for(const prefix of ['4617d8c2','d8c06d31','bdd2b476'])assert.match(get(prefix).professionalHold.reason,/所选没有第36—40条/);
assert.match(get('f1d4bd2f').professionalHold.reason,/所选无10/);
assert.match(get('c466e35e').professionalHold.reason,/不能只核准E/);
for(const prefix of ['701a4303','e0262806'])assert.match(get(prefix).professionalHold.reason,/未注明不同阶段/);
assert.match(get('af18a413').professionalHold.reason,/宽窄相容/);
assert.match(get('24e27a08').professionalHold.reason,/剂量.*服次.*服温/);
assert.match(get('2f661e87').professionalHold.reason,/温药和之/);
const repair=bank.get(b.repairQuestionIds[0]);assert.equal(repair.review,'authored-image-checked');assert.deepEqual(repair.requirementIds,['K0217']);assert.deepEqual(repair.answers,['A']);
assert.match(repair.explanation,/温之不可太过/);assert.match(repair.optionReview.C.reason,/条件/);
assert.deepEqual(d.courses.map((c:any)=>[c.id,c.requirements]),before.courses.map((c:any)=>[c.id,c.requirements]));assert.deepEqual(d.scheme,before.scheme);
assert.equal(b.heldQuestionIds.filter((id:string)=>bank.get(id).subjective).length,1);
assert.equal(Object.keys(b.variantGroups).length,4);
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
state.courseDraft={question:id,response:'E'};state.courseAnswers=[{id:'legacy-tanyin',question:id,response:'E',score:1,at:now,revealed:true}];
state.courseExams=[{id:'legacy-tanyin-exam',questionIds:[id],responses:{[id]:'E'},startedAt:now,submittedAt:now}];
const restored=validateState(await readEnvelope(await makeEnvelope(state),'archive'));
assert.deepEqual(restored.courseDraft,state.courseDraft);assert.deepEqual(restored.courseAnswers,state.courseAnswers);assert.deepEqual(restored.courseExams,state.courseExams);
console.log('Tanyin 56 dispositions: 26 compared / 30 held; 15 in-scope repair, four variant groups, original keys and other questions, scopes, formula conditions, outside excerpts, source hashes, 40 exam seeds and legacy records passed');
