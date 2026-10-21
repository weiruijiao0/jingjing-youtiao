import historical from './historical-catalog.cjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assembleCourseExam,examObjectiveScore} from '../src/examEngine';
import {scoreCourse} from '../src/Course';
import {freshState,makeEnvelope,readEnvelope,validateState} from '../src/learning';
const d=historical.readHistoricalCatalog();
const a=d.questionSourceAudit,b=a.taiyangCompletionBatch,bank=new Map<string,any>(d.questions.map((q:any)=>[q.id,q]));
const beforeBytes=readFileSync('../../../work/taiyang-final-before-oct04-catalog.json');
const before=JSON.parse(beforeBytes.toString('utf8'));
const selected=JSON.parse(readFileSync('../../../work/taiyang-remaining84-oct04-targets.json','utf8'));
const chapter=JSON.parse(readFileSync('../../../work/taiyang-audit-oct04-targets.json','utf8'));
assert.equal(selected.catalogSha256,createHash('sha256').update(beforeBytes).digest('hex'));
assert.equal(d.questions.length,2417);assert.equal(bank.size,2417);
assert.equal(a.checks.length,1052);assert.equal(a.heldQuestionIds.length,631);
assert.equal(b.questionIds.length,84);assert.equal(new Set(b.questionIds).size,84);
assert.equal(b.checkedQuestionIds.length,60);assert.equal(b.heldQuestionIds.length,24);assert.equal(b.repairQuestionIds.length,2);
assert.deepEqual([...b.questionIds].sort(),selected.questions.map((q:any)=>q.id).sort());
assert.equal(b.pendingChapterQuestionIds.length,0);assert.equal(b.chapterCheckedQuestionIds.length,155);assert.equal(b.chapterHeldQuestionIds.length,49);
assert.deepEqual([...b.chapterCheckedQuestionIds,...b.chapterHeldQuestionIds].sort(),chapter.questions.map((q:any)=>q.id).sort());
assert.equal(a.taiyangBatch.pendingAfterBatchQuestionIds.length,164);assert.equal(a.taiyangMiddleBatch.pendingAfterBatchQuestionIds.length,84);
assert.deepEqual(a.taiyangBatch.pendingChapterQuestionIds,[]);assert.deepEqual(a.taiyangMiddleBatch.pendingChapterQuestionIds,[]);
for(const q of before.questions)if(!b.questionIds.includes(q.id)&&!a.shaoyangBatch.questionIds.includes(q.id)&&!a.tanyinBatch.questionIds.includes(q.id)&&!a.shuiqiBatch.questionIds.includes(q.id)&&!a.all1099Batch.questionIds.includes(q.id)&&!d.authoredQuestionReviewAudit.questionIds.includes(q.id))assert.deepEqual(bank.get(q.id),q);
assert.deepEqual(d.questions.filter((q:any)=>!before.questions.some((p:any)=>p.id===q.id)).map((q:any)=>q.id).sort(),[...b.repairQuestionIds,...a.shaoyangBatch.repairQuestionIds,...a.tanyinBatch.repairQuestionIds,...a.shuiqiBatch.repairQuestionIds,...a.all1099Batch.repairQuestionIds,...a.all1099Batch.caseQuestionIds].sort());
const original=new Map<string,any>(chapter.questions.map((q:any)=>[q.id,q]));
for(const id of b.questionIds){
 const q=bank.get(id),o=original.get(id),decision=q.sourceCheck||q.professionalHold;
 assert.equal(q.review,'source-answer-unverified');assert.deepEqual(q.answers,o.answers);assert.equal(q.family,o.family);
 for(const key of ['stem','options','answers','explanation','reference','chapter','classic','family'])assert.deepEqual(decision.original[key],o[key]);
}
for(const id of [...b.checkedQuestionIds,...b.repairQuestionIds]){
 const q=bank.get(id),flag=q.sourceCheck||q;
 assert.ok(!q.professionalHold);for(const key of ['independentExpertReview','examCalibration','fullRequirementAbilityVerified'])assert.equal(flag[key],false);
 assert.deepEqual(Object.keys(q.optionReview).sort(),q.options.map((o:any)=>o.id).sort());
 for(const [key,r] of Object.entries(q.optionReview) as [string,any][]){assert.equal(r.selected,q.answers.includes(key));assert.ok(r.reason)}
 for(const rid of q.requirementIds){assert.ok(d.requirementGuides[rid].directQuestionIds.includes(id));assert.ok(d.requirementReadings[rid].questionIds.includes(id))}
 assert.equal(scoreCourse(q,q.answers.join(',')),1);if(q.answers.length>1)assert.equal(scoreCourse(q,q.answers[0]),0);
}
for(const id of b.heldQuestionIds){
 const q=bank.get(id);assert.equal(q.professionalHold.batch,'taiyang-final-84');assert.ok(!q.sourceCheck);
 assert.equal(scoreCourse(q,q.answers.join(',')),null);assert.equal(examObjectiveScore(q,q.answers.join(',')),null);
 assert.deepEqual(q.requirementIds,[]);assert.ok(d.courses.every((c:any)=>!c.questionIds.includes(id)));
 assert.ok(Object.values(d.requirementGuides).every((g:any)=>!g.directQuestionIds.includes(id)));
 assert.ok(Object.values(d.requirementReadings).every((r:any)=>![...r.questionIds,...(r.articleQuestionIds||[])].includes(id)));
}
for(const [file,hash] of Object.entries(b.sourceFileSha256))assert.equal(createHash('sha256').update(readFileSync(`public/${file}`)).digest('hex'),hash);
assert.deepEqual([...a.checks].sort(),d.questions.filter((q:any)=>q.sourceCheck?.status==='single-source-comparison'&&!q.professionalHold).map((q:any)=>q.id).sort());
assert.deepEqual([...a.heldQuestionIds].sort(),d.questions.filter((q:any)=>q.professionalHold).map((q:any)=>q.id).sort());
const get=(prefix:string)=>{const found=[...bank.values()].filter(q=>q.id.startsWith(prefix));assert.equal(found.length,1);return found[0]};
assert.match(get('517ceb4f').options.find((o:any)=>o.id==='D').text,/栝楼实/);
assert.match(get('517ceb4f').optionReview.C.reason,/去黄芩/);assert.match(get('517ceb4f').explanation,/不是加栝楼根/);
assert.match(get('e3ccfa0f').explanation,/全方.*四两/);assert.match(get('5ebb50f1').explanation,/本方原无参/);
assert.match(get('87350fb3').explanation,/不能直接称里热下利/);
assert.match(get('7f24b955').professionalHold.reason,/B与E均有/);
assert.match(get('e4ac2c60').professionalHold.reason,/有无表证均可/);
assert.match(get('80fe1f65').professionalHold.reason,/泽泻汤误写水停下焦/);
for(const prefix of ['92760e06','61962b4c','64a8b909','aba80f24','7060919e','3b5535c7'])assert.match(get(prefix).professionalHold.reason,/未选|未.*所选|所选无|所选没有/);
assert.match(get('96e466c9').professionalHold.reason,/不能.*白喉|不足.*白喉/);
assert.match(get('b11c69a1').professionalHold.reason,/375/);
assert.match(get('ea16edba').stem,/直接写出/);assert.match(get('25065e12').stem,/106.*直接/);
assert.match(get('8c268a7a').options.find((o:any)=>o.id==='B').text,/胸满/);
assert.match(get('8c268a7a').explanation,/AD对.*冲突/);
for(const [rid,key] of [['K0128','B'],['K0605','A,B,C']]){
 const q=bank.get(`professional-${rid}-taiyang-final-oct04`);assert.equal(q.review,'authored-image-checked');assert.equal(q.answers.join(','),key);
 assert.deepEqual(q.requirementIds,[rid]);assert.equal(q.authoringBatch,'taiyang-final-84-repair');
}
assert.equal(Object.keys(b.variantGroups).length,4);
for(let seed=0;seed<40;seed++){
 const exam=assembleCourseExam(d.questions,freshState(),()=>seed/40);assert.equal(exam.questionIds.length,91);assert.deepEqual(exam.missing,[]);
 assert.ok(exam.questionIds.every(id=>!a.heldQuestionIds.includes(id)));
 const groups=exam.questionIds.map(id=>bank.get(id).variantGroup).filter(Boolean);assert.equal(groups.length,new Set(groups).size);
}
for(const ids of Object.values(b.variantGroups) as string[][]){
 const state=freshState();state.courseExposures=[{question:ids[0],at:new Date().toISOString()}];
 assert.ok(assembleCourseExam(d.questions,state,()=>0.5).questionIds.every(id=>!ids.includes(id)));
}
const state=freshState(),id=b.heldQuestionIds[0],now=new Date().toISOString();
state.courseDraft={question:id,response:'D'};state.courseAnswers=[{id:'legacy-final',question:id,response:'D',score:1,at:now,revealed:true}];
state.courseExams=[{id:'legacy-final-exam',questionIds:[id],responses:{[id]:'D'},startedAt:now,submittedAt:now}];
const restored=validateState(await readEnvelope(await makeEnvelope(state),'archive'));
assert.deepEqual(restored.courseDraft,state.courseDraft);assert.deepEqual(restored.courseAnswers,state.courseAnswers);assert.deepEqual(restored.courseExams,state.courseExams);
console.log('Final 84 dispositions (60 compared / 24 held), 204 originals fully partitioned, two in-scope repairs, old keys and other content preserved, sources, medical/scope contradictions, unseen variants, 40 exam seeds and legacy archives passed');
