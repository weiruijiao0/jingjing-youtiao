const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium,expect}=require('@playwright/test');
const d=JSON.parse(fs.readFileSync('public/course/catalog.json','utf8'));
(async()=>{
 const b=await chromium.launch({channel:'msedge',headless:true}),p=await b.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 const q=d.questions.find(q=>q.id.startsWith('015cb'));
 const held=d.questions.find(q=>q.id===d.questionSourceAudit.objectiveBatch.heldQuestionIds[0]);
 const state=()=>p.evaluate(async()=>await(await import('/src/learningStore.ts')).loadLearning());
 try{
  await p.goto('http://127.0.0.1:5185/#/course');await p.getByRole('heading',{name:'按考纲，逐章学与练。'}).waitFor();
  await p.locator('.question-review-summary summary').click();
  await expect(p.locator('.question-review-summary')).toContainText('29 道已补题干限定');
  await p.evaluate(async id=>{const m=await import('/src/learningStore.ts'),s=await m.loadLearning();await m.saveLearning({...s,courseDraft:{question:id,response:''},courseAnswers:[{id:'old-objective-result',question:id,response:'B',score:0,at:new Date().toISOString(),revealed:true}]},s.revision)},q.id);
  await p.reload();await expect(p.locator('.course-question h2')).toBeVisible();
  await expect(p.locator('.objective-option-review')).toHaveCount(0);await expect(p.locator('.original-question-record')).toHaveCount(0);
  await expect(p.locator('.course-question')).not.toContainText('藏之长');
  await p.locator('.course-question .answer-options button').first().click();
  await p.getByRole('button',{name:'提交并查看解析',exact:true}).click();
  await expect(p.locator('.objective-option-review')).toContainText(q.optionReview.B.reason);
  await expect(p.locator('.objective-option-review li')).toHaveCount(5);
  await p.locator('.original-question-record summary').click();await expect(p.locator('.original-question-record')).toContainText(q.sourceCheck.original.options[0].text);
  assert.equal((await state()).courseAnswers.find(a=>a.id==='old-objective-result').score,0);
  // Old objective exam: held response survives but is not graded or exposed.
  await p.evaluate(async ids=>{const m=await import('/src/learningStore.ts'),s=await m.loadLearning();await m.saveLearning({...s,courseDraft:null,courseExams:[{id:'objective-hold-exam',questionIds:ids,startedAt:new Date().toISOString(),submittedAt:null,responses:{[ids[0]]:'A',[ids[1]]:'A'}}]},s.revision)},[held.id,q.id]);
  await p.reload();await expect(p.locator('.course-exam')).toContainText('本卷旧题已暂移出训练');
  await expect(p.locator('.course-exam')).not.toContainText(held.explanation);
  await expect(p.locator('.objective-option-review')).toHaveCount(0);
  await p.getByRole('button',{name:'检查并交卷',exact:true}).click();await p.getByRole('button',{name:'确认交卷',exact:true}).click();
  await p.getByText('整套限时演练与交卷订正',{exact:true}).click();
  await expect(p.locator('.course-exam .feedback')).toContainText('客观题 1/1 分');
  await expect(p.locator('.course-exam .feedback')).toContainText('不计本次对照得分');
  const details=p.locator('.course-exam .feedback > details');await details.nth(0).locator('summary').click();
  await expect(details.nth(0)).not.toContainText('资料答案');
  await details.nth(1).locator('summary').first().click();await expect(p.locator('.course-exam .objective-option-review')).toContainText(q.optionReview.B.reason);
  const s=await state();assert.equal(s.courseAnswers.find(a=>a.id===`objective-hold-exam-${held.id}`).score,null);
  assert.equal(s.courseExams[0].responses[held.id],'A');assert.equal(s.courseAnswers.find(a=>a.id==='old-objective-result').score,0);
  await p.setViewportSize({width:360,height:800});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  fs.writeFileSync('../verification/current-audit/objective-review-ui.json',JSON.stringify({passed:true,checks:['closed-book reasons hidden','old answer content hidden before submission','five option reasons after submission','original options accessible after submission','old result preserved','held exam draft preserved','held objective answer unscored','held answer key hidden','correct exam item rationale available','mobile width','no page errors']},null,2));
  console.log('11 objective-review UI checks passed');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
