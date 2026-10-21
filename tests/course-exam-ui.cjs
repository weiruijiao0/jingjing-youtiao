const {chromium,expect}=require('@playwright/test');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});let p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));try{
await p.goto('http://127.0.0.1:5185/#/course');await p.getByText('整套限时演练与交卷订正',{exact:true}).click();await p.getByRole('button',{name:'开始新的未使用题演练'}).click();
await expect(p.getByRole('heading',{name:'全国三级 · 限时题型演练'})).toBeVisible();await expect(p.getByLabel('跳转题目').locator('option')).toHaveCount(91);
await p.locator('.course-exam .answer-options button').first().click();await p.waitForTimeout(700);await p.reload();await expect(p.locator('.course-exam button[aria-pressed=true]')).toHaveCount(1);
await p.getByLabel('跳转题目').selectOption('90');await p.getByLabel('独立写出能力分析').fill('独立分析：先分析主症和病机，再辨治法与方药。');
await p.getByRole('button',{name:'检查并交卷'}).click();await expect(p.getByText(/尚有 89 题未作答/)).toBeVisible();await p.getByRole('button',{name:'确认交卷'}).click();
await p.getByText('整套限时演练与交卷订正',{exact:true}).click();await expect(p.getByRole('heading',{name:/本卷已交卷：客观题/})).toBeVisible();
const s=await p.evaluate(async()=>{const m=await import('/src/learningStore.ts');return m.loadLearning()});if(s.courseAnswers.length!==91||!s.courseExams[0].submittedAt)throw Error('submission not persisted');
if(s.courseAnswers.filter(a=>a.score===null).length!==1)throw Error('ability auto graded');
// Timeout is a separate isolated exam: the finite unused bank does not promise
// two consecutive full papers for every random first-paper combination.
const submittedPage=p, firstExam=s.courseExams[0];
const timeoutContext=await b.newContext();p=await timeoutContext.newPage();p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://127.0.0.1:5185/#/course');
await p.getByText('整套限时演练与交卷订正',{exact:true}).click();
await p.getByRole('button',{name:'开始新的未使用题演练'}).click();
await expect(p.getByRole('heading',{name:'全国三级 · 限时题型演练'})).toBeVisible();
await expect(p.getByLabel('跳转题目').locator('option')).toHaveCount(91);
await expect.poll(()=>p.evaluate(async()=>{const m=await import('/src/learningStore.ts');const exams=(await m.loadLearning()).courseExams;return exams.length===1&&!exams[0].submittedAt}),{timeout:10000}).toBe(true);
// Leave the app before advancing the saved time so autosave cannot race the fixture.
await p.route('**/__exam-timeout-fixture__',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated timeout fixture</title>'}));
await p.goto('http://127.0.0.1:5185/__exam-timeout-fixture__');
await p.evaluate(async()=>{const m=await import('/src/learningStore.ts');const s=await m.loadLearning();if(s.courseExams.length!==1||s.courseExams[0].submittedAt)throw Error('timeout exam not active');s.courseExams[0].startedAt=new Date(Date.now()-6001e3).toISOString();const saved=await m.saveLearning(s,s.revision);if(saved.courseExams[0].startedAt!==s.courseExams[0].startedAt)throw Error('expired exam fixture not saved')});
await p.goto('http://127.0.0.1:5185/#/course');
await expect.poll(()=>p.evaluate(async()=>{const m=await import('/src/learningStore.ts');const s=await m.loadLearning();return s.courseExams.length===1&&!!s.courseExams[0].submittedAt&&s.courseAnswers.length===91}),{timeout:10000}).toBe(true);
const done=await p.evaluate(async()=>{const m=await import('/src/learningStore.ts');return await m.loadLearning()});
if(done.courseExams.length!==1||!done.courseExams[0].submittedAt||done.courseAnswers.length!==91||done.courseAnswers.filter(a=>a.score===null).length!==1)throw Error('timeout did not persist complete ungraded-ability submission');
const unchanged=await submittedPage.evaluate(async()=>{const m=await import('/src/learningStore.ts');return await m.loadLearning()});
if(JSON.stringify(unchanged.courseExams[0])!==JSON.stringify(firstExam)||unchanged.courseAnswers.length!==91)throw Error('isolated timeout changed prior submitted exam');
if(errors.length)throw Error(errors.join('\n'));console.log('Exam UI: resume, 91 items, deferred answers, submit and timeout passed');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
