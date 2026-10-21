const { chromium, expect } = require("@playwright/test");
const fs = require("node:fs/promises"),
  path = require("node:path");
(async () => {
  const original = await fs.readFile("dist/sw.js", "utf8");
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const results = [];
  try {
    await page.goto("http://127.0.0.1:5176/#/today");
    await page.getByLabel("伙伴的名字").fill("更新检查");
    await page.getByRole("button", { name: /保存并开始学习/ }).click();

    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => navigator.serviceWorker.controller);
    await page.goto("http://127.0.0.1:5176/#/today");
    await page.getByRole("button", { name: /轻一点开始/ }).click();
    await page
      .locator(".task-row")
      .getByRole("button", { name: "开始", exact: true })
      .click();
    await fs.writeFile(
      "dist/sw.js",
      original + "\n// update-check " + Date.now(),
    );
    await page.evaluate(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      await r.update();
    });
    await expect(
      page.getByRole("button", { name: "结束当前片段后更新" }),
    ).toBeDisabled();
    results.push("新版本等待，未完成学习片段时禁止切换");
    await page.getByRole("button", { name: "读过了，看看理解" }).click();
    await page.getByRole("button", { name: "开始巩固", exact: true }).click();
    await page.getByLabel("你的回忆").fill("更新前首答");
    await page.locator(".reading-actions .primary").click();
    await page.locator(".reading-actions .primary").click();
    await page.getByRole("button", { name: "保存完成，更新页面" }).click();
    await expect(page.getByText("今天的一小步，已经稳稳落下。")).toBeVisible();
    await expect(page.locator(".update-banner")).toHaveCount(0);
    results.push("完成后用户切换版本，已完成记录保持");
    const broken = original
      .replace("const CACHE=", "const CACHE=")
      .replace("const ASSETS=", "const ASSETS=")
      .replace(
        "self.addEventListener('install'",
        "ASSETS.push('http://127.0.0.1:1/missing-update-asset');\nself.addEventListener('install'",
      );
    await fs.writeFile(
      "dist/sw.js",
      broken.replace(
        "const CACHE='jingjing-v3-",
        "const CACHE='jingjing-v3-failure-",
      ),
    );
    const outcome = await page.evaluate(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      const old = navigator.serviceWorker.controller;
      const state = new Promise((resolve) => {
        r.addEventListener(
          "updatefound",
          () => {
            const w = r.installing;
            w.addEventListener("statechange", () => {
              if (w.state === "redundant") resolve(true);
            });
          },
          { once: true },
        );
      });
      await r.update();
      await Promise.race([
        state,
        new Promise((_, reject) =>
          setTimeout(() => reject(Error("Worker install timeout")), 15000),
        ),
      ]);
      return navigator.serviceWorker.controller === old && !r.waiting;
    });
    if (!outcome) throw Error("Failed install replaced active worker");
    results.push("缺失资源导致新缓存安装失败，旧版本继续运行");
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByText("今天的一小步，已经稳稳落下。")).toBeVisible();
    results.push("更新失败后旧版本仍可离线恢复");
    await fs.writeFile(
      "../verification/update-results.json",
      JSON.stringify({ results, passed: true }, null, 2),
    );
    console.log(`${results.length} update checks passed.`);
  } finally {
    await fs.writeFile("dist/sw.js", original);
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
