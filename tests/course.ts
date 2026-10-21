import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {freshState,validateState,makeEnvelope,readEnvelope,mergeRestore} from '../src/learning.ts';
import {scoreCourse} from '../src/Course.tsx';
const data=JSON.parse(readFileSync('public/course/catalog.json','utf8'));
assert.equal(data.questions.length,2484);
const reqs=data.courses.flatMap((c:any)=>c.requirements.map((r:any)=>r.id));
assert.equal(reqs.length,712);assert.equal(new Set(reqs).size,712);
assert.equal(new Set(data.questions.map((q:any)=>q.id)).size,2484);
assert.ok(!data.questions.some((q:any)=>q.id.startsWith('0d6e9fbb7800')));
for(const q of data.questions) {
 assert.ok(q.explanation.length);assert.ok(q.row>=((q.id.startsWith('special-')||q.id.startsWith('supplemental22-'))?1:2)); // New pack uses syllabus PDF pages; imported banks use spreadsheet rows.
 if(q.professionalHold){assert.equal(scoreCourse(q,q.answers.join(',')),null)}
 else if(q.subjective){assert.equal(q.options.length,0);assert.equal(scoreCourse(q,'任何文字'),null)}
 else {assert.equal(scoreCourse(q,q.answers.join(',')),1);assert.equal(scoreCourse(q,''),0)}
}
const multi=data.questions.find((q:any)=>q.answers.length>1&&!q.professionalHold);
assert.equal(scoreCourse(multi,multi.answers.toReversed().join(',')),1);
assert.equal(scoreCourse(multi,multi.answers[0]),0);
const s=freshState();
const old:any=structuredClone(s);delete old.courseAnswers;delete old.courseDraft;
assert.deepEqual(validateState(old).courseAnswers,[]);
s.courseAnswers=[{id:'test-answer',question:multi.id,response:multi.answers.join(','),score:1,at:new Date().toISOString(),revealed:true}];
s.courseDraft={question:multi.id,response:'A'};
const restored=validateState(await readEnvelope(await makeEnvelope(s),'archive'));
assert.deepEqual(restored.courseAnswers,s.courseAnswers);assert.deepEqual(restored.courseDraft,s.courseDraft);
assert.equal(mergeRestore(s,validateState(old)).courseAnswers.length,1);
assert.equal(mergeRestore(s,restored).courseAnswers.length,1);
writeFileSync('../verification/course-results.json',JSON.stringify({passed:true,requirements:712,questions:2484,types:data.scheme.types,checks:['答案及选项完整性','冲突隔离','多选精确集合判分','主观题不自动判分','旧档升级','备份草稿和记录','恢复合并不丢失不重复']},null,2));
console.log('Course data and persistence checks passed');
