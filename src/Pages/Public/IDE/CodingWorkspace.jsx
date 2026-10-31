import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { supabase } from '../../../lib/supabase'
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

/*
  CODING STUDIO — Apple-style dark IDE
  - ฟีเจอร์: ออกจากระบบ, ตั้งค่าตัวแก้ไข (ขนาดตัวอักษร/wrap/minimap), จัดรูปแบบโค้ด, คัดลอก/ดาวน์โหลดไฟล์,
    ย่อ-ขยายแผงด้านล่าง, สถานะบันทึกอัตโนมัติ, สถิติการรันล่าสุด, เปิด Preview ในแท็บใหม่
  - ตรรกะการรันโค้ด (runners) ทั้งหมดเหมือนเดิม
*/

const STORAGE_PREFIX = 'coding-studio:workspace:'
const PREFS_KEY = 'coding-studio:prefs'
const MAX_OUTPUT_LINES = 1000
const TAB_BAR_H = 37

const RUNNER_INFO = {
  web: 'Browser · iframe sandbox',
  react: 'Browser · Babel + React',
  js: 'Browser · Web Worker',
  python: 'Pyodide · WebAssembly',
  piston: `Piston · ${PISTON_URL}`,
}

const OUTPUT_STYLE = {
  log: 'text-[#e5e5ea]',
  info: 'text-[#64d2ff]',
  warn: 'text-[#ffd60a]',
  error: 'text-[#ff453a]',
  success: 'text-[#30d158]',
  system: 'text-white/40 italic',
}

const TAB = {
  preview: { id: 'preview', label: 'Preview' },
  console: { id: 'console', label: 'Console' },
  output: { id: 'output', label: 'Output' },
  input: { id: 'input', label: 'Input (stdin)' },
}

const DEFAULT_PREFS = { fontSize: 14, wordWrap: false, minimap: false, sidebar: true }

const ICONS = {
  code: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
  play: 'M8 5v14l11-7z',
  stop: 'M7 7h10v10H7z',
  sidebar: 'M4 5h16v14H4V5zm5 0v14',
  sliders: 'M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6m2-6h6m2 8h6',
  reset: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  copy: 'M8 8h10a2 2 0 012 2v10a2 2 0 01-2 2H8a2 2 0 01-2-2V10a2 2 0 012-2zM16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2',
  download: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4',
  format: 'M4 7h16M4 12h10M4 17h16',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5',
  chevronDown: 'M6 9l6 6 6-6',
  chevronUp: 'M18 15l-6-6-6 6',
  logout: 'M16 17l5-5-5-5M21 12H9M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4',
  grid: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z',
  home: 'M3 11l9-8 9 8M5 10v10h14V10',
  check: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM8 12.5l2.5 2.5L16 9.5',
  alert: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM12 8v5M12 16h.01',
  close: 'M6 6l12 12M18 6L6 18',
  minus: 'M5 12h14',
  plus: 'M12 5v14M5 12h14',
}

const SOLID = new Set(['play', 'stop'])
const ring = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]/70'
const menuItem = `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] text-[#e5e5ea] transition-colors hover:bg-white/10 ${ring}`

function Icon({ name, className = 'h-4 w-4', strokeWidth = 1.9 }) {
  const solid = SOLID.has(name)
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={solid ? 'currentColor' : 'none'}
      stroke={solid ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  )
}

function Spinner({ className = 'h-4 w-4' }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function IconButton({ icon, label, onClick, disabled, active }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-40 ${ring} ${
        active ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon name={icon} />
    </button>
  )
}

function usePopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return [open, setOpen, ref]
}

/* ---------------- Notification & Dialog ---------------- */

function Notification({ type = 'success', message, duration = 3500, onClose }) {
  const [visible, setVisible] = useState(false)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    const t1 = setTimeout(() => setVisible(false), duration)
    const t2 = setTimeout(() => closeRef.current?.(), duration + 300)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [duration])

  const isError = type === 'error'
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex justify-center px-4">
      <div
        role={isError ? 'alert' : 'status'}
        className={`pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border border-white/10 bg-[#2c2c2e]/90 px-4 py-3 text-sm text-white shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300 motion-reduce:transition-none ${
          visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
        }`}
      >
        <span className={isError ? 'text-[#ff453a]' : 'text-[#30d158]'}>
          <Icon name={isError ? 'alert' : 'check'} className="h-5 w-5" strokeWidth={2} />
        </span>
        <span className="leading-snug">{message}</span>
      </div>
    </div>
  )
}

function Dialog({ title, description, onClose, children }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={`relative w-full max-w-sm rounded-[22px] border border-white/10 bg-[#1c1c1e] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.6)] transition-all duration-200 ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <h2 id="dialog-title" className="text-xl font-semibold tracking-tight">
          {title}
        </h2>
        {description && <p className="mt-1.5 text-[15px] leading-relaxed text-white/60">{description}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  )
}

const dlgBtn = `inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition active:scale-[0.98] ${ring}`

/* ---------------- Menus ---------------- */

function AccountMenu({ profile, email, initial, onLogout, loggingOut }) {
  const [open, setOpen, ref] = usePopover()
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-white/10 ${ring}`}
      >
        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#30d158] to-[#0a84ff] text-xs font-bold text-white">
          {profile?.profile_image_url ? (
            <img src={profile.profile_image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </span>
        <Icon name="chevronDown" className={`h-3 w-3 text-white/50 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={2.5} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-11 z-50 w-64 rounded-2xl border border-white/10 bg-[#2c2c2e]/95 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <div className="px-3 pb-2.5 pt-2">
            <p className="truncate text-[15px] font-semibold text-white">{fullName || 'บัญชีของฉัน'}</p>
            {email && <p className="truncate text-xs text-white/50">{email}</p>}
          </div>
          <div className="my-1 h-px bg-white/10" />
          <Link to="/portal" role="menuitem" onClick={() => setOpen(false)} className={menuItem}>
            <Icon name="grid" className="h-4 w-4 text-white/50" />
            กลับไปที่ Portal
          </Link>
          <Link to="/coding/landing" role="menuitem" onClick={() => setOpen(false)} className={menuItem}>
            <Icon name="home" className="h-4 w-4 text-white/50" />
            เกี่ยวกับ CODING
          </Link>
          <div className="my-1 h-px bg-white/10" />
          <button type="button" role="menuitem" onClick={onLogout} disabled={loggingOut} className={`${menuItem} !text-[#ff453a] disabled:opacity-60`}>
            {loggingOut ? <Spinner /> : <Icon name="logout" className="h-4 w-4" />}
            {loggingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ'}
          </button>
        </div>
      )}
    </div>
  )
}

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${ring} ${checked ? 'bg-[#30d158]' : 'bg-white/20'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  )
}

function SettingsMenu({ prefs, setPref }) {
  const [open, setOpen, ref] = usePopover()
  const step = (d) => setPref('fontSize', Math.min(22, Math.max(11, prefs.fontSize + d)))

  return (
    <div className="relative" ref={ref}>
      <IconButton icon="sliders" label="ตั้งค่าตัวแก้ไข" onClick={() => setOpen((v) => !v)} active={open} />
      {open && (
        <div role="dialog" aria-label="ตั้งค่าตัวแก้ไข" className="absolute right-0 top-10 z-50 w-72 rounded-2xl border border-white/10 bg-[#2c2c2e]/95 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <p className="text-[13px] font-semibold text-white">ตั้งค่าตัวแก้ไข</p>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-[13px] text-[#e5e5ea]">ขนาดตัวอักษร</span>
            <div className="flex items-center gap-1 rounded-full bg-white/10 p-0.5">
              <button type="button" aria-label="ลดขนาดตัวอักษร" onClick={() => step(-1)} className={`flex h-7 w-7 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white ${ring}`}>
                <Icon name="minus" className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
              <span className="w-7 text-center text-[13px] font-semibold tabular-nums text-white">{prefs.fontSize}</span>
              <button type="button" aria-label="เพิ่มขนาดตัวอักษร" onClick={() => step(1)} className={`flex h-7 w-7 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white ${ring}`}>
                <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[13px] text-[#e5e5ea]">ตัดบรรทัดอัตโนมัติ</span>
            <Switch checked={prefs.wordWrap} onChange={(v) => setPref('wordWrap', v)} label="ตัดบรรทัดอัตโนมัติ" />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[13px] text-[#e5e5ea]">แสดง Minimap</span>
            <Switch checked={prefs.minimap} onChange={(v) => setPref('minimap', v)} label="แสดง Minimap" />
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------------- Workspace storage ---------------- */

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

function loadPrefs() {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }
  } catch {
    return DEFAULT_PREFS
  }
}

/* ================================================================== */

export default function CodingWorkspace() {
  const { username } = useParams()
  const auth = useAuth()
  const { profile, session } = auth
  const navigate = useNavigate()

  const displayName = username || profile?.nickname || 'Guest'
  const storageKey = STORAGE_PREFIX + displayName.toLowerCase()
  const avatarInitial = (profile?.first_name || profile?.nickname || displayName).charAt(0).toUpperCase()
  const signedIn = Boolean(session || profile)

  const [workspace, setWorkspace] = useState(() => loadWorkspace(storageKey))
  const [prefs, setPrefs] = useState(loadPrefs)
  const [output, setOutput] = useState([{ type: 'system', text: 'พร้อมรันโค้ด — กด Run หรือ Ctrl + Enter' }])
  const [isRunning, setIsRunning] = useState(false)
  const [panelTab, setPanelTab] = useState('output')
  const [previewDoc, setPreviewDoc] = useState('')
  const [previewKey, setPreviewKey] = useState(0)
  const [cursor, setCursor] = useState({ line: 1, column: 1 })
  const [panelHeight, setPanelHeight] = useState(280)
  const [panelOpen, setPanelOpen] = useState(true)
  const [isResizing, setIsResizing] = useState(false)
  const [saveState, setSaveState] = useState('saved')
  const [lastRun, setLastRun] = useState(null)
  const [notice, setNotice] = useState(null)
  const [showReset, setShowReset] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const iframeRef = useRef(null)
  const outputRef = useRef(null)
  const abortRef = useRef(null)
  const editorRef = useRef(null)
  const loadedKeyRef = useRef(storageKey)
  const workspaceRef = useRef(workspace)
  const actionsRef = useRef({})

  workspaceRef.current = workspace

  const { mode, projects } = workspace
  const lang = LANGUAGES[mode]
  const project = projects[mode]
  const activeFile = project.files.find((f) => f.name === project.active) ?? project.files[0]
  const isPreviewMode = lang.runner === 'web' || lang.runner === 'react'

  const panelTabs = isPreviewMode ? [TAB.preview, TAB.console] : lang.stdin ? [TAB.output, TAB.input] : [TAB.output]
  const currentTab = panelTabs.some((t) => t.id === panelTab) ? panelTab : panelTabs[0].id
  const errorCount = output.filter((l) => l.type === 'error').length
  const lineCount = activeFile.content ? activeFile.content.split('\n').length : 0

  const notify = (type, message) => setNotice({ id: Date.now(), type, message })
  const closeNotice = useCallback(() => setNotice(null), [])
  const closeReset = useCallback(() => setShowReset(false), [])

  const setPref = (key, value) => {
    setPrefs((p) => {
      const next = { ...p, [key]: value }
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }

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
    setSaveState('saving')
    const id = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(workspace))
        setSaveState('saved')
      } catch {
        setSaveState('error') // storage เต็ม
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
  }, [output, currentTab, panelOpen])

  // คีย์ลัด: Ctrl/Cmd + Enter รัน, + S บันทึก, + J ย่อ/ขยายแผง
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      if (k === 'enter') {
        e.preventDefault()
        actionsRef.current.run?.()
      } else if (k === 's') {
        e.preventDefault()
        actionsRef.current.save?.()
      } else if (k === 'j') {
        e.preventDefault()
        actionsRef.current.togglePanel?.()
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
    setLastRun(null)
    setOutput([{ type: 'system', text: `เปลี่ยนเป็น ${LANGUAGES[id].label} — พร้อมรันโค้ด` }])
  }

  const confirmReset = () => {
    updateProject(mode, () => createProject(mode))
    setShowReset(false)
    notify('success', `รีเซ็ตโค้ด ${lang.label} แล้ว`)
  }

  const saveNow = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(workspaceRef.current))
      setSaveState('saved')
      notify('success', 'บันทึกโค้ดแล้ว')
    } catch {
      setSaveState('error')
      notify('error', 'บันทึกไม่สำเร็จ พื้นที่จัดเก็บของเบราว์เซอร์เต็ม')
    }
  }

  const togglePanel = () => setPanelOpen((v) => !v)

  const copyText = async (text, okMsg) => {
    try {
      await navigator.clipboard.writeText(text)
      notify('success', okMsg)
    } catch {
      notify('error', 'คัดลอกไม่สำเร็จ เบราว์เซอร์ไม่อนุญาตให้เข้าถึงคลิปบอร์ด')
    }
  }

  const downloadFile = () => {
    const url = URL.createObjectURL(new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = activeFile.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    notify('success', `ดาวน์โหลด ${activeFile.name} แล้ว`)
  }

  const formatCode = async () => {
    const action = editorRef.current?.getAction('editor.action.formatDocument')
    if (!action) return notify('error', 'ภาษานี้ยังไม่รองรับการจัดรูปแบบอัตโนมัติ')
    try {
      await action.run()
    } catch {
      notify('error', 'จัดรูปแบบโค้ดไม่สำเร็จ')
    }
  }

  const openPreviewInTab = () => {
    if (!previewDoc) return
    const url = URL.createObjectURL(new Blob([previewDoc], { type: 'text/html' }))
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      const fn = auth.signOut || auth.logout
      if (typeof fn === 'function') await fn()
      else await supabase.auth.signOut()
      navigate('/coding/landing', { replace: true })
    } catch (err) {
      console.error(err)
      notify('error', 'ออกจากระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
      setLoggingOut(false)
    }
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
    let ok = true

    setIsRunning(true)
    setPanelOpen(true)
    setPanelTab(lang.runner === 'web' || lang.runner === 'react' ? 'preview' : 'output')
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
          ok = res.code === 0
          print(ok ? 'success' : 'error', `Process exited with code ${res.code} (${elapsed()}s)`)
          break
        }

        case 'python': {
          const res = await runPython({ code: entry.content, stdin: project.stdin, onOutput: print, signal })
          ok = res.code === 0
          print(ok ? 'success' : 'error', `Process exited with code ${res.code} (${elapsed()}s)`)
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
            ok = false
            print('error', (data.compile.stderr || data.compile.output || 'Compilation failed').trimEnd())
            print('error', `✗ Compilation failed (${elapsed()}s)`)
            break
          }
          if (data.compile?.stderr) print('warn', data.compile.stderr.trimEnd())

          const { stdout, stderr, code, signal: killSignal } = data.run ?? {}
          if (stdout) print('log', stdout.trimEnd())
          if (stderr) print('error', stderr.trimEnd())
          if (killSignal) print('error', `Process killed (${killSignal}) — อาจใช้เวลาหรือหน่วยความจำเกินกำหนด`)
          ok = code === 0
          print(ok ? 'success' : 'error', `Process exited with code ${code ?? '-'} (${elapsed()}s)`)
          break
        }

        default:
          ok = false
          print('error', 'ยังไม่รองรับภาษานี้')
      }
    } catch (err) {
      ok = false
      if (err?.name !== 'AbortError') print('error', err?.message || String(err))
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setIsRunning(false)
        setLastRun({ ok, seconds: elapsed() })
      }
    }
  }, [lang, project, appendOutput])

  // ให้คีย์ลัดและคำสั่งใน Monaco เรียกฟังก์ชันล่าสุดเสมอ
  actionsRef.current = { run: handleRun, save: saveNow, togglePanel }

  /* ---------------- Monaco ---------------- */

  const handleBeforeMount = (monaco) => {
    monaco.editor.defineTheme('studio-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0e0e10',
        'editor.lineHighlightBackground': '#17171a',
        'editorLineNumber.foreground': '#48484a',
        'editorLineNumber.activeForeground': '#e5e5ea',
        'editorCursor.foreground': '#0a84ff',
        'editor.selectionBackground': '#0a84ff40',
        'editorIndentGuide.background1': '#222226',
        'editorWidget.background': '#1c1c1e',
        'editorSuggestWidget.background': '#1c1c1e',
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
    editorRef.current = editor
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => actionsRef.current.run?.())
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => actionsRef.current.save?.())
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyJ, () => actionsRef.current.togglePanel?.())
    editor.onDidChangeCursorPosition((e) => setCursor({ line: e.position.lineNumber, column: e.position.column }))
    editor.focus()
  }

  /* ---------------- Panel resize ---------------- */

  const startResize = (e) => {
    if (!panelOpen) return
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

  const selectTab = (id) => {
    setPanelTab(id)
    setPanelOpen(true)
  }

  /* ---------------- Render ---------------- */

  const saveLabel = { saved: 'บันทึกแล้ว', saving: 'กำลังบันทึก…', error: 'บันทึกไม่สำเร็จ' }[saveState]

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0a0a0b] font-sans text-[#e5e5ea] antialiased selection:bg-[#0a84ff]/30">
      {isResizing && <div className="fixed inset-0 z-50 cursor-row-resize" />}
      {notice && <Notification key={notice.id} type={notice.type} message={notice.message} onClose={closeNotice} />}

      {/* ===== Header ===== */}
      <header className="z-20 flex h-12 flex-shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] bg-[#161618]/80 px-3 backdrop-blur-xl backdrop-saturate-150 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="hidden md:block">
            <IconButton icon="sidebar" label={prefs.sidebar ? 'ซ่อนแถบด้านข้าง' : 'แสดงแถบด้านข้าง'} onClick={() => setPref('sidebar', !prefs.sidebar)} active={prefs.sidebar} />
          </div>
          <Link
            to="/coding/landing"
            aria-label="กลับหน้าหลัก CODING"
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#30d158] to-[#0a9d6b] text-white shadow-[0_6px_16px_-6px_rgba(48,209,88,0.7)] transition hover:opacity-85 ${ring}`}
          >
            <Icon name="code" className="h-4 w-4" strokeWidth={2.2} />
          </Link>
          <div className="hidden min-w-0 flex-col leading-tight sm:flex">
            <span className="text-[11px] font-medium text-white/40">Personal Workspace</span>
            <span className="truncate text-[13px] font-semibold text-white">
              {displayName} <span className="text-white/30">/</span> <span className="text-[#30d158]">Sandbox</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language selector */}
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full" style={{ backgroundColor: lang.color }} />
            <select
              value={mode}
              onChange={(e) => switchMode(e.target.value)}
              aria-label="เลือกภาษา"
              className={`h-8 cursor-pointer appearance-none rounded-full bg-white/[0.08] pl-7 pr-8 text-[13px] font-medium text-white transition hover:bg-white/[0.12] ${ring}`}
            >
              {LANGUAGE_ORDER.map((id) => (
                <option key={id} value={id} className="bg-[#1c1c1e]">
                  {LANGUAGES[id].label}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/50" strokeWidth={2.5} />
          </div>

          {isRunning ? (
            <button
              type="button"
              onClick={() => stopRun()}
              className={`flex h-8 items-center gap-2 rounded-full bg-[#ff453a] px-4 text-[13px] font-semibold text-white transition hover:bg-[#ff5a50] active:scale-[0.97] ${ring}`}
            >
              <Spinner className="h-3.5 w-3.5" />
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRun}
              title="Run (Ctrl + Enter)"
              className={`flex h-8 items-center gap-1.5 rounded-full bg-[#30d158] px-4 text-[13px] font-semibold text-black shadow-[0_8px_20px_-8px_rgba(48,209,88,0.8)] transition hover:bg-[#4be072] active:scale-[0.97] ${ring}`}
            >
              <Icon name="play" className="h-3.5 w-3.5" />
              Run
            </button>
          )}

          <SettingsMenu prefs={prefs} setPref={setPref} />
          <div className="mx-0.5 hidden h-5 w-px bg-white/10 sm:block" />

          {signedIn ? (
            <AccountMenu profile={profile} email={session?.user?.email} initial={avatarInitial} onLogout={handleLogout} loggingOut={loggingOut} />
          ) : (
            <Link to="/portal" className={`rounded-full bg-white/[0.08] px-3.5 py-1.5 text-[13px] font-medium text-white transition hover:bg-white/[0.14] ${ring}`}>
              เข้าสู่ระบบ
            </Link>
          )}
        </div>
      </header>

      {/* ===== Body ===== */}
      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        {prefs.sidebar && (
          <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-white/[0.08] bg-[#111113] md:flex">
            <SectionTitle>Languages</SectionTitle>
            <nav className="space-y-0.5 px-2 pb-2" aria-label="ภาษา">
              {LANGUAGE_ORDER.map((id) => {
                const l = LANGUAGES[id]
                const active = id === mode
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => switchMode(id)}
                    aria-current={active ? 'true' : undefined}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition ${ring} ${
                      active ? 'bg-white/[0.1] text-white' : 'text-white/55 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <span className="flex h-5 min-w-[2.5rem] items-center justify-center rounded px-1 text-[10px] font-bold" style={{ color: l.color, backgroundColor: `${l.color}1f` }}>
                      {l.short}
                    </span>
                    <span className="truncate">{l.label}</span>
                  </button>
                )
              })}
            </nav>

            <SectionTitle>Files</SectionTitle>
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {project.files.map((f) => {
                const badge = getFileBadge(f.name)
                const active = f.name === activeFile.name
                return (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => switchFile(f.name)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition ${ring} ${
                      active ? 'bg-white/[0.1] text-white' : 'text-white/55 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <span className="w-8 text-[10px] font-bold" style={{ color: badge.color }}>
                      {badge.label}
                    </span>
                    <span className="truncate">{f.name}</span>
                  </button>
                )
              })}
            </div>

            <div className="space-y-2 border-t border-white/[0.08] p-3 text-[11px] leading-relaxed text-white/40">
              <div>
                <div className="font-semibold text-white/60">Runtime</div>
                <div className="truncate">{RUNNER_INFO[lang.runner]}</div>
              </div>
              <div className="flex gap-4">
                <div>
                  <div className="font-semibold text-white/60">บรรทัด</div>
                  <div className="tabular-nums">{lineCount.toLocaleString('th-TH')}</div>
                </div>
                <div>
                  <div className="font-semibold text-white/60">ตัวอักษร</div>
                  <div className="tabular-nums">{activeFile.content.length.toLocaleString('th-TH')}</div>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Main */}
        <main className="flex min-w-0 flex-1 flex-col">
          {/* File tabs + toolbar */}
          <div className="flex h-10 flex-shrink-0 items-stretch justify-between border-b border-white/[0.08] bg-[#111113]">
            <div className="flex overflow-x-auto" role="tablist" aria-label="ไฟล์">
              {project.files.map((f) => {
                const badge = getFileBadge(f.name)
                const active = f.name === activeFile.name
                return (
                  <button
                    key={f.name}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => switchFile(f.name)}
                    className={`flex items-center gap-2 whitespace-nowrap border-r border-t-2 border-r-white/[0.06] px-4 text-[13px] transition ${ring} ${
                      active ? 'border-t-[#0a84ff] bg-[#0e0e10] text-white' : 'border-t-transparent text-white/45 hover:bg-white/[0.04] hover:text-white/80'
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

            <div className="flex items-center gap-0.5 px-2">
              <kbd className="mr-2 hidden rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-white/40 lg:inline">Ctrl + Enter</kbd>
              <IconButton icon="format" label="จัดรูปแบบโค้ด" onClick={formatCode} />
              <IconButton icon="copy" label="คัดลอกโค้ด" onClick={() => copyText(activeFile.content, 'คัดลอกโค้ดแล้ว')} />
              <IconButton icon="download" label={`ดาวน์โหลด ${activeFile.name}`} onClick={downloadFile} />
              <IconButton icon="reset" label="รีเซ็ตเป็นโค้ดตัวอย่าง" onClick={() => setShowReset(true)} />
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
              loading={<div className="p-4 text-sm text-white/40">กำลังโหลด Editor...</div>}
              options={{
                fontSize: prefs.fontSize,
                fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', Consolas, monospace",
                fontLigatures: true,
                tabSize: lang.tabSize,
                wordWrap: prefs.wordWrap ? 'on' : 'off',
                minimap: { enabled: prefs.minimap },
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

          {/* Resize handle (ดับเบิลคลิกเพื่อย่อ/ขยาย) */}
          <div
            onPointerDown={startResize}
            onDoubleClick={togglePanel}
            title="ลากเพื่อปรับขนาด • ดับเบิลคลิกเพื่อย่อ/ขยาย"
            className={`group flex h-1.5 flex-shrink-0 items-center justify-center bg-white/[0.04] transition hover:bg-[#0a84ff]/40 ${panelOpen ? 'cursor-row-resize' : 'cursor-pointer'}`}
          >
            <div className="h-0.5 w-10 rounded-full bg-white/20 group-hover:bg-[#0a84ff]" />
          </div>

          {/* Bottom panel */}
          <section
            aria-label="ผลลัพธ์"
            style={{ height: panelOpen ? panelHeight : TAB_BAR_H }}
            className="flex flex-shrink-0 flex-col overflow-hidden bg-[#050506] transition-[height] duration-200 motion-reduce:transition-none"
          >
            <div className="flex h-[37px] flex-shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#111113] px-2">
              <div className="flex" role="tablist">
                {panelTabs.map((t) => {
                  const selected = currentTab === t.id && panelOpen
                  const showBadge = t.id !== 'input' && t.id !== 'preview' && errorCount > 0
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => selectTab(t.id)}
                      className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition ${ring} ${
                        selected ? 'text-white' : 'text-white/45 hover:text-white/80'
                      }`}
                    >
                      {t.label}
                      {showBadge && <span className="rounded-full bg-[#ff453a] px-1.5 text-[10px] font-bold leading-4 text-white">{errorCount}</span>}
                      {selected && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#0a84ff]" />}
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center gap-0.5">
                {isPreviewMode && currentTab === 'preview' && (
                  <>
                    <IconButton icon="reset" label="โหลด Preview ใหม่" onClick={() => setPreviewKey((k) => k + 1)} disabled={!previewDoc} />
                    <IconButton icon="external" label="เปิด Preview ในแท็บใหม่" onClick={openPreviewInTab} disabled={!previewDoc} />
                  </>
                )}
                {currentTab !== 'preview' && currentTab !== 'input' && (
                  <IconButton icon="copy" label="คัดลอก Output" onClick={() => copyText(output.map((l) => l.text).join('\n'), 'คัดลอก Output แล้ว')} />
                )}
                <IconButton icon="trash" label="ล้าง Output" onClick={() => setOutput([])} />
                <IconButton icon={panelOpen ? 'chevronDown' : 'chevronUp'} label={panelOpen ? 'ย่อแผง (Ctrl + J)' : 'ขยายแผง (Ctrl + J)'} onClick={togglePanel} />
              </div>
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
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-white/40">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06]">
                        <Icon name="play" className="h-5 w-5 text-white/40" />
                      </span>
                      กด Run เพื่อดูผลลัพธ์
                    </div>
                  )}
                </div>
              )}

              {(currentTab === 'output' || currentTab === 'console') && (
                <div ref={outputRef} className="absolute inset-0 overflow-y-auto p-4 font-mono text-[13px] leading-relaxed">
                  {output.map((line, i) => (
                    <div key={i} className={`whitespace-pre-wrap break-words ${OUTPUT_STYLE[line.type] ?? OUTPUT_STYLE.log}`}>
                      {line.text}
                    </div>
                  ))}
                  <div className="mt-1 flex items-center text-white/40">
                    <span className="mr-2 text-[#30d158]">➜</span>
                    {isRunning ? <span className="text-xs">running...</span> : <span className="inline-block h-4 w-2 animate-pulse bg-white/40" />}
                  </div>
                </div>
              )}

              {currentTab === 'input' && (
                <div className="absolute inset-0 flex flex-col p-3">
                  <p className="mb-2 text-xs text-white/40">ข้อมูลนำเข้า (stdin) — หนึ่งบรรทัดต่อการอ่านหนึ่งครั้ง เช่น input(), cin, Scanner</p>
                  <textarea
                    value={project.stdin ?? ''}
                    onChange={(e) => setStdin(e.target.value)}
                    spellCheck={false}
                    placeholder={'เช่น\n10\n20\nSomchai'}
                    className="flex-1 resize-none rounded-xl border border-white/10 bg-[#0e0e10] p-3 font-mono text-[13px] text-[#e5e5ea] outline-none transition placeholder:text-white/25 focus:border-[#0a84ff] focus:ring-4 focus:ring-[#0a84ff]/20"
                  />
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      {/* ===== Status bar ===== */}
      <footer className="flex h-6 flex-shrink-0 items-center justify-between border-t border-white/[0.08] bg-[#161618] px-3 text-[11px] text-white/50">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${isRunning ? 'animate-pulse bg-[#ffd60a]' : 'bg-[#30d158]'}`} />
            {isRunning ? 'Running…' : 'Ready'}
          </span>
          {lastRun && !isRunning && (
            <span className={lastRun.ok ? 'text-[#30d158]' : 'text-[#ff453a]'}>
              {lastRun.ok ? '✓' : '✗'} {lastRun.seconds}s
            </span>
          )}
          <span className="hidden truncate sm:inline">{RUNNER_INFO[lang.runner]}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={saveState === 'error' ? 'text-[#ff453a]' : ''}>{saveLabel}</span>
          <span>
            Ln {cursor.line}, Col {cursor.column}
          </span>
          <span className="hidden sm:inline">Spaces: {lang.tabSize}</span>
          <span className="hidden sm:inline">UTF-8</span>
          <span style={{ color: lang.color }}>{lang.label}</span>
        </div>
      </footer>

      {/* Dialog: รีเซ็ตโค้ด */}
      {showReset && (
        <Dialog title="รีเซ็ตโค้ดตัวอย่าง?" description={`โค้ด ${lang.label} ปัจจุบันจะหายไปและกลับเป็นตัวอย่างเริ่มต้น ไม่สามารถกู้คืนได้`} onClose={closeReset}>
          <div className="flex justify-end gap-3">
            <button type="button" autoFocus onClick={closeReset} className={`${dlgBtn} bg-white/10 text-white hover:bg-white/15`}>
              ยกเลิก
            </button>
            <button type="button" onClick={confirmReset} className={`${dlgBtn} bg-[#ff453a] text-white hover:bg-[#ff5a50]`}>
              รีเซ็ต
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}

function SectionTitle({ children }) {
  return <div className="px-4 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-wider text-white/35">{children}</div>
}