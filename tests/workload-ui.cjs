const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
(async () => {
 const b = await chromium.launch({channel:'msedge',headless:true});
 const p = await b.newPage({viewport:{width:1280,height:960}});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 try {
  await p.goto('http://127.0.0.1:5185/#/today');
  await p.getByLabel('伙伴的名字').fill('学习测试');
  await p.getByRole('button',{name:/保存并开始学习/}).click();
  await p.getByRole('button',{name:'安排今天的学习'}).click();
  await p.getByRole('button',{name:'20 分钟',exact:true}).click();
  await p.getByRole('button',{name:/生成今天的安排/}).click();
  await expect(p.locator('.task-row')).toHaveCount(6);
  await expect(p.getByText(/已安排约 18 分钟学习/)).toBeVisible();
  await p.screenshot({path:'../verification/20分钟真实任务量.png',fullPage:true});
  await p.locator('.task-row').first().getByRole('button',{name:'开始',exact:true}).click();
  await p.getByRole('button',{name:'读过了，看看理解'}).click();
  await p.getByRole('button',{name:'开始巩固',exact:true}).click();
  for(let i=0;i<2;i++) {
    if(await p.getByLabel('你的回忆').isVisible()) await p.getByLabel('你的回忆').fill('测试回答');
    else await p.locator('.answer-options button').first().click();
    await p.locator('.reading-actions .primary').click();
    await p.locator('.reading-actions .primary').click();
    if(i===0)await p.getByRole('button',{name:'暂不确定，看看反馈',exact:true}).waitFor();
    else await expect(p.getByText(/今天还有 5 个已安排单元待学/)).toBeVisible();
  }
  await expect(p.getByText(/今天还有 5 个已安排单元待学/)).toBeVisible();
  await p.getByRole('button',{name:/继续下一个单元/}).click();
  await expect(p.getByRole('button',{name:'读过了，看看理解'})).toBeVisible();
  await p.goto('http://127.0.0.1:5185/#/classics');
  await p.getByText('展开全部 712 条考纲候选要求').click();
  await p.getByLabel('检索考纲').fill('K0712');
  await expect(p.locator('.scope-list article')).toHaveCount(1);
  await expect(p.locator('.scope-list')).toContainText('请在主课程学习本条');
  await p.goto('http://127.0.0.1:5185/#/course');
  await p.getByText('查看新增专项题（536 条）',{exact:true}).click();
  await p.getByLabel('查找专项考点',{exact:true}).fill('K0712');
  await expect(p.locator('.gap-topic')).toHaveCount(1);
  await p.locator('.gap-topic').getByRole('button',{name:'开始或继续本条专项'}).click();
  await expect(p.locator('.course-question h2')).toContainText('甘露消毒丹');
  await p.setViewportSize({width:360,height:800});
  if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw Error('Mobile overflow');
  await p.screenshot({path:'../verification/考纲末条已接入_手机.png',fullPage:true});
  if(errors.length)throw Error(errors.join('\n'));
  await fs.writeFile('../verification/workload-ui-results.json',JSON.stringify({passed:true,checks:['20分钟6单元约18分钟','片段结束显示5条剩余并直接继续','末条K0712可检索并进入主课程专项','360px无横向溢出','无页面异常']},null,2));
  console.log('5 workload UI checks passed');
 } finally {await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

