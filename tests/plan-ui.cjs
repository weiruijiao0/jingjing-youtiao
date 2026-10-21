const {chromium,expect}=require('@playwright/test');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});const p=await b.newPage({viewport:{width:1280,height:960}});try{
 await p.goto('http://127.0.0.1:5185/#/course');
 const plan=p.getByRole('region',{name:'30天主学习计划'});
 await expect(plan.locator('.plan-days progress')).toHaveCount(30);
 await plan.getByText('时间不够？调整剩余计划',{exact:true}).click();
 await plan.getByLabel('每天可用于阅读与回忆的分钟数').selectOption('20');
 await plan.getByRole('button',{name:'保存预算并重排未学内容'}).click();
 await plan.getByRole('button',{name:/开始第 1 天的下一小段/}).click();
 await expect(p.getByText('本轮含当前还剩 4 条。',{exact:false})).toBeVisible();
 await p.getByRole('button',{name:'读好了，隐藏资料开始回忆'}).click();
 await expect(p.getByRole('heading',{name:'课程地图',exact:true})).toHaveCount(0);
 await p.getByLabel('合上原文，写出本条要点').fill('测试回忆');
 await p.getByRole('button',{name:'完成回忆，展开对照'}).click();
 await p.getByRole('button',{name:'有漏项 · 明天复习'}).click();
 await expect(p.locator('.plan-days progress').nth(0)).toHaveAttribute('value','1');
 for(let i=0;i<3;i++){
  await p.getByRole('button',{name:'继续下一条',exact:true}).click();
  await p.getByRole('button',{name:'读好了，隐藏资料开始回忆'}).click();
  await p.getByLabel('合上原文，写出本条要点').fill('测试回忆');
  await p.getByRole('button',{name:'完成回忆，展开对照'}).click();
  await p.getByRole('button',{name:'有漏项 · 明天复习'}).click();
 }
 await p.getByRole('button',{name:'结束本轮',exact:true}).click();
 await plan.locator('.plan-days button').nth(4).click();
 await plan.getByRole('button',{name:'保存预算并重排未学内容'}).click();
 const state=await p.evaluate(async()=>{const m=await import('/src/learningStore.ts');return m.loadLearning()});
 const ids=state.courseSchedule.days.flatMap(d=>d.requirements);
 if(ids.length!==712||new Set(ids).size!==712||state.courseSchedule.days[0].requirements.length!==4)throw Error('Rebalance lost or duplicated content');
 await p.reload();await expect(plan.getByRole('progressbar',{name:'第1天进度',exact:true})).toHaveAttribute('value','4');
 await plan.locator('.plan-days button').nth(24).click();
 await plan.getByRole('checkbox').nth(0).click();
 await expect(plan.getByRole('checkbox').nth(0)).toBeChecked();
 await p.reload();await expect(plan.getByRole('progressbar',{name:'第25天进度',exact:true})).toHaveAttribute('value','1');
 await plan.screenshot({path:'../verification/30天每日进度总览.png'});
 await p.setViewportSize({width:390,height:850});if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');
 console.log('30 day bars, budget-based queue, closed book, progress, rebalance preservation, reload and review checklist passed');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
