const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium,expect}=require('@playwright/test');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext(),page=await context.newPage();
 const coach=()=>page.getByRole('region',{name:'今日自动领学',exact:true});
 const state=()=>page.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('jingjing-youtiao:phase3:learning:/');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,get=db.transaction('records','readonly').objectStore('records').get('current');get.onsuccess=()=>{resolve(get.result.value);db.close()};get.onerror=()=>reject(get.error)}}));
 try{
  await page.goto('http://127.0.0.1:5176/#/course');await coach().getByRole('button',{name:'开始今日领学',exact:true}).waitFor();
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);await page.reload();
  await coach().getByRole('button',{name:'开始今日领学',exact:true}).click();await coach().getByRole('button',{name:'读好了，合上资料回忆',exact:true}).click();
  await coach().getByLabel('合上资料，写出本条关键点').fill('离线独立回忆：条文关键词及限制');await coach().getByRole('button',{name:'保存小段，先歇一下',exact:true}).click();await coach().getByRole('button',{name:'继续已保存的今日领学',exact:true}).waitFor();await page.reload();
  await expect(coach().getByLabel('合上资料，写出本条关键点')).toHaveValue(/离线独立回忆/);await expect(page.locator('.coach-materials')).toHaveCount(0);
  await coach().getByRole('button',{name:'写好了，对照漏项',exact:true}).click();const image=page.locator('.coach-materials img').first();await image.scrollIntoViewIfNeeded();await page.waitForFunction(()=>{const img=document.querySelector('.coach-materials img');return img?.complete&&img.naturalWidth>0});
  await coach().getByLabel('这次回忆情况').selectOption('recalled');
  await coach().getByRole('button',{name:'记下漏项，做关联练习',exact:true}).click();const data=await page.evaluate(async()=>await(await fetch('/course/catalog.json')).json());
  // Direct original questions can now precede the former written fallback. Verify the actual scheduled item.
  const current=await state(),task=current.courseCoach.tasks[current.courseCoach.index],q=data.questions.find(q=>q.id===task.question);assert.ok(q&&!q.professionalHold);
  assert.ok(data.requirementGuides[task.requirement].directQuestionIds.includes(q.id));
  await expect(page.locator('.coach-materials')).toHaveCount(0);await expect(page.locator('.coach-feedback')).toHaveCount(0);
  if(q.subjective)await coach().getByLabel('独立写出关联练习的答案').fill('离线书面练习，提交后逐点对照');
  else for(const key of q.answers)await coach().locator('.answer-options button').filter({hasText:new RegExp('^'+key+'\\.')}).click();
  await coach().getByRole('button',{name:'提交，进入订正',exact:true}).click();await expect(page.locator('.coach-feedback')).toBeVisible();
  if(q.subjective){await coach().getByLabel('书面题核对情况').selectOption('recalled');await coach().getByRole('button',{name:'保存自评，继续下一步',exact:true}).click()}
  else await coach().getByRole('button',{name:'继续下一步',exact:true}).click();
  await expect(coach()).toContainText('第 2 /');const stored=await state();
  assert.equal(stored.courseAnswers.at(-1).question,q.id);assert.equal(stored.courseAnswers.at(-1).score,q.subjective?null:1);assert.equal(stored.courseAnswers.at(-1).coach.delayedEligible,false);assert.equal(stored.courseRecall.at(-1).confidence,'recalled');assert.equal(data.questions.length,2484);await context.setOffline(false);
  const checks=['production offline reload','offline coach scheduling','saved closed recall restores offline','source image from offline cache','actual directly bound associated practice with hidden evidence','expected grading and next item; same-day practice not treated as delayed retention'];fs.writeFileSync('../verification/current-audit/course-coach-offline.json',JSON.stringify({passed:true,checks,scheduledQuestion:q.id,subjective:q.subjective,isolatedStorage:true},null,2));console.log(`${checks.length} coach offline checks passed`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
