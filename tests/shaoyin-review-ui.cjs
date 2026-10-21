const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium,expect}=require('@playwright/test');
const d=JSON.parse(fs.readFileSync('public/course/catalog.json','utf8'));
(async()=>{
 const b=await chromium.launch({channel:'msedge',headless:true}),p=await b.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 const get=prefix=>d.questions.find(q=>q.id.startsWith(prefix)),q=get('61fe'),egg=get('e84'),held=get('d97d117724');
 const state=()=>p.evaluate(async()=>await(await import('/src/learningStore.ts')).loadLearning());
 const seed=async(question,response)=>{await p.evaluate(async args=>{const m=await import('/src/learningStore.ts'),s=await m.loadLearning();await m.saveLearning({...s,courseDraft:{question:args.id,response:args.response}},s.revision)},{id:question.id,response});await p.reload()};
 try{
  await p.goto('http://127.0.0.1:5185/#/course');await p.getByRole('heading',{name:'按考纲，逐章学与练。'}).waitFor();
  await expect(p.locator('.question-review-summary summary')).toContainText('1052 题已对照，631 题暂移出训练');
  await p.locator('.question-review-summary summary').click();await expect(p.locator('.question-review-summary')).toContainText('此前 42 道少阴');
  await p.evaluate(async id=>{const m=await import('/src/learningStore.ts'),s=await m.loadLearning();await m.saveLearning({...s,courseAnswers:[{id:'pre-correction-score',question:id,response:'D',score:0,at:new Date().toISOString(),revealed:true}]},s.revision)},q.id);
  await seed(q,'B');await expect(p.locator('.objective-option-review')).toHaveCount(0);await expect(p.locator('.original-question-record')).toHaveCount(0);
  await p.getByRole('button',{name:'提交并查看解析',exact:true}).click();
  await expect(p.locator('.objective-option-review')).toContainText('313汤剂也少少咽之');
  await p.locator('.original-question-record summary').click();await expect(p.locator('.original-question-record')).toContainText(q.sourceCheck.original.stem);
  await p.locator('.course-question .feedback summary').filter({hasText:'已定位引用'}).click();
  await expect(p.locator('.course-question a[href$="0281.jpg"]')).toBeVisible();await expect(p.locator('.course-question a[href$="0282.jpg"]')).toBeVisible();
  await seed(egg,'E');await expect(p.locator('.course-question .answer-options')).toContainText('全鸡子（连黄）');
  await expect(p.locator('.objective-option-review')).toHaveCount(0);
  await p.getByRole('button',{name:'提交并查看解析',exact:true}).click();
  await expect(p.locator('.objective-option-review')).toContainText('旧泛称不宜直接判错');
  await p.locator('.original-question-record summary').click();await expect(p.locator('.original-question-record')).toContainText(egg.sourceCheck.original.options[3].text);
  await seed(held,'B,C,D');await expect(p.locator('.held-question')).toContainText('桃花汤');await expect(p.locator('.course-question')).toHaveCount(0);
  assert.equal((await state()).courseDraft.response,'B,C,D');
  // A saved exam still contains the held response but must not award its old key.
  // A held-draft autosave may finish during fixture preparation. Retry only that revision conflict with a fresh state.
  await expect(async()=>{await p.evaluate(async ids=>{const m=await import('/src/learningStore.ts'),s=await m.loadLearning();await m.saveLearning({...s,courseDraft:null,courseExams:[{id:'shaoyin-old-exam',questionIds:ids,startedAt:new Date().toISOString(),submittedAt:null,responses:{[ids[0]]:'B,C,D',[ids[1]]:'E'}}]},s.revision)},[held.id,egg.id]);}).toPass({timeout:3000,intervals:[100,250]});
  await p.reload();await expect(p.locator('.course-exam')).toContainText('本卷旧题已暂移出训练');await expect(p.locator('.objective-option-review')).toHaveCount(0);
  await p.getByRole('button',{name:'检查并交卷',exact:true}).click();await p.getByRole('button',{name:'确认交卷',exact:true}).click();
  await p.getByText('整套限时演练与交卷订正',{exact:true}).click();
  await expect(p.locator('.course-exam .feedback')).toContainText('客观题 1/1 分');
  const details=p.locator('.course-exam .feedback > details');await details.nth(0).locator('summary').click();await expect(details.nth(0)).not.toContainText('资料答案');
  await details.nth(1).locator('summary').first().click();await expect(p.locator('.course-exam .objective-option-review')).toContainText('旧泛称不宜直接判错');
  const s=await state();assert.equal(s.courseAnswers.find(a=>a.id==='pre-correction-score').score,0);
  assert.equal(s.courseAnswers.find(a=>a.id===`shaoyin-old-exam-${held.id}`).score,null);assert.equal(s.courseExams[0].responses[held.id],'B,C,D');
  await p.setViewportSize({width:360,height:800});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  const checks=['latest 42/37/5 disposition visible','closed-book reasons and original hidden','313 valid similar服法 explained after submit','original question preserved','281 and 282 source pages open','explicit egg-white distractor','old ambiguous option retained in history','held draft kept without training','old exam held answer ungraded','held answer key hidden','old score unchanged','mobile width','no page errors'];
  fs.writeFileSync('../verification/current-audit/shaoyin-review-ui.json',JSON.stringify({passed:true,checks},null,2));console.log(`${checks.length} Shaoyin-review UI checks passed`);
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
