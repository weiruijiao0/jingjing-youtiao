const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium,expect}=require('@playwright/test');
const d=JSON.parse(fs.readFileSync('public/course/catalog.json','utf8'));
const id='4e90b9bcc12e74957716f863b8b119f0c673135b2f5926a28380d9e8b7a1bb15',q=d.questions.find(q=>q.id===id);
assert.deepEqual(q.answers,['C','E']);assert.equal(q.review,'source-answer-unverified');
assert.equal(q.sourceCorrection.independentExpertReview,false);
assert.match(q.explanation,/半夏燥湿[，；]蔻仁、干菖蒲芳香化湿/);
assert.match(q.explanation,/大豆黄卷、绿豆衣、连翘、六一散清热利湿/);
assert.ok(!q.explanation.includes('苍术'));
(async()=>{
 const b=await chromium.launch({channel:'msedge',headless:true});
 try{
  const p=await b.newPage();await p.goto('http://127.0.0.1:5185/#/course');
  await p.getByRole('heading',{name:'按考纲，逐章学与练。'}).waitFor();
  await p.evaluate(async id=>{const m=await import('/src/learningStore.ts');const s=await m.loadLearning();await m.saveLearning({...s,courseDraft:{question:id,response:'C,E'}},s.revision)},id);
  await p.reload();await expect(p.locator('.course-question h2')).toHaveText(q.stem);
  await expect(p.locator('.course-question .feedback')).toHaveCount(0);
  await p.getByRole('button',{name:'提交并查看解析',exact:true}).click();
  await expect(p.locator('.course-question .feedback')).toContainText('清热为辅');
  await expect(p.locator('.course-question .feedback')).toContainText('六一散清热利湿');
  await expect(p.locator('.course-question .objective-option-review')).toContainText(q.optionReview.E.reason);
  await p.locator('.course-question .feedback summary').filter({hasText:'已定位引用'}).click();
  await expect(p.getByRole('link',{name:'核对引用原页'}).last()).toHaveAttribute('href',/0447.jpg$/);
  console.log('Source-image explanation correction, unchanged key, closed answers and specific page link passed');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
