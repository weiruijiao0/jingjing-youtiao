const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium,expect}=require('@playwright/test');
const d=JSON.parse(fs.readFileSync('public/course/catalog.json','utf8'));
(async()=>{
 const b=await chromium.launch({channel:'msedge',headless:true}),p=await b.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 const seed=async(q,response='')=>{await p.evaluate(async args=>{const m=await import('/src/learningStore.ts'),s=await m.loadLearning();await m.saveLearning({...s,courseDraft:{question:args.id,response:args.response}},s.revision)},{id:q.id,response});await p.reload()};
 try{
  await p.goto('http://127.0.0.1:5185/#/course');await p.getByRole('heading',{name:'按考纲，逐章学与练。'}).waitFor();
  await expect(p.locator('.question-review-summary summary')).toContainText('1052 题已对照');
  await p.locator('.question-review-summary summary').click();await expect(p.locator('.question-review-summary')).toContainText('此前 32 道');
  const q=d.questions.find(q=>q.id.startsWith('286dd'));
  await seed(q,'C');await expect(p.locator('.objective-option-review')).toHaveCount(0);await expect(p.locator('.original-question-record')).toHaveCount(0);
  await p.getByRole('button',{name:'提交并查看解析',exact:true}).click();
  await expect(p.locator('.objective-option-review')).toContainText('本篇确有此表述');
  await p.locator('.original-question-record summary').click();await expect(p.locator('.original-question-record')).toContainText('受五脏浊气');
  await p.locator('.course-question .feedback summary').filter({hasText:'已定位引用'}).click();
  await expect(p.locator('.course-question a[href$="0054.jpg"]')).toBeVisible();await expect(p.locator('.course-question a[href$="0055.jpg"]')).toBeVisible();
  const needle=d.questions.find(q=>q.id.startsWith('b1d409'));await seed(needle,'A');
  await expect(p.locator('.course-question .answer-options')).not.toContainText('高妙的医疗技术');
  await p.getByRole('button',{name:'提交并查看解析',exact:true}).click();await expect(p.locator('.course-question .feedback')).toContainText('最高超的医疗技术');
  const y=d.questions.find(q=>q.id.startsWith('265926'));await seed(y,'A,C,D');
  await expect(p.locator('.course-question .feedback')).toHaveCount(0);await p.getByRole('button',{name:'提交并查看解析',exact:true}).click();
  await expect(p.locator('.course-question .feedback')).toContainText('与资料答案一致');await expect(p.locator('.objective-option-review')).toContainText('按本题是否写汗不出判断');
  const s=await p.evaluate(async()=>await(await import('/src/learningStore.ts')).loadLearning());
  assert.equal(s.courseAnswers.length,3);assert.ok(s.courseAnswers.every(a=>a.score===1));
  await p.setViewportSize({width:360,height:800});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  fs.writeFileSync('../verification/current-audit/neijing-review-ui.json',JSON.stringify({passed:true,checks:['latest batch summary','closed-book reasoning and original record hidden','valid unselected statement explained after submission','original options preserved','each cited page opens','near-synonym distractor removed','textbook general meaning retained','yin-sweat variant key respected','three answers persisted','mobile width','no page errors']},null,2));
  console.log('11 Neijing-review UI checks passed');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
