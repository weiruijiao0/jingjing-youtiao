import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium, expect } from '@playwright/test';

const root = path.resolve('dist');
const prefix = '/jingjing-youtiao/';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.pdf': 'application/pdf' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith(prefix)) { res.writeHead(404).end(); return; }
    const relative = decodeURIComponent(url.pathname.slice(prefix.length)) || 'index.html';
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep) || !(await stat(file)).isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}${prefix}`;
let browser;
const checks = [], pageErrors = [], failedLocalRequests = [];
try {
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  const context = await browser.newContext({ viewport: { width: 1365, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) failedLocalRequests.push({ url: r.url().replace(base, './'), status: r.status() }); });
  const coach = () => page.getByRole('region', { name: '今日自动领学', exact: true });
  await page.goto(base + '#/today');
  await page.getByLabel('伙伴的名字').or(page.getByRole('link', { name: /开始或继续今日领学/ })).first().waitFor();
  if (await page.getByLabel('伙伴的名字').count()) {
    await page.getByLabel('伙伴的名字').fill('公开发布隔离测试伙伴');
    await page.getByRole('button', { name: /保存并开始学习/ }).click();
  }
  await page.getByRole('link', { name: /开始或继续今日领学/ }).click();
  await expect(coach()).toBeVisible();
  await expect(page.getByRole('region', { name: '30天主学习计划' }).locator('.plan-days progress')).toHaveCount(30);
  checks.push('Project subpath: Today opens the full course and all 30 daily progress bars');
  await coach().getByLabel('本次小段时间').selectOption('20');
  await coach().getByRole('button', { name: '开始今日领学', exact: true }).click();
  await expect(page.locator('.coach-materials')).toBeVisible();
  const sourceImage = page.locator('.coach-materials img').first();
  await sourceImage.scrollIntoViewIfNeeded();
  await expect.poll(() => sourceImage.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  checks.push('Embedded source image loads from the project subpath');
  await coach().getByRole('button', { name: '读好了，合上资料回忆', exact: true }).click();
  await expect(page.locator('.coach-materials')).toHaveCount(0);
  await coach().getByLabel('合上资料，写出本条关键点').fill('发布验证隔离草稿，不用于能力判断');
  await coach().getByRole('button', { name: '保存小段，先歇一下', exact: true }).click();
  await page.reload();
  await coach().getByLabel('合上资料，写出本条关键点').or(coach().getByRole('button', { name: '继续已保存的今日领学', exact: true })).first().waitFor();
  if (await coach().getByRole('button', { name: '继续已保存的今日领学', exact: true }).count()) await coach().getByRole('button', { name: '继续已保存的今日领学', exact: true }).click();
  await expect(coach().getByLabel('合上资料，写出本条关键点')).toHaveValue('发布验证隔离草稿，不用于能力判断');
  await expect(page.locator('.coach-materials')).toHaveCount(0);
  checks.push('Closed recall remains hidden; saved draft restores under the project subpath');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  assert.equal(scope, base);
  await context.setOffline(true);
  await page.reload();
  await expect(coach().getByLabel('合上资料，写出本条关键点')).toHaveValue('发布验证隔离草稿，不用于能力判断');
  const digest = await page.evaluate(async () => {
    const bytes = await (await fetch('./course/catalog.json')).arrayBuffer();
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
  });
  assert.equal(digest, createHash('sha256').update(await readFile('public/course/catalog.json')).digest('hex'));
  checks.push('Scoped offline worker restores the app, draft and exact catalog without network');
  await page.goto(base + '#/classics');
  await expect(page.getByRole('navigation')).toBeVisible();
  await page.goto(base + '#/me');
  await expect(page.getByRole('button', { name: '从头开始', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '直接进入冲刺模式', exact: true })).toBeVisible();
  checks.push('Classic library and restart/sprint page remain accessible offline');
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(failedLocalRequests, []);
  await mkdir('release-verification', { recursive: true });
  await writeFile('release-verification/pages-subpath.json', JSON.stringify({ passed: true, date: new Date().toISOString(), subpath: prefix, catalogSha256: digest, isolatedStorage: true, realLearnerRecordsTouched: false, checks, pageErrors, failedLocalRequests }, null, 2));
  console.log(`${checks.length} GitHub Pages subpath and offline checks passed`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
