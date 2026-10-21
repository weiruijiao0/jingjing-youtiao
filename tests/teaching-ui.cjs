const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs/promises');
(async()=>{const data=JSON.parse(await fs.readFile('public/course/catalog.json','utf8'));const added=data.questions.filter(q=>q.id.startsWith('teaching-'));
 if(added.length!==120||new Set(added.map(q=>q.id)).size!==120)throw Error('Duplicate/lost supplemental question');
 for(const q of added){if(!q.requirementIds.length||!q.reference)throw Error('Missing exact source');if(q.subjective&&q.rubric.reduce((n,r)=>n+r.points,0)!==10)throw Error('Incomplete rubric')}
 const b=await chromium.launch({channel:'msedge',headless:true}),p=await b.newPage();try{
 await p.goto('http://127.0.0.1:5185/#/course');
 await p.getByLabel('带学范围').selectOption({label:'黄帝内经 · 宣明五气篇第二十三'});await p.getByRole('button',{name:'开始本轮逐条学习',exact:true}).click();
 await p.getByText('第一步：原文与讲解（1 段）',{exact:true}).click();await p.getByText('五劳所伤：配对与过用原理',{exact:true}).click();
 await expect(p.getByText(/共同点是‘生病起于过用’/)).toBeVisible();await expect(p.getByRole('link',{name:'教材原页：PDF 第 88 页',exact:true})).toHaveAttribute('href',/0088.jpg$/);
 await p.getByRole('button',{name:'读好了，隐藏资料开始回忆'}).click();await expect(p.locator('.study-materials')).toHaveCount(0);
 await p.getByLabel('合上原文，写出本条要点').fill('视血、卧气、坐肉、立骨、行筋；过用致病。');await p.getByRole('button',{name:'完成回忆，展开对照'}).click();await p.getByRole('button',{name:'有漏项 · 明天复习'}).click();await p.getByRole('button',{name:'下一步：做关联练习（题目在下方）'}).click();
 await expect(p.locator('.course-question h2')).toHaveText('五劳所伤中，久卧对应哪一项？');await expect(p.locator('.course-question .feedback')).toHaveCount(0);await p.locator('.course-question .answer-options button').filter({hasText:'B. 伤气'}).click();await p.getByRole('button',{name:'提交并查看解析',exact:true}).click();
 await expect(p.locator('.course-question .feedback')).toContainText(data.questions.find(q=>q.id==='teaching-K0046-1').explanation);await expect(p.locator('.course-question .feedback')).toContainText('阳气不伸');await p.locator('.course-question').screenshot({path:'../verification/五劳所伤补讲与专项练习.png'});
 console.log('30 source-linked lessons, 120 questions, rubrics, image citations, closed recall and related practice passed');
 }finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
