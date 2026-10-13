// runners.js — ตัวรันโค้ดของแต่ละภาษา

export const PISTON_URL = (import.meta.env.VITE_PISTON_URL || '/piston').replace(/\/+$/, '')

const JS_TIMEOUT = 10_000
const PY_TIMEOUT = 15_000
const PYODIDE_VERSION = '0.26.4'
const REACT_VERSION = '18.3.1'

const abortError = () => new DOMException('Execution stopped', 'AbortError')

function makeWorker(source) {
  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
  const worker = new Worker(url)
  worker.__url = url
  return worker
}

function destroyWorker(worker) {
  if (!worker) return
  worker.terminate()
  URL.revokeObjectURL(worker.__url)
}

/* ============================================================
 * JavaScript — Web Worker (ตัด infinite loop ได้ ไม่ทำให้หน้าเว็บค้าง)
 * ============================================================ */

const JS_WORKER_SRC = `
const fmt = (v) => {
  if (typeof v === 'string') return v;
  if (v instanceof Error) return v.name + ': ' + v.message;
  if (typeof v === 'function') return '[Function ' + (v.name || 'anonymous') + ']';
  if (v instanceof Map) v = Object.fromEntries(v);
  else if (v instanceof Set) v = [...v];
  try { const s = JSON.stringify(v, null, 2); return s === undefined ? String(v) : s; }
  catch { return String(v); }
};
const send = (type, args) => self.postMessage({ type, text: args.map(fmt).join(' ') });

console.log = (...a) => send('log', a);
console.debug = (...a) => send('log', a);
console.info = (...a) => send('info', a);
console.warn = (...a) => send('warn', a);
console.error = (...a) => send('error', a);
console.table = (d) => send('log', [d]);

self.addEventListener('unhandledrejection', (e) => send('error', ['Uncaught (in promise)', e.reason]));

self.onmessage = async ({ data }) => {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  try {
    await new AsyncFunction(data.code)();
    self.postMessage({ type: 'done', code: 0 });
  } catch (err) {
    send('error', [err]);
    self.postMessage({ type: 'done', code: 1 });
  }
};
`

let jsWorker = null
function killJsWorker() {
  destroyWorker(jsWorker)
  jsWorker = null
}

export function runJavaScript({ code, onOutput, signal }) {
  killJsWorker()
  return new Promise((resolve, reject) => {
    const worker = (jsWorker = makeWorker(JS_WORKER_SRC))

    const cleanup = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
    const onAbort = () => {
      cleanup()
      killJsWorker()
      reject(abortError())
    }
    const timer = setTimeout(() => {
      cleanup()
      killJsWorker()
      reject(new Error(`หมดเวลา ${JS_TIMEOUT / 1000} วินาที — โค้ดอาจมี infinite loop`))
    }, JS_TIMEOUT)

    signal?.addEventListener('abort', onAbort, { once: true })

    worker.onmessage = ({ data }) => {
      if (data.type === 'done') {
        cleanup()
        resolve(data) // worker ยังทำงานต่อเพื่อรับ log จาก setTimeout ที่ค้างอยู่ จนกว่าจะรันครั้งถัดไป
      } else {
        onOutput(data.type, data.text)
      }
    }
    worker.onerror = (e) => {
      e.preventDefault()
      onOutput('error', e.message)
    }
    worker.postMessage({ code })
  })
}

/* ============================================================
 * Python — Pyodide ใน Web Worker
 * ============================================================ */

const PY_WORKER_SRC = `
importScripts('https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js');
const pyReady = loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/' })
  .then((py) => { self.postMessage({ type: 'ready' }); return py; });

self.onmessage = async ({ data }) => {
  let py;
  try { py = await pyReady; }
  catch (err) { self.postMessage({ type: 'fatal', text: 'โหลด Python runtime ไม่สำเร็จ: ' + err }); return; }

  const lines = data.stdin ? data.stdin.replace(/\\r/g, '').split('\\n') : [];
  py.setStdout({ batched: (text) => self.postMessage({ type: 'stdout', text }) });
  py.setStderr({ batched: (text) => self.postMessage({ type: 'stderr', text }) });
  py.setStdin({ stdin: () => (lines.length ? lines.shift() + '\\n' : undefined), autoEOF: false });

  let globals;
  try {
    await py.loadPackagesFromImports(data.code, {
      messageCallback: (text) => self.postMessage({ type: 'system', text }),
    });
    self.postMessage({ type: 'start' });
    globals = py.globals.get('dict')();
    await py.runPythonAsync(data.code, { globals });
    self.postMessage({ type: 'done', code: 0 });
  } catch (err) {
    self.postMessage({ type: 'stderr', text: String(err && err.message ? err.message : err) });
    self.postMessage({ type: 'done', code: 1 });
  } finally {
    if (globals) globals.destroy();
  }
};
`

let py = null
function getPython() {
  if (!py) py = { worker: makeWorker(PY_WORKER_SRC), ready: false }
  return py
}
function killPython() {
  if (py) destroyWorker(py.worker)
  py = null
}

export function runPython({ code, stdin, onOutput, signal }) {
  const inst = getPython()
  if (!inst.ready) {
    onOutput('system', 'กำลังโหลด Python runtime (Pyodide) — ครั้งแรกอาจใช้เวลา 5–15 วินาที...')
  }

  return new Promise((resolve, reject) => {
    let timer = null
    const cleanup = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
    const fail = (err) => {
      cleanup()
      killPython()
      reject(err)
    }
    const onAbort = () => fail(abortError())

    signal?.addEventListener('abort', onAbort, { once: true })

    inst.worker.onmessage = ({ data }) => {
      switch (data.type) {
        case 'ready':
          inst.ready = true
          break
        case 'start':
          timer = setTimeout(
            () => fail(new Error(`หมดเวลา ${PY_TIMEOUT / 1000} วินาที — โค้ดอาจมี infinite loop`)),
            PY_TIMEOUT,
          )
          break
        case 'stdout':
          onOutput('log', data.text)
          break
        case 'stderr':
          onOutput('error', data.text)
          break
        case 'system':
          onOutput('system', data.text)
          break
        case 'fatal':
          fail(new Error(data.text))
          break
        case 'done':
          cleanup()
          resolve(data)
          break
        default:
          break
      }
    }
    inst.worker.onerror = (e) => {
      e.preventDefault?.()
      fail(new Error('โหลด Python runtime ไม่สำเร็จ — ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'))
    }
    inst.worker.postMessage({ code, stdin })
  })
}

/* ============================================================
 * C / C++ / C# / Java — Piston API
 * ============================================================ */

export async function runPiston({ language, files, stdin, signal }) {
  let res
  try {
    res = await fetch(`${PISTON_URL}/api/v2/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({ language, version: '*', files, stdin }),
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new Error(`เชื่อมต่อ Code Runner ไม่ได้ (${PISTON_URL}) — ตรวจสอบว่าเปิด Piston server แล้ว`)
  }

  const data = await res.json().catch(() => null)
  if (!res.ok || !data) {
    throw new Error(data?.message || `Code Runner ตอบกลับผิดพลาด (HTTP ${res.status})`)
  }
  return data
}

/* ============================================================
 * Preview builders (HTML/CSS/JS และ React)
 * ============================================================ */

// ส่ง console.log / error จาก iframe กลับมาที่หน้าหลัก
const CONSOLE_BRIDGE = `<script>
(function () {
  function fmt(v) {
    if (typeof v === 'string') return v;
    if (v instanceof Error) return v.name + ': ' + v.message;
    try { var s = JSON.stringify(v, null, 2); return s === undefined ? String(v) : s; }
    catch (e) { return String(v); }
  }
  function send(type, args) {
    try {
      parent.postMessage({ __studio: true, type: type, text: Array.prototype.map.call(args, fmt).join(' ') }, '*');
    } catch (e) {}
  }
  var map = { log: 'log', debug: 'log', info: 'info', warn: 'warn', error: 'error' };
  Object.keys(map).forEach(function (m) {
    var original = console[m];
    console[m] = function () { send(map[m], arguments); original.apply(console, arguments); };
  });
  window.addEventListener('error', function (e) {
    send('error', [e.message + (e.lineno ? ' (line ' + e.lineno + ')' : '')]);
  });
  window.addEventListener('unhandledrejection', function (e) {
    send('error', ['Unhandled Promise rejection:', e.reason]);
  });
})();
</script>`

const escScript = (s) => s.replace(/<\/script/gi, '<\\/script')
const escStyle = (s) => s.replace(/<\/style/gi, '<\\/style')

export function buildWebDocument(files) {
  const get = (name) => files.find((f) => f.name === name)?.content ?? ''

  let html = get('index.html') || '<!DOCTYPE html><html><head></head><body></body></html>'

  // ลบ <link>/<script src> ที่อ้างไฟล์ในโปรเจกต์ เพราะเราจะฝังโค้ดลงไปเอง
  html = html
    .replace(/<link\b[^>]*href=["'](?:\.\/)?style\.css["'][^>]*>/gi, '')
    .replace(/<script\b[^>]*src=["'](?:\.\/)?script\.js["'][^>]*>\s*<\/script>/gi, '')

  const headInject = `${CONSOLE_BRIDGE}\n<style>\n${escStyle(get('style.css'))}\n</style>`
  const bodyInject = `<script>\n${escScript(get('script.js'))}\n</script>`

  // ใช้ฟังก์ชันใน replace เพื่อไม่ให้ $ ในโค้ดผู้ใช้ถูกตีความเป็น pattern
  html = /<head\b[^>]*>/i.test(html)
    ? html.replace(/<head\b[^>]*>/i, (m) => m + headInject)
    : headInject + html

  html = /<\/body>/i.test(html)
    ? html.replace(/<\/body>(?![\s\S]*<\/body>)/i, () => bodyInject + '</body>')
    : html + bodyInject

  return html
}

let babelPromise = null
function loadBabel() {
  if (!babelPromise) {
    babelPromise = import('@babel/standalone')
      .then((m) => m.default ?? m)
      .catch((err) => {
        babelPromise = null
        throw err
      })
  }
  return babelPromise
}

const IMPORT_MAP = {
  imports: {
    react: `https://esm.sh/react@${REACT_VERSION}`,
    'react/jsx-runtime': `https://esm.sh/react@${REACT_VERSION}/jsx-runtime`,
    'react-dom': `https://esm.sh/react-dom@${REACT_VERSION}?deps=react@${REACT_VERSION}`,
    'react-dom/client': `https://esm.sh/react-dom@${REACT_VERSION}/client?deps=react@${REACT_VERSION}`,
  },
}

// แปลง import แพ็กเกจอื่น ๆ (เช่น 'lodash') ให้โหลดจาก esm.sh อัตโนมัติ
const rewriteBareImports = (code) =>
  code.replace(/(\bfrom\s*|\bimport\s*\(?\s*)(['"])([^'"]+)\2/g, (m, pre, q, spec) => {
    if (spec in IMPORT_MAP.imports || /^(https?:|\.|\/)/.test(spec)) return m
    return `${pre}${q}https://esm.sh/${spec}?deps=react@${REACT_VERSION},react-dom@${REACT_VERSION}${q}`
  })

export async function buildReactDocument(file) {
  const Babel = await loadBabel()
  const isTS = /\.tsx?$/.test(file.name)

  const { code } = Babel.transform(file.content, {
    filename: file.name,
    sourceType: 'module',
    presets: [
      ...(isTS ? [['typescript', { isTSX: true, allExtensions: true }]] : []),
      ['react', { runtime: 'automatic' }],
    ],
  })

  let out = rewriteBareImports(code)
  let rootExpr = null

  // หา default export เพื่อใช้เป็น component หลัก
  const named = out.match(/\bexport\s+default\s+(?:async\s+)?(?:function\s*\*?|class)\s+([\w$]+)/)
  if (named) {
    out = out.replace(/\bexport\s+default\s+/, '')
    rootExpr = named[1]
  } else if (/\bexport\s+default\s+/.test(out)) {
    out = out.replace(/\bexport\s+default\s+/, 'const __StudioApp__ = ')
    rootExpr = '__StudioApp__'
  } else {
    const m = out.match(/\bexport\s*\{\s*([\w$]+)\s+as\s+default\s*\}\s*;?/)
    if (m) {
      out = out.replace(m[0], '')
      rootExpr = m[1]
    }
  }
  out = out.replace(/\bexport\s+(?=(?:const|let|var|function|class|async)\b)/g, '')

  const mount = `
;import { createRoot as __createRoot } from 'react-dom/client';
import { createElement as __h } from 'react';
const __Root = ${rootExpr ?? "typeof App !== 'undefined' ? App : null"};
if (!__Root) throw new Error('ไม่พบ Component — กรุณา export default component ของคุณ');
__createRoot(document.getElementById('root')).render(__h(__Root));
`

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
${CONSOLE_BRIDGE}
<script type="importmap">${JSON.stringify(IMPORT_MAP)}</script>
<style>body { margin: 0; font-family: system-ui, sans-serif; }</style>
</head>
<body>
<div id="root"></div>
<script type="module">
${escScript(out + mount)}
</script>
</body>
</html>`
}

/* ============================================================ */

export function disposeRunners() {
  killJsWorker()
  killPython()
}