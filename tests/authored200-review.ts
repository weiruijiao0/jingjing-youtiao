import historical from './historical-catalog.cjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {scoreCourse} from '../src/Course';
import {assembleCourseExam,examObjectiveScore} from '../src/examEngine';
import {freshState,makeEnvelope,readEnvelope,validateState} from '../src/learning';
const d=historical.readHistoricalCatalog(),cumulative=d.authoredQuestionReviewAudit,b=cumulative.batches?.['authored200-16']??cumulative;
const beforeRaw=readFileSync('../../../work/authored200-before-oct04-catalog.json'),before=JSON.parse(beforeRaw.toString('utf8'));
const bank=new Map<string,any>(d.questions.map((q:any)=>[q.id,q]));
const expected=['shanghan','neijing','jinkui','wenbing'].flatMap(key=>{const x=JSON.parse(readFileSync(`../../../work/authored200-${key}-targets.json`,'utf8'));assert.equal(x.catalogSha256,createHash('sha256').update(beforeRaw).digest('hex'));return x.questions});
assert.equal(d.questions.length,2417);assert.equal(b.questionIds.length,200);assert.equal(new Set(b.questionIds).size,200);
assert.deepEqual([...b.questionIds].sort(),expected.map((q:any)=>q.id).sort());assert.equal(b.checkedQuestionIds.length+b.heldQuestionIds.length,200);
assert.equal(b.pendingQuestionIds.length,536);assert.ok(b.pendingQuestionIds.every((id:string)=>id.startsWith('special-')));assert.equal(cumulative.pendingQuestionIds.length,0);assert.ok(cumulative.pendingQuestionIds.every((id:string)=>!bank.get(id).authoredReview));
assert.equal(expected.filter((q:any)=>q.subjective).length,30);assert.equal(expected.filter((q:any)=>!q.subjective).length,170);
for(const old of before.questions){const q=bank.get(old.id);if(!b.questionIds.includes(old.id)){if(['written128-17','written128b-18','written128c-19','written152-20'].some(batch=>cumulative.batches?.[batch]?.questionIds.includes(old.id))){assert.deepEqual(q.authoredReview.original,old)}else assert.deepEqual(q,old);continue}
 assert.deepEqual(q.authoredReview.original,old);assert.equal(q.authoredReview.batch,'authored200-16');
 for(const key of ['id','family','review','answers','sourceCheck'])assert.deepEqual(q[key],old[key]);
 for(const key of ['independentExpertReview','examCalibration','fullRequirementAbilityVerified'])assert.equal(q.authoredReview[key],false);
 assert.ok(q.authoredReview.coverage.tested.length&&q.authoredReview.coverage.notTested.length);assert.equal(q.authoredReview.coverage.fullRequirementAbilityVerified,false);
 if(q.professionalHold){assert.equal(scoreCourse(q,q.answers.join(',')),null);assert.ok(d.courses.every((c:any)=>!c.questionIds.includes(q.id)));continue}
 assert.ok(q.evidenceLinks.length&&q.evidenceLinks.every((e:any)=>e.quote&&e.note&&e.citation&&e.excerptKind));
 for(const rid of q.requirementIds){assert.equal(d.requirementGuides[rid].classic,q.classic);assert.ok(d.requirementGuides[rid].directQuestionIds.includes(q.id));assert.ok(d.requirementReadings[rid].questionIds.includes(q.id))}
 if(q.subjective){assert.equal(scoreCourse(q,'自主组织要点'),null);assert.equal(examObjectiveScore(q,'自主组织要点'),null);assert.ok(q.rubric.length)}
 else{assert.equal(scoreCourse(q,q.answers.join(',')),1);assert.equal(scoreCourse(q,''),0);assert.deepEqual(Object.keys(q.optionReview).sort(),q.options.map((o:any)=>o.id).sort());for(const [id,r] of Object.entries(q.optionReview) as [string,any][])assert.ok(r.reason&&r.selected===q.answers.includes(id))}
}
for(const [file,sha]of Object.entries(b.sourceFileSha256))assert.equal(createHash('sha256').update(readFileSync('public/'+file)).digest('hex'),sha);
assert.deepEqual(d.courses.map((c:any)=>c.requirements),before.courses.map((c:any)=>c.requirements));assert.deepEqual(d.scheme,before.scheme);
for(let i=0;i<40;i++){const exam=assembleCourseExam(d.questions,freshState(),()=>i/40);assert.equal(exam.questionIds.length,91);assert.ok(exam.questionIds.every(id=>!bank.get(id).professionalHold));const groups=exam.questionIds.map(id=>bank.get(id).variantGroup).filter(Boolean);assert.equal(new Set(groups).size,groups.length)}
assert.match(bank.get('professional-K0382-taiyang-oct04').explanation,/5\/12.*2\/9/);
assert.match(bank.get('professional-K0459-all1099-oct04').explanation,/原内服方基础/);
assert.match(bank.get('teaching-K0656-3').stem,/防己地黄汤/);assert.match(bank.get('teaching-K0246-4').stem,/第9条/);
const state=freshState(),old=expected[0],now=new Date().toISOString();state.courseDraft={question:old.id,response:'A'};state.courseAnswers=[{id:'pre-authored-review',question:old.id,response:'A',score:0,at:now,revealed:true}];
const restored=validateState(await readEnvelope(await makeEnvelope(state),'archive'));assert.deepEqual(restored.courseDraft,state.courseDraft);assert.deepEqual(restored.courseAnswers,state.courseAnswers);
console.log('Authored 200 scope/source/option/rubric/coverage review, exact prior snapshots, 536 historical pending / 0 current pending, 40 exam seeds and old storage preserved');
