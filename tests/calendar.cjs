const { chromium, expect } = require("@playwright/test");
const fs = require("node:fs/promises"),
  path = require("node:path");
(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 960 },
  });
  const page = await context.newPage(),
    results = [];
  await page.addInitScript(()=>{const Original=window.AudioContext;window.__audioCount=0;window.AudioContext=new Proxy(Original,{construct(target,args){window.__audioCount++;return Reflect.construct(target,args)}})});
  try {
    await page.clock.install({ time: new Date("2026-10-01T04:00:00Z") });
    await page.goto("http://127.0.0.1:5185/#/today");
    await page.getByLabel("伙伴的名字").fill("小叶");
    await page.getByRole("button", { name: /保存并开始学习/ }).click();

    await page.goto("http://127.0.0.1:5185/#/today");
    await page.getByRole("button", { name: /轻一点开始/ }).click();
    await page
      .locator(".task-row")
      .getByRole("button", { name: "开始", exact: true })
      .click();
    await page.getByRole("button", { name: "读过了，看看理解" }).click();
    await page.getByRole("button", { name: "开始巩固", exact: true }).click();
    await page.getByLabel("你的回忆").fill("跨日恢复");
    await page.getByRole("button", { name: "保存并返回" }).click();
    await page.waitForURL('**/#/today');
    await page.clock.setFixedTime(new Date("2026-10-12T04:00:00Z"));
    await page.goto("http://127.0.0.1:5185/#/me");
    await page
      .getByRole("button", { name: "暂停学习计划", exact: true })
      .click();
    await page.getByRole("button", { name: "确认暂停", exact: true }).click();
    await page.clock.setFixedTime(new Date("2026-10-16T04:00:00Z"));
    await page.goto("http://127.0.0.1:5185/#/today");
    await expect(page.getByText("Day 16 / 30")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "恢复并重新安排" }),
    ).toBeVisible();
    results.push("暂停跨日后日历为Day16，仍需主动恢复");
    await page.getByRole("button", { name: "恢复并重新安排" }).click();
    await expect(page.getByLabel("你的回忆")).toHaveValue("跨日恢复");
    await page.locator(".reading-actions .primary").click();
    await page.locator(".reading-actions .primary").click();
    results.push("跨日恢复保留原文快照和草稿，只在实际完成日发奖");
    if(await page.evaluate(()=>window.__audioCount)!==0)throw Error('Muted learning produced audio');
    await page.goto('http://127.0.0.1:5185/#/me');
    await expect(page.getByRole('button',{name:'完成试听'})).toBeDisabled();
    await page.getByLabel('轻轻的提示音').click();
    await expect(page.getByLabel('轻轻的提示音')).toBeChecked();
    await expect(page.getByRole('button',{name:'完成试听'})).toBeEnabled();
    await page.getByLabel('轻轻的提示音').click();
    await expect(page.getByLabel('轻轻的提示音')).not.toBeChecked();
    await page.reload();await expect(page.getByLabel('轻轻的提示音')).not.toBeChecked();
    results.push('静音学习不创建音频，音效开关和刷新持久化有效');
    await page.clock.setFixedTime(new Date("2026-10-30T04:00:00Z"));
    await page.goto("http://127.0.0.1:5185/#/today");
    await expect(
      page.getByRole("link", { name: "看看这一段旅程的总结" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "看看这一段旅程的总结" }).click();
    await expect(page.getByText(/正式达标尚未验证/)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "接下来，把时间用在这些地方" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "保存学习总结" }).click();
    results.push("Day30总结入口、未验证结论、薄弱项建议与报告保存");
    await page.screenshot({
      path: "../verification/Day30总结.png",
      fullPage: true,
    });
    for (const width of [360, 768, 1280]) {
      await page.setViewportSize({ width, height: 960 });
      for (const route of [
        "today",
        "classics",
        "growth",
        "graduation",
        "rewards",
        "me",
        "sources",
        "archive",
      ]) {
        await page.goto("http://127.0.0.1:5185/#/" + route);
        await expect(page.locator("main")).toBeVisible();
        if (
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
          )
        )
          throw Error(`${width}px ${route} overflow`);
      }
      results.push(`${width}px八页面无横向溢出`);
    }
    const state = await page.evaluate(async () => {
      const m = await import("/src/learningStore.ts");
      return m.loadLearning();
    });
    if (
      state.grants.filter((g) => g.kind === "small").length !== 1 ||
      state.grants.some((g) => g.kind === "medium" || g.kind === "large")
    )
      throw Error("Calendar reward error");
    if (state.grants[0].date !== "2026-10-16")
      throw Error("Reward completion date");
    results.push("跨日会话仅产生一次Day16日奖励，无虚假毕业奖励");
    await fs.writeFile(
      "../verification/calendar-results.json",
      JSON.stringify({ results, passed: true }, null, 2),
    );
    console.log(`${results.length} calendar/viewport checks passed.`);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
