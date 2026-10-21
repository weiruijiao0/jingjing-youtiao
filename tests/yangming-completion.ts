import historical from './historical-catalog.cjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assembleCourseExam,examObjectiveScore} from '../src/examEngine';
import {freshState,validateState,readEnvelope,makeEnvelope} from '../src/learning';
import {scoreCourse} from '../src/Course';
const d=historical.readHistoricalCatalog();
const bank=new Map<string,any>(d.questions.map((q:any)=>[q.id,q])),a=d.questionSourceAudit,b=a.yangmingCompletionBatch;
assert.equal(a.checks.length,1052);assert.equal(a.heldQuestionIds.length,631);assert.equal(a.date,'2026-10-04');
assert.equal(b.questionIds.length,56);assert.equal(new Set(b.questionIds).size,56);assert.equal(b.checkedQuestionIds.length,35);assert.equal(b.heldQuestionIds.length,21);
assert.equal(b.frozenChapterQuestionIds.length,100);assert.equal(b.chapterCheckedQuestionIds.length,67);assert.equal(b.chapterHeldQuestionIds.length,33);assert.equal(b.pendingChapterQuestionIds.length,0);
assert.deepEqual([...b.questionIds].sort(),[...a.yangmingBatch.pendingAfterBatchQuestionIds].sort());assert.equal(a.yangmingBatch.pendingChapterQuestionIds.length,0);
assert.deepEqual([...b.chapterCheckedQuestionIds,...b.chapterHeldQuestionIds].sort(),[...b.frozenChapterQuestionIds].sort());
assert.ok(d.questions.filter((q:any)=>q.classic==='伤寒论'&&q.chapter==='阳明'&&!q.subjective).every((q:any)=>q.sourceCheck||q.professionalHold));
for(const id of b.checkedQuestionIds){
 const q=bank.get(id);assert.equal(q.sourceCheck.batch,'yangming-final-56');assert.equal(q.review,'source-answer-unverified');assert.ok(!q.professionalHold);
 assert.deepEqual(q.answers,q.sourceCheck.original.answers);assert.equal(q.family,q.sourceCheck.original.family);
 for(const flag of ['independentExpertReview','examCalibration','fullRequirementAbilityVerified'])assert.equal(q.sourceCheck[flag],false);
 assert.deepEqual(Object.keys(q.optionReview).sort(),q.options.map((o:any)=>o.id).sort());
 for(const [key,r] of Object.entries(q.optionReview) as [string,any][]){assert.equal(r.selected,q.answers.includes(key));assert.ok(r.reason.trim())}
 assert.ok(q.requirementIds.every((rid:string)=>d.requirementReadings[rid].questionIds.includes(id)&&d.requirementGuides[rid].directQuestionIds.includes(id)));
 assert.equal(scoreCourse(q,q.answers.join(',')),1);
}
for(const [page,hash] of Object.entries(b.sourceImageSha256))assert.equal(createHash('sha256').update(readFileSync(`public/library/F0007/${page.padStart(4,'0')}.jpg`)).digest('hex'),hash);
const get=(prefix:string)=>{const found=[...bank.values()].filter(q=>q.id.startsWith(prefix));assert.equal(found.length,1);return found[0]};
assert.match(get('e0c2a').explanation,/撤去甘澜水清热解毒/);assert.match(get('e0c2a').optionReview.A.reason,/现代替代/);
assert.match(get('78e5b').options[3].text,/颈以下.*头汗/);assert.match(get('78e5b').sourceCheck.original.options[3].text,/无汗/);
assert.match(get('3a926').stem,/224.*汗多胃燥/);assert.match(get('3a926').explanation,/化源不足/);
assert.match(get('85389').professionalHold.reason,/不能.*否定.*不恶寒/);
assert.match(get('a60b9').professionalHold.reason,/尿色不等于排尿不利/);assert.match(get('8554c').professionalHold.reason,/过去表证当当前/);
assert.match(get('50552').professionalHold.reason,/104柴胡加芒硝/);
assert.match(get('eaad0').explanation,/不推断.*绝不能汗出/);assert.match(get('6738e').options[4].text,/一宿腹减/);
assert.match(get('18ba3').optionReview.B.reason,/旧泛称不能一概判错/);
assert.ok(d.requirementReadings.K0428.questionIds.includes(get('5b310').id));assert.match(get('5b310').stem,/身黄如橘子色.*小便不利.*腹微满/);
assert.match(get('b5f0f').optionReview.D.reason,/微字/);assert.match(get('94ac7').optionReview.E.reason,/不宣称.*绝无/);
assert.equal(b.movedQuestionIds.length,6);
for(const id of b.movedQuestionIds){const q=bank.get(id);assert.notEqual(q.chapter,q.sourceCheck.original.chapter);assert.equal(q.sourceCheck.original.chapter,'阳明');const containing=d.courses.filter((c:any)=>c.questionIds.includes(id));assert.equal(containing.length,1);assert.equal(containing[0].title,q.chapter)}
assert.equal(get('4599c').chapter,'厥阴');assert.equal(get('e1f56').chapter,'厥阴');assert.equal(get('dbaf6').chapter,'太阳');
for(const id of b.heldQuestionIds){
 const q=bank.get(id);assert.equal(q.professionalHold.batch,'yangming-final-56');assert.ok(!q.sourceCheck);assert.deepEqual(q.answers,q.professionalHold.original.answers);
 assert.equal(scoreCourse(q,q.answers.join(',')),null);assert.equal(examObjectiveScore(q,q.answers.join(',')),null);
 assert.ok(d.courses.every((c:any)=>!c.questionIds.includes(id)));assert.ok(Object.values(d.requirementGuides).every((g:any)=>!g.directQuestionIds.includes(id)));
 assert.ok(Object.values(d.requirementReadings).every((r:any)=>![...r.questionIds,...(r.articleQuestionIds||[])].includes(id)));
}
assert.equal(Object.keys(b.variantGroups).length,2);
for(let seed=0;seed<40;seed++){
 const e=assembleCourseExam(d.questions,freshState(),()=>seed/40);assert.equal(e.questionIds.length,91);assert.equal(e.missing.length,0);assert.ok(e.questionIds.every(id=>!a.heldQuestionIds.includes(id)));
 const groups=e.questionIds.map(id=>bank.get(id).variantGroup).filter(Boolean);assert.equal(groups.length,new Set(groups).size);
}
for(const ids of Object.values(b.variantGroups) as string[][]){const s=freshState();s.courseExposures=[{question:ids[0],at:new Date().toISOString()}];assert.ok(assembleCourseExam(d.questions,s,()=>0.5).questionIds.every(id=>!ids.includes(id)));s.courseExposures=[];s.courseDraft={question:ids[0],response:'A'};assert.ok(assembleCourseExam(d.questions,s,()=>0.5).questionIds.every(id=>!ids.includes(id)))}
const old=freshState(),id=get('85389').id,now=new Date().toISOString();old.courseDraft={question:id,response:'B,C,D,E'};
old.courseAnswers=[{id:'old-held',question:id,response:'B,C,D,E',score:1,at:now,revealed:true}];old.courseExams=[{id:'old-exam',questionIds:[id],responses:{[id]:'B,C,D,E'},startedAt:now,submittedAt:now}];
const restored=validateState(await readEnvelope(await makeEnvelope(old),'archive'));assert.deepEqual(restored.courseAnswers,old.courseAnswers);assert.deepEqual(restored.courseExams,old.courseExams);assert.deepEqual(restored.courseDraft,old.courseDraft);
console.log('All 100 frozen Yangming questions dispositioned: final 35/21, six chapter corrections, honest pending=0, source hashes, contraindication/ambiguity regressions, 260 direct practice, history and exam exclusions passed');
