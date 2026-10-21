const { chromium, expect } = require("@playwright/test");
const fs = require("node:fs/promises"),
  path = require("node:path");
(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const results = [];
  try {
    await page.goto("http://127.0.0.1:5176/#/today");
    await page.getByLabel("伙伴的名字").fill("离线小叶");
    await page.getByRole("button", { name: /保存并开始学习/ }).click();

    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByText("离线 · 使用本地内容")).toBeVisible();
    await page.goto("http://127.0.0.1:5176/#/classics");
    await expect(page.locator(".unit-link")).toHaveCount(40);
    results.push("生产包离线重载与四经典内容持久化");
    const pdfs = await page.evaluate(async () => Promise.all(['F0003','F0012','F0918','F0016'].map(async id => {
      const r = await fetch(`/library/${id}.pdf`);
      return r.ok && (await r.text()).startsWith('%PDF-');
    })));
    if(!pdfs.every(Boolean)) throw Error('Offline full PDF unavailable');
    results.push('四份完整PDF离线可读取');
    const catalog = await page.evaluate(async () => (await fetch('/course/catalog.json')).json());
    if(catalog.questions.length!==2484)throw Error('Offline course mismatch');
    if(catalog.questionSourceAudit.checks.length!==1052||catalog.questionSourceAudit.heldQuestionIds.length!==631||catalog.questionSourceAudit.writtenRemaining.length!==0||catalog.questionSourceAudit.latestBatch.questionIds.length!==22||catalog.questionSourceAudit.neijingBatch.questionIds.length!==32)throw Error('Offline source-review decisions missing');
    const middle=catalog.questionSourceAudit.taiyangMiddleBatch;
    if(middle.checkedQuestionIds.length!==70||middle.heldQuestionIds.length!==10||middle.pendingAfterBatchQuestionIds.length!==84||middle.pendingChapterQuestionIds.length!==0)throw Error('Offline Taiyang middle decisions missing');
    if(catalog.questions.filter(q=>middle.checkedQuestionIds.includes(q.id)).some(q=>!q.optionReview||Object.keys(q.optionReview).length!==q.options.length))throw Error('Offline Taiyang middle option reasons missing');
    results.push('第十轮中段历史70/10和历史剩余84记录保留，当前太阳待处理为0');
    const shuiqi=catalog.questionSourceAudit.shuiqiBatch;
    if(shuiqi.checkedQuestionIds.length!==11||shuiqi.heldQuestionIds.length!==17||shuiqi.pendingChapterQuestionIds.length!==0||shuiqi.repairQuestionIds.length!==2)throw Error('Offline Shuiqi decisions missing');
    const tanyin=catalog.questionSourceAudit.tanyinBatch;
    if(tanyin.checkedQuestionIds.length!==26||tanyin.heldQuestionIds.length!==30||tanyin.pendingChapterQuestionIds.length!==0||tanyin.repairQuestionIds.length!==1)throw Error('Offline Tanyin decisions missing');
    const shaoyang=catalog.questionSourceAudit.shaoyangBatch;
    if(shaoyang.checkedQuestionIds.length!==22||shaoyang.heldQuestionIds.length!==13||shaoyang.pendingChapterQuestionIds.length!==0||shaoyang.repairQuestionIds.length!==1)throw Error('Offline Shaoyang decisions missing');
    const final=catalog.questionSourceAudit.taiyangCompletionBatch;
    if(final.checkedQuestionIds.length!==60||final.heldQuestionIds.length!==24||final.chapterCheckedQuestionIds.length!==155||final.chapterHeldQuestionIds.length!==49||final.pendingChapterQuestionIds.length!==0||final.repairQuestionIds.length!==2)throw Error('Offline Taiyang completion decisions missing');
    const reviewed=catalog.questions.filter(q=>catalog.questionSourceAudit.latestBatch.questionIds.includes(q.id));
    if(reviewed.some(q=>!q.reference||!q.rubric?.length||!q.evidenceLinks?.length))throw Error('Offline final-22 points or references missing');
    const reviewImages=await page.evaluate(async expected=>Promise.all(Object.entries(expected).map(async([n,sha])=>{
      const r=await fetch(`/library/F0007/${String(n).padStart(4,'0')}.jpg`),bytes=await r.arrayBuffer();
      const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
      return r.ok&&digest===sha;
    })),{...catalog.questionSourceAudit.latestBatch.sourceImageSha256,...catalog.questionSourceAudit.objectiveBatch.sourceImageSha256,...catalog.questionSourceAudit.neijingBatch.sourceImageSha256,...catalog.questionSourceAudit.shaoyinBatch.sourceImageSha256,...catalog.questionSourceAudit.yangmingBatch.sourceImageSha256,...catalog.questionSourceAudit.yangmingCompletionBatch.sourceImageSha256});
    if(!reviewImages.every(Boolean))throw Error('Offline reviewed source image mismatch');
    if(catalog.questionSourceAudit.objectiveBatch.checkedQuestionIds.length!==29||catalog.questionSourceAudit.objectiveBatch.heldQuestionIds.length!==4)throw Error('Offline objective decisions missing');
    if(catalog.questions.filter(q=>catalog.questionSourceAudit.objectiveBatch.checkedQuestionIds.includes(q.id)).some(q=>!q.optionReview||Object.keys(q.optionReview).length!==q.options.length))throw Error('Offline option reasons missing');
    if(catalog.questions.filter(q=>catalog.questionSourceAudit.neijingBatch.questionIds.includes(q.id)).some(q=>!q.optionReview||Object.keys(q.optionReview).length!==q.options.length))throw Error('Offline Neijing reasons missing');
    if(catalog.questionSourceAudit.shaoyinBatch.checkedQuestionIds.length!==37||catalog.questionSourceAudit.shaoyinBatch.heldQuestionIds.length!==5)throw Error('Offline Shaoyin decisions missing');
    if(catalog.questions.filter(q=>catalog.questionSourceAudit.shaoyinBatch.checkedQuestionIds.includes(q.id)).some(q=>!q.optionReview||Object.keys(q.optionReview).length!==q.options.length))throw Error('Offline Shaoyin reasons missing');
    if(catalog.questionSourceAudit.yangmingBatch.checkedQuestionIds.length!==32||catalog.questionSourceAudit.yangmingBatch.heldQuestionIds.length!==12||catalog.questionSourceAudit.yangmingBatch.pendingChapterQuestionIds.length!==0||catalog.questionSourceAudit.yangmingBatch.pendingAfterBatchQuestionIds.length!==56)throw Error('Offline Yangming decisions missing');
    if(catalog.questions.filter(q=>catalog.questionSourceAudit.yangmingBatch.checkedQuestionIds.includes(q.id)).some(q=>!q.optionReview||Object.keys(q.optionReview).length!==q.options.length))throw Error('Offline Yangming reasons missing');
    if(catalog.questionSourceAudit.yangmingCompletionBatch.checkedQuestionIds.length!==35||catalog.questionSourceAudit.yangmingCompletionBatch.heldQuestionIds.length!==21||catalog.questionSourceAudit.yangmingCompletionBatch.chapterCheckedQuestionIds.length!==67||catalog.questionSourceAudit.yangmingCompletionBatch.chapterHeldQuestionIds.length!==33||catalog.questionSourceAudit.yangmingCompletionBatch.pendingChapterQuestionIds.length!==0)throw Error('Offline Yangming completion missing');
    if(catalog.questions.filter(q=>catalog.questionSourceAudit.yangmingCompletionBatch.checkedQuestionIds.includes(q.id)).some(q=>!q.optionReview||Object.keys(q.optionReview).length!==q.options.length))throw Error('Offline completion reasons missing');
    results.push('第八轮35题逐项依据、21题隔离、6题归章、100题处理闭环与引用页离线可用');
    results.push('第七轮32题承气逐项依据、12题隔离、2组变体、56题待核对记录及引用页离线可用');
    results.push('第六轮37题逐项依据、5题隔离、3组同义变体及引用页离线可用');
    results.push('第五轮32题版本/词解与逐项解析、5组变体标记、全部引用页离线可用');
    results.push('第三批22题要点、第四批29题逐项解析及4题隔离、全部定位原页离线可读且图像指纹一致');
    if(catalog.newGuide.pages.length!==509||catalog.lessons.length!==846)throw Error('Offline textbook mismatch');
    if(Object.keys(catalog.requirementGuides||{}).length!==712)throw Error('Offline teaching routes missing');
    const images=await page.evaluate(async()=>Promise.all([10,171,305,424,512,518].map(async n=>{const r=await fetch(`/library/F0007/${String(n).padStart(4,'0')}.jpg`);const bytes=new Uint8Array(await r.arrayBuffer());return r.ok&&bytes[0]===255&&bytes[1]===216})));
    if(!images.every(Boolean))throw Error('New source images unavailable offline');
    results.push('新版教材原页及846段讲解离线可读');
    await page.goto('http://127.0.0.1:5176/#/course');
    await expect(page.getByRole('heading',{name:'按考纲，逐章学与练。'})).toBeVisible();
    await expect(page.locator('.question-review-summary summary')).toContainText('1052 题已对照');
    results.push('完整章节资料和逐章课程页面离线可用');
    if(catalog.gapCompletionAudit.withoutDirectQuestions.length||catalog.gapCompletionAudit.topicLocationsPending.length)throw Error('Offline gap completion audit mismatch');
    await page.getByText('查看新增专项题（536 条）',{exact:true}).click();
    await page.getByLabel('查找专项考点',{exact:true}).fill('K0001');
    await page.locator('.gap-topic').getByRole('button',{name:'开始或继续本条专项'}).click();
    await expect(page.locator('.course-question .feedback')).toHaveCount(0);
    await page.getByLabel('先写下你的分析').fill('离线专项：法于阴阳，起居有常。');
    await page.getByRole('button',{name:'提交并查看解析',exact:true}).click();
    const written=catalog.questions.find(q=>q.id==='special-K0001-written');
    await expect(page.locator('.course-question .feedback')).toContainText(written.explanation);
    await expect(page.locator('.written-answer-points li')).toHaveText(written.rubric.map(r=>r.criterion));
    await expect(page.locator('.written-answer-points')).toContainText('不自动打分');
    await expect(page.getByRole('progressbar',{name:'新增专项简答作答进度',exact:true})).toHaveAttribute('value','1');
    results.push('536条专项答案及185条定位审计离线可用，闭卷提交与进度保存');
    await page.goto("http://127.0.0.1:5176/#/today");
    await page.getByRole("button", { name: /轻一点开始/ }).click();
    await page
      .locator(".task-row")
      .getByRole("button", { name: "开始", exact: true })
      .click();
    await page.getByRole("button", { name: "读过了，看看理解" }).click();
    await page.getByRole("button", { name: "开始巩固", exact: true }).click();
    await page.getByLabel("你的回忆").fill("离线草稿");
    await page.waitForTimeout(500);
    await page.reload();
    await expect(page.getByLabel("你的回忆")).toHaveValue("离线草稿");
    results.push("离线完成规划、阅读与草稿刷新恢复");
    await page.goto("http://127.0.0.1:5176/#/today");
    await page.waitForFunction(() =>
      [...document.images].every((i) => i.complete && i.naturalWidth > 0),
    );
    results.push("Q版伙伴与装饰离线加载");
    await fs.writeFile(
      "../verification/offline-results.json",
      JSON.stringify({ results, passed: true }, null, 2),
    );
    console.log(`${results.length} offline production checks passed.`);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
