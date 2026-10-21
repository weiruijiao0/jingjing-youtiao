import historical from './historical-catalog.cjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assembleCourseExam,examObjectiveScore} from '../src/examEngine';
import {scoreCourse} from '../src/Course';
import {freshState,makeEnvelope,readEnvelope,validateState} from '../src/learning';
const d=historical.readHistoricalCatalog();
const a=d.questionSourceAudit,b=a.all1099Batch,bank=new Map<string,any>(d.questions.map((q:any)=>[q.id,q]));
const raw=readFileSync('../../../work/all1099-before-oct04-catalog.json'),before=JSON.parse(raw.toString('utf8'));
const frozen=JSON.parse(readFileSync('../../../work/all1099-oct04-targets.json','utf8'));
assert.equal(frozen.catalogSha256,createHash('sha256').update(raw).digest('hex'));
assert.equal(b.repairQuestionIds.length,8);assert.equal(d.questions.length,2417);assert.equal(bank.size,2417);
assert.equal(b.questionIds.length,1099);assert.equal(new Set(b.questionIds).size,1099);
assert.deepEqual([...b.checkedQuestionIds,...b.heldQuestionIds].sort(),frozen.questions.map((q:any)=>q.id).sort());
assert.deepEqual(b.pendingQuestionIds,[]);
assert.equal(a.checks.length,426+b.checkedQuestionIds.length);assert.equal(a.heldQuestionIds.length,158+b.heldQuestionIds.length);
for(const q of before.questions)if(!b.questionIds.includes(q.id)&&!d.authoredQuestionReviewAudit.questionIds.includes(q.id))assert.deepEqual(bank.get(q.id),q);
for(const o of frozen.questions){
 const q=bank.get(o.id),decision=q.sourceCheck||q.professionalHold;
 assert.equal(decision.batch,'all1099-15');assert.equal(q.review,'source-answer-unverified');
 assert.deepEqual(q.answers,o.answers);assert.equal(q.family,o.family);
 for(const k of ['stem','options','answers','explanation','reference','chapter','classic','family'])assert.deepEqual(decision.original[k],o[k]);
 for(const k of ['independentExpertReview','examCalibration','fullRequirementAbilityVerified'])assert.equal(decision[k],false);
}
for(const id of b.checkedQuestionIds){
 const q=bank.get(id);assert.ok(!q.professionalHold&&q.explanation&&q.reference&&q.evidenceLinks.length);
 assert.deepEqual(Object.keys(q.optionReview).sort(),q.options.map((o:any)=>o.id).sort());
 for(const [key,r] of Object.entries(q.optionReview) as [string,any][]){assert.equal(r.selected,q.answers.includes(key));assert.ok(r.reason.trim())}
 for(const rid of q.requirementIds){assert.equal(d.requirementGuides[rid].classic,q.classic);assert.ok(d.requirementGuides[rid].directQuestionIds.includes(id));assert.ok(d.requirementReadings[rid].questionIds.includes(id))}
 if(q.subjective){assert.equal(scoreCourse(q,'自写回忆'),null);assert.ok(q.rubric.length)}else {assert.equal(scoreCourse(q,q.answers.join(',')),1);if(q.answers.length>1)assert.equal(scoreCourse(q,q.answers[0]),0)}
}
for(const id of b.heldQuestionIds){
 const q=bank.get(id);assert.ok(q.professionalHold.reason&&q.professionalHold.evidenceLinks.length);assert.ok(!q.sourceCheck);
 assert.equal(scoreCourse(q,q.answers.join(',')),null);assert.equal(examObjectiveScore(q,q.answers.join(',')),null);
 assert.deepEqual(q.requirementIds,[]);assert.ok(d.courses.every((c:any)=>!c.questionIds.includes(id)));
 assert.ok(Object.values(d.requirementGuides).every((g:any)=>!g.directQuestionIds.includes(id)));
 assert.ok(Object.values(d.requirementReadings).every((r:any)=>![...r.questionIds,...(r.articleQuestionIds||[])].includes(id)));
}
assert.equal(b.caseQuestionIds.length,30);assert.equal(new Set(b.caseQuestionIds.map((id:string)=>bank.get(id).family)).size,15);
for(const id of [...b.repairQuestionIds,...b.caseQuestionIds]){const q=bank.get(id);assert.ok(['all1099-repair','all1099-case-repair'].includes(q.authoringBatch));assert.ok(q.explanation&&q.evidenceLinks.length&&q.requirementIds.length);assert.equal(scoreCourse(q,q.answers.join(',')),1);assert.ok(!q.sourceCheck&&!q.professionalHold);for(const k of ['independentExpertReview','examCalibration','fullRequirementAbilityVerified'])assert.equal(q[k],false);for(const rid of q.requirementIds)assert.ok(d.requirementReadings[rid].questionIds.includes(id));}
for(const [file,hash] of Object.entries(b.sourceFileSha256))assert.equal(createHash('sha256').update(readFileSync(`public/${file}`)).digest('hex'),hash);
assert.equal(d.questions.filter((q:any)=>q.review==='source-answer-unverified'&&!q.sourceCheck&&!q.professionalHold).length,0);
assert.deepEqual(d.courses.map((c:any)=>[c.id,c.requirements]),before.courses.map((c:any)=>[c.id,c.requirements]));assert.deepEqual(d.scheme,before.scheme);
for(const [rid,r] of Object.entries(d.requirementReadings) as [string,any][]){assert.ok([...r.questionIds,...(r.articleQuestionIds||[])].length>0,rid)}
const moved=bank.get('4cebc5ac7f74203529c81eaacb0235b891410ae66135d860a82b2cfcde0e0e65');assert.equal(moved.chapter,'太阴阳明论篇第二十九');assert.equal(moved.sourceCheck.original.chapter,'经脉别论篇第二十一');assert.ok(d.courses.filter((c:any)=>c.questionIds.includes(moved.id)).every((c:any)=>c.title===moved.chapter));
const get=(prefix:string)=>{const qs=[...bank.values()].filter(q=>q.id.startsWith(prefix));assert.equal(qs.length,1);return qs[0]};
assert.match(get('d0f2cf').explanation,/F0012第54页及F0016第169页/);
assert.ok(get('d0f2cf').evidenceLinks.some((e:any)=>e.source==='F0012'&&e.page===54));
assert.ok(get('d0f2cf').evidenceLinks.some((e:any)=>e.source==='F0016'&&e.page===169));
assert.match(get('c9948b').explanation,/不是把心阳虚全部固定为五类/);
assert.match(get('cbfa8e').explanation,/124里重急先治里/);
assert.equal(get('a28e957').options[2].text,'当归、桂枝、芍药、细辛、通草、甘草、大枣');
assert.match(get('bb1653').professionalHold.reason,/286/);
assert.match(get('f1beb2').professionalHold.reason,/并非互斥/);
assert.match(get('8d4400').professionalHold.reason,/真实治法的一部分/);
for(let seed=0;seed<40;seed++){
 const exam=assembleCourseExam(d.questions,freshState(),()=>seed/40);assert.equal(exam.questionIds.length,91);assert.deepEqual(exam.missing,[]);
 assert.ok(exam.questionIds.every(id=>!a.heldQuestionIds.includes(id)));
 const groups=exam.questionIds.map(id=>bank.get(id).variantGroup).filter(Boolean);assert.equal(groups.length,new Set(groups).size);
}
const state=freshState(),id=b.heldQuestionIds[0],now=new Date().toISOString();
state.courseDraft={question:id,response:'A'};state.courseAnswers=[{id:'legacy-all1099',question:id,response:'A',score:1,at:now,revealed:true}];
state.courseExams=[{id:'legacy-all1099-exam',questionIds:[id],responses:{[id]:'A'},startedAt:now,submittedAt:now}];
const restored=validateState(await readEnvelope(await makeEnvelope(state),'archive'));
assert.deepEqual(restored.courseDraft,state.courseDraft);assert.deepEqual(restored.courseAnswers,state.courseAnswers);assert.deepEqual(restored.courseExams,state.courseExams);
console.log(`All 1099 decisions: ${b.checkedQuestionIds.length} compared, ${b.heldQuestionIds.length} held; original keys/snapshots, all sources, unaffected content, 712 scope, 40 exam seeds and old storage preserved`);
