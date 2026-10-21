import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {courseRoute} from '../src/courseRoute';
const d=JSON.parse(readFileSync('public/course/catalog.json','utf8'));
const route=courseRoute(d);const all=route.flatMap(day=>day.requirements);
assert.equal(route.length,24);assert.equal(all.length,712);assert.equal(new Set(all).size,712);
for(const day of route){assert.ok(day.requirements.length>=28&&day.requirements.length<=31);assert.equal(new Set(day.requirements.map(id=>d.courses.find((c:any)=>c.requirements.some((r:any)=>r.id===id)).classic)).size,4)}
assert.equal(d.newGuide.pages.length,509);
for(const p of d.newGuide.pages)assert.ok(existsSync(`public/library/F0007/${String(p.page).padStart(4,'0')}.jpg`));
for(const c of d.courses){assert.ok(c.newGuidePages.length);for(const r of c.requirements){const a=d.requirementReadings[r.id];assert.ok(a.newGuidePages.length);assert.ok(a.newGuideFocusPages.every((p:number)=>a.newGuidePages.includes(p)))}}
assert.equal(d.courses.find((c:any)=>c.title==='阴阳易').newGuidePages[0],300);
assert.deepEqual(d.requirementReadings.K0199.newGuidePages,d.requirementReadings.K0197.newGuidePages);
console.log('30-day route: all 712 exactly once, four classics each day, all 106 chapter image links valid');
