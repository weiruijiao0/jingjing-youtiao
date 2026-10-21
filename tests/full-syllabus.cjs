const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium,expect}=require('@playwright/test');
const d=JSON.parse(fs.readFileSync('public/course/catalog.json','utf8'));
const official=fs.readFileSync('../../../work/syllabus-official2026.txt','utf8');
const normal=t=>t.normalize('NFKC').replace(/[\p{P}\p{Z}\s_]+/gu,'');
const rs=d.courses.flatMap(c=>c.requirements);
assert.equal(rs.length,712);
assert.deepEqual(Object.keys(d.requirementGuides).sort(),rs.map(r=>r.id).sort());
for(const r of rs){
 const g=d.requirementGuides[r.id];
 assert.equal(g.scope,r.text);assert.ok(normal(official).includes(normal(g.scope)));
 assert.ok(g.tasks.length&&g.tasks.some(t=>t.kind==='syllabus'));
 assert.ok(g.tasks.filter(t=>t.kind==='syllabus').every(t=>normal(r.text).includes(normal(t.prompt.replace('闭卷说明：','')))));
 assert.ok(g.pages.length&&g.focusPages.length);
 assert.ok(g.focusPages.every(n=>g.pages.includes(n)));
 assert.ok(g.source==='F0007'?g.pages.every(n=>fs.existsSync(`public/library/F0007/${String(n).padStart(4,'0')}.jpg`)):fs.existsSync(`public/library/${g.source}.pdf`));
 assert.equal(g.professionalReviewComplete,false);
}
assert.deepEqual(d.requirementGuides.K0199.pages,d.requirementGuides.K0197.pages);
assert.equal(d.requirementGuides.K0199.chapter,d.requirementGuides.K0197.chapter);
assert.equal(d.contentCoverage.withTextbookTeachingRoutes,712);
assert.deepEqual(d.contentCoverage.withoutTextbookTeachingRoutes,[]);
assert.equal(d.contentCoverage.newRequirementOutlines,114);
assert.deepEqual(d.contentCoverage.withoutTeachingSupport,[]);
assert.equal(d.questions.length,2484); // 536 source-backed short answers, separate from reading prompts.
(async()=>{
 const b=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await b.newContext({viewport:{width:390,height:850}});
  const p=await context.newPage();
  await p.goto('http://127.0.0.1:5185/#/course');
  await expect(p.getByText(/教材领学路径已接入 712 \/ 712 条/)).toBeVisible();
  // These four items previously had no linked narrative lesson, one per classic.
  for(const id of ['K0598','K0609','K0655','K0688']){
   await p.evaluate(async id=>{
    const m=await import('/src/learningStore.ts');const s=await m.loadLearning();
    await m.saveLearning({...s,courseRecallDraft:{queue:[id],response:'',show:false,phase:'read',total:1}},s.revision);
   },id);
   await p.reload();
   const g=d.requirementGuides[id];
   await expect(p.locator('.requirement-session h3')).toHaveText(g.scope);
   const reader=p.locator('.source-teaching');
   await expect(reader.locator('.source-outline')).toContainText(g.outline);
   await expect(reader).toHaveAttribute('open','');
   await expect(reader.locator('img')).toHaveAttribute('src',new RegExp(`${String(g.focusPages[0]).padStart(4,'0')}.jpg$`));
   await expect(p.locator('.requirement-tasks li')).toHaveCount(g.tasks.length);
   await p.getByRole('button',{name:'读好了，隐藏资料开始回忆'}).click();
   await expect(p.locator('.study-materials')).toHaveCount(0);
   await expect(p.locator('.source-teaching')).toHaveCount(0);
   await expect(p.locator('.source-outline')).toHaveCount(0);
   await p.getByLabel('合上原文，写出本条要点').fill('独立回忆草稿，尚有漏项。');
   await p.waitForTimeout(800);await p.reload();
   await expect(p.locator('.study-materials')).toHaveCount(0);
   await p.getByRole('button',{name:'完成回忆，展开对照'}).click();
   await expect(p.getByRole('heading',{name:'按这份清单核对漏项'})).toBeVisible();
   await expect(p.locator('.source-teaching img')).toBeVisible();
   await expect(p.getByLabel('合上原文，写出本条要点')).toBeDisabled();
   if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');
  }
  await p.locator('.requirement-session').screenshot({path:'../verification/全考纲教材领学与逐项对照.png'});
  console.log('712 official scopes, 712 source teaching routes, source assets, four former gaps, mobile, closed recall and reload passed');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

