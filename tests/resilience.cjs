const { chromium } = require("@playwright/test");
const fs = require("node:fs/promises");
const path = require("node:path");
const out = path.resolve(process.env.TEST_OUTPUT || "test-results");
const scratch = path.resolve(
  process.env.TEST_SCRATCH || path.join(out, "scratch"),
);
const server = process.env.BASE_URL || "http://127.0.0.1:5173/";
(async () => {
  const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || "msedge",
    headless: true,
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const results = [];
  const check = (ok, test) => {
    if (!ok) throw Error(test);
    results.push({ test, status: "passed" });
  };
  const base = server;
  await page.goto(base + "#/archive");
  await page
    .locator("input[type=file]")
    .setInputFiles(path.join(scratch, "test-archive.json"));
  await page.getByRole("button", { name: "备份当前并恢复" }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.goto(base + "#/me");
  const second = await context.newPage();
  await second.goto(base + "#/me");
  await second.getByLabel("伙伴的名字").waitFor();
  await page.getByLabel("伙伴的名字").fill("知微甲");
  await page.getByRole("button", { name: "保存设置" }).click();
  await page.getByText("伙伴与日期已保存。").waitFor();
  await second.getByLabel("伙伴的名字").fill("知微乙");
  await second.getByRole("button", { name: "保存设置" }).click();
  check(
    await second
      .getByRole("alert")
      .textContent()
      .then((t) => t.includes("另一个页面更新")),
    "并发标签页冲突被显式拦截",
  );
  await second.reload();
  check(
    (await second.getByLabel("伙伴的名字").inputValue()) === "知微甲",
    "冲突写入未覆盖已保存数据",
  );
  await page.evaluate(() => {
    window.originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function () {
      throw new DOMException("测试：存储空间不足", "QuotaExceededError");
    };
  });
  await page.getByLabel("伙伴的名字").fill("不应保存");
  await page.getByRole("button", { name: "保存设置" }).click();
  check(
    await page
      .getByRole("alert")
      .textContent()
      .then((t) => t.includes("存储空间不足")),
    "存储写入失败显示明确错误",
  );
  await page.reload();
  check(
    (await page.getByLabel("伙伴的名字").inputValue()) === "知微甲",
    "失败写入未伪造已保存状态",
  );
  const data = JSON.parse(
    await fs.readFile(path.join(scratch, "test-archive.json"), "utf8"),
  );
  data.session = {
    ...data.session,
    minimum: false,
    step: 2,
    completed: false,
    answer: "一点点",
    choice: "",
    feedback: false,
  };
  await page.goto(base + "#/archive");
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "session.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(data)),
    });
  await page.getByRole("button", { name: "备份当前并恢复" }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  const axe = [];
  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + "#/learn/" + data.session.id);
    await page.getByLabel("你的回忆").waitFor();
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `${width}px 学习页无横向溢出`,
    );
    await page.locator(".toast").waitFor({ state: "hidden" });
    await page.locator("main").focus();
    await page.screenshot({
      path: path.join(out, `screenshots/06-learn-${width}.png`),
      fullPage: width !== 360,
    });
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    axe.push({
      route: "learn",
      width,
      violations: await page.evaluate(
        async () =>
          (
            await axe.run(document, {
              runOnly: {
                type: "tag",
                values: ["wcag2a", "wcag2aa", "wcag21aa"],
              },
            })
          ).violations,
      ),
    });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(base + "#/today");
  await page.evaluate(() => (document.body.style.zoom = "2"));
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "首页 CSS 200% 放大后无横向溢出",
  );
  await page.evaluate(() => (document.body.style.zoom = "1"));
  const fresh = await browser.newContext();
  const newpage = await fresh.newPage();
  for (const width of [360, 768, 1280]) {
    await newpage.setViewportSize({ width, height: 900 });
    await newpage.goto(base + "#/welcome");
    await newpage.getByLabel("伙伴的名字").waitFor();
    check(
      await newpage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `${width}px 首次引导无横向溢出`,
    );
    await newpage.addScriptTag({
      path: require.resolve("axe-core/axe.min.js"),
    });
    axe.push({
      route: "welcome",
      width,
      violations: await newpage.evaluate(
        async () =>
          (
            await axe.run(document, {
              runOnly: {
                type: "tag",
                values: ["wcag2a", "wcag2aa", "wcag21aa"],
              },
            })
          ).violations,
      ),
    });
  }
  const failed = await browser.newContext();
  await failed.addInitScript(() => {
    IDBFactory.prototype.open = function () {
      throw new DOMException("Storage denied", "SecurityError");
    };
  });
  const denied = await failed.newPage();
  await denied.goto(base);
  await denied.getByRole("button", { name: "刷新重试" }).waitFor();
  check(
    await denied
      .getByText("无法打开本地存档。请允许此浏览器使用本地存储，再刷新重试。")
      .isVisible(),
    "禁用本地存储时展示恢复提示",
  );
  await fs.writeFile(
    path.join(out, "resilience-test-results.json"),
    JSON.stringify({ results, accessibility: axe }, null, 2),
  );
  console.log(
    JSON.stringify({
      passed: results.length,
      accessibility: axe.map((a) => ({
        route: a.route,
        width: a.width,
        violations: a.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      })),
    }),
  );
  await browser.close();
  if (axe.some((r) => r.violations.length)) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
