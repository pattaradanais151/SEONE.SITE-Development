import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'

/*
  CloudFiles Dashboard — Apple.com style
  - สีทั้งหมดอ้างอิงจาก design tokens (--color-se-*) รองรับ Light/Dark Mode เมื่อ override ตัวแปร
  - ฟีเจอร์: ออกจากระบบ, breadcrumb, ค้นหา, เรียงลำดับ, มุมมอง Grid/List, ลากวางอัปโหลดหลายไฟล์,
    เปลี่ยนชื่อ, ดาวน์โหลด, คัดลอกลิงก์, ลบโฟลเดอร์แบบลบทั้งต้นไม้, สรุปพื้นที่ใช้งาน
*/

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const VIEW_KEY = 'se-cf-view'
const BUCKET = 'cloudfiles'

const ICONS = {
  cloud: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
  folderFill: 'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z',
  doc: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  upload: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
  newFolder: 'M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  search: 'M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z',
  grid: 'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  edit: 'M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z',
  download: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4',
  link: 'M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5',
  logout: 'M16 17l5-5-5-5M21 12H9M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4',
  chevronDown: 'M6 9l6 6 6-6',
  chevronRight: 'M9 5l7 7-7 7',
  grid2: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z',
}

const ring = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-se-primary/30'

const btnPrimary = `inline-flex h-10 items-center justify-center gap-2 rounded-full bg-se-primary px-5 text-sm font-medium text-white transition hover:bg-se-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${ring}`
const btnSecondary = `inline-flex h-10 items-center justify-center gap-2 rounded-full bg-se-surface px-5 text-sm font-medium text-se-text-main ring-1 ring-se-border transition hover:bg-se-border/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${ring}`
const btnDanger = `inline-flex h-10 items-center justify-center gap-2 rounded-full bg-se-danger px-5 text-sm font-medium text-white transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${ring}`
const menuItem = `flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-se-text-main transition-colors hover:bg-se-border/30 ${ring}`

function Icon({ d, className = 'h-5 w-5', strokeWidth = 1.75 }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const formatBytes = (bytes) => {
  if (!bytes) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

const extOf = (name = '') => (name.includes('.') ? name.split('.').pop().toLowerCase() : '')

const EXT_COLORS = [
  [['pdf'], '#ff3b30'],
  [['doc', 'docx', 'txt', 'rtf', 'md'], '#0071e3'],
  [['xls', 'xlsx', 'csv'], '#30b0c7'],
  [['ppt', 'pptx', 'key'], '#ff9500'],
  [['zip', 'rar', '7z', 'tar', 'gz'], '#a2845e'],
  [['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'html', 'css', 'json', 'sql', 'php'], '#34c759'],
  [['mp3', 'wav', 'm4a', 'flac'], '#ff6482'],
  [['mp4', 'mov', 'mkv', 'avi', 'webm'], '#af52de'],
  [['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic'], '#af52de'],
]

const kindOf = (item) => {
  const ext = extOf(item.file_name)
  const hit = EXT_COLORS.find(([exts]) => exts.includes(ext))
  const mime = item.file_type || ''
  const color = hit ? hit[1] : mime.startsWith('image/') || mime.startsWith('video/') ? '#af52de' : '#86868b'
  return { color, label: ext ? ext.slice(0, 4).toUpperCase() : 'FILE' }
}

const downloadUrl = (item) =>
  `${item.file_url}${item.file_url.includes('?') ? '&' : '?'}download=${encodeURIComponent(item.file_name)}`

// popover: ปิดเมื่อคลิกนอกพื้นที่หรือกด Esc
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

/* ------------------------------------------------------------------ */
/*  Notification — banner ลอยด้านบนแบบ iOS (ปิดเองอัตโนมัติ)             */
/* ------------------------------------------------------------------ */
const NOTICE_STYLES = {
  error: {
    title: 'เกิดข้อผิดพลาด',
    tone: 'bg-se-danger/10 text-se-danger',
    icon: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM12 8v5M12 16h.01',
  },
  success: {
    title: 'สำเร็จ',
    tone: 'bg-se-success/15 text-se-success',
    icon: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM8 12.5l2.5 2.5L16 9.5',
  },
}

function Notification({ type = 'error', message, duration = 5000, onClose }) {
  const [visible, setVisible] = useState(false)
  const closeRef = useRef(onClose)
  const exitTimer = useRef()
  const style = NOTICE_STYLES[type]

  useEffect(() => {
    closeRef.current = onClose
  })

  const dismiss = useCallback(() => {
    setVisible(false)
    exitTimer.current = setTimeout(() => closeRef.current?.(), 300)
  }, [])

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    const timer = duration ? setTimeout(dismiss, duration) : null
    return () => {
      cancelAnimationFrame(raf)
      if (timer) clearTimeout(timer)
    }
  }, [duration, dismiss])

  useEffect(() => () => clearTimeout(exitTimer.current), [])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex justify-center px-4">
      <div
        role={type === 'error' ? 'alert' : 'status'}
        className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-se-border/60 bg-se-surface/80 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl backdrop-saturate-150 transition-all duration-300 ease-out motion-reduce:transition-none ${
          visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
        }`}
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style.tone}`}>
          <Icon d={style.icon} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold text-se-text-main">{style.title}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-se-text-muted">{message}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="ปิดการแจ้งเตือน"
          className={`-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-se-text-muted transition-colors hover:bg-se-border/40 hover:text-se-text-main ${ring}`}
        >
          <Icon d="M6 6l12 12M18 6L6 18" className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Dialog — กล่องโต้ตอบแบบ Apple (กด Esc หรือคลิกพื้นหลังเพื่อปิด)         */
/* ------------------------------------------------------------------ */
function Dialog({ title, description, onClose, children }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={`relative w-full max-w-sm rounded-[22px] border border-se-border/60 bg-se-surface p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)] transition-all duration-200 ease-out motion-reduce:transition-none ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <h2 id="dialog-title" className="text-xl font-semibold tracking-tight">
          {title}
        </h2>
        {description && <p className="mt-1.5 text-[15px] leading-relaxed text-se-text-muted">{description}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Account menu (รวมปุ่มออกจากระบบ)                                    */
/* ------------------------------------------------------------------ */
function AccountMenu({ profile, email, onLogout, loggingOut }) {
  const [open, setOpen, ref] = usePopover()
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-se-border/30 ${ring}`}
      >
        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-se-primary/10 text-xs font-semibold text-se-primary ring-1 ring-se-border">
          {profile?.profile_image_url ? (
            <img src={profile.profile_image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            profile?.first_name?.charAt(0)
          )}
        </span>
        <Icon d={ICONS.chevronDown} className={`h-3.5 w-3.5 text-se-text-muted transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={2.5} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-11 z-50 w-64 rounded-2xl border border-se-border/60 bg-se-surface/95 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <div className="px-3 pb-2.5 pt-2">
            <p className="truncate text-[15px] font-semibold">{fullName || 'บัญชีของฉัน'}</p>
            {email && <p className="truncate text-xs text-se-text-muted">{email}</p>}
          </div>
          <div className="my-1 h-px bg-se-border/60" />
          <Link to="/portal" role="menuitem" onClick={() => setOpen(false)} className={menuItem}>
            <Icon d={ICONS.grid2} className="h-4 w-4 text-se-text-muted" />
            กลับไปที่ Portal
          </Link>
          <Link to="/cloudfiles/landing" role="menuitem" onClick={() => setOpen(false)} className={menuItem}>
            <Icon d={ICONS.cloud} className="h-4 w-4 text-se-text-muted" />
            เกี่ยวกับ CLOUDFILES
          </Link>
          <div className="my-1 h-px bg-se-border/60" />
          <button type="button" role="menuitem" onClick={onLogout} disabled={loggingOut} className={`${menuItem} !text-se-danger disabled:opacity-60`}>
            {loggingOut ? <Spinner /> : <Icon d={ICONS.logout} className="h-4 w-4" />}
            {loggingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ'}
          </button>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Item menu (⋯)                                                      */
/* ------------------------------------------------------------------ */
function ItemMenu({ item, onRename, onDelete, onCopy, persistent = false }) {
  const [open, setOpen, ref] = usePopover()
  const run = (fn) => () => {
    setOpen(false)
    fn(item)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`ตัวเลือกของ ${item.file_name}`}
        className={`flex h-8 w-8 items-center justify-center rounded-full text-se-text-muted transition-all hover:text-se-text-main ${ring} ${
          persistent
            ? 'hover:bg-se-border/40'
            : `bg-se-surface/85 ring-1 ring-se-border/60 backdrop-blur ${open ? 'opacity-100' : 'opacity-0 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100'}`
        }`}
      >
        <Icon d={ICONS.more} className="h-4 w-4" strokeWidth={3} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-10 z-30 w-52 rounded-2xl border border-se-border/60 bg-se-surface/95 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          {item.is_folder ? (
            <Link to={`/cloudfiles/folder/${item.id}`} role="menuitem" className={menuItem}>
              <Icon d={ICONS.folderFill} className="h-4 w-4 text-se-text-muted" />
              เปิดโฟลเดอร์
            </Link>
          ) : (
            <a href={item.file_url} target="_blank" rel="noopener noreferrer" role="menuitem" onClick={() => setOpen(false)} className={menuItem}>
              <Icon d={ICONS.external} className="h-4 w-4 text-se-text-muted" />
              เปิดในแท็บใหม่
            </a>
          )}
          <button type="button" role="menuitem" onClick={run(onRename)} className={menuItem}>
            <Icon d={ICONS.edit} className="h-4 w-4 text-se-text-muted" />
            เปลี่ยนชื่อ
          </button>
          {!item.is_folder && (
            <>
              <a href={downloadUrl(item)} role="menuitem" onClick={() => setOpen(false)} className={menuItem}>
                <Icon d={ICONS.download} className="h-4 w-4 text-se-text-muted" />
                ดาวน์โหลด
              </a>
              <button type="button" role="menuitem" onClick={run(onCopy)} className={menuItem}>
                <Icon d={ICONS.link} className="h-4 w-4 text-se-text-muted" />
                คัดลอกลิงก์
              </button>
            </>
          )}
          <div className="my-1 h-px bg-se-border/60" />
          <button type="button" role="menuitem" onClick={run(onDelete)} className={`${menuItem} !text-se-danger`}>
            <Icon d={ICONS.trash} className="h-4 w-4" />
            ลบ
          </button>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Thumbnail                                                          */
/* ------------------------------------------------------------------ */
function Thumb({ item, size = 'lg' }) {
  const lg = size === 'lg'

  if (item.is_folder) {
    return (
      <svg className={`${lg ? 'h-16 w-16' : 'h-9 w-9'} text-se-primary`} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d={ICONS.folderFill} />
      </svg>
    )
  }

  if (item.file_type?.startsWith('image/') && item.file_url) {
    return (
      <img
        src={item.file_url}
        alt={item.file_name}
        loading="lazy"
        className={lg ? 'h-full w-full object-cover' : 'h-10 w-10 rounded-lg object-cover'}
      />
    )
  }

  const { color, label } = kindOf(item)
  return lg ? (
    <div className="flex flex-col items-center gap-2.5">
      <Icon d={ICONS.doc} className="h-12 w-12" strokeWidth={1.5} />
      <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ color, background: `${color}1f` }}>
        {label}
      </span>
    </div>
  ) : (
    <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ color, background: `${color}1f` }}>
      <Icon d={ICONS.doc} className="h-5 w-5" strokeWidth={1.75} />
    </span>
  )
}

const thumbColor = (item) => (item.is_folder || item.file_type?.startsWith('image/') ? undefined : kindOf(item).color)

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function CloudFilesDashboard() {
  const auth = useAuth()
  const { session, profile } = auth
  const { folderId } = useParams()
  const navigate = useNavigate()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [trail, setTrail] = useState([]) // เส้นทางโฟลเดอร์จาก root → ปัจจุบัน
  const [usage, setUsage] = useState({ bytes: 0, count: 0 })
  const [notice, setNotice] = useState(null)

  // ค้นหา / เรียง / มุมมอง
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'
    } catch {
      return 'grid'
    }
  })

  // สร้างโฟลเดอร์
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [creating, setCreating] = useState(false)

  // เปลี่ยนชื่อ
  const [renameTarget, setRenameTarget] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [renaming, setRenaming] = useState(false)

  // อัปโหลด
  const fileInputRef = useRef(null)
  const [uploadState, setUploadState] = useState(null) // { done, total }
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)
  const uploading = Boolean(uploadState)

  // ลบ
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // ออกจากระบบ
  const [loggingOut, setLoggingOut] = useState(false)

  const folderRef = useRef(folderId)
  folderRef.current = folderId

  const currentFolder = trail[trail.length - 1] || null

  const notify = (type, message) => setNotice({ id: Date.now(), type, message })
  const closeNotice = useCallback(() => setNotice(null), [])
  const closeNewFolder = useCallback(() => {
    setShowNewFolder(false)
    setFolderName('')
  }, [])
  const closeRename = useCallback(() => setRenameTarget(null), [])
  const closeDelete = useCallback(() => setDeleteTarget(null), [])

  useEffect(() => {
    document.title = `${currentFolder?.file_name || 'My Files'} | CLOUDFILES`
  }, [currentFolder])

  useEffect(() => {
    if (!session || !profile?.id) return
    setQuery('')
    fetchFiles()
    fetchTrail()
    fetchUsage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, profile?.id, folderId])

  /* ---------- Data ---------- */
  const fetchTrail = async () => {
    if (!folderId) {
      setTrail([])
      return
    }
    const chain = []
    let id = folderId
    for (let i = 0; i < 12 && id; i++) {
      const { data } = await supabase
        .from('cloud_files')
        .select('id, file_name, parent_id')
        .eq('id', id)
        .eq('owner_id', profile.id)
        .single()
      if (!data) break
      chain.unshift(data)
      id = data.parent_id
    }
    if (folderRef.current === folderId) setTrail(chain)
  }

  const fetchUsage = async () => {
    const { data } = await supabase
      .from('cloud_files')
      .select('file_size_bytes')
      .eq('owner_id', profile.id)
      .eq('is_folder', false)
    if (data) setUsage({ bytes: data.reduce((s, r) => s + (r.file_size_bytes || 0), 0), count: data.length })
  }

  const fetchFiles = async () => {
    try {
      setLoading(true)
      let q = supabase
        .from('cloud_files')
        .select('*')
        .eq('owner_id', profile.id)
        .order('is_folder', { ascending: false })
        .order('created_at', { ascending: false })

      q = folderId ? q.eq('parent_id', folderId) : q.is('parent_id', null)

      const { data, error } = await q
      if (error) throw error
      if (folderRef.current === folderId) setItems(data || [])
    } catch (err) {
      console.error('Error fetching files:', err.message)
      notify('error', 'โหลดรายการไฟล์ไม่สำเร็จ กรุณาลองรีเฟรชหน้านี้')
    } finally {
      setLoading(false)
    }
  }

  const refresh = () => {
    fetchFiles()
    fetchUsage()
  }

  /* ---------- Actions ---------- */
  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      const fn = auth.signOut || auth.logout
      if (typeof fn === 'function') await fn()
      else await supabase.auth.signOut()
      navigate('/cloudfiles/landing', { replace: true })
    } catch (err) {
      console.error(err)
      notify('error', 'ออกจากระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
      setLoggingOut(false)
    }
  }

  const handleCreateFolder = async (e) => {
    e.preventDefault()
    const name = folderName.trim()
    if (!name) return
    try {
      setCreating(true)
      const { error } = await supabase
        .from('cloud_files')
        .insert([{ file_name: name, is_folder: true, parent_id: folderId || null, owner_id: profile.id }])
      if (error) throw error
      closeNewFolder()
      notify('success', `สร้างโฟลเดอร์ "${name}" แล้ว`)
      refresh()
    } catch (err) {
      console.error(err)
      notify('error', 'สร้างโฟลเดอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setCreating(false)
    }
  }

  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length || uploading) return

    const valid = files.filter((f) => f.size <= MAX_FILE_SIZE)
    const skipped = files.length - valid.length
    if (!valid.length) {
      notify('error', 'ไฟล์ใหญ่เกินไป (จำกัด 100MB ต่อไฟล์)')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploadState({ done: 0, total: valid.length })
    let success = 0
    let failed = 0

    for (let i = 0; i < valid.length; i++) {
      const file = valid[i]
      let filePath = null
      try {
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '') || 'file'
        filePath = `${profile.id}/${Date.now()}_${i}_${sanitizedName}`

        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file)
        if (uploadError) throw uploadError

        const {
          data: { publicUrl },
        } = supabase.storage.from(BUCKET).getPublicUrl(filePath)

        const { error: dbError } = await supabase.from('cloud_files').insert([
          {
            file_name: file.name,
            file_path: filePath,
            file_url: publicUrl,
            file_size_bytes: file.size,
            file_type: file.type,
            is_folder: false,
            parent_id: folderId || null,
            owner_id: profile.id,
          },
        ])
        if (dbError) {
          await supabase.storage.from(BUCKET).remove([filePath]) // กันไฟล์ค้างใน Storage
          throw dbError
        }
        success++
      } catch (err) {
        console.error(err)
        failed++
      }
      setUploadState({ done: i + 1, total: valid.length })
    }

    setUploadState(null)
    if (fileInputRef.current) fileInputRef.current.value = ''

    if (failed || skipped) {
      const parts = []
      if (failed) parts.push(`อัปโหลดไม่สำเร็จ ${failed} ไฟล์`)
      if (skipped) parts.push(`ข้าม ${skipped} ไฟล์ที่เกิน 100MB`)
      notify('error', parts.join(' • ') + (success ? ` (สำเร็จ ${success} ไฟล์)` : ''))
    } else {
      notify('success', success === 1 ? `อัปโหลด "${valid[0].name}" แล้ว` : `อัปโหลด ${success} ไฟล์แล้ว`)
    }
    if (success) refresh()
  }

  const openRename = (item) => {
    setRenameTarget(item)
    setRenameValue(item.file_name)
  }

  const handleRename = async (e) => {
    e.preventDefault()
    const name = renameValue.trim()
    if (!name || name === renameTarget.file_name) {
      closeRename()
      return
    }
    try {
      setRenaming(true)
      const { error } = await supabase
        .from('cloud_files')
        .update({ file_name: name })
        .eq('id', renameTarget.id)
        .eq('owner_id', profile.id)
      if (error) throw error
      closeRename()
      notify('success', `เปลี่ยนชื่อเป็น "${name}" แล้ว`)
      refresh()
      if (renameTarget.is_folder) fetchTrail()
    } catch (err) {
      console.error(err)
      notify('error', 'เปลี่ยนชื่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setRenaming(false)
    }
  }

  const copyLink = async (item) => {
    try {
      await navigator.clipboard.writeText(item.file_url)
      notify('success', 'คัดลอกลิงก์ของไฟล์แล้ว')
    } catch {
      notify('error', 'คัดลอกลิงก์ไม่สำเร็จ เบราว์เซอร์ไม่อนุญาตให้เข้าถึงคลิปบอร์ด')
    }
  }

  // เก็บรายการทั้งหมดที่อยู่ใต้โฟลเดอร์ (ทุกชั้น)
  const collectDescendants = async (rootId) => {
    const rows = []
    let frontier = [rootId]
    for (let depth = 0; frontier.length && depth < 20; depth++) {
      const { data, error } = await supabase
        .from('cloud_files')
        .select('id, file_path, is_folder')
        .in('parent_id', frontier)
        .eq('owner_id', profile.id)
      if (error) throw error
      rows.push(...(data || []))
      frontier = (data || []).filter((r) => r.is_folder).map((r) => r.id)
    }
    return rows
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    const { id, file_path: filePath, is_folder: isFolder, file_name: name } = deleteTarget

    try {
      setDeleting(true)
      const descendants = isFolder ? await collectDescendants(id) : []

      const paths = descendants.filter((r) => !r.is_folder && r.file_path).map((r) => r.file_path)
      if (!isFolder && filePath) paths.push(filePath)
      if (paths.length) await supabase.storage.from(BUCKET).remove(paths)

      const ids = [id, ...descendants.map((r) => r.id)]
      const { error } = await supabase.from('cloud_files').delete().in('id', ids).eq('owner_id', profile.id)
      if (error) throw error

      setDeleteTarget(null)
      notify('success', `ลบ "${name}" แล้ว`)
      refresh()
    } catch (err) {
      console.error(err)
      notify('error', 'ลบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setDeleting(false)
    }
  }

  const changeView = (v) => {
    setView(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      /* ignore */
    }
  }

  /* ---------- Drag & drop ---------- */
  const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes('Files')
  const dropProps = {
    onDragEnter: (e) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      dragDepth.current += 1
      setDragging(true)
    },
    onDragOver: (e) => hasFiles(e) && e.preventDefault(),
    onDragLeave: (e) => {
      if (!hasFiles(e)) return
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (dragDepth.current === 0) setDragging(false)
    },
    onDrop: (e) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      dragDepth.current = 0
      setDragging(false)
      uploadFiles(e.dataTransfer.files)
    },
  }

  /* ---------- Derived ---------- */
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? items.filter((i) => i.file_name?.toLowerCase().includes(q)) : [...items]
    const cmp = {
      name: (a, b) => a.file_name.localeCompare(b.file_name, 'th', { numeric: true }),
      size: (a, b) => (b.file_size_bytes || 0) - (a.file_size_bytes || 0),
      date: (a, b) => new Date(b.created_at) - new Date(a.created_at),
    }[sortBy]
    return list.sort((a, b) => Number(b.is_folder) - Number(a.is_folder) || cmp(a, b))
  }, [items, query, sortBy])

  const folderCount = items.filter((i) => i.is_folder).length
  const fileCount = items.length - folderCount
  const title = folderId ? currentFolder?.file_name || 'โฟลเดอร์' : 'My Files'

  const stats = [
    { label: 'พื้นที่ที่ใช้', value: formatBytes(usage.bytes), hint: 'ทุกโฟลเดอร์รวมกัน' },
    { label: 'ไฟล์ทั้งหมด', value: usage.count.toLocaleString('th-TH'), hint: 'ในบัญชีของคุณ' },
    { label: 'ในโฟลเดอร์นี้', value: items.length.toLocaleString('th-TH'), hint: `${folderCount} โฟลเดอร์ • ${fileCount} ไฟล์` },
  ]

  /* ---------- Render ---------- */
  return (
    <div className="flex min-h-screen flex-col bg-se-background font-sans text-se-text-main antialiased" {...dropProps}>
      {notice && <Notification key={notice.id} type={notice.type} message={notice.message} onClose={closeNotice} />}

      {/* Header — โปร่งแสง + blur */}
      <header className="sticky top-0 z-40 border-b border-se-border/60 bg-se-background/75 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link to="/cloudfiles/landing" className={`flex items-center gap-2.5 rounded-lg ${ring}`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-orange-400 to-rose-500 shadow-[0_6px_16px_-6px_rgba(244,63,94,0.6)]">
              <Icon d={ICONS.cloud} className="h-4 w-4 text-white" strokeWidth={2} />
            </span>
            <span className="text-[17px] font-semibold tracking-tight">CLOUDFILES</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link to="/portal" className={`hidden rounded-full px-3 py-1.5 text-sm text-se-text-muted transition-colors hover:text-se-text-main sm:block ${ring}`}>
              Portal
            </Link>
            <AccountMenu profile={profile} email={session?.user?.email} onLogout={handleLogout} loggingOut={loggingOut} />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20 pt-8">
        {/* Breadcrumb */}
        <nav aria-label="ตำแหน่งโฟลเดอร์" className="mb-3 -ml-1">
          <ol className="flex flex-wrap items-center gap-1 text-[15px]">
            <li>
              <Link
                to="/cloudfiles/dashboard"
                aria-current={!folderId ? 'page' : undefined}
                className={`rounded-lg px-1 py-0.5 font-medium ${folderId ? 'text-se-primary hover:underline' : 'text-se-text-muted'} ${ring}`}
              >
                My Files
              </Link>
            </li>
            {trail.map((t, i) => {
              const last = i === trail.length - 1
              return (
                <li key={t.id} className="flex min-w-0 items-center gap-1">
                  <Icon d={ICONS.chevronRight} className="h-3.5 w-3.5 shrink-0 text-se-text-muted" strokeWidth={2.5} />
                  {last ? (
                    <span aria-current="page" className="max-w-[200px] truncate px-1 py-0.5 font-medium text-se-text-muted">
                      {t.file_name}
                    </span>
                  ) : (
                    <Link to={`/cloudfiles/folder/${t.id}`} className={`max-w-[200px] truncate rounded-lg px-1 py-0.5 font-medium text-se-primary hover:underline ${ring}`}>
                      {t.file_name}
                    </Link>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>

        {/* Title & Actions */}
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-4xl font-semibold leading-tight tracking-tight md:text-5xl">{title}</h1>
            <p className="mt-1.5 text-[17px] text-se-text-muted">
              {loading ? 'กำลังโหลด...' : `${items.length} รายการ${items.length ? ` • ${folderCount} โฟลเดอร์ • ${fileCount} ไฟล์` : ''}`}
            </p>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setShowNewFolder(true)} className={btnSecondary}>
              <Icon d={ICONS.newFolder} className="h-4 w-4" strokeWidth={2} />
              สร้างโฟลเดอร์
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className={btnPrimary}>
              {uploading ? (
                <>
                  <Spinner />
                  {uploadState.done}/{uploadState.total}
                </>
              ) : (
                <>
                  <Icon d={ICONS.upload} className="h-4 w-4" strokeWidth={2} />
                  อัปโหลดไฟล์
                </>
              )}
            </button>
            <input type="file" multiple ref={fileInputRef} onChange={(e) => uploadFiles(e.target.files)} className="hidden" />
          </div>
        </div>

        {/* Summary */}
        <dl className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-[22px] bg-se-surface px-5 py-4">
              <dt className="text-[13px] font-medium text-se-text-muted">{s.label}</dt>
              <dd className="mt-1 text-[28px] font-semibold leading-none tracking-tight tabular-nums">{s.value}</dd>
              <dd className="mt-1.5 text-xs text-se-text-muted">{s.hint}</dd>
            </div>
          ))}
        </dl>

        {/* Toolbar */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block flex-1 sm:max-w-md">
            <span className="sr-only">ค้นหาไฟล์และโฟลเดอร์</span>
            <Icon d={ICONS.search} className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-se-text-muted" strokeWidth={2} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาในโฟลเดอร์นี้"
              className="h-10 w-full rounded-full bg-se-surface pl-11 pr-4 text-[15px] text-se-text-main outline-none ring-1 ring-se-border transition placeholder:text-se-text-muted/60 focus:ring-2 focus:ring-se-primary"
            />
          </label>

          <div className="flex items-center gap-3 sm:ml-auto">
            <label className="relative">
              <span className="sr-only">เรียงตาม</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`h-10 appearance-none rounded-full bg-se-surface pl-4 pr-9 text-sm font-medium text-se-text-main ring-1 ring-se-border transition hover:bg-se-border/30 ${ring}`}
              >
                <option value="date">ล่าสุด</option>
                <option value="name">ชื่อ</option>
                <option value="size">ขนาด</option>
              </select>
              <Icon d={ICONS.chevronDown} className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-se-text-muted" strokeWidth={2.5} />
            </label>

            <div role="group" aria-label="มุมมอง" className="flex rounded-full bg-se-surface p-1 ring-1 ring-se-border">
              {[
                ['grid', ICONS.grid, 'มุมมองกริด'],
                ['list', ICONS.list, 'มุมมองรายการ'],
              ].map(([v, d, label]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  aria-label={label}
                  onClick={() => changeView(v)}
                  className={`flex h-8 w-9 items-center justify-center rounded-full transition ${
                    view === v ? 'bg-se-primary text-white' : 'text-se-text-muted hover:text-se-text-main'
                  } ${ring}`}
                >
                  <Icon d={d} className="h-4 w-4" strokeWidth={2} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mt-6">
          {loading ? (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" aria-hidden="true">
              {Array.from({ length: 10 }).map((_, i) => (
                <li key={i} className="rounded-[22px] bg-se-surface p-3">
                  <div className="aspect-square animate-pulse rounded-2xl bg-se-border/40" />
                  <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-se-border/40" />
                  <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-se-border/40" />
                </li>
              ))}
            </ul>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-se-border bg-se-surface px-6 py-20 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-se-primary/10 text-se-primary">
                <Icon d={ICONS.cloud} className="h-8 w-8" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-semibold tracking-tight">ยังไม่มีไฟล์ในพื้นที่นี้</h2>
              <p className="mt-1.5 max-w-sm text-[15px] leading-relaxed text-se-text-muted">
                ลากไฟล์มาวางที่นี่ หรืออัปโหลดครั้งละหลายไฟล์ได้เลย
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className={btnPrimary}>
                  <Icon d={ICONS.upload} className="h-4 w-4" strokeWidth={2} />
                  อัปโหลดไฟล์
                </button>
                <button type="button" onClick={() => setShowNewFolder(true)} className={btnSecondary}>
                  <Icon d={ICONS.newFolder} className="h-4 w-4" strokeWidth={2} />
                  สร้างโฟลเดอร์
                </button>
              </div>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center rounded-[28px] bg-se-surface px-6 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-se-border/40 text-se-text-muted">
                <Icon d={ICONS.search} className="h-7 w-7" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-semibold tracking-tight">ไม่พบ “{query}”</h2>
              <p className="mt-1.5 text-[15px] text-se-text-muted">ลองใช้คำอื่น หรือล้างการค้นหาเพื่อดูทั้งหมด</p>
              <button type="button" onClick={() => setQuery('')} className={`${btnSecondary} mt-5`}>
                ล้างการค้นหา
              </button>
            </div>
          ) : view === 'grid' ? (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {visible.map((item) => {
                const cardClass = `flex flex-col rounded-[22px] bg-se-surface p-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(0,0,0,0.1)] ${ring}`
                const preview = (
                  <div
                    className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-se-background"
                    style={{ color: thumbColor(item) }}
                  >
                    <Thumb item={item} />
                  </div>
                )
                const caption = (
                  <div className="mt-3 min-w-0 px-1 pb-1">
                    <p className="truncate text-[15px] font-medium">{item.file_name}</p>
                    <p className="mt-0.5 truncate text-xs text-se-text-muted">
                      {item.is_folder ? 'โฟลเดอร์' : `${formatBytes(item.file_size_bytes)} • ${formatDate(item.created_at)}`}
                    </p>
                  </div>
                )
                return (
                  <li key={item.id} className="group relative">
                    <div className="absolute right-5 top-5 z-10">
                      <ItemMenu item={item} onRename={openRename} onDelete={setDeleteTarget} onCopy={copyLink} />
                    </div>
                    {item.is_folder ? (
                      <Link to={`/cloudfiles/folder/${item.id}`} className={cardClass}>
                        {preview}
                        {caption}
                      </Link>
                    ) : (
                      <a href={item.file_url} target="_blank" rel="noopener noreferrer" className={cardClass}>
                        {preview}
                        {caption}
                      </a>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <ul className="rounded-[22px] bg-se-surface">
              <li aria-hidden="true" className="hidden items-center gap-4 border-b border-se-border/60 px-4 py-2.5 text-xs font-medium text-se-text-muted md:flex">
                <span className="flex-1 pl-14">ชื่อ</span>
                <span className="w-28 text-right">ขนาด</span>
                <span className="w-32 text-right">วันที่สร้าง</span>
                <span className="w-8" />
              </li>
              {visible.map((item) => {
                const rowClass = `flex min-w-0 flex-1 items-center gap-4 rounded-[18px] px-4 py-3 ${ring}`
                const content = (
                  <>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center">
                      <Thumb item={item} size="sm" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{item.file_name}</span>
                      <span className="block truncate text-xs text-se-text-muted md:hidden">
                        {item.is_folder ? 'โฟลเดอร์' : formatBytes(item.file_size_bytes)} • {formatDate(item.created_at)}
                      </span>
                    </span>
                    <span className="hidden w-28 shrink-0 text-right text-sm text-se-text-muted md:block">
                      {item.is_folder ? '—' : formatBytes(item.file_size_bytes)}
                    </span>
                    <span className="hidden w-32 shrink-0 text-right text-sm text-se-text-muted md:block">{formatDate(item.created_at)}</span>
                  </>
                )
                return (
                  <li key={item.id} className="group flex items-center gap-1 border-b border-se-border/40 pr-3 transition-colors first:rounded-t-[22px] last:rounded-b-[22px] last:border-0 hover:bg-se-border/20">
                    {item.is_folder ? (
                      <Link to={`/cloudfiles/folder/${item.id}`} className={rowClass}>
                        {content}
                      </Link>
                    ) : (
                      <a href={item.file_url} target="_blank" rel="noopener noreferrer" className={rowClass}>
                        {content}
                      </a>
                    )}
                    <ItemMenu item={item} persistent onRename={openRename} onDelete={setDeleteTarget} onCopy={copyLink} />
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>

      {/* Upload progress */}
      {uploading && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[55] flex justify-center px-4" role="status">
          <div className="pointer-events-auto w-full max-w-xs rounded-2xl border border-se-border/60 bg-se-surface/90 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.2)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <Spinner className="h-4 w-4 text-se-primary" />
              <p className="text-sm font-medium">
                กำลังอัปโหลด {Math.min(uploadState.done + 1, uploadState.total)} จาก {uploadState.total} ไฟล์
              </p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-se-border/50">
              <div className="h-full rounded-full bg-se-primary transition-all duration-500" style={{ width: `${(uploadState.done / uploadState.total) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Drag overlay */}
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-se-background/70 p-6 backdrop-blur-md">
          <div className="flex w-full max-w-lg flex-col items-center rounded-[32px] border-2 border-dashed border-se-primary bg-se-surface/90 px-8 py-16 text-center shadow-[0_24px_80px_rgba(0,113,227,0.25)]">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-se-primary text-white">
              <Icon d={ICONS.upload} className="h-8 w-8" strokeWidth={2} />
            </div>
            <p className="mt-5 text-2xl font-semibold tracking-tight">วางไฟล์เพื่ออัปโหลด</p>
            <p className="mt-1.5 text-[15px] text-se-text-muted">ไปยัง “{title}” • สูงสุด 100MB ต่อไฟล์</p>
          </div>
        </div>
      )}

      {/* Dialog: สร้างโฟลเดอร์ */}
      {showNewFolder && (
        <Dialog title="สร้างโฟลเดอร์ใหม่" onClose={closeNewFolder}>
          <form onSubmit={handleCreateFolder}>
            <input
              type="text"
              autoFocus
              placeholder="ชื่อโฟลเดอร์"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="h-12 w-full rounded-xl border border-se-border bg-se-background px-4 text-[17px] text-se-text-main transition placeholder:text-se-text-muted/60 focus:border-se-primary focus:outline-none focus:ring-4 focus:ring-se-primary/20"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeNewFolder} className={btnSecondary}>
                ยกเลิก
              </button>
              <button type="submit" disabled={creating || !folderName.trim()} className={btnPrimary}>
                {creating && <Spinner />}
                สร้าง
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Dialog: เปลี่ยนชื่อ */}
      {renameTarget && (
        <Dialog title={renameTarget.is_folder ? 'เปลี่ยนชื่อโฟลเดอร์' : 'เปลี่ยนชื่อไฟล์'} onClose={closeRename}>
          <form onSubmit={handleRename}>
            <input
              type="text"
              autoFocus
              onFocus={(e) => {
                // เลือกเฉพาะชื่อ ไม่รวมนามสกุลไฟล์
                const dot = renameTarget.is_folder ? -1 : e.target.value.lastIndexOf('.')
                e.target.setSelectionRange(0, dot > 0 ? dot : e.target.value.length)
              }}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="h-12 w-full rounded-xl border border-se-border bg-se-background px-4 text-[17px] text-se-text-main transition focus:border-se-primary focus:outline-none focus:ring-4 focus:ring-se-primary/20"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeRename} className={btnSecondary}>
                ยกเลิก
              </button>
              <button type="submit" disabled={renaming || !renameValue.trim()} className={btnPrimary}>
                {renaming && <Spinner />}
                บันทึก
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Dialog: ยืนยันการลบ */}
      {deleteTarget && (
        <Dialog
          title="ลบรายการนี้ใช่หรือไม่?"
          description={
            deleteTarget.is_folder
              ? `โฟลเดอร์ "${deleteTarget.file_name}" รวมถึงไฟล์และโฟลเดอร์ทั้งหมดภายในจะถูกลบ และไม่สามารถกู้คืนได้`
              : `"${deleteTarget.file_name}" จะถูกลบและไม่สามารถกู้คืนได้`
          }
          onClose={closeDelete}
        >
          <div className="flex justify-end gap-3">
            <button type="button" autoFocus onClick={closeDelete} className={btnSecondary}>
              ยกเลิก
            </button>
            <button type="button" onClick={handleConfirmDelete} disabled={deleting} className={btnDanger}>
              {deleting && <Spinner />}
              ลบ
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}