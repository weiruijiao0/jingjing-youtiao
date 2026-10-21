const {chromium,expect}=require('@playwright/test');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});const p=await b.newPage({viewport:{width:1280,height:900}});try{
 await p.goto('http://127.0.0.1:5185/#/me');
 await p.evaluate(async()=>{const m=await import('/src/learningStore.ts');const s=await m.loadLearning();await m.saveLearning({...s,profile:{...s.profile,name:'测试伙伴',ready:true},courseRecall:[{id:'test-recall',requirement:'K0001',response:'测试原记录',at:new Date().toISOString(),confidence:'unsure',nextReviewAt:new Date(Date.now()+86400000).toISOString()}]},s.revision)});
 await p.reload();await p.getByRole('button',{name:'从头开始',exact:true}).click();await p.getByRole('button',{name:'取消',exact:true}).click();
 const read=()=>p.evaluate(async()=>{const m=await import('/src/learningStore.ts');return m.loadLearning()});
 if((await read()).courseRecall.length!==1)throw Error('Cancel changed progress');
 await p.getByRole('button',{name:'直接进入冲刺模式',exact:true}).click();await p.getByRole('button',{name:'确认进入冲刺',exact:true}).click();
 await expect(p.getByRole('heading',{name:'第 25 天 · 归纳内经与伤寒',exact:true})).toBeVisible();
 if((await read()).courseRecall.length!==1)throw Error('Sprint erased progress');
 await p.reload();await expect(p.getByRole('heading',{name:'第 25 天 · 归纳内经与伤寒',exact:true})).toBeVisible();
 await p.goto('http://127.0.0.1:5185/#/me');await p.getByRole('button',{name:'从头开始',exact:true}).click();await p.getByRole('button',{name:'确认从头开始',exact:true}).click();
 await expect(p.getByRole('heading',{name:'第 1 天 · 阅读与闭卷回忆',exact:true})).toBeVisible();const fresh=await read();
 if(fresh.courseRecall.length||fresh.courseMode!=='guided'||fresh.profile.name!=='测试伙伴'||!fresh.packs.length)throw Error('Reset or preserved settings incorrect');
 await p.goto('http://127.0.0.1:5185/#/me');await p.getByRole('button',{name:'恢复上次切换前的记录',exact:true}).click();await p.getByRole('button',{name:'确认恢复记录',exact:true}).click();
 await expect(p.getByRole('heading',{name:'第 25 天 · 归纳内经与伤寒',exact:true})).toBeVisible();if((await read()).courseRecall[0]?.response!=='测试原记录')throw Error('Restore lost old records');
 await p.goto('http://127.0.0.1:5185/#/me');await p.locator('.restart-controls').screenshot({path:'../verification/重新开始与冲刺模式.png'});
 console.log('Cancel, sprint preservation and reload, full restart, content/settings preservation, atomic snapshot restore passed');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
