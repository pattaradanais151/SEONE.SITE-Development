/* =====================================================================
   SE-ONE.SITE Service Worker
   - อัปเดตทันที: skipWaiting() + clients.claim() (หน้าเว็บจะ reload เองผ่าน controllerchange)
   - HTML (navigation): network-first (timeout 5s) → ออฟไลน์ใช้ App Shell ที่แคชไว้
   - /assets/* (Vite hashed): cache-first (ไฟล์ไม่เปลี่ยนเนื้อหาเมื่อชื่อเดิม)
   - รูป/ฟอนต์/manifest: stale-while-revalidate
   - ปล่อยผ่านเครือข่าย: API, Supabase, Analytics, WebSocket, RSS, sitemap, robots, llms.txt

   หมายเหตุ: ควร register SW เฉพาะ production (import.meta.env.PROD) เพื่อไม่ให้รบกวน HMR ของ Vite ตอน dev
   ===================================================================== */

const SW_VERSION = '2026.10.13-1'; // แก้เลขนี้เมื่อต้องการบังคับล้างแคช/ให้ SW ตัวใหม่ติดตั้ง
const PREFIX = 'se-one';
const SHELL_CACHE = `${PREFIX}-shell-${SW_VERSION}`;
const ASSET_CACHE = `${PREFIX}-assets`;
const RUNTIME_CACHE = `${PREFIX}-runtime`;

const PRECACHE_URLS = ['/', '/logo.png', '/favicon.svg', '/manifest.webmanifest'];

// ไฟล์/พาธที่ต้องไปที่เครือข่ายเสมอ — ไม่แคช และไม่ fallback เป็น App Shell
const NETWORK_ONLY_EXACT = [
  '/sw.js',
  '/rss.xml',
  '/sitemap.xml',
  '/robots.txt',
  '/llms.txt',
  '/ai-catalog.json',
  '/version.json',
  '/ws',
];
const NETWORK_ONLY_PREFIX = ['/api/', '/ws/'];

const MAX_ASSET_ENTRIES = 150;
const MAX_RUNTIME_ENTRIES = 80;
const NAV_TIMEOUT_MS = 5000;

/* ----------------------------- Helpers ----------------------------- */
const isNetworkOnly = (pathname) =>
  NETWORK_ONLY_EXACT.includes(pathname) || NETWORK_ONLY_PREFIX.some((p) => pathname.startsWith(p));

// Route ของ SPA ไม่มีนามสกุลไฟล์ (เช่น /sework/login) — ถ้ามีนามสกุล (.xml, .png ...) ถือเป็นไฟล์จริง
const hasFileExtension = (pathname) => /\.[a-z0-9]+$/i.test(pathname);

// เก็บเป็น App Shell ได้เฉพาะ HTML ที่สำเร็จ และไม่ผ่านการ redirect
// (response ที่ redirected แล้วนำไปตอบ navigation ภายหลังจะ error)
function isShellCacheable(res) {
  if (!res || !res.ok || res.redirected) return false;
  return (res.headers.get('content-type') || '').includes('text/html');
}

// ไม่แคชไฟล์ที่ server ตอบ index.html กลับมาแทนไฟล์ที่ไม่พบ (SPA fallback)
function isCacheable(res) {
  if (!res || !res.ok) return false;
  return !(res.headers.get('content-type') || '').includes('text/html');
}

const timeout = (ms) =>
  new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));

/* ----------------------------- Install ----------------------------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // ใช้ allSettled: ไฟล์ใดไฟล์หนึ่งโหลดไม่ได้ก็ไม่ทำให้การติดตั้งล้มทั้งหมด
      await Promise.allSettled(
        PRECACHE_URLS.map(async (url) => {
          const res = await fetch(new Request(url, { cache: 'reload' }));
          if (!res.ok) throw new Error(`precache failed: ${url}`);
          if (url === '/' && !isShellCacheable(res)) throw new Error('shell is not cacheable HTML');
          await cache.put(url, res);
        })
      );
      await self.skipWaiting(); // อัปเดตทันที ไม่รอให้ปิดทุกแท็บ
    })()
  );
});

/* ----------------------------- Activate ---------------------------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, ASSET_CACHE, RUNTIME_CACHE]);
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith(`${PREFIX}-`) && !keep.has(n))
          .map((n) => caches.delete(n))
      );
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim(); // คุมทุกแท็บทันที → หน้าเว็บได้ controllerchange
    })()
  );
});

/* ------------------------------ Fetch ------------------------------ */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // หน้า HTML (เฉพาะ route ของแอป ไม่รวมไฟล์อย่าง /sitemap.xml, /rss.xml, /logo.png)
  if (req.mode === 'navigate') {
    if (!sameOrigin || isNetworkOnly(url.pathname) || hasFileExtension(url.pathname)) return;
    event.respondWith(handleNavigate(event));
    return;
  }

  // ฟอนต์ไฟล์จริงของ Google Fonts (CORS, cache ได้ปลอดภัย)
  if (url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(event, RUNTIME_CACHE, MAX_RUNTIME_ENTRIES));
    return;
  }

  // ข้ามโดเมนอื่นทั้งหมด (Supabase, GA, GTM, GitHub API, instant.page ฯลฯ)
  if (!sameOrigin) return;

  if (isNetworkOnly(url.pathname)) return;

  // ไฟล์ build ของ Vite (ชื่อมี hash)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(event, ASSET_CACHE, MAX_ASSET_ENTRIES));
    return;
  }

  // รูป/ฟอนต์/manifest ในโดเมนเดียวกัน
  if (['image', 'font', 'manifest'].includes(req.destination)) {
    event.respondWith(staleWhileRevalidate(event, RUNTIME_CACHE, MAX_RUNTIME_ENTRIES));
  }
  // อย่างอื่น: ปล่อยให้เบราว์เซอร์จัดการตามปกติ
});

/* ----------------------------- Messages ---------------------------- */
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
  if (data.type === 'GET_VERSION' && event.ports && event.ports[0]) {
    event.ports[0].postMessage({ version: SW_VERSION });
  }
});

/* ---------------------------- Strategies --------------------------- */
async function handleNavigate(event) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    // รวม navigation preload เข้ากับ timeout เดียวกัน เพื่อไม่ให้ค้างเมื่อเครือข่ายช้า
    const network = (async () => {
      const preload = await event.preloadResponse;
      return preload || fetch(event.request, { cache: 'no-cache' });
    })();
    network.catch(() => {}); // กัน unhandled rejection หากแพ้ timeout

    const res = await Promise.race([network, timeout(NAV_TIMEOUT_MS)]);

    if (isShellCacheable(res)) {
      event.waitUntil(cache.put('/', res.clone())); // เก็บ App Shell ล่าสุดไว้ใช้ตอนออฟไลน์
    }
    return res;
  } catch (err) {
    const shell = (await cache.match('/')) || (await caches.match('/'));
    if (shell) return shell;
    return offlineResponse();
  }
}

async function cacheFirst(event, cacheName, maxEntries) {
  const req = event.request;
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;

  const res = await fetch(req);
  if (isCacheable(res)) {
    event.waitUntil(putAndTrim(cache, req, res.clone(), maxEntries));
  }
  return res;
}

async function staleWhileRevalidate(event, cacheName, maxEntries) {
  const req = event.request;
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);

  const network = fetch(req)
    .then(async (res) => {
      if (isCacheable(res)) await putAndTrim(cache, req, res.clone(), maxEntries);
      return res;
    })
    .catch(() => null);

  if (hit) {
    event.waitUntil(network); // อัปเดตแคชเบื้องหลังหลังตอบจากแคชแล้ว
    return hit;
  }
  return (await network) || Response.error();
}

async function putAndTrim(cache, req, res, max) {
  await cache.put(req, res);
  const keys = await cache.keys();
  if (keys.length > max) {
    await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
  }
}

function offlineResponse() {
  const html =
    '<!doctype html><html lang="th"><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="color-scheme" content="light dark"><title>Offline | SE-ONE</title>' +
    '<style>' +
    ':root{color-scheme:light dark}' +
    'body{margin:0;min-height:100vh;display:grid;place-items:center;box-sizing:border-box;padding:24px;' +
    'font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Noto Sans Thai",system-ui,sans-serif;' +
    'background:#fbfbfd;color:#1d1d1f;text-align:center}' +
    'h2{margin:0 0 8px;font-size:24px;font-weight:600;letter-spacing:-.02em}' +
    'p{margin:0;color:#6e6e73}' +
    'button{margin-top:20px;height:40px;padding:0 22px;border:0;border-radius:999px;background:#0071e3;' +
    'color:#fff;font-size:15px;cursor:pointer}' +
    '@media (prefers-color-scheme:dark){body{background:#000;color:#f5f5f7}p{color:#a1a1a6}}' +
    '</style><body><div><h2>ไม่มีการเชื่อมต่ออินเทอร์เน็ต</h2>' +
    '<p>กรุณาตรวจสอบเครือข่ายแล้วลองใหม่อีกครั้ง</p>' +
    '<button onclick="location.reload()">ลองใหม่อีกครั้ง</button></div></body></html>';
  return new Response(html, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}