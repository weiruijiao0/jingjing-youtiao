import historical from './historical-catalog.cjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assembleCourseExam,examObjectiveScore} from '../src/examEngine';
import {freshState,makeEnvelope,readEnvelope,validateState} from '../src/learning';
import {scoreCourse} from '../src/Course';
const d=historical.readHistoricalCatalog();
const a=d.questionSourceAudit,b=a.taiyangBatch,bank=new Map<string,any>(d.questions.map((q:any)=>[q.id,q]));
const frozen=JSON.parse(readFileSync('../../../work/taiyang-audit-oct04-targets.json','utf8'));
const originals=new Map<string,any>(frozen.questions.map((q:any)=>[q.id,q]));
const before=JSON.parse(readFileSync('../../../work/taiyang-before-oct04-catalog.json','utf8'));
assert.equal(d.questions.length,2417);assert.equal(bank.size,2417);
assert.equal(a.checks.length,1052);assert.equal(a.heldQuestionIds.length,631);
assert.equal(b.questionIds.length,40);assert.equal(new Set(b.questionIds).size,40);
assert.equal(b.checkedQuestionIds.length,25);assert.equal(b.heldQuestionIds.length,15);
assert.equal(b.frozenChapterQuestionIds.length,204);assert.equal(b.pendingChapterQuestionIds.length,0);assert.equal(b.pendingAfterBatchQuestionIds.length,164);
assert.deepEqual([...b.checkedQuestionIds,...b.heldQuestionIds,...b.pendingAfterBatchQuestionIds].sort(),[...b.frozenChapterQuestionIds].sort());
assert.equal(b.independentExpertReview,false);assert.equal(b.examCalibration,false);
const affected=new Set(b.questionIds);
for(const q of before.questions)if(!affected.has(q.id)&&!a.taiyangMiddleBatch.questionIds.includes(q.id)&&!a.taiyangCompletionBatch.questionIds.includes(q.id)&&!a.shaoyangBatch.questionIds.includes(q.id)&&!a.tanyinBatch.questionIds.includes(q.id)&&!a.shuiqiBatch.questionIds.includes(q.id)&&!a.all1099Batch.questionIds.includes(q.id)&&!d.authoredQuestionReviewAudit.questionIds.includes(q.id))assert.deepEqual(bank.get(q.id),q);
for(const id of b.questionIds){
 const q=bank.get(id),old=originals.get(id),decision=q.sourceCheck||q.professionalHold;
 assert.ok(old);assert.equal(q.review,'source-answer-unverified');assert.equal(q.family,old.family);
 assert.deepEqual(q.answers,old.answers);assert.equal(q.classic,old.classic);assert.equal(q.chapter,old.chapter);
 for(const key of ['stem','options','answers','explanation','reference','chapter','classic','family'])assert.deepEqual(decision.original[key],old[key]);
}
assert.deepEqual([...a.checks].sort(),d.questions.filter((q:any)=>q.sourceCheck?.status==='single-source-comparison'&&!q.professionalHold).map((q:any)=>q.id).sort());
assert.deepEqual([...a.heldQuestionIds].sort(),d.questions.filter((q:any)=>q.professionalHold).map((q:any)=>q.id).sort());
for(const id of b.checkedQuestionIds){
 const q=bank.get(id);assert.equal(q.sourceCheck.batch,'taiyang-first-40');assert.ok(!q.professionalHold);
 for(const key of ['independentExpertReview','examCalibration','fullRequirementAbilityVerified'])assert.equal(q.sourceCheck[key],false);
 assert.deepEqual(Object.keys(q.optionReview).sort(),q.options.map((o:any)=>o.id).sort());
 for(const [key,r] of Object.entries(q.optionReview) as [string,any][]){assert.equal(r.selected,q.answers.includes(key));assert.ok(r.reason)}
 for(const rid of q.requirementIds){assert.ok(d.requirementGuides[rid].directQuestionIds.includes(id));assert.ok(d.requirementReadings[rid].questionIds.includes(id))}
}
for(const [page,hash] of Object.entries(b.sourceImageSha256))assert.equal(createHash('sha256').update(readFileSync(`public/library/F0007/${page.padStart(4,'0')}.jpg`)).digest('hex'),hash);
for(const id of b.heldQuestionIds){
 const q=bank.get(id);assert.equal(q.professionalHold.batch,'taiyang-first-40');assert.ok(!q.sourceCheck);
 assert.equal(scoreCourse(q,q.answers.join(',')),null);assert.equal(examObjectiveScore(q,q.answers.join(',')),null);
 assert.deepEqual(q.requirementIds,[]);assert.ok(d.courses.every((c:any)=>!c.questionIds.includes(id)));
 assert.ok(Object.values(d.requirementGuides).every((g:any)=>!g.directQuestionIds.includes(id)));
 assert.ok(Object.values(d.requirementReadings).every((r:any)=>![...r.questionIds,...(r.articleQuestionIds||[])].includes(id)));
}
const get=(prefix:string)=>{const found=[...bank.values()].filter(q=>q.id.startsWith(prefix));assert.equal(found.length,1);return found[0]};
assert.match(get('4c61aeb9').professionalHold.reason,/单选不唯一/);
assert.match(get('16823c5f').professionalHold.reason,/含义可重叠/);
for(const prefix of ['fff62851','a0223da1'])assert.match(get(prefix).professionalHold.reason,/没有24条/);
assert.match(get('c5effede').professionalHold.reason,/没有第4条/);
assert.match(get('95c1e792').professionalHold.reason,/第17条/);
assert.match(get('37e32c94').professionalHold.reason,/舌红苔黄脉浮数/);
assert.match(get('1f9aab98').professionalHold.reason,/版本限定/);
assert.match(get('cb3aeb9a').explanation,/没有的E.*移除/);assert.equal(get('cb3aeb9a').options.length,4);
assert.match(get('28e2e152').explanation,/芍药甘草附子为68条复阳益阴/);
assert.match(get('5f8a769d').explanation,/不恶寒.*恶寒轻微/);
assert.match(get('655c5574').stem,/中风、伤寒.*已经出现发热/);
assert.match(get('3778d551').explanation,/不等于临床.*必须呕逆/);
assert.match(get('96fed491').explanation,/12条中风同样明列恶寒/);
assert.match(get('c665306d').stem,/直接明列/);assert.match(get('c665306d').explanation,/不能说喘是所有/);
assert.match(get('d4e3a13b').explanation,/不要求必须有新感风寒/);
assert.match(get('30632f34').explanation,/不能单凭服牛黄解毒片/);
assert.match(get('79bf2d3c').explanation,/不能证明抗菌药本身/);
assert.equal(b.repairQuestionIds.length,3);
for(const [rid,answer] of [['K0121','B'],['K0381','A,B,C'],['K0382','A,B']]){
 const q=bank.get(`professional-${rid}-taiyang-oct04`);assert.ok(b.repairQuestionIds.includes(q.id));
 assert.equal(q.review,'authored-image-checked');assert.equal(q.independentExpertReview,false);assert.equal(q.examCalibration,false);
 assert.deepEqual(q.requirementIds,[rid]);assert.ok(d.requirementGuides[rid].directQuestionIds.includes(q.id));
 assert.ok(d.requirementReadings[rid].questionIds.includes(q.id));assert.ok(q.evidenceLinks.length);
 assert.equal(scoreCourse(q,answer),1);if(q.answers.length>1)assert.equal(scoreCourse(q,q.answers[0]),0);
 assert.deepEqual(Object.keys(q.optionReview).sort(),q.options.map((o:any)=>o.id).sort());
}
assert.equal(Object.keys(b.variantGroups).length,3);
for(let seed=0;seed<40;seed++){
 const exam=assembleCourseExam(d.questions,freshState(),()=>seed/40);
 assert.equal(exam.questionIds.length,91);assert.equal(exam.missing.length,0);
 assert.ok(exam.questionIds.every(id=>!a.heldQuestionIds.includes(id)));
 const groups=exam.questionIds.map(id=>bank.get(id).variantGroup).filter(Boolean);assert.equal(groups.length,new Set(groups).size);
}
for(const ids of Object.values(b.variantGroups) as string[][]){
 const s=freshState();s.courseExposures=[{question:ids[0],at:new Date().toISOString()}];
 assert.ok(assembleCourseExam(d.questions,s,()=>0.5).questionIds.every(id=>!ids.includes(id)));
}
const old=freshState(),id=b.heldQuestionIds[0],now=new Date().toISOString();
old.courseDraft={question:id,response:'D'};
old.courseAnswers=[{id:'before-taiyang-review',question:id,response:'D',score:1,at:now,revealed:true}];
old.courseExams=[{id:'before-taiyang-exam',questionIds:[id],responses:{[id]:'D'},startedAt:now,submittedAt:now}];
const restored=validateState(await readEnvelope(await makeEnvelope(old),'archive'));
assert.deepEqual(restored.courseDraft,old.courseDraft);assert.deepEqual(restored.courseAnswers,old.courseAnswers);assert.deepEqual(restored.courseExams,old.courseExams);
console.log('Taiyang 40 dispositions (25 compared / 15 held), three in-scope repairs, original snapshots, unchanged other questions, evidence hashes, ambiguity and scope cases, exam exclusions, variants and legacy archives passed');
