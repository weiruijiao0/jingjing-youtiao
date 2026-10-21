const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium,expect}=require('@playwright/test');
const d=JSON.parse(fs.readFileSync('public/course/catalog.json','utf8'));
(async()=>{
 const b=await chromium.launch({channel:'msedge',headless:true}),p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const get=prefix=>d.questions.find(q=>q.id.startsWith(prefix)),q=get('78e5b'),water=get('e0c2a'),held=get('85389'),moved=get('4599c');
 const state=()=>p.evaluate(async()=>await(await import('/src/learningStore.ts')).loadLearning());
 const seed=async(question,response)=>{await p.evaluate(async args=>{const m=await import('/src/learningStore.ts'),s=await m.loadLearning();await m.saveLearning({...s,courseDraft:{question:args.id,response:args.response}},s.revision)},{id:question.id,response});await p.reload()};
 try{
  await p.goto('http://127.0.0.1:5185/#/course');await p.getByRole('heading',{name:'按考纲，逐章学与练。'}).waitFor();
  await expect(p.locator('.question-review-summary summary')).toContainText('1052 题已对照，631 题暂移出训练');
  await p.locator('.question-review-summary summary').click();const summary=p.locator('.question-review-summary');
  await expect(summary).toContainText('最新一轮 56 道阳明剩余');await expect(summary).toContainText('35 道补足');await expect(summary).toContainText('21 道暂移出');await expect(summary).toContainText('67 道教材对照，33 道暂移出，未处理 0 道');
  await expect(summary).not.toContainText('还有 56 道待核对');await expect(p.locator('.plan-days progress')).toHaveCount(30);
  await p.evaluate(async id=>{const m=await import('/src/learningStore.ts'),s=await m.loadLearning();await m.saveLearning({...s,courseAnswers:[{id:'before-new-wording',question:id,response:'A',score:0,at:new Date().toISOString(),revealed:true}]},s.revision)},q.id);
  await seed(q,'B,D');await expect(p.locator('.course-question .answer-options')).toContainText('颈以下身无汗');await expect(p.locator('.objective-option-review')).toHaveCount(0);await expect(p.locator('.original-question-record')).toHaveCount(0);
  await p.getByRole('button',{name:'提交并查看解析',exact:true}).click();await expect(p.locator('.objective-option-review')).toContainText('非全身绝无汗');
  await p.locator('.original-question-record summary').click();await expect(p.locator('.original-question-record')).toContainText(q.sourceCheck.original.stem);
  await seed(water,'D');await expect(p.locator('.objective-option-review')).toHaveCount(0);await p.getByRole('button',{name:'提交并查看解析',exact:true}).click();
  await expect(p.locator('.course-question .feedback')).toContainText('撤去甘澜水清热解毒');await expect(p.locator('.objective-option-review')).toContainText('现代替代说明不改变');
  await p.locator('.course-question .feedback summary').filter({hasText:'已定位引用'}).click();await expect(p.locator('.course-question a[href$="0267.jpg"]')).toBeVisible();await expect(p.locator('.course-question a[href$="0268.jpg"]')).toBeVisible();
  await seed(moved,'C');await expect(p.locator('.course-question')).toContainText(moved.stem);await p.getByRole('button',{name:'提交并查看解析',exact:true}).click();await expect(p.locator('.course-question .feedback')).toContainText('旧归阳明不准确');await expect(p.locator('.course-question .feedback')).toContainText('现归厥阴');
  await seed(held,'B,C,D,E');await expect(p.locator('.held-question')).toContainText('不能');await expect(p.locator('.course-question')).toHaveCount(0);assert.equal((await state()).courseDraft.response,'B,C,D,E');
  await p.evaluate(async ids=>{const m=await import('/src/learningStore.ts'),s=await m.loadLearning();await m.saveLearning({...s,courseDraft:null,courseExams:[{id:'completion-old-exam',questionIds:ids,startedAt:new Date().toISOString(),submittedAt:null,responses:{[ids[0]]:'B,C,D,E',[ids[1]]:'D'}}]},s.revision)},[held.id,water.id]);
  await p.reload();await expect(p.locator('.course-exam')).toContainText('本卷旧题已暂移出训练');await expect(p.locator('.objective-option-review')).toHaveCount(0);
  await p.getByRole('button',{name:'检查并交卷',exact:true}).click();await p.getByRole('button',{name:'确认交卷',exact:true}).click();await p.getByText('整套限时演练与交卷订正',{exact:true}).click();
  await expect(p.locator('.course-exam .feedback')).toContainText('客观题 1/1 分');const details=p.locator('.course-exam .feedback > details');await details.nth(0).locator('summary').click();await expect(details.nth(0)).not.toContainText('资料答案');
  await details.nth(1).locator('summary').first().click();await expect(p.locator('.course-exam .objective-option-review')).toContainText('现代替代说明不改变');
  const s=await state();assert.equal(s.courseAnswers.find(a=>a.id==='before-new-wording').score,0);assert.equal(s.courseAnswers.find(a=>a.id===`completion-old-exam-${held.id}`).score,null);assert.equal(s.courseExams[0].responses[held.id],'B,C,D,E');
  await p.setViewportSize({width:360,height:800});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  const checks=['100=67+33 and pending=0 visible','35/21 latest dispositions','30 daily plan bars remain','closed-book reasons and original hidden','body-sweat qualifier visible','original question retained','unsupported water functions removed','all 267/268 source pages open','corrected 厥阴 attribution explained after submit','held draft retained without training','old held exam ungraded and key hidden','old scores and responses preserved','mobile width and no page errors'];
  fs.writeFileSync('../verification/current-audit/yangming-completion-ui.json',JSON.stringify({passed:true,checks},null,2));console.log(`${checks.length} Yangming-completion UI checks passed`);
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
