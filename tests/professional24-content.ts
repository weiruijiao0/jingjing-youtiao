import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import repair from './professional24-catalog.cjs';
import ability from './professional25-catalog.cjs';
import historical from './historical-catalog.cjs';
import {scoreCourse} from '../src/Course';
import {assembleCourseExam} from '../src/examEngine';
import {freshState} from '../src/learning';
const d=ability.projectBeforeAbility25(JSON.parse(readFileSync('public/course/catalog.json','utf8'))),before=repair.projectBeforeRepair24(d),bank=new Map<string,any>(d.questions.map((q:any)=>[q.id,q]));
assert.equal(d.questions.length,2478);assert.equal(d.questions.filter((q:any)=>!q.professionalHold).length,1847);assert.equal(d.authoredQuestionReviewAudit.checkedQuestionIds.length,797);assert.equal(before.questions.length,2458);historical.readHistoricalCatalog(d);
const normal=(s:string)=>s.normalize('NFKC').replace(/[\p{P}\p{Z}\s_]+/gu,'');const official=normal(readFileSync('../../../work/syllabus-official2026.txt','utf8'));
for(const id of repair.ids){const q=bank.get(id),old=bank.get(q.repairedFromQuestionId);assert.ok(old.professionalHold);assert.deepEqual(old,before.questions.find((x:any)=>x.id===old.id));assert.equal(q.family,old.family);assert.equal(q.variantGroup,old.variantGroup||old.family);assert.equal(q.assessmentOnly,true);assert.ok(!q.professionalHold);assert.ok(q.authoredReview.coverage.tested.length&&q.authoredReview.coverage.notTested.length);
 for(const s of [...q.scopeQuotes,...(q.comparisonScopeQuotes||[])]){assert.equal(s.scope,d.requirementGuides[s.requirementId].scope);assert.ok(official.includes(normal(s.scope)));}
 for(const rid of q.requirementIds){assert.ok(d.requirementGuides[rid].directQuestionIds.includes(id));assert.ok(d.requirementReadings[rid].questionIds.includes(id));assert.deepEqual(d.requirementGuides[rid].directAssessment,before.requirementGuides[rid].directAssessment);}
 for(const e of q.evidenceLinks){assert.match(e.source,/^F\d{4}$/);if(e.ocrFileSha256)assert.equal(historical.sha256(readFileSync(`../../../work/ocr-F0007/${String(e.page).padStart(4,'0')}.json`)),e.ocrFileSha256);}
 for(const related of q.relatedExistingQuestionIds||[])assert.ok(bank.has(related));
 if(q.subjective){assert.equal(q.options.length,0);assert.equal(q.answers.length,0);assert.equal(q.rubric.reduce((sum:number,r:any)=>sum+r.points,0),10);assert.ok(q.acceptableParaphrases.length&&q.criticalErrors.length&&q.gradingInstruction);assert.equal(scoreCourse(q,q.explanation),null);}
 else{assert.ok(q.options.length>=4&&q.options.length<=5);assert.deepEqual(Object.keys(q.optionReview),q.options.map((o:any)=>o.id));for(const o of q.options){assert.equal(q.optionReview[o.id].selected,q.answers.includes(o.id));assert.ok(q.optionReview[o.id].reason);}assert.equal(scoreCourse(q,q.answers.join(',')),1);assert.equal(scoreCourse(q,''),0);if(q.answers.length>1){assert.equal(q.type,'X型题');assert.equal(scoreCourse(q,q.answers[0]),0);assert.equal(scoreCourse(q,q.answers.toReversed().join(',')),1);}else assert.equal(q.type,'A1型题');}
 for(const key of ['independentExpertReview','examCalibration','fullRequirementAbilityVerified'])assert.equal(q[key],false);
}
assert.equal(repair.ids.filter((id:string)=>bank.get(id).subjective).length,1);assert.equal(repair.ids.filter((id:string)=>!bank.get(id).subjective).length,19);
const a=d.professionalReplacementAudit;assert.deepEqual(a.statuses,{'study-replacement-ready':20,'pending-evidence':5,'exclude-current-scope':1});assert.equal(a.oldHeldQuestionsRestored.length,0);assert.equal(a.formalExamEligible,false);assert.equal(a.professionalReadinessVerified,false);
const random=(seed:number)=>{let v=seed;return()=>{v=(Math.imul(v,1664525)+1013904223)>>>0;return v/4294967296}};
for(let seed=1;seed<=100;seed++){const s1=freshState(),s2=freshState(),r1=random(seed),r2=random(seed);for(let n=1;n<=2;n++){const old=assembleCourseExam(before.questions,s1,r1),now=assembleCourseExam(d.questions,s2,r2);assert.deepEqual(now,old,'Learning replacements cannot alter the formal exam pool');assert.equal(now.questionIds.length,91);assert.deepEqual(now.missing,[]);assert.ok(now.questionIds.every(id=>!repair.ids.includes(id)));const saved={id:`isolated-${n}`,questionIds:now.questionIds,startedAt:new Date().toISOString(),submittedAt:new Date().toISOString(),responses:{}};s1.courseExams.push(saved);s2.courseExams.push(saved);}}
for(const mutate of [(x:any)=>x.questions[0].explanation+='unreviewed',(x:any)=>x.questions.at(-1).assessmentOnly=false,(x:any)=>x.questions.at(-1).family='fake-independent-family',(x:any)=>x.requirementGuides.K0078.scope+='outside-syllabus',(x:any)=>x.professionalReplacementAudit.statuses['pending-evidence']=0,(x:any)=>x.professionalReplacementAudit.oldHeldQuestionsRestored.push(x.questions[0].id)]){const x=structuredClone(d);mutate(x);assert.throws(()=>repair.projectBeforeRepair24(x));}
writeFileSync('../verification/current-audit/professional24-content-historical-regression.json',JSON.stringify({catalogSha256:ability.BASELINE,learningReplacements:20,objectiveLearning:19,manualWritten:1,old2458Unchanged:true,unchangedFormalExamPoolAcrossSeeds:100,twoPaperAssemblies:200,allReplacementIdsExcludedFromExam:true,prohibitedMutationsRejected:6,professionalReadinessVerified:false},null,2));
console.log('20 bounded learning replacements; old content and formal pool unchanged; 200 assemblies and 6 prohibited mutations passed');
