import historical from './historical-catalog.cjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assembleCourseExam,examObjectiveScore} from '../src/examEngine';
import {scoreCourse} from '../src/Course';
import {freshState,makeEnvelope,readEnvelope,validateState} from '../src/learning';
const d=historical.readHistoricalCatalog();
const a=d.questionSourceAudit,b=a.shaoyangBatch,bank=new Map<string,any>(d.questions.map((q:any)=>[q.id,q]));
const beforeBytes=readFileSync('../../../work/shaoyang-before-oct04-catalog.json');
const before=JSON.parse(beforeBytes.toString('utf8'));
const frozen=JSON.parse(readFileSync('../../../work/shaoyang-oct04-targets.json','utf8'));
assert.equal(frozen.catalogSha256,createHash('sha256').update(beforeBytes).digest('hex'));
assert.equal(d.questions.length,2417);assert.equal(bank.size,2417);assert.equal(a.checks.length,1052);assert.equal(a.heldQuestionIds.length,631);
assert.equal(b.questionIds.length,35);assert.equal(b.checkedQuestionIds.length,22);assert.equal(b.heldQuestionIds.length,13);assert.equal(b.repairQuestionIds.length,1);
assert.deepEqual(b.pendingChapterQuestionIds,[]);
assert.deepEqual([...b.checkedQuestionIds,...b.heldQuestionIds].sort(),frozen.questions.map((q:any)=>q.id).sort());
assert.equal(new Set([...b.checkedQuestionIds,...b.heldQuestionIds]).size,35);
for(const q of before.questions)if(!b.questionIds.includes(q.id)&&!a.tanyinBatch.questionIds.includes(q.id)&&!a.shuiqiBatch.questionIds.includes(q.id)&&!a.all1099Batch.questionIds.includes(q.id)&&!d.authoredQuestionReviewAudit.questionIds.includes(q.id))assert.deepEqual(bank.get(q.id),q);
assert.deepEqual(d.questions.filter((q:any)=>!before.questions.some((p:any)=>p.id===q.id)).map((q:any)=>q.id),[...b.repairQuestionIds,...a.tanyinBatch.repairQuestionIds,...a.shuiqiBatch.repairQuestionIds,...a.all1099Batch.repairQuestionIds,...a.all1099Batch.caseQuestionIds]);
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
 const q=bank.get(id);assert.equal(q.professionalHold.batch,'shaoyang-35');assert.ok(!q.sourceCheck);
 assert.equal(scoreCourse(q,q.answers.join(',')),null);assert.equal(examObjectiveScore(q,q.answers.join(',')),null);
 assert.deepEqual(q.requirementIds,[]);assert.ok(d.courses.every((c:any)=>!c.questionIds.includes(id)));
 assert.ok(Object.values(d.requirementGuides).every((g:any)=>!g.directQuestionIds.includes(id)));
 assert.ok(Object.values(d.requirementReadings).every((r:any)=>![...r.questionIds,...(r.articleQuestionIds||[])].includes(id)));
}
for(const [file,hash] of Object.entries(b.sourceFileSha256))assert.equal(createHash('sha256').update(readFileSync(`public/${file}`)).digest('hex'),hash);
const get=(prefix:string)=>{const qs=[...bank.values()].filter(q=>q.id.startsWith(prefix));assert.equal(qs.length,1);return qs[0]};
assert.match(get('a1398997').stem,/若.*不差/);assert.match(get('a1398997').explanation,/不是|不将.*每例/);
assert.match(get('2bdd95d0').explanation,/不是任意一个孤立/);
assert.match(get('826a25eb').explanation,/不是每例同时必有/);assert.match(get('826a25eb').explanation,/胃不和/);
assert.match(get('b34fbf5e').explanation,/263明确口苦咽干目眩为少阳提纲/);
assert.match(get('67b38f3e').explanation,/栝楼实.*栝楼根/);
assert.match(get('58429893').optionReview.E.reason,/多茯苓.*缺牡蛎/);
assert.match(get('ce6bcced').explanation,/不是黄芩汤不去滓/);
assert.match(get('e99e94c7').explanation,/先列七味.*加大黄二两/);
for(const prefix of ['4935dd78','a63e3c13'])assert.match(get(prefix).professionalHold.reason,/所选没有264/);
assert.match(get('7f166760').professionalHold.reason,/所选没有98/);
assert.match(get('fc03af7c').professionalHold.reason,/B.*C.*均为107/);
assert.match(get('fda57c5b').professionalHold.reason,/A.*D相容/);
const repair=bank.get(b.repairQuestionIds[0]);assert.equal(repair.review,'authored-image-checked');assert.deepEqual(repair.requirementIds,['K0431']);assert.deepEqual(repair.answers,['B']);
assert.match(repair.explanation,/尚未吐下.*脉沉紧/);assert.match(repair.optionReview.A.reason,/不能/);
for(let seed=0;seed<40;seed++){
 const exam=assembleCourseExam(d.questions,freshState(),()=>seed/40);assert.equal(exam.questionIds.length,91);assert.deepEqual(exam.missing,[]);
 assert.ok(exam.questionIds.every(id=>!a.heldQuestionIds.includes(id)));
 const groups=exam.questionIds.map(id=>bank.get(id).variantGroup).filter(Boolean);assert.equal(groups.length,new Set(groups).size);
}
const state=freshState(),id=b.heldQuestionIds[0],now=new Date().toISOString();
state.courseDraft={question:id,response:'E'};state.courseAnswers=[{id:'legacy-shaoyang',question:id,response:'E',score:1,at:now,revealed:true}];
state.courseExams=[{id:'legacy-shaoyang-exam',questionIds:[id],responses:{[id]:'E'},startedAt:now,submittedAt:now}];
const restored=validateState(await readEnvelope(await makeEnvelope(state),'archive'));
assert.deepEqual(restored.courseDraft,state.courseDraft);assert.deepEqual(restored.courseAnswers,state.courseAnswers);assert.deepEqual(restored.courseExams,state.courseExams);
console.log('Shaoyang 35 dispositions: 22 compared / 13 held, original keys and other content preserved, conditional treatment, 101 interpretation, excluded 98/264, ambiguities, formula parts and versions, 266 repair, source hashes, 40 exam seeds and legacy records passed');
