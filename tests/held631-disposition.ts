import historical from './historical-catalog.cjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assembleCourseExam,examObjectiveScore} from '../src/examEngine';
import {scoreCourse} from '../src/Course';
import {freshState} from '../src/learning';
const raw=readFileSync('../../../work/held631-before-oct04-catalog.json');
const old=JSON.parse(raw.toString('utf8')),d=historical.readHistoricalCatalog();
const a=d.professionalHoldDispositionAudit,without=structuredClone(d);delete without.professionalHoldDispositionAudit;
assert.deepEqual(without,old,'No question, guide, scope, scheme, or previous audit may change');
assert.equal(a.baselineCatalogSha256,createHash('sha256').update(raw).digest('hex'));
assert.equal(a.kind,'manual-training-disposition-review-not-answer-certification');
assert.equal(a.legacyScopeNotesMayBeSuperseded,true);assert.deepEqual(a.restoredQuestionIds,[]);
const held=old.questions.filter((q:any)=>q.professionalHold),bank=new Map<string,any>(d.questions.map((q:any)=>[q.id,q]));
assert.equal(held.length,631);assert.equal(a.decisions.length,631);assert.equal(new Set(a.questionIds).size,631);
assert.deepEqual([...a.questionIds].sort(),held.map((q:any)=>q.id).sort());
const norm=(s:string)=>s.normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,'');
const official=norm(readFileSync('../../../work/syllabus-official2026.txt','utf8'));
const categories=new Set(['outside-selected-scope','mixed-selected-and-unselected','missing-original-case-source','answer-ambiguity-or-insufficient-conditions','text-or-answer-discrepancy','unresolved-other']);
const counts:Record<string,number>={},recommendations:Record<string,number>={};
for(const r of a.decisions){
 const q=bank.get(r.questionId);assert.ok(q.professionalHold);assert.equal(q.review,'source-answer-unverified');
 assert.ok(categories.has(r.primaryCategory));assert.ok(r.additionalCategories.every((c:string)=>categories.has(c)));
 assert.equal(r.catalogSha256,a.baselineCatalogSha256);assert.equal(r.classic,q.classic);
 for(const flag of ['independentExpertReview','examCalibration','fullRequirementAbilityVerified','restored','answerReverified'])assert.equal(r[flag],false);
 assert.ok(r.reason.trim()&&r.nextAction.trim());assert.ok(r.scopeComparedRequirementIds.length);
 assert.deepEqual(r.scopeQuotes.map((x:any)=>x.requirementId).sort(),[...r.scopeComparedRequirementIds].sort());
 for(const e of r.scopeQuotes){assert.equal(e.scope,d.requirementGuides[e.requirementId].scope);assert.ok(official.includes(norm(e.scope)))}
 const excluded=['outside-selected-scope','mixed-selected-and-unselected'].includes(r.primaryCategory);
 assert.equal(r.recommendation,excluded?'retain-excluded-for-current-syllabus':'retain-hold-pending-evidence');
 counts[r.primaryCategory]=(counts[r.primaryCategory]||0)+1;recommendations[r.recommendation]=(recommendations[r.recommendation]||0)+1;
 assert.equal(scoreCourse(q,q.answers.join(',')),null);assert.equal(examObjectiveScore(q,q.answers.join(',')),null);
 assert.ok(d.courses.every((c:any)=>!c.questionIds.includes(q.id)));assert.deepEqual(q.requirementIds??[],[]);
 assert.ok(Object.values(d.requirementGuides).every((g:any)=>!g.directQuestionIds.includes(q.id)));
 assert.ok(Object.values(d.requirementReadings).every((g:any)=>![...g.questionIds,...(g.articleQuestionIds??[])].includes(q.id)));
}
assert.deepEqual(counts,a.countsByCategory);assert.deepEqual(recommendations,a.countsByRecommendation);
for(const input of Object.values(a.decisionFiles)as any[])assert.equal(createHash('sha256').update(readFileSync('../../../'+input.path)).digest('hex'),input.sha256);
for(const [file,hash]of Object.entries(a.reviewEvidenceFiles))assert.equal(createHash('sha256').update(readFileSync('../../../'+file)).digest('hex'),hash);
const nc=JSON.parse(readFileSync('../../../work/held631-neijing-exclusion-crossreview.json','utf8'));
const ncRaw=readFileSync('../../../work/held631-neijing-before-exclusion-crossreview.json');
assert.equal(nc.length,49);assert.equal(nc.filter((x:any)=>x.action==='needs-fix').length,30);
for(const x of nc){
 assert.equal(x.finalDecisionSha256,createHash('sha256').update(ncRaw).digest('hex'));
 const current=a.decisions.find((r:any)=>r.questionId===x.questionId);
 assert.equal(current.primaryCategory,x.suggestedPrimaryCategory);
 assert.equal(current.recommendation,x.suggestedRecommendation);
}
for(const key of ['shanghan','wenbing']){
 const cross=JSON.parse(readFileSync(`../../../work/held631-${key}-crossreview.json`,'utf8'));
 assert.equal(cross.length,a.decisionFiles[key].count);
 assert.deepEqual(cross.map((x:any)=>x.questionId).sort(),a.decisions.filter((r:any)=>r.classic===(key==='shanghan'?'伤寒论':'温病学')).map((r:any)=>r.questionId).sort());
 for(const x of cross){assert.equal(x.action,'retain');assert.ok(x.reason);assert.equal(x.finalDispositionSha256??x.finalDecisionSha256,a.decisionFiles[key].sha256)}
}
for(const flag of ['independentExpertReview','examCalibration','fullRequirementAbilityVerified','professionalReadinessVerified'])assert.equal(a[flag],false);
const sh=JSON.parse(readFileSync('../../../work/held631-shanghan-targets.json','utf8')).questions;
const r=(i:number)=>a.decisions.find((x:any)=>x.questionId===sh[i].id);
assert.ok(r(81).scopeComparedRequirementIds.includes('K0634'));assert.ok(r(81).scopeComparisonCorrected);assert.match(r(81).reason,/278/);
assert.ok(r(127).scopeComparedRequirementIds.includes('K0648'));assert.ok(r(127).scopeComparisonCorrected);
assert.equal(r(110).primaryCategory,'text-or-answer-discrepancy');assert.equal(r(110).restored,false);
const nj=JSON.parse(readFileSync('../../../work/held631-neijing-targets.json','utf8')).questions;
const nr=(i:number)=>a.decisions.find((x:any)=>x.questionId===nj[i].id);
// A textbook omission alone must not be promoted to an official exclusion.
for(const i of [4,14,56,60,69,71,75,120,122,133,135,139]){
 assert.equal(nr(i).recommendation,'retain-hold-pending-evidence');assert.equal(nr(i).restored,false);
 assert.equal(nr(i).primaryCategory,'unresolved-other');
 assert.equal(nr(i).scopeBoundaryEvidenceStatus,'official-theme-present-but-designated-passage-boundary-unresolved; textbook-excerpt-absence-is-not-official-exclusion');
}
const wb=JSON.parse(readFileSync('../../../work/held631-wenbing-targets.json','utf8')).questions;
for(const i of [7,8,16,36])assert.equal(a.decisions.find((x:any)=>x.questionId===wb[i].id).recommendation,'retain-hold-pending-evidence');
assert.ok(a.decisions.find((x:any)=>x.questionId===wb[51].id).scopeComparedRequirementIds.includes('K0158'));
for(let i=0;i<40;i++){const exam=assembleCourseExam(d.questions,freshState(),()=>i/40);assert.equal(exam.questionIds.length,91);assert.ok(exam.questionIds.every(id=>!bank.get(id).professionalHold))}
assert.equal(d.questions.length,2417);assert.equal(d.questions.filter((q:any)=>!q.professionalHold).length,1786);
console.log('631 manual hold dispositions: exact frozen set, official scope quotes, no question edits/restoration, historical audits preserved, known scope corrections, held scoring and exam exclusion');
