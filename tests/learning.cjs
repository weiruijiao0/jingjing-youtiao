const { chromium, firefox, expect } = require("@playwright/test");
const fs = require("node:fs/promises"),
  path = require("node:path");
const base = process.env.BASE_URL || "http://127.0.0.1:5185/";
const results = [],
  out = path.resolve(process.env.TEST_OUTPUT || "../verification");
const check = (name) => results.push({ test: name, status: "passed" });
(async () => {
  await fs.mkdir(out, { recursive: true });
  const browser = process.env.ENGINE === 'firefox' ? await firefox.launch({headless:true}) : await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 960 },
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.setDefaultTimeout(10000);
  try {
    await page.goto(base + "#/today");
    await page.getByLabel("伙伴的名字").fill("小叶");
    await page.getByRole("button", { name: /保存并开始学习/ }).click();

    await page.goto(base + "#/sources");
    await expect(page.getByText("已准备好的学习资料")).toBeVisible();
    await expect(page.locator("input[type=file]")).toHaveCount(0);
    check("首次自动载入学习资料，资料页无手动导入入口");
    await page.goto(base + "#/classics");
    await expect(page.locator(".unit-link")).toHaveCount(40);
    check("四经典核定单元可访问");
    await page.goto(base + "#/today");
    await page.getByRole("button", { name: /轻一点开始/ }).click();
    await expect(page.locator(".task-row")).toHaveCount(1);
    await page
      .locator(".task-row")
      .getByRole("button", { name: "开始", exact: true })
      .click();
    await page.getByRole("button", { name: "读过了，看看理解" }).click();
    await page.getByRole("button", { name: "开始巩固", exact: true }).click();
    await expect(page.getByText('提交后核对原文',{exact:true})).toHaveCount(0);
    await expect(page.getByText('一起看一眼原文',{exact:true})).toHaveCount(0);
    await expect(page.getByRole('button',{name:'看看提示',exact:true})).toHaveCount(0);
    await expect(page.getByRole('progressbar',{name:'本片段作答进度'})).toHaveAttribute('value','0');
    await page.getByLabel("你的回忆").fill("保存检查");
    await page.waitForTimeout(500);
    await page.reload();
    await expect(page.getByLabel("你的回忆")).toHaveValue("保存检查");
    check("学习草稿刷新恢复");
    await page.screenshot({
      path: path.join(out, "学习片段.png"),
      fullPage: true,
    });
    await page.locator(".reading-actions .primary").click();
    await expect(page.getByText('提交后核对原文',{exact:true})).toBeVisible();
    await expect(page.getByRole('progressbar',{name:'本片段作答进度'})).toHaveAttribute('value','1');
    await expect(
      page.getByText("有原文或答案帮助：不计独立掌握证据。"),
    ).toBeVisible();
    await page.locator(".reading-actions .primary").click();
    await expect(page.getByText("这个片段已完成，进度已保存。")).toBeVisible();
    check("原文—理解—闭卷回忆—反馈—完成流程，无答题泄漏");
    await page.goto(base + "#/growth");
    await expect(page.getByText("证据不足").first()).toBeVisible();
    check("首轮学习不虚报掌握");
    await page.goto(base + "#/today");
    await page.screenshot({
      path: path.join(out, "今日学习_桌面.png"),
      fullPage: true,
    });
    const state = () =>
      page.evaluate(async () => {
        const db = await import("/src/learningStore.ts");
        return db.loadLearning();
      });
    let s = await state();
    if (
      s.attempts.length !== 1 ||
      s.grants.filter((g) => g.kind === "small").length !== 1
    )
      throw Error("Ledger count");
    check("首答与每日小奖励各记一次");
    const before = JSON.stringify(s);
    const transaction = await page.evaluate(async () => {
      const m = await import("/src/learningStore.ts");
      const before = await m.loadLearning();
      let rejected = false;
      try {
        await m.learningDB.transaction("rw", m.learningDB.records, async () => {
          await m.learningDB.records.put({
            id: "current",
            value: { ...before, attempts: [] },
          });
          throw Error("injected write failure");
        });
      } catch {
        rejected = true;
      }
      return {
        rejected,
        same: JSON.stringify(before) === JSON.stringify(await m.loadLearning()),
      };
    });
    if (!transaction.rejected || !transaction.same)
      throw Error("Rollback failed");
    check("数据库事务中断完整回滚");
    const conflict = await page.evaluate(async () => {
      const m = await import("/src/learningStore.ts");
      const s = await m.loadLearning();
      await m.saveLearning(s, s.revision);
      try {
        await m.saveLearning(s, s.revision);
        return false;
      } catch {
        return true;
      }
    });
    if (!conflict) throw Error("Conflict missing");
    check("另一页面旧修订写入被拒绝");
    const restore = await page.evaluate(async () => {
      const m = await import("/src/learningStore.ts");
      const before = await m.loadLearning();
      const old = {
        ...before,
        attempts: [],
        exposures: [],
        grants: [],
        chests: [],
        covered: [],
      };
      await m.saveLearning(old, before.revision, true);
      const after = await m.loadLearning();
      const backup = (await m.learningDB.records.get("before-import")).value;
      return (
        JSON.stringify(backup) === JSON.stringify(before) &&
        after.attempts.length === before.attempts.length &&
        after.exposures.length === before.exposures.length &&
        JSON.stringify(after.chests) === JSON.stringify(before.chests) &&
        after.grants.length === before.grants.length
      );
    });
    if (!restore) throw Error("Restore ledger loss");
    check("旧档恢复保留首答、曝光和奖励并备份");
    const badRestore = await page.evaluate(async () => {
      const m = await import("/src/learningStore.ts");
      const s = await m.loadLearning(),
        backup = await m.learningDB.records.get("before-import");
      try {
        await m.saveLearning({ ...s, schema: 99 }, s.revision, true);
        return false;
      } catch {
        return (
          JSON.stringify(await m.loadLearning()) === JSON.stringify(s) &&
          JSON.stringify(await m.learningDB.records.get("before-import")) ===
            JSON.stringify(backup)
        );
      }
    });
    if (!badRestore) throw Error("Invalid migration changed state");
    check("未知存档版本拒绝且数据和备份不变");
    await page.reload();
    await page.goto(base + "#/me");
    await page
      .getByRole("button", { name: "暂停学习计划", exact: true })
      .click();
    await page.getByRole("button", { name: "确认暂停", exact: true }).click();
    await page.goto(base + "#/today");
    await expect(
      page.getByRole("button", { name: "恢复并重新安排" }),
    ).toBeVisible();
    check("暂停保留进度并提供恢复");
    const axe = require.resolve("axe-core/axe.min.js");
    for (const route of [
      "today",
      "classics",
      "growth",
      "sources",
      "archive",
      "rewards",
      "me",
      "assessment/stage",
    ]) {
      await page.goto(base + "#/" + route);
      await page.addScriptTag({ path: axe });
      const violations = await page.evaluate(
        async () =>
          (
            await axe.run(document, {
              runOnly: {
                type: "tag",
                values: ["wcag2a", "wcag2aa", "wcag21aa"],
              },
            })
          ).violations,
      );
      await fs.writeFile(
        path.join(out, `axe-${route.replace("/", "-")}.json`),
        JSON.stringify(violations, null, 2),
      );
      if (violations.length)
        throw Error(
          "Accessibility " +
            route +
            ": " +
            violations.map((v) => v.id).join(","),
        );
      check("无障碍 " + route);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + "#/today");
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      )
    )
      throw Error("Mobile overflow");
    await page.screenshot({
      path: path.join(out, "今日学习_手机.png"),
      fullPage: true,
    });
    check("390px手机布局无横向溢出");
    if (errors.length) throw Error(errors.join("\n"));
    check("全流程无页面运行异常");
    await page.goto(base + "#/sources");
    await page
      .getByRole("button", { name: /暂停此内容/ })
      .first()
      .click();
    await page.getByRole("button", { name: "确认暂停此内容" }).click();
    await page.goto(base + "#/classics");
    await expect(page.locator(".unit-link")).toHaveCount(39);
    check("撤回内容即时退出学习库");
  } finally {
    await fs.writeFile(
      path.join(out, "browser-results.json"),
      JSON.stringify({ results, errors }, null, 2),
    );
    await browser.close();
  }
  console.log(`${results.length} browser checks passed.`);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
