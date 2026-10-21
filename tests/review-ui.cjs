const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium,expect}=require('@playwright/test');
const d=JSON.parse(fs.readFileSync('public/course/catalog.json','utf8'));
require('./historical-catalog.cjs').readHistoricalCatalog(d); // Strict live validation, not a historical browser fixture.
// Answer set independently re-read from the rendered source pages in this batch.
// This regression fixture is not an independent expert review or calibration.
const key={K0315:['A','C','ABCD'],K0316:['B','D','ABCE'],K0317:['D','B','ABCE'],K0318:['C','A','ABCD'],K0606:['C','D','ABCE'],K0609:['B','A','ABCE'],K0620:['D','C','ABCD'],K0655:['B','D','ABC'],K0656:['C','A','ABCDE'],K0246:['B','D','ABCDE'],K0307:['C','A','ABCD'],K0308:['D','B','ABCE'],K0309:['B','D','ABCD'],K0310:['D','B','ABC'],K0708:['B','D','ABCE'],K0709:['B','D','ABCD']};
assert.equal(Object.keys(key).length,16);
assert.equal(d.itemReviewAudit.newQuestions,64);
assert.equal(d.itemReviewAudit.remainingRequirements.length,696);
assert.equal(d.itemReviewAudit.independentExpertReviews,0);
assert.equal(d.questions.filter(q=>!q.id.startsWith('teaching-')&&!q.id.startsWith('special-')).length,1723+d.questionSourceAudit.all1099Batch.repairQuestionIds.length+d.questionSourceAudit.all1099Batch.caseQuestionIds.length+d.professionalSupplementAudit.questionIds.length+d.professionalCaseSupplementAudit.questionIds.length+d.professionalReplacementAudit.questionIds.length+d.professionalAbilitySupplementAudit.questionIds.length); // Historical cohort plus explicitly listed professional repair and case batches.
for(const [rid,answers]of Object.entries(key)){
 const g=d.requirementGuides[rid];assert.equal(g.itemReview.independentReview,false);assert.equal(g.itemReview.examCalibration,false);
 const qs=d.questions.filter(q=>q.assessmentGroup===rid);assert.equal(qs.length,4);
 assert.equal(new Set(qs.map(q=>q.family)).size,1); // A seen sibling is not a fresh exam item.
 for(let i=0;i<3;i++){assert.equal(qs[i].answers.join(''),answers[i]);assert.equal(qs[i].options.length,5);assert.ok(qs[i].requirementIds.includes(rid));assert.ok(g.directQuestionIds.includes(qs[i].id));if(qs[i].authoredReview){assert.equal(qs[i].authoredReview.status,'single-source-comparison');assert.ok(qs[i].evidenceLinks.every(e=>e.source&&e.page&&e.quote));assert.ok(qs[i].reference.includes(qs[i].evidenceLinks[0].source))}else assert.ok(qs[i].reference.includes(`考纲 ${rid}`))}
 assert.ok(qs[3].subjective);assert.equal(qs[3].rubric.reduce((n,r)=>n+r.points,0),10);
}
assert.equal(d.requirementGuides.K0620.source,'F0012');
assert.deepEqual(d.requirementGuides.K0620.pages,[54]);
assert.deepEqual(d.requirementReadings.K0620.newGuideFocusPages,[]);
// Later authored review replaces the old synopsis reference with both exact PDF sources.
const q159=d.questions.find(q=>q.id==='teaching-K0620-1');assert.ok(q159.evidenceLinks.some(e=>e.source==='F0012'&&e.page===54));assert.ok(q159.evidenceLinks.some(e=>e.source==='F0016'&&e.page===169));assert.ok(q159.reference.includes('F0012')&&q159.reference.includes('F0016'));
(async()=>{
 const b=await chromium.launch({channel:'msedge',headless:true});
 try{
  const p=await b.newPage({viewport:{width:390,height:850}});
  await p.goto('http://127.0.0.1:5185/#/course');
  await expect(p.getByRole('heading',{name:'逐项核对与专项测评'})).toBeVisible();
  await p.getByText('查看已核对考点并开始专项测评（16 组）',{exact:true}).click();
  const topic=p.locator('.review-topic').filter({has:p.getByRole('heading',{name:/^K0620/})});
  await topic.getByRole('button',{name:'开始或继续本条专项'}).click();
  await expect(p.locator('.course-question h2')).toHaveText('第159条此利在下焦所指定的方是？');
  await expect(p.locator('.study-materials')).toHaveCount(0);await expect(p.locator('.review-overview')).toHaveCount(0);
  await expect(p.locator('.course-question .feedback')).toHaveCount(0);
  // A wrong independent first answer stays wrong in the first-answer indicator.
  await p.locator('.course-question .answer-options button').filter({hasText:'A. 桂枝人参汤'}).click();
  await p.getByRole('button',{name:'提交并查看解析',exact:true}).click();
  await expect(p.locator('.course-question .feedback')).toContainText('不是第163条桂枝人参汤');
  await p.getByRole('button',{name:'继续下一题',exact:true}).click();
  await p.locator('.course-question .answer-options button').filter({hasText:'C. 中焦与下焦病位及治法不同'}).click();
  await p.waitForTimeout(700);await p.reload();
  await expect(p.locator('.course-question .answer-options button').filter({hasText:'C. 中焦与下焦病位及治法不同'})).toHaveAttribute('aria-pressed','true');
  await expect(p.locator('.course-question .feedback')).toHaveCount(0);
  await p.getByRole('button',{name:'提交并查看解析',exact:true}).click();await p.getByRole('button',{name:'继续下一题',exact:true}).click();
  for(const letter of ['A','B','C','D'])await p.locator('.course-question .answer-options button').filter({hasText:new RegExp('^'+letter+'\\. ')}).click();
  await p.getByRole('button',{name:'提交并查看解析',exact:true}).click();await p.getByRole('button',{name:'继续下一题',exact:true}).click();
  await p.getByLabel('先写下你的分析').fill('初为误治痞利；理中治中焦，本利在下焦；赤石脂与太一禹余粮收涩固下；复不止者利其小便。');
  await p.getByRole('button',{name:'提交并查看解析',exact:true}).click();
  await expect(p.locator('.course-question .feedback')).toContainText('学习用自评，不自动判分');
  await p.getByRole('button',{name:'本组已到末尾，返回章节'}).click();
  await p.getByText('查看已核对考点并开始专项测评（16 组）',{exact:true}).click();
  await expect(topic).toContainText('客观题首答 3 / 3，首答正确 2 / 3；书面分析已写 1 / 1');
  await topic.getByRole('button',{name:'再练本条（已见题）'}).click();
  await p.locator('.course-question .answer-options button').filter({hasText:'D. 赤石脂禹余粮汤'}).click();
  await p.getByRole('button',{name:'提交并查看解析',exact:true}).click();
  await p.getByText('查看已核对考点并开始专项测评（16 组）',{exact:true}).click();
  await expect(p.locator('.review-topic').filter({has:p.getByRole('heading',{name:/^K0620/})})).toContainText('首答正确 2 / 3');
  // Corrected source route and review details disappear during closed recall.
  await p.evaluate(async()=>{const m=await import('/src/learningStore.ts');const s=await m.loadLearning();await m.saveLearning({...s,courseDraft:null,courseRecallDraft:{queue:['K0620'],response:'',show:false,phase:'read',total:1}},s.revision)});
  await p.reload();
  await expect(p.locator('.source-teaching .guide-reader')).toHaveCount(0);
  await expect(p.getByRole('link',{name:'核对指南原页 · PDF 第 54 页'})).toHaveAttribute('href',/F0012.pdf#page=54$/);
  await expect(p.getByRole('link',{name:'核对配套讲义 · PDF 第 169 页'})).toHaveAttribute('href',/F0016.pdf#page=169$/);
  await p.getByRole('button',{name:'读好了，隐藏资料开始回忆'}).click();
  await expect(p.locator('.source-teaching')).toHaveCount(0);await expect(p.locator('.review-overview')).toHaveCount(0);
  await p.getByLabel('合上原文，写出本条要点').fill('第159条闭卷回忆');await p.getByRole('button',{name:'完成回忆，展开对照'}).click();
  await expect(p.locator('.item-review')).toContainText('已撤销');
  if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');
  await p.locator('.requirement-session').screenshot({path:'../verification/第159条纠正与专项测评.png'});
  console.log('16 item source checks, 64 answers/rubrics, corrected 159 route, four-question scope, closed answers, draft reload, first-answer integrity and mobile passed');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

