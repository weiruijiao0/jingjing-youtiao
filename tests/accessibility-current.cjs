const {chromium}=require('@playwright/test');
const fs=require('node:fs');
(async()=>{
 const b=await chromium.launch({channel:'msedge',headless:true}),context=await b.newContext(),p=await context.newPage();
 const results=[];
 const scan=async state=>{
  await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  const r=await p.evaluate(async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
  results.push({state,violations:r.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
 };
 try{
  for(const route of ['today','classics','growth','me','sources','course']){
   await p.goto(`http://127.0.0.1:5185/#/${route}`);await p.locator('main').waitFor();
   if(route==='course')await p.getByText('查看新增专项题（536 条）',{exact:true}).click();
   await scan(route);
  }
  await p.getByLabel('查找专项考点',{exact:true}).fill('K0001');
  await p.locator('.gap-topic').getByRole('button',{name:'开始或继续本条专项'}).click();
  await p.getByLabel('先写下你的分析').waitFor();await scan('course-closed-answer');
  await p.getByLabel('先写下你的分析').fill('法于阴阳。');await p.getByRole('button',{name:'提交并查看解析',exact:true}).click();
  await p.locator('.feedback').waitFor();await scan('course-feedback');
  await p.getByText('整套限时演练与交卷订正',{exact:true}).click();
  await p.getByRole('button',{name:'开始新的未使用题演练'}).click();
  await p.getByRole('button',{name:'检查并交卷'}).click();
  await p.getByRole('button',{name:'确认交卷'}).click();
  await p.getByText('整套限时演练与交卷订正',{exact:true}).click();
  await p.locator('.course-exam .feedback summary').first().click();
  await scan('course-exam-feedback');
 }finally{await b.close();fs.mkdirSync('../verification/current-audit',{recursive:true});fs.writeFileSync('../verification/current-audit/accessibility.json',JSON.stringify(results,null,2))}
 console.log(JSON.stringify(results.map(r=>({state:r.state,violations:r.violations.map(v=>({id:v.id,impact:v.impact,count:v.nodes.length}))}))));
 if(results.some(r=>r.violations.length))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
