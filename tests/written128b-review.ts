import historical from './historical-catalog.cjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {scoreCourse} from '../src/Course';
import {assembleCourseExam,examObjectiveScore} from '../src/examEngine';
import {freshState,makeEnvelope,readEnvelope,validateState} from '../src/learning';
const d=historical.readHistoricalCatalog(),a=d.authoredQuestionReviewAudit,b=a.batches['written128b-18'];
const raw=readFileSync('../../../work/written128b-before-oct04-catalog.json'),old=JSON.parse(raw.toString('utf8'));
const bank=new Map<string,any>(d.questions.map((q:any)=>[q.id,q]));
const expected=['shanghan','neijing','jinkui','wenbing'].flatMap(key=>{const t=JSON.parse(readFileSync(`../../../work/written128b-${key}-targets.json`,'utf8'));assert.equal(t.catalogSha256,createHash('sha256').update(raw).digest('hex'));return t.questions});
assert.equal(d.questions.length,2417);assert.equal(expected.length,128);assert.equal(b.questionIds.length,128);assert.equal(new Set(b.questionIds).size,128);
assert.deepEqual([...b.questionIds].sort(),expected.map((q:any)=>q.id).sort());assert.equal(b.checkedQuestionIds.length,128);assert.equal(b.heldQuestionIds.length,0);
assert.equal(a.questionIds.length,736);assert.equal(a.checkedQuestionIds.length,736);assert.equal(a.pendingQuestionIds.length,0);assert.equal(new Set(a.questionIds).size,736);
assert.deepEqual(a.batches['authored200-16'],old.authoredQuestionReviewAudit.batches['authored200-16']);assert.deepEqual(a.batches['written128-17'],old.authoredQuestionReviewAudit.batches['written128-17']);
assert.ok(a.pendingQuestionIds.every((id:string)=>id.startsWith('special-')&&!bank.get(id).authoredReview));
for(const classic of ['伤寒论','黄帝内经','金匮要略','温病学'])assert.equal(expected.filter((q:any)=>q.classic===classic).length,32);
for(const previous of old.questions){const q=bank.get(previous.id);if(!b.questionIds.includes(q.id)){if(['written128c-19','written152-20'].some(batch=>a.batches[batch].questionIds.includes(q.id)))assert.deepEqual(q.authoredReview.original,previous);else assert.deepEqual(q,previous);continue}
 assert.ok(q.subjective&&q.assessmentOnly);assert.deepEqual(q.authoredReview.original,previous);assert.equal(q.authoredReview.batch,'written128b-18');
 for(const key of ['id','answers','family','review','sourceCheck','requirementIds'])assert.deepEqual(q[key],previous[key]);
 for(const key of ['independentExpertReview','examCalibration','fullRequirementAbilityVerified','automaticGrade'])assert.equal(q.authoredReview[key],false);
 assert.equal(q.authoredReview.rubricMode,'manual-reference-only');assert.ok(q.authoredReview.coverage.tested.length&&q.authoredReview.coverage.notTested.length);
 assert.equal(q.authoredReview.coverage.fullRequirementAbilityVerified,false);assert.ok(q.rubric.length>=2);assert.equal(q.rubric.reduce((n:number,r:any)=>n+r.points,0),10);assert.ok(q.rubric.every((r:any)=>r.criterion&&r.points>0));
 assert.ok(q.evidenceLinks.every((e:any)=>e.quote&&e.citation&&e.note&&e.excerptKind&&e.sourceReadingLevel&&e.endPage>=e.page));
 assert.equal(scoreCourse(q,'闭卷自写'),null);assert.equal(examObjectiveScore(q,'闭卷自写'),null);assert.equal(scoreCourse(q,''),null);
 for(const rid of q.requirementIds){const g=d.requirementGuides[rid];assert.equal(g.classic,q.classic);assert.ok(g.directQuestionIds.includes(q.id));assert.ok(d.requirementReadings[rid].questionIds.includes(q.id));assert.equal(g.directAssessment.reviewedFacets.questionId,q.id)}
}
for(const [rid,g]of Object.entries(d.requirementGuides)as [string,any][]){const before=old.requirementGuides[rid],after=structuredClone(g);if(['written128b-18','written128c-19','written152-20'].includes(after.directAssessment?.reviewedFacets?.batch))delete after.directAssessment.reviewedFacets;assert.deepEqual(after,before)}
assert.deepEqual(d.requirementReadings,old.requirementReadings);assert.deepEqual(d.courses,old.courses);assert.deepEqual(d.scheme,old.scheme);
assert.equal(d.questionSourceAudit.checks.length,1052);assert.equal(d.questionSourceAudit.heldQuestionIds.length,631);
for(const [file,hash]of Object.entries(b.sourceFileSha256))assert.equal(createHash('sha256').update(readFileSync('public/'+file)).digest('hex'),hash);
for(const [key,hash]of Object.entries(b.decisionFileSha256))assert.equal(createHash('sha256').update(readFileSync(`../../../work/written128b-${key}-decisions.json`)).digest('hex'),hash);
assert.match(bank.get('special-K0408-written').explanation,/先治里/);assert.match(bank.get('special-K0410-written').explanation,/已无太阳表证/);assert.match(bank.get('special-K0410-written').explanation,/附子别煮/);
assert.match(bank.get('special-K0617-written').explanation,/三物小白散/);assert.match(bank.get('special-K0414-written').explanation,/表里俱热/);assert.match(bank.get('special-K0407-written').explanation,/甘草倍(?:于桂枝|桂)/);
const fixed=bank.get('special-K0333-written');assert.equal(fixed.authoredReview.coreAnswerCorrected,true);assert.match(fixed.explanation,/病为本.*工为标/);assert.ok(fixed.rubric.some((r:any)=>r.criterion.includes('配合')||r.criterion.includes('契合')));
assert.ok(b.coreAnswerCorrectedQuestionIds.includes(fixed.id));
for(let i=0;i<40;i++){const exam=assembleCourseExam(d.questions,freshState(),()=>i/40);assert.equal(exam.questionIds.length,91);assert.ok(exam.questionIds.every(id=>!bank.get(id).professionalHold));const families=exam.questionIds.map(id=>bank.get(id).variantGroup).filter(Boolean);assert.equal(new Set(families).size,families.length)}
const state=freshState(),now=new Date().toISOString();state.courseDraft={question:expected[0].id,response:'旧书面草稿'};state.courseAnswers=[{id:'before-written128',question:expected[0].id,response:'旧书面答案',score:0,at:now,revealed:true}];
const restored=validateState(await readEnvelope(await makeEnvelope(state),'archive'));assert.deepEqual(restored.courseDraft,state.courseDraft);assert.deepEqual(restored.courseAnswers,state.courseAnswers);
console.log('128 written items: exact scope and snapshots, 10-point manual-only rubrics, 736 cumulative / 0 pending; second 128 exact new batch, unchanged outside batch, null scores, source hashes, 40 exam seeds, legacy storage preserved');
