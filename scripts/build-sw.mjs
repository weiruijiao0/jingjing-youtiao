import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const walk = async (d) =>
  (
    await Promise.all(
      (await readdir(d, { withFileTypes: true })).map(async (e) =>
        e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`],
      ),
    )
  ).flat();
const files = (await walk("dist")).filter((f) => !f.endsWith("/sw.js")).sort();
const hash = createHash("sha256");
for (const f of files) hash.update(await readFile(f));
const version = hash.digest("hex").slice(0, 16);
await writeFile(
  "dist/sw.js",
  `const CACHE='jingjing-v3-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-${version}';
const ASSETS=${JSON.stringify(files.map((f) => "./" + f.slice(5)))};
self.addEventListener('install',event=>event.waitUntil((async()=>{try{const cache=await caches.open(CACHE);await cache.addAll(ASSETS);}catch(e){await caches.delete(CACHE);throw e;}})()));
self.addEventListener('message',event=>{if(event.data==='activate')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith((async()=>{const cache=await caches.open(CACHE);const exact=await cache.match(event.request,{ignoreVary:true});if(exact)return exact;try{return await fetch(event.request);}catch(e){if(event.request.mode==='navigate')return await cache.match('./index.html');throw e;}})());});
`,
);
console.log(
  `Offline cache ${version}: ${files.length} application files; local content stays in IndexedDB.`,
);
