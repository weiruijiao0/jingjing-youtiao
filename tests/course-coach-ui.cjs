const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium,expect}=require('@playwright/test');
const data=JSON.parse(fs.readFileSync('public/course/catalog.json','utf8'));
(async()=>{
 const b=await chromium.launch({channel:'msedge',headless:true}),context=await b.newContext({viewport:{width:1280,height:960}}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const state=()=>p.evaluate(async()=>await(await import('/src/learningStore.ts')).loadLearning());
 const seed=async payload=>{await p.evaluate(async payload=>{const m=await import('/src/learningStore.ts'),s=await m.loadLearning();await m.saveLearning({...s,...payload},s.revision)},payload);await p.reload()};
 const coach=()=>p.getByRole('region',{name:'今日自动领学',exact:true});
 const scan=async name=>{await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const r=await p.evaluate(async()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));assert.deepEqual(r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],name)};
 try{
  await p.goto('http://127.0.0.1:5185/#/course');await coach().getByRole('button',{name:'开始今日领学',exact:true}).waitFor();
  await expect(p.locator('.plan-days progress')).toHaveCount(30);await scan('coach overview');
  await coach().getByRole('button',{name:'开始今日领学',exact:true}).click();await expect(p.locator('.coach-materials')).toBeVisible();
  await coach().getByRole('button',{name:'读好了，合上资料回忆',exact:true}).click();await expect(p.locator('.coach-materials')).toHaveCount(0);await expect(p.locator('.chapter-list')).toHaveCount(0);
  await coach().getByLabel('合上资料，写出本条关键点').fill('独立回忆：按条文写关键词与限定。');await p.waitForTimeout(650);await p.reload();
  await expect(coach().getByLabel('合上资料，写出本条关键点')).toHaveValue(/独立回忆/);await expect(p.locator('.coach-materials')).toHaveCount(0);await scan('coach closed recall');
  await coach().getByRole('button',{name:'写好了，对照漏项',exact:true}).click();await expect(p.locator('.coach-materials')).toBeVisible();
  await coach().getByLabel('这次回忆情况').selectOption('recalled');await coach().getByRole('button',{name:'记下漏项，做关联练习',exact:true}).click();
  await expect(p.locator('.coach-materials')).toHaveCount(0);await expect(p.locator('.coach-feedback')).toHaveCount(0);await scan('coach closed practice');
  let s=await state(),task=s.courseCoach.tasks[s.courseCoach.index],first=data.questions.find(q=>q.id===task.question);
  if(first.subjective){await expect(coach().getByLabel('独立写出关联练习的答案')).toHaveValue(/独立回忆/);await coach().getByLabel('独立写出关联练习的答案').fill('独立专项作答，提交后对照缺漏。')}else for(const key of first.answers)await p.locator('.coach-question .answer-options button').filter({hasText:new RegExp('^'+key+'\\.')}).click();
  await coach().getByRole('button',{name:'提交，进入订正',exact:true}).click();await expect(p.locator('.coach-feedback')).toBeVisible();await scan('coach feedback');
  assert.equal((await state()).courseAnswers.at(-1).coach.delayedEligible,false);
  if(first.subjective){await coach().getByLabel('书面题核对情况').selectOption('recalled');await p.reload();await expect(coach().getByLabel('书面题核对情况')).toHaveValue('recalled');await coach().getByRole('button',{name:'保存自评，继续下一步',exact:true}).click();const saved=await state();assert.equal(saved.courseAnswers.at(-1).score,null);assert.equal(saved.courseRecall.at(-1).confidence,'recalled');}
  // Exercise the objective wrong -> cause -> saved correction -> next-day retest path.
  const q=data.questions.find(q=>q.id.startsWith('78e5b')),at=new Date().toISOString(),session={id:'coach-ui',date:at.slice(0,10),minutes:20,createdAt:at,index:0,tasks:[{id:'coach-ui-task',requirement:'K0163',kind:'learn',question:q.id,phase:'question',response:'',recallResponse:'原独立回忆',confidence:'unsure'}]};
  await seed({courseCoach:session,courseAnswers:[],courseRecall:[{id:'coach-read',requirement:'K0163',response:'原独立回忆',confidence:'unsure',at,nextReviewAt:new Date(Date.now()+86400000).toISOString()}],courseDraft:null,courseRecallDraft:null});
  await p.locator('.coach-question .answer-options button').filter({hasText:/^A\./}).click();await coach().getByRole('button',{name:'提交，进入订正',exact:true}).click();
  await coach().getByLabel('这次主要错在哪里？').selectOption('condition');await coach().getByRole('button',{name:'回看这一条，写下订正',exact:true}).click();
  await expect(p.locator('.coach-materials')).toBeVisible();await coach().getByLabel('我的订正：关键点或鉴别条件').fill('头汗出不等于颈以下身有汗；保留尿不利条件。');await p.waitForTimeout(650);await p.reload();
  await expect(coach().getByLabel('我的订正：关键点或鉴别条件')).toHaveValue(/颈以下/);await scan('coach correction');
  await coach().getByRole('button',{name:'保存小段，先歇一下',exact:true}).click();await expect(p.locator('.plan-days progress')).toHaveCount(30);
  await expect(coach().getByRole('progressbar',{name:'闭卷练习答对的条目',exact:true})).toHaveAttribute('value','0');await expect(coach().getByRole('progressbar',{name:'隔天检验仍答对的条目',exact:true})).toHaveAttribute('value','0');
  await coach().getByRole('button',{name:'继续已保存的今日领学',exact:true}).click();await coach().getByRole('button',{name:'订正已记下，继续下一步',exact:true}).click();
  s=await state();assert.equal(s.courseAnswers.length,1);assert.equal(s.courseAnswers[0].score,0);assert.equal(s.courseAnswers[0].errorCause,'condition');assert.match(s.courseAnswers[0].correction,/颈以下/);assert.equal(s.courseRecall.at(-1).confidence,'unsure');
  const old=new Date(Date.now()-86400000-10000).toISOString();await seed({courseCoach:null,courseAnswers:s.courseAnswers.map(a=>({...a,at:old,correctionAt:old})),courseRecall:s.courseRecall.map(a=>({...a,at:old,nextReviewAt:new Date(Date.now()-1000).toISOString()}))});
  await coach().getByRole('button',{name:'开始今日领学',exact:true}).click();await expect(coach()).toContainText('错点回炉 · 先闭卷检验');await expect(p.locator('.coach-materials')).toHaveCount(0);
  s=await state();task=s.courseCoach.tasks[0];assert.equal(task.requirement,'K0163');assert.equal(task.phase,'question');const retest=data.questions.find(q=>q.id===task.question);
  for(const key of retest.answers)await p.locator('.coach-question .answer-options button').filter({hasText:new RegExp('^'+key+'\\.')}).click();
  await coach().getByRole('button',{name:'提交，进入订正',exact:true}).click();await expect(coach()).toContainText('本题通过了间隔至少24小时');
  s=await state();assert.equal(s.courseAnswers.at(-1).score,1);assert.equal(s.courseAnswers.at(-1).coach.delayedEligible,true);const records=s.courseAnswers.length;await p.reload();assert.equal((await state()).courseAnswers.length,records);
  await coach().getByRole('button',{name:'保存小段，先歇一下',exact:true}).click();await expect(coach().getByRole('progressbar',{name:'闭卷练习答对的条目',exact:true})).toHaveAttribute('value','1');await expect(coach().getByRole('progressbar',{name:'隔天检验仍答对的条目',exact:true})).toHaveAttribute('value','1');
  await coach().screenshot({path:'../verification/current-audit/今日领学与记忆进度.png'});await p.setViewportSize({width:360,height:800});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await coach().getByRole('button',{name:'继续已保存的今日领学',exact:true}).click();await coach().getByRole('button',{name:'继续下一步',exact:true}).click();await expect(coach()).toContainText('30天主线 · 新内容');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const bound=new Set([...Object.values(data.requirementGuides).flatMap(g=>g.directQuestionIds||[]),...Object.values(data.requirementReadings).flatMap(r=>[...r.questionIds,...(r.articleQuestionIds||[])])]),heldFamilies=new Set(data.questions.filter(q=>q.professionalHold).map(q=>q.family));
  const currentUnbound=data.questions.find(q=>!q.subjective&&!q.professionalHold&&!heldFamilies.has(q.family)&&!bound.has(q.id));
  assert.equal(currentUnbound,undefined,'All current available questions now have exact partial syllabus bindings');
  // Retain the compatibility browser check with an explicitly isolated fixture.
  // This additional ID is never written to the real catalog or counted as content.
  const unbound={...q,id:'isolated-unbound-compatibility',family:'isolated-unbound-compatibility-family',variantGroup:'isolated-unbound-compatibility-family',requirementIds:[]};
  const compatibilityData={...data,questions:[...data.questions,unbound]};
  await p.route('**/course/catalog.json',route=>route.fulfill({json:compatibilityData}));
  await seed({courseCoach:null,courseAnswers:[{id:'unbound-old',question:unbound.id,response:'',score:0,at:old,revealed:true}],courseRecall:[]});
  await expect(coach()).toContainText('章节错题尚无精确考纲关联');await coach().getByRole('button',{name:'开始今日领学',exact:true}).click();
  s=await state();assert.equal(s.courseCoach.tasks[0].requirement,`question:${unbound.id}`);await expect(p.locator('.coach-materials')).toHaveCount(0);
  for(const key of unbound.answers)await p.locator('.coach-question .answer-options button').filter({hasText:new RegExp('^'+key+'\\.')}).click();
  await coach().getByRole('button',{name:'提交，进入订正',exact:true}).click();await coach().getByRole('button',{name:'保存小段，先歇一下',exact:true}).click();
  await expect(coach().getByRole('progressbar',{name:'已学过的考纲条目',exact:true})).toHaveAttribute('value','0');await expect(coach().getByRole('progressbar',{name:'隔天检验仍答对的条目',exact:true})).toHaveAttribute('value','0');
  await p.unroute('**/course/catalog.json');
  // A competing tab prevents grading rather than revealing an unsaved answer.
  await seed({courseCoach:{...session,tasks:[{...session.tasks[0],response:'A'}]},courseAnswers:[],courseRecall:[]});
  await p.evaluate(async()=>{const m=await import('/src/learningStore.ts'),s=await m.loadLearning();await m.saveLearning({...s,settings:{...s.settings,sound:!s.settings.sound}},s.revision)});
  await coach().getByRole('button',{name:'提交，进入订正',exact:true}).click();await expect(coach()).toContainText('这一步未保存成功');assert.equal((await state()).courseAnswers.length,0);await expect(p.locator('.coach-feedback')).toHaveCount(0);
  assert.deepEqual(errors,[]);const checks=['overview and 30 plan bars','automatic read/recall/practice flow','closed sources and chapter map','draft reload','wrong cause and correction retained','pause/resume','wrong result not promoted','tomorrow review before new learning','24h retest recorded separately','feedback reload no duplicate score','continue to next new requirement','mobile no overflow','5 states no axe violations','unbound chapter wrong retest without inventing requirement progress','competing-tab failed save does not grade or reveal'];fs.writeFileSync('../verification/current-audit/course-coach-ui.json',JSON.stringify({passed:true,checks,isolatedStorage:true},null,2));console.log(`${checks.length} coach UI checks passed`);
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
