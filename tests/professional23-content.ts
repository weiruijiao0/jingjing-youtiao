import repair from './professional24-catalog.cjs';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import strictCase from './professional23-catalog.cjs';
import historical from './historical-catalog.cjs';
import {scoreCourse} from '../src/Course';
import {assembleCourseExam,examBlueprint,examObjectiveScore} from '../src/examEngine';
import {freshState} from '../src/learning';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const d=repair.projectBeforeRepair24(read('public/course/catalog.json')),old=strictCase.projectBeforeCase23(d),bank=new Map<string,any>(d.questions.map((q:any)=>[q.id,q]));
assert.equal(d.questions.length,2458);assert.equal(bank.size,2458);assert.equal(d.questions.filter((q:any)=>!q.professionalHold).length,1827);assert.equal(d.authoredQuestionReviewAudit.checkedQuestionIds.length,777);
assert.equal(old.questions.length,2440);historical.readHistoricalCatalog(d);
const official=readFileSync('../../../work/syllabus-official2026.txt','utf8');const norm=(s:string)=>s.normalize('NFKC').replace(/[\p{P}\p{Z}\s_]+/gu,'');
for(const key of ['shanghan','jinkui','wenbing']){
 const candidates=read(`../../../work/professional23-${key}-candidates.json`),cross=read(`../../../work/professional23-${key}-crossreview.json`);
 assert.equal(candidates.length,6);assert.equal(cross.length,6);for(const r of cross){assert.equal(r.action,'retain');assert.ok(r.reason);assert.equal(r.candidateFileSha256,historical.sha256(readFileSync(`../../../work/professional23-${key}-candidates.json`)));assert.equal(r.independentExpertReview,false);}
}
for(const id of strictCase.ids){const q=bank.get(id);assert.ok(q&&!q.professionalHold&&!q.assessmentOnly);assert.equal(q.type,'A3型题');assert.equal(q.subjective,false);assert.equal(q.family,q.variantGroup);assert.equal(q.family,q.caseGroup.id);assert.equal(q.caseGroup.fictional,true);assert.equal(q.caseGroup.questionCount,3);assert.ok(q.stem.includes(q.caseGroup.caseText));assert.deepEqual(q.options.map((o:any)=>o.id),['A','B','C','D','E']);assert.equal(q.answers.length,1);
 for(const o of q.options){assert.equal(q.optionReview[o.id].selected,q.answers.includes(o.id));assert.ok(q.optionReview[o.id].reason);assert.equal(scoreCourse(q,o.id),q.answers.includes(o.id)?1:0);}assert.equal(examObjectiveScore(q,q.answers[0]),1);
 for(const s of [...q.scopeQuotes,...(q.comparisonScopeQuotes||[])]){assert.equal(s.scope,d.requirementGuides[s.requirementId].scope);assert.ok(norm(official).includes(norm(s.scope)));if(q.scopeQuotes.includes(s))assert.ok(q.requirementIds.includes(s.requirementId));else if(q.comparisonRequirementIds)assert.ok(q.comparisonRequirementIds.includes(s.requirementId));}
 for(const rid of q.requirementIds){assert.ok(d.requirementGuides[rid].directQuestionIds.includes(id));assert.ok(d.requirementReadings[rid].questionIds.includes(id));assert.deepEqual(d.requirementGuides[rid].directAssessment,old.requirementGuides[rid].directAssessment);}
 for(const e of q.evidenceLinks){if(e.ocrFileSha256)assert.equal(historical.sha256(readFileSync(`../../../work/ocr-F0007/${String(e.page).padStart(4,'0')}.json`)),e.ocrFileSha256);}
 for(const related of q.relatedExistingQuestionIds||[])assert.ok(bank.has(related),`Related old question exists: ${related}`);
 for(const k of ['independentExpertReview','examCalibration','fullRequirementAbilityVerified'])assert.equal(q[k],false);assert.ok(q.authoredReview.coverage.tested.length&&q.authoredReview.coverage.notTested.length);
}
for(const id of d.professionalCaseSupplementAudit.caseGroupIds){const qs=strictCase.ids.map((id:string)=>bank.get(id)).filter((q:any)=>q.family===id);assert.deepEqual(qs.map((q:any)=>q.caseGroup.questionIndex),[1,2,3]);assert.equal(new Set(qs.map((q:any)=>q.caseGroup.caseText)).size,1);}
const samples=[];const seenNew=new Set();
for(let seed=1;seed<=500;seed++){let v=seed;const random=()=>{v=(Math.imul(v,1664525)+1013904223)>>>0;return v/4294967296};const s=freshState();const used=new Set<string>(),variants=new Set<string>();
 for(let n=1;n<=2;n++){const result=assembleCourseExam(d.questions,s,random);assert.deepEqual(result.missing,[],`seed ${seed} paper ${n}`);assert.equal(result.questionIds.length,91);const qs=result.questionIds.map(id=>bank.get(id));assert.equal(new Set(qs.map(q=>q.family)).size,91);
  for(const [type,count]of examBlueprint)assert.equal(qs.filter(q=>q.type===type||(type==='X型题'&&q.type==='多选题')).length,count);
  for(const q of qs){assert.ok(!q.professionalHold&&!q.assessmentOnly);assert.ok(!used.has(q.family));used.add(q.family);if(q.variantGroup){assert.ok(!variants.has(q.variantGroup));variants.add(q.variantGroup);}if(strictCase.ids.includes(q.id))seenNew.add(q.id);}
  s.courseExams.push({id:`isolated-${n}`,questionIds:result.questionIds,startedAt:new Date().toISOString(),submittedAt:new Date().toISOString(),responses:{}});
 }samples.push({seed,papers:2,questions:182});}
assert.equal(seenNew.size,18);
const exposed=freshState(),shared=d.questions.find((q:any)=>q.type==='X型题'&&q.variantGroup==='shuiqi-11-same-ke-xia'&&!q.professionalHold);assert.ok(shared);exposed.courseExposures=[{question:shared.id,at:new Date().toISOString()}];for(let n=0;n<2;n++){const r=assembleCourseExam(d.questions,exposed,()=>0.4);assert.deepEqual(r.missing,[]);assert.equal(r.questionIds.length,91);assert.ok(r.questionIds.every(id=>bank.get(id).variantGroup!=='shuiqi-11-same-ke-xia'));exposed.courseExams.push({id:`forced-water-${n}`,questionIds:r.questionIds,startedAt:new Date().toISOString(),submittedAt:new Date().toISOString(),responses:{}});}
const defects=[(x:any)=>x.questions[0].explanation+='unreviewed',(x:any)=>x.requirementGuides.K0274.scope+='outside syllabus',(x:any)=>x.questions.at(-1).answers=['A','B'],(x:any)=>x.professionalCaseSupplementAudit.completeCaseGroupExamSupported=true,(x:any)=>x.authoredQuestionReviewAudit.batches['written152-20'].questionIds.pop(),(x:any)=>x.courses[0].questionIds.push(strictCase.ids[0])];for(const mutate of defects){const x=structuredClone(d);mutate(x);assert.throws(()=>strictCase.projectBeforeCase23(x));}
writeFileSync('../verification/current-audit/professional23-two-paper-historical-regression.json',JSON.stringify({date:'2026-10-07',catalogSha256:repair.BASELINE,seeds:500,papers:1000,complete:1000,newItemsActuallySampled:seenNew.size,negativeMutationsRejected:6,sharedWaterVariantPreExposureTwoPapers:true,completeCaseGroupExamSupported:false,examCalibration:false,note:'Two fresh unused papers under existing one-question-per-family engine; seed checks are not exam or difficulty calibration.',samples},null,2));
console.log('18 bounded case questions, frozen old content, 500 seeds / 1000 two-paper assemblies and 6 prohibited mutations passed');
