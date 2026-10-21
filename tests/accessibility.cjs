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
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  const results = [];
  await page.goto(server + "#/archive");
  await page
    .locator("input[type=file]")
    .setInputFiles(path.join(scratch, "test-archive.json"));
  await page.getByRole("button", { name: "备份当前并恢复" }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  for (const route of [
    "today",
    "classics",
    "growth",
    "me",
    "archive",
    "sources",
    "rewards",
  ]) {
    await page.goto(server + "#/" + route);
    await page.locator("main").waitFor();
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    const result = await page.evaluate(
      async () =>
        await axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        }),
    );
    results.push({
      route,
      violations: result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    });
  }
  await fs.writeFile(
    path.join(out, "accessibility-test-results.json"),
    JSON.stringify(results, null, 2),
  );
  console.log(
    JSON.stringify(
      results.map((r) => ({
        route: r.route,
        violations: r.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      })),
    ),
  );
  await browser.close();
  if (results.some((r) => r.violations.length)) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
