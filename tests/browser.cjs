const { chromium, expect } = require("@playwright/test");
const fs = require("node:fs/promises");
const path = require("node:path");
const out = path.resolve(process.env.TEST_OUTPUT || "test-results");
const scratch = path.resolve(
  process.env.TEST_SCRATCH || path.join(out, "scratch"),
);
const base = process.env.BASE_URL || "http://127.0.0.1:5173/";
const results = [];
const errors = [];
const assert = (ok, message) => {
  if (!ok) throw new Error(message);
  results.push({ test: message, status: "passed" });
};
(async () => {
  await fs.mkdir(path.join(out, "screenshots"), { recursive: true });
  await fs.mkdir(scratch, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.BROWSER_CHANNEL || "msedge",
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on("pageerror", (e) => errors.push(e.message));
  const go = async (route) => {
    await page.goto(base + "#/" + route);
    await page.locator("h1").first().waitFor();
  };
  const click = async (name) => {
    await page.getByRole("button", { name, exact: true }).click();
  };
  await go("welcome");
  await page.locator(".toast").waitFor({ state: "hidden" });
  await page.locator("main").focus();
  await page.screenshot({
    path: path.join(out, "screenshots/01-welcome-desktop.png"),
    fullPage: true,
  });
  await click("继续");
  assert(await page.getByRole("alert").isVisible(), "空角色名被拦截");
  await page.getByLabel("伙伴的名字").fill("知微");
  await click("继续");
  await page.getByLabel("考试日期（可选）").fill("2020-01-01");
  await click("继续");
  assert(await page.getByRole("alert").isVisible(), "过期考试日期被拦截");
  await click("先自主学习，使用 30 天周期");
  await click("继续");
  await click("继续");
  await click("看看我的计划");
  await click("开启我的小小书房");
  await page.getByRole("heading", { name: "今天，也一起读书吧。" }).waitFor();
  assert(await page.getByText("Day 1").isVisible(), "完整引导进入 Day 1");
  await page.locator(".toast").waitFor({ state: "hidden" });
  await page.locator("main").focus();
  await page.screenshot({
    path: path.join(out, "screenshots/02-today-desktop.png"),
    fullPage: true,
  });
  await click("开始今天的学习");
  await page.getByLabel("自定义分钟").fill("0");
  assert(
    await page.getByRole("button", { name: "就这样开始" }).isDisabled(),
    "非法学习预算被拦截",
  );
  await click("10 分钟");
  await click("有点累");
  assert(
    await page.getByText("预留休息后，可用学习时间约 7 分钟。").isVisible(),
    "10 分钟疲劳状态预算为 7 分钟",
  );
  await page.keyboard.press("Escape");
  assert(
    (await page.getByRole("dialog").count()) === 0,
    "弹层支持 Escape 关闭",
  );
  await click("开始今天的学习");
  await click("就这样开始");
  await click("继续");
  await click("继续");
  await page.getByLabel("你的回忆").fill("一点点");
  await page.waitForTimeout(700);
  await page.reload();
  await page.getByLabel("你的回忆").waitFor();
  assert(
    (await page.getByLabel("你的回忆").inputValue()) === "一点点",
    "刷新恢复步骤与作答草稿",
  );
  await page.locator(".toast").waitFor({ state: "hidden" });
  await page.locator("main").focus();
  await page.screenshot({
    path: path.join(out, "screenshots/03-learn-desktop.png"),
    fullPage: true,
  });
  await click("看看反馈");
  await click("继续");
  await page.getByRole("button", { name: /先完成一个最小任务/ }).click();
  await click("看看反馈");
  await click("完成这次小练习");
  assert(
    await page
      .getByRole("heading", { name: "认真走过的每一步，都算数。" })
      .isVisible(),
    "阅读理解挖空练习完整闭环",
  );
  await page.getByRole("link", { name: "收下小奖励" }).click();
  await click("领取小奖励");
  await click("开心收下");
  assert(
    await page
      .getByRole("button", { name: "今天已领取", exact: true })
      .isDisabled(),
    "每日奖励重复领取被阻止",
  );
  await click("体验打开惊喜盒子");
  await click("开心收下");
  await page.reload();
  assert(
    await page.getByRole("button", { name: "惊喜已收藏" }).isDisabled(),
    "宝箱结果跨刷新保留且不能重复开启",
  );
  await page
    .getByRole("button", { name: "标记已兑现", exact: true })
    .first()
    .click();
  await page.getByLabel("奖励内容").fill("看一场日落");
  await click("放进奖励池");
  assert(
    (await page.getByText("看一场日落", { exact: true }).count()) === 1,
    "自定义奖励保存",
  );
  await go("me");
  await click("暂停学习计划");
  await click("确认暂停");
  await go("today");
  assert(
    await page
      .getByRole("button", { name: "恢复学习", exact: true })
      .isVisible(),
    "暂停状态保存并反映在首页",
  );
  await click("恢复学习");
  await page.getByRole("dialog").waitFor();
  await click("关闭");
  await click("只读一句");
  await click("读完了，收下这一小步");
  assert(
    await page
      .getByRole("heading", { name: "读完一句，也值得庆祝。" })
      .isVisible(),
    "最小任务独立完成",
  );
  await go("archive");
  const downloaded = page.waitForEvent("download");
  await click("下载演示存档");
  const d = await downloaded;
  const save = path.join(scratch, "test-archive.json");
  await d.saveAs(save);
  const data = JSON.parse(await fs.readFile(save, "utf8"));
  assert(
    data.mode === "demo" &&
      data.completed.length === 2 &&
      data.claims.length === 2,
    "JSON 导出包含演示记录与奖励",
  );
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ ...data, mode: "real" })),
    });
  assert(await page.getByRole("alert").isVisible(), "拒绝真实模式与不兼容存档");
  await page.locator("input[type=file]").setInputFiles(save);
  await page.getByRole("dialog").waitFor();
  await click("暂不导入");
  assert((await page.getByRole("dialog").count()) === 0, "导入预览可取消");
  await page.locator("input[type=file]").setInputFiles(save);
  await click("备份当前并恢复");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  const backupWait = page.waitForEvent("download");
  await click("下载上一次导入前的备份");
  const backup = await backupWait;
  await backup.saveAs(path.join(scratch, "test-preimport.json"));
  assert(
    JSON.parse(
      await fs.readFile(path.join(scratch, "test-preimport.json"), "utf8"),
    ).completed.length === 2,
    "导入事务保留导入前备份",
  );
  const fresh = await browser.newContext({
    viewport: { width: 360, height: 800 },
  });
  const freshPage = await fresh.newPage();
  await freshPage.goto(base + "#/archive");
  await freshPage.locator("input[type=file]").setInputFiles(save);
  await freshPage.getByRole("button", { name: "备份当前并恢复" }).click();
  await freshPage.getByRole("dialog").waitFor({ state: "hidden" });
  await freshPage.goto(base + "#/growth");
  await freshPage.getByText("2 次").waitFor();
  assert(true, "空白浏览器环境导入恢复学习记录");
  await fresh.close();
  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "today",
      "classics",
      "knowledge/0",
      "growth",
      "assessment/stage",
      "graduation",
      "rewards",
      "me",
      "archive",
      "sources",
    ]) {
      await go(route);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      assert(!overflow, `${width}px ${route} 无横向溢出`);
    }
    await go("today");
    await page.locator(".toast").waitFor({ state: "hidden" });
    await page.locator("main").focus();
    await page.screenshot({
      path: path.join(out, `screenshots/04-today-${width}.png`),
      fullPage: true,
    });
    await go("growth");
    await page.locator(".toast").waitFor({ state: "hidden" });
    await page.locator("main").focus();
    await page.screenshot({
      path: path.join(out, `screenshots/05-growth-${width}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 360, height: 900 });
  await go("today");
  await click("再温习一小会儿");
  await page.keyboard.press("Tab");
  const first = await page.evaluate(() =>
    document.activeElement?.getAttribute("aria-label"),
  );
  assert(first === "关闭", "弹层焦点进入关闭按钮");
  await page.keyboard.press("Shift+Tab");
  assert(
    await page
      .getByRole("button", { name: "就这样开始" })
      .evaluate((el) => el === document.activeElement),
    "弹层键盘焦点循环",
  );
  await page.keyboard.press("Escape");
  await go("me");
  await page.getByLabel("减少动态效果").click();
  await expect(page.getByLabel("减少动态效果")).toBeChecked();
  await page.reload();
  assert(
    await page.getByLabel("减少动态效果").isChecked(),
    "减少动效设置持久化",
  );
  await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "大字号设置无横向溢出（非浏览器缩放测试）",
  );
  assert(errors.length === 0, "浏览器无未捕获运行异常");
  await fs.writeFile(
    path.join(out, "browser-test-results.json"),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        browser: await browser.version(),
        results,
        errors,
      },
      null,
      2,
    ),
  );
  await browser.close();
  console.log(JSON.stringify({ passed: results.length, errors }));
})().catch(async (e) => {
  console.error(e);
  await fs.writeFile(
    path.join(out, "browser-test-results.json"),
    JSON.stringify({ results, errors, failure: String(e) }, null, 2),
  );
  process.exit(1);
});
