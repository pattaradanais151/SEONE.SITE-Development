import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { useAuth } from '../../../contexts/AuthContext'
import { LANGUAGES, LANGUAGE_ORDER, createProject, createAllProjects, getFileBadge } from './languages'
import {
  runJavaScript,
  runPython,
  runPiston,
  buildWebDocument,
  buildReactDocument,
  disposeRunners,
  PISTON_URL,
} from './runners'

const STORAGE_PREFIX = 'coding-studio:workspace:'
const MAX_OUTPUT_LINES = 1000

const RUNNER_INFO = {
  web: 'Browser · iframe sandbox',
  react: 'Browser · Babel + React',
  js: 'Browser · Web Worker',
  python: 'Pyodide · WebAssembly',
  piston: `Piston · ${PISTON_URL}`,
}

const OUTPUT_STYLE = {
  log: 'text-gray-200',
  info: 'text-sky-300',
  warn: 'text-amber-300',
  error: 'text-red-400',
  success: 'text-emerald-400',
  system: 'text-gray-500 italic',
}

const TAB = {
  preview: { id: 'preview', label: 'Preview' },
  console: { id: 'console', label: 'Console' },
  output: { id: 'output', label: 'Output' },
  input: { id: 'input', label: 'Input (stdin)' },
}

function loadWorkspace(key) {
  const fallback = { mode: 'javascript', projects: createAllProjects() }
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null')
    if (!saved || typeof saved !== 'object') return fallback
    const projects = { ...fallback.projects }
    for (const id of LANGUAGE_ORDER) {
      const p = saved.projects?.[id]
      if (p && Array.isArray(p.files) && p.files.length) projects[id] = { ...projects[id], ...p }
    }
    return { mode: LANGUAGES[saved.mode] ? saved.mode : fallback.mode, projects }
  } catch {
    return fallback
  }
}

export default function CodingWorkspace() {
  const { username } = useParams()
  const { profile } = useAuth()

  const displayName = username || profile?.nickname || 'Guest'
  const storageKey = STORAGE_PREFIX + displayName.toLowerCase()
  const avatarInitial = (profile?.first_name || profile?.nickname || displayName).charAt(0).toUpperCase()

  const [workspace, setWorkspace] = useState(() => loadWorkspace(storageKey))
  const [output, setOutput] = useState([{ type: 'system', text: 'พร้อมรันโค้ด — กด Run หรือ Ctrl + Enter' }])
  const [isRunning, setIsRunning] = useState(false)
  const [panelTab, setPanelTab] = useState('output')
  const [previewDoc, setPreviewDoc] = useState('')
  const [previewKey, setPreviewKey] = useState(0)
  const [cursor, setCursor] = useState({ line: 1, column: 1 })
  const [panelHeight, setPanelHeight] = useState(280)
  const [isResizing, setIsResizing] = useState(false)

  const iframeRef = useRef(null)
  const outputRef = useRef(null)
  const abortRef = useRef(null)
  const runRef = useRef(null)
  const loadedKeyRef = useRef(storageKey)

  const { mode, projects } = workspace
  const lang = LANGUAGES[mode]
  const project = projects[mode]
  const activeFile = project.files.find((f) => f.name === project.active) ?? project.files[0]
  const isPreviewMode = lang.runner === 'web' || lang.runner === 'react'

  const panelTabs = isPreviewMode
    ? [TAB.preview, TAB.console]
    : lang.stdin
      ? [TAB.output, TAB.input]
      : [TAB.output]
  const currentTab = panelTabs.some((t) => t.id === panelTab) ? panelTab : panelTabs[0].id

  /* ---------------- Effects ---------------- */

  useEffect(() => {
    document.title = `Workspace | ${displayName} | CODING STUDIO`
  }, [displayName])

  // โหลด workspace ใหม่เมื่อเปลี่ยนผู้ใช้
  useEffect(() => {
    if (loadedKeyRef.current === storageKey) return
    loadedKeyRef.current = storageKey
    setWorkspace(loadWorkspace(storageKey))
  }, [storageKey])

  // บันทึกอัตโนมัติ (debounce)
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(workspace))
      } catch {
        /* storage เต็ม — ข้ามไป */
      }
    }, 400)
    return () => clearTimeout(id)
  }, [workspace, storageKey])

  const appendOutput = useCallback((type, text) => {
    setOutput((prev) => {
      const next = [...prev, { type, text: String(text ?? '').replace(/\n$/, '') }]
      return next.length > MAX_OUTPUT_LINES ? next.slice(-MAX_OUTPUT_LINES) : next
    })
  }, [])

  // รับ console log จาก iframe preview
  useEffect(() => {
    const onMessage = (e) => {
      if (e.source !== iframeRef.current?.contentWindow || !e.data?.__studio) return
      appendOutput(e.data.type, e.data.text)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [appendOutput])

  // เลื่อน output ลงล่างสุดอัตโนมัติ
  useEffect(() => {
    const el = outputRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [output, currentTab])

  // Ctrl/Cmd + Enter เพื่อรัน
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        runRef.current?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // cleanup ตอนออกจากหน้า
  useEffect(
    () => () => {
      abortRef.current?.abort()
      disposeRunners()
    },
    [],
  )

  /* ---------------- State helpers ---------------- */

  const updateProject = useCallback((id, updater) => {
    setWorkspace((ws) => ({ ...ws, projects: { ...ws.projects, [id]: updater(ws.projects[id]) } }))
  }, [])

  const handleEditorChange = (value) => {
    const name = activeFile.name
    updateProject(mode, (p) => ({
      ...p,
      files: p.files.map((f) => (f.name === name ? { ...f, content: value ?? '' } : f)),
    }))
  }

  const switchFile = (name) => updateProject(mode, (p) => ({ ...p, active: name }))

  const setStdin = (value) => updateProject(mode, (p) => ({ ...p, stdin: value }))

  const stopRun = (silent = false) => {
    const controller = abortRef.current
    if (!controller) return
    abortRef.current = null
    controller.abort()
    setIsRunning(false)
    if (!silent) appendOutput('warn', '■ หยุดการทำงานแล้ว')
  }

  const switchMode = (id) => {
    if (id === mode) return
    stopRun(true)
    setWorkspace((ws) => ({ ...ws, mode: id }))
    setPreviewDoc('')
    setOutput([{ type: 'system', text: `เปลี่ยนเป็น ${LANGUAGES[id].label} — พร้อมรันโค้ด` }])
  }

  const resetProject = () => {
    if (!window.confirm(`รีเซ็ตโค้ด ${lang.label} กลับเป็นตัวอย่างเริ่มต้น? โค้ดปัจจุบันจะหายไป`)) return
    updateProject(mode, () => createProject(mode))
  }

  /* ---------------- Run ---------------- */

  const handleRun = useCallback(async () => {
    if (abortRef.current) return // กำลังรันอยู่

    const controller = new AbortController()
    abortRef.current = controller
    const { signal } = controller
    const print = (type, text) => {
      if (!signal.aborted) appendOutput(type, text)
    }
    const t0 = performance.now()
    const elapsed = () => ((performance.now() - t0) / 1000).toFixed(2)
    const entry = project.files.find((f) => f.name === lang.entry) ?? project.files[0]

    setIsRunning(true)
    setOutput([{ type: 'system', text: `▶ ${lang.label} · ${RUNNER_INFO[lang.runner]}` }])

    try {
      switch (lang.runner) {
        case 'web': {
          setPreviewDoc(buildWebDocument(project.files))
          setPreviewKey((k) => k + 1)
          print('success', `✓ อัปเดต Preview แล้ว (${elapsed()}s)`)
          break
        }

        case 'react': {
          print('system', 'กำลังแปลงโค้ดด้วย Babel...')
          const doc = await buildReactDocument(entry)
          if (signal.aborted) return
          setPreviewDoc(doc)
          setPreviewKey((k) => k + 1)
          print('success', `✓ Build สำเร็จ (${elapsed()}s)`)
          break
        }

        case 'js': {
          const res = await runJavaScript({ code: entry.content, onOutput: print, signal })
          print(res.code === 0 ? 'success' : 'error', `Process exited with code ${res.code} (${elapsed()}s)`)
          break
        }

        case 'python': {
          const res = await runPython({ code: entry.content, stdin: project.stdin, onOutput: print, signal })
          print(res.code === 0 ? 'success' : 'error', `Process exited with code ${res.code} (${elapsed()}s)`)
          break
        }

        case 'piston': {
          const files = [entry, ...project.files.filter((f) => f !== entry)].map(({ name, content }) => ({
            name,
            content,
          }))
          print('system', 'กำลังคอมไพล์และรัน...')
          const data = await runPiston({ language: lang.piston, files, stdin: project.stdin ?? '', signal })
          print('system', `${data.language} ${data.version}`)

          if (data.compile && data.compile.code !== 0) {
            print('error', (data.compile.stderr || data.compile.output || 'Compilation failed').trimEnd())
            print('error', `✗ Compilation failed (${elapsed()}s)`)
            break
          }
          if (data.compile?.stderr) print('warn', data.compile.stderr.trimEnd())

          const { stdout, stderr, code, signal: killSignal } = data.run ?? {}
          if (stdout) print('log', stdout.trimEnd())
          if (stderr) print('error', stderr.trimEnd())
          if (killSignal) print('error', `Process killed (${killSignal}) — อาจใช้เวลาหรือหน่วยความจำเกินกำหนด`)
          print(code === 0 ? 'success' : 'error', `Process exited with code ${code ?? '-'} (${elapsed()}s)`)
          break
        }

        default:
          print('error', 'ยังไม่รองรับภาษานี้')
      }
    } catch (err) {
      if (err?.name !== 'AbortError') print('error', err?.message || String(err))
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setIsRunning(false)
      }
    }
  }, [lang, project, appendOutput])

  useEffect(() => {
    runRef.current = handleRun
  }, [handleRun])

  /* ---------------- Monaco ---------------- */

  const handleBeforeMount = (monaco) => {
    monaco.editor.defineTheme('studio-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0d1117',
        'editor.lineHighlightBackground': '#161b22',
        'editorLineNumber.foreground': '#484f58',
        'editorLineNumber.activeForeground': '#c9d1d9',
        'editorCursor.foreground': '#34d399',
        'editor.selectionBackground': '#10b98140',
        'editorIndentGuide.background1': '#21262d',
      },
    })

    const ts = monaco.languages.typescript ?? monaco.typescript
    if (ts) {
      const compilerOptions = {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        jsx: ts.JsxEmit.ReactJSX,
        allowJs: true,
        allowNonTsExtensions: true,
        esModuleInterop: true,
      }
      const diagnostics = { noSemanticValidation: true, noSyntaxValidation: false }
      ts.typescriptDefaults.setCompilerOptions(compilerOptions)
      ts.javascriptDefaults.setCompilerOptions(compilerOptions)
      ts.typescriptDefaults.setDiagnosticsOptions(diagnostics)
      ts.javascriptDefaults.setDiagnosticsOptions(diagnostics)
    }
  }

  const handleMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current?.())
    editor.onDidChangeCursorPosition((e) =>
      setCursor({ line: e.position.lineNumber, column: e.position.column }),
    )
    editor.focus()
  }

  /* ---------------- Panel resize ---------------- */

  const startResize = (e) => {
    e.preventDefault()
    const startY = e.clientY
    const startHeight = panelHeight
    setIsResizing(true)

    const onMove = (ev) => {
      const max = window.innerHeight - 200
      setPanelHeight(Math.min(max, Math.max(120, startHeight - (ev.clientY - startY))))
    }
    const onUp = () => {
      setIsResizing(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  /* ---------------- Render ---------------- */

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0d1117] font-sans text-[#c9d1d9] selection:bg-emerald-500/30">
      {isResizing && <div className="fixed inset-0 z-50 cursor-row-resize" />}

      {/* ===== Header ===== */}
      <header className="z-10 flex h-14 flex-shrink-0 items-center justify-between gap-3 border-b border-[#30363d] bg-[#161b22] px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/coding/landing"
            aria-label="กลับหน้าหลัก"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/20 transition hover:opacity-80"
          >
            <CodeIcon className="h-5 w-5" />
          </Link>
          <div className="hidden min-w-0 flex-col sm:flex">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Personal Workspace
            </span>
            <span className="truncate text-sm font-medium text-white">
              {displayName} / <span className="text-emerald-400">Sandbox</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language selector */}
          <div className="relative">
            <span
              className="pointer-events-none absolute left-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
              style={{ backgroundColor: lang.color }}
            />
            <select
              value={mode}
              onChange={(e) => switchMode(e.target.value)}
              aria-label="เลือกภาษา"
              className="cursor-pointer appearance-none rounded-md border border-[#30363d] bg-[#0d1117] py-1.5 pl-7 pr-8 text-sm text-gray-200 outline-none transition hover:border-[#484f58] focus:border-emerald-500"
            >
              {LANGUAGE_ORDER.map((id) => (
                <option key={id} value={id}>
                  {LANGUAGES[id].label}
                </option>
              ))}
            </select>
            <ChevronIcon className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          </div>

          {isRunning ? (
            <button
              onClick={() => stopRun()}
              className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-1.5 text-sm font-bold text-white transition hover:bg-red-500"
            >
              <SpinnerIcon className="h-4 w-4 animate-spin" />
              Stop
            </button>
          ) : (
            <button
              onClick={handleRun}
              title="Run (Ctrl + Enter)"
              className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 active:scale-[0.97]"
            >
              <PlayIcon className="h-4 w-4" />
              Run
            </button>
          )}

          <div className="mx-1 hidden h-6 w-px bg-[#30363d] sm:block" />
          <div
            title={displayName}
            className="hidden h-8 w-8 items-center justify-center rounded-full border border-[#484f58] bg-[#30363d] text-xs font-bold text-white sm:flex"
          >
            {avatarInitial}
          </div>
        </div>
      </header>

      {/* ===== Body ===== */}
      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-[#30363d] bg-[#0d1117] md:flex">
          <SectionTitle>Languages</SectionTitle>
          <nav className="space-y-0.5 px-2 py-2">
            {LANGUAGE_ORDER.map((id) => {
              const l = LANGUAGES[id]
              const active = id === mode
              return (
                <button
                  key={id}
                  onClick={() => switchMode(id)}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm transition ${
                    active
                      ? 'bg-emerald-500/10 text-emerald-300'
                      : 'text-gray-400 hover:bg-[#161b22] hover:text-gray-200'
                  }`}
                >
                  <span
                    className="flex h-5 min-w-[2.5rem] items-center justify-center rounded px-1 text-[10px] font-bold"
                    style={{ color: l.color, backgroundColor: `${l.color}1f` }}
                  >
                    {l.short}
                  </span>
                  <span className="truncate">{l.label}</span>
                </button>
              )
            })}
          </nav>

          <SectionTitle>Files</SectionTitle>
          <div className="flex-1 overflow-y-auto py-2">
            {project.files.map((f) => {
              const badge = getFileBadge(f.name)
              const active = f.name === activeFile.name
              return (
                <button
                  key={f.name}
                  onClick={() => switchFile(f.name)}
                  className={`flex w-full items-center gap-2 border-l-2 px-4 py-1.5 text-left text-sm transition ${
                    active
                      ? 'border-emerald-400 bg-[#161b22] text-emerald-300'
                      : 'border-transparent text-gray-400 hover:bg-[#161b22]/60 hover:text-gray-200'
                  }`}
                >
                  <span className="w-8 text-[10px] font-bold" style={{ color: badge.color }}>
                    {badge.label}
                  </span>
                  {f.name}
                </button>
              )
            })}
          </div>

          <div className="border-t border-[#30363d] p-3 text-[11px] leading-relaxed text-gray-500">
            <div className="font-semibold uppercase tracking-wider text-gray-400">Runtime</div>
            <div className="truncate">{RUNNER_INFO[lang.runner]}</div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex min-w-0 flex-1 flex-col">
          {/* File tabs */}
          <div className="flex h-10 flex-shrink-0 items-stretch justify-between border-b border-[#30363d] bg-[#161b22]">
            <div className="flex overflow-x-auto">
              {project.files.map((f) => {
                const badge = getFileBadge(f.name)
                const active = f.name === activeFile.name
                return (
                  <button
                    key={f.name}
                    onClick={() => switchFile(f.name)}
                    className={`flex items-center gap-2 whitespace-nowrap border-r border-t-2 border-r-[#30363d] px-4 text-sm transition ${
                      active
                        ? 'border-t-emerald-500 bg-[#0d1117] text-gray-100'
                        : 'border-t-transparent text-gray-500 hover:bg-[#0d1117]/50 hover:text-gray-300'
                    }`}
                  >
                    <span className="text-[10px] font-bold" style={{ color: badge.color }}>
                      {badge.label}
                    </span>
                    {f.name}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-2 px-2">
              <kbd className="hidden rounded border border-[#30363d] bg-[#0d1117] px-1.5 py-0.5 font-mono text-[10px] text-gray-500 lg:inline">
                Ctrl + Enter
              </kbd>
              <button
                onClick={resetProject}
                title="รีเซ็ตเป็นโค้ดตัวอย่าง"
                className="rounded p-1.5 text-gray-500 transition hover:bg-[#30363d] hover:text-gray-200"
              >
                <ResetIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Editor */}
          <div className="min-h-0 flex-1">
            <Editor
              height="100%"
              path={`${mode}/${activeFile.name}`}
              language={activeFile.language}
              value={activeFile.content}
              onChange={handleEditorChange}
              theme="studio-dark"
              beforeMount={handleBeforeMount}
              onMount={handleMount}
              loading={<div className="p-4 text-sm text-gray-500">กำลังโหลด Editor...</div>}
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                fontLigatures: true,
                tabSize: lang.tabSize,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                renderLineHighlight: 'all',
                bracketPairColorization: { enabled: true },
                padding: { top: 16, bottom: 16 },
                automaticLayout: true,
              }}
            />
          </div>

          {/* Resize handle */}
          <div
            onPointerDown={startResize}
            className="group flex h-1.5 flex-shrink-0 cursor-row-resize items-center justify-center bg-[#30363d]/40 transition hover:bg-emerald-500/40"
          >
            <div className="h-0.5 w-10 rounded-full bg-[#484f58] group-hover:bg-emerald-400" />
          </div>

          {/* Bottom panel */}
          <section style={{ height: panelHeight }} className="flex flex-shrink-0 flex-col bg-[#010409]">
            <div className="flex items-center justify-between border-b border-[#30363d] bg-[#0d1117] px-2">
              <div className="flex">
                {panelTabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setPanelTab(t.id)}
                    className={`relative px-3 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                      currentTab === t.id ? 'text-gray-100' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {t.label}
                    {currentTab === t.id && (
                      <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-emerald-500" />
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setOutput([])}
                title="ล้าง Output"
                className="rounded p-1.5 text-gray-500 transition hover:bg-[#30363d] hover:text-gray-200"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="relative min-h-0 flex-1">
              {/* Preview: mount ไว้ตลอดเพื่อให้ Console ยังรับ log ได้ */}
              {isPreviewMode && (
                <div className={`absolute inset-0 ${currentTab === 'preview' ? '' : 'invisible'}`}>
                  {previewDoc ? (
                    <iframe
                      key={previewKey}
                      ref={iframeRef}
                      title="Preview"
                      srcDoc={previewDoc}
                      sandbox="allow-scripts allow-modals allow-forms allow-popups"
                      className="h-full w-full border-0 bg-white"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-gray-500">
                      <PlayIcon className="h-8 w-8 text-gray-700" />
                      กด Run เพื่อดูผลลัพธ์
                    </div>
                  )}
                </div>
              )}

              {(currentTab === 'output' || currentTab === 'console') && (
                <div
                  ref={outputRef}
                  className="absolute inset-0 overflow-y-auto p-4 font-mono text-[13px] leading-relaxed"
                >
                  {output.map((line, i) => (
                    <div
                      key={i}
                      className={`whitespace-pre-wrap break-words ${OUTPUT_STYLE[line.type] ?? OUTPUT_STYLE.log}`}
                    >
                      {line.text}
                    </div>
                  ))}
                  <div className="mt-1 flex items-center text-gray-500">
                    <span className="mr-2 text-emerald-500">➜</span>
                    {isRunning ? (
                      <span className="text-xs">running...</span>
                    ) : (
                      <span className="inline-block h-4 w-2 animate-pulse bg-gray-500" />
                    )}
                  </div>
                </div>
              )}

              {currentTab === 'input' && (
                <div className="absolute inset-0 flex flex-col p-3">
                  <p className="mb-2 text-xs text-gray-500">
                    ข้อมูลนำเข้า (stdin) — หนึ่งบรรทัดต่อการอ่านหนึ่งครั้ง เช่น input(), cin, Scanner
                  </p>
                  <textarea
                    value={project.stdin ?? ''}
                    onChange={(e) => setStdin(e.target.value)}
                    spellCheck={false}
                    placeholder={'เช่น\n10\n20\nSomchai'}
                    className="flex-1 resize-none rounded-md border border-[#30363d] bg-[#0d1117] p-3 font-mono text-[13px] text-gray-200 outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      {/* ===== Status bar ===== */}
      <footer className="flex h-6 flex-shrink-0 items-center justify-between border-t border-[#30363d] bg-[#161b22] px-3 text-[11px] text-gray-400">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${isRunning ? 'animate-pulse bg-amber-400' : 'bg-emerald-500'}`} />
            {isRunning ? 'Running…' : 'Ready'}
          </span>
          <span className="hidden truncate sm:inline">{RUNNER_INFO[lang.runner]}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>
            Ln {cursor.line}, Col {cursor.column}
          </span>
          <span className="hidden sm:inline">Spaces: {lang.tabSize}</span>
          <span className="hidden sm:inline">UTF-8</span>
          <span style={{ color: lang.color }}>{lang.label}</span>
        </div>
      </footer>
    </div>
  )
}

/* ---------------- Small UI components ---------------- */

function SectionTitle({ children }) {
  return (
    <div className="border-y border-[#30363d] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 first:border-t-0">
      {children}
    </div>
  )
}

function CodeIcon(props) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  )
}

function PlayIcon(props) {
  return (
    <svg {...props} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function SpinnerIcon(props) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function ChevronIcon(props) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function ResetIcon(props) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  )
}

function TrashIcon(props) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  )
}