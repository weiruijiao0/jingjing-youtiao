const {chromium,expect}=require('@playwright/test');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});const p=await b.newPage({viewport:{width:1280,height:900}});try{
await p.goto('http://127.0.0.1:5185/#/course');await p.getByText('30 天完整路线：24 天首轮 + 6 天巩固',{exact:true}).click();
await expect(p.getByText('本日 28 条，已记录回忆 0 条。',{exact:true})).toBeVisible();await p.screenshot({path:'../verification/全国三级30天路线.png'});
await p.getByRole('button',{name:'按本日路线开始（可保存后分段继续）'}).click();await expect(p.getByText(/本轮含当前还剩 28 条/)).toBeVisible();
await p.getByText('新版教材：本章原文与释义',{exact:true}).click();const im=p.locator('.requirement-session .guide-reader img');await expect(im).toBeVisible();await expect(im).toHaveAttribute('src',/0010.jpg/);if(!await im.evaluate(n=>n.complete&&n.naturalWidth>1000))throw Error('source image did not load');
await p.locator('.requirement-session .guide-reader').getByRole('button',{name:'后一页'}).click();await expect(im).toHaveAttribute('src',/0011.jpg/);
await p.locator('.requirement-session .guide-reader').getByLabel('在这些教材页中找词').fill('精神内守');await expect(p.locator('.requirement-session .guide-reader').getByRole('button',{name:'11 页',exact:true})).toBeVisible();
await p.setViewportSize({width:390,height:850});if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('guide overflow');
console.log('Guide UI: daily 28 items, original images, navigation, search and mobile passed');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
