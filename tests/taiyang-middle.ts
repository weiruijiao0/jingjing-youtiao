import historical from './historical-catalog.cjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assembleCourseExam,examObjectiveScore} from '../src/examEngine';
import {scoreCourse} from '../src/Course';
import {freshState,makeEnvelope,readEnvelope,validateState} from '../src/learning';
const d=historical.readHistoricalCatalog();
const a=d.questionSourceAudit,b=a.taiyangMiddleBatch,bank=new Map<string,any>(d.questions.map((q:any)=>[q.id,q]));
const old=JSON.parse(readFileSync('../../../work/taiyang-middle-before-oct04-catalog.json','utf8'));
const frozen=JSON.parse(readFileSync('../../../work/taiyang-audit-oct04-targets.json','utf8'));
const original=new Map<string,any>(frozen.questions.map((q:any)=>[q.id,q]));
const selected=JSON.parse(readFileSync('../../../work/taiyang-middle-80-targets.json','utf8'));
assert.equal(d.questions.length,2417);assert.equal(bank.size,2417);
assert.equal(a.checks.length,1052);assert.equal(a.heldQuestionIds.length,631);
assert.equal(b.questionIds.length,80);assert.equal(new Set(b.questionIds).size,80);
assert.equal(b.checkedQuestionIds.length,70);assert.equal(b.heldQuestionIds.length,10);
assert.deepEqual([...b.questionIds].sort(),selected.map((q:any)=>q.id).sort());
assert.equal(b.pendingChapterQuestionIds.length,0);assert.equal(b.pendingAfterBatchQuestionIds.length,84);assert.equal(b.chapterCheckedQuestionIds.length,95);assert.equal(b.chapterHeldQuestionIds.length,25);
assert.deepEqual([...b.chapterCheckedQuestionIds,...b.chapterHeldQuestionIds,...b.pendingAfterBatchQuestionIds].sort(),[...b.frozenChapterQuestionIds].sort());
assert.equal(a.taiyangBatch.pendingAfterBatchQuestionIds.length,164);
assert.deepEqual(a.taiyangBatch.pendingChapterQuestionIds,b.pendingChapterQuestionIds);
for(const id of b.pendingChapterQuestionIds){const q=bank.get(id);assert.ok(!q.sourceCheck&&!q.professionalHold)}
for(const q of old.questions)if(!b.questionIds.includes(q.id)&&!a.taiyangCompletionBatch.questionIds.includes(q.id)&&!a.shaoyangBatch.questionIds.includes(q.id)&&!a.tanyinBatch.questionIds.includes(q.id)&&!a.shuiqiBatch.questionIds.includes(q.id)&&!a.all1099Batch.questionIds.includes(q.id)&&!d.authoredQuestionReviewAudit.questionIds.includes(q.id))assert.deepEqual(bank.get(q.id),q);
for(const id of b.questionIds){
 const q=bank.get(id),o=original.get(id),decision=q.sourceCheck||q.professionalHold;
 assert.equal(q.review,'source-answer-unverified');assert.equal(q.family,o.family);assert.deepEqual(q.answers,o.answers);
 for(const key of ['stem','options','answers','explanation','reference','chapter','classic','family'])assert.deepEqual(decision.original[key],o[key]);
}
for(const id of b.checkedQuestionIds){
 const q=bank.get(id);assert.equal(q.sourceCheck.batch,'taiyang-middle-80');assert.ok(!q.professionalHold);
 for(const key of ['independentExpertReview','examCalibration','fullRequirementAbilityVerified'])assert.equal(q.sourceCheck[key],false);
 assert.deepEqual(Object.keys(q.optionReview).sort(),q.options.map((o:any)=>o.id).sort());
 for(const [key,r] of Object.entries(q.optionReview) as [string,any][]){assert.equal(r.selected,q.answers.includes(key));assert.ok(r.reason)}
 for(const rid of q.requirementIds){assert.ok(d.requirementGuides[rid].directQuestionIds.includes(id));assert.ok(d.requirementReadings[rid].questionIds.includes(id))}
 assert.equal(scoreCourse(q,q.answers.join(',')),1);if(q.answers.length>1)assert.equal(scoreCourse(q,q.answers[0]),0);
}
for(const id of b.heldQuestionIds){
 const q=bank.get(id);assert.equal(q.professionalHold.batch,'taiyang-middle-80');assert.ok(!q.sourceCheck);
 assert.equal(scoreCourse(q,q.answers.join(',')),null);assert.equal(examObjectiveScore(q,q.answers.join(',')),null);
 assert.deepEqual(q.requirementIds,[]);assert.ok(d.courses.every((c:any)=>!c.questionIds.includes(id)));
 assert.ok(Object.values(d.requirementGuides).every((g:any)=>!g.directQuestionIds.includes(id)));
 assert.ok(Object.values(d.requirementReadings).every((r:any)=>![...r.questionIds,...(r.articleQuestionIds||[])].includes(id)));
}
for(const [file,hash] of Object.entries(b.sourceFileSha256))assert.equal(createHash('sha256').update(readFileSync(`public/${file}`)).digest('hex'),hash);
assert.ok(b.sourceFileSha256['library/F0012.pdf']);
assert.deepEqual([...a.checks].sort(),d.questions.filter((q:any)=>q.sourceCheck?.status==='single-source-comparison'&&!q.professionalHold).map((q:any)=>q.id).sort());
assert.deepEqual([...a.heldQuestionIds].sort(),d.questions.filter((q:any)=>q.professionalHold).map((q:any)=>q.id).sort());
const get=(prefix:string)=>{const found=[...bank.values()].filter(q=>q.id.startsWith(prefix));assert.equal(found.length,1);return found[0]};
assert.match(get('c7118898').professionalHold.reason,/159条直接明列心下痞硬/);
assert.equal(get('c7118898').professionalHold.evidenceLinks[0].source,'F0012');
assert.equal(get('c7118898').professionalHold.evidenceLinks[0].page,54);
assert.match(get('2fff7e7a').professionalHold.reason,/旧答案E.*旧解析.*C/);
assert.match(get('5bff7987').professionalHold.reason,/包含B/);
assert.match(get('c9585477').professionalHold.reason,/自行补成痞利俱甚/);
assert.match(get('d4c31237').professionalHold.reason,/混同噫气与呃逆/);
assert.match(get('33b790e9').professionalHold.reason,/不把检索摘要/);
assert.match(get('3d5afe79').stem,/两味药散.*另煎/);assert.equal(get('3d5afe79').answers.join(','),'C');
assert.match(get('3d5afe79').optionReview.B.reason,/正确列出二味药散/);
assert.match(get('f3dcc346').optionReview.A.reason,/香豉另煮/);
assert.match(get('f38c9f51').options.find((o:any)=>o.id==='C').text,/下少/);
assert.ok(!get('df6ecc4e').options.find((o:any)=>o.id==='C').text.includes('手足'));
assert.ok(!get('6adc4e3d').stem.includes('裂中'));assert.ok(!get('6adc4e3d').stem.includes('白滑款'));
assert.match(get('306a1c39').stem,/针对水停/);assert.match(get('306a1c39').explanation,/不能一概判C完全错误/);
assert.match(get('133a2207').optionReview.B.reason,/相容/);
assert.match(get('8b8e0d00').explanation,/项亦强/);
assert.match(get('e06556b3').stem,/微汗/);assert.match(get('e06556b3').explanation,/发黄分支/);
assert.match(get('2f37aa68').explanation,/按濡不痛/);
assert.match(get('dc43b895').explanation,/一法十二枚/);
assert.match(get('0527080a').explanation,/归桂枝甘草龙骨牡蛎不当/);
assert.match(get('731e67b0').explanation,/不是痰气痞/);
assert.match(get('9352a007').stem,/其他部位兼痛/);
for(let seed=0;seed<40;seed++){
 const exam=assembleCourseExam(d.questions,freshState(),()=>seed/40);
 assert.equal(exam.questionIds.length,91);assert.deepEqual(exam.missing,[]);
 assert.ok(exam.questionIds.every(id=>!a.heldQuestionIds.includes(id)));
 const groups=exam.questionIds.map(id=>bank.get(id).variantGroup).filter(Boolean);assert.equal(groups.length,new Set(groups).size);
}
assert.equal(Object.keys(b.variantGroups).length,4);
for(const ids of Object.values(b.variantGroups) as string[][]){
 const s=freshState();s.courseExposures=[{question:ids[0],at:new Date().toISOString()}];
 assert.ok(assembleCourseExam(d.questions,s,()=>0.5).questionIds.every(id=>!ids.includes(id)));
}
const state=freshState(),id=b.heldQuestionIds[0],now=new Date().toISOString();
state.courseDraft={question:id,response:'E'};state.courseAnswers=[{id:'legacy-middle',question:id,response:'E',score:1,at:now,revealed:true}];
state.courseExams=[{id:'legacy-middle-exam',questionIds:[id],responses:{[id]:'E'},startedAt:now,submittedAt:now}];
const restored=validateState(await readEnvelope(await makeEnvelope(state),'archive'));
assert.deepEqual(restored.courseDraft,state.courseDraft);assert.deepEqual(restored.courseAnswers,state.courseAnswers);assert.deepEqual(restored.courseExams,state.courseExams);
console.log('80 dispositions (70 compared / 10 held), original keys and other content, sources, 159/166 contradictions, omitted conditions, four variant groups, exams and legacy records passed');
