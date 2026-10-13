import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { notifyDiscord } from '../../../lib/discord'

/* =====================================================================
 * Config
 * ===================================================================== */
const SECS = ['SEC 1', 'SEC 2']
const SEMESTERS = ['1', '2', '3']
const YEAR_LEVELS = ['1', '2', '3', '4']
const BUCKET = 'resource-files'
const MAX_FILE_MB = 30
const TOAST_MS = 4200
const MANAGE_ROLES = ['admin', 'manager', 'ceo']

const DEFAULT_FILTERS = { year: 'all', term: 'all', level: 'all', sec: 'all' }

/* =====================================================================
 * Helpers
 * ===================================================================== */
const formatDate = (iso) => {
  const d = new Date(iso)
  const min = Math.floor((Date.now() - d.getTime()) / 60000)
  if (min < 1) return 'เมื่อสักครู่'
  if (min < 60) return `${min} นาทีที่แล้ว`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

const formatBytes = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// file_size_mb ในฐานข้อมูลเก็บเป็น MB — ไฟล์เล็กกว่า 1 MB แสดงเป็น KB จะอ่านง่ายกว่า
const formatSizeMb = (mb) => {
  const n = Number(mb)
  if (!Number.isFinite(n)) return '-'
  if (n < 1) return `${Math.max(1, Math.round(n * 1024))} KB`
  return `${n.toFixed(1)} MB`
}

// อนุญาตเฉพาะ http(s) — กัน javascript: / data: ใน file_url
const safeUrl = (u) => {
  try {
    const url = new URL(String(u || '').trim())
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

// ชื่อไฟล์ที่ปลอดภัยสำหรับ path ใน Storage (ชื่อไทยจะเหลือแค่นามสกุล จึงใช้ 'file' แทน)
const safeStorageName = (name) => {
  const dot = name.lastIndexOf('.')
  const ext = dot > 0 ? name.slice(dot + 1).replace(/[^a-zA-Z0-9]/g, '') : ''
  const stem = (dot > 0 ? name.slice(0, dot) : name).replace(/[^a-zA-Z0-9.\-_]/g, '').replace(/^\.+/, '')
  return `${stem || 'file'}${ext ? `.${ext}` : ''}`
}

// กัน @everyone / @here / <@id> จากข้อความผู้ใช้ไม่ให้ ping คนใน Discord
const cleanForDiscord = (s = '') =>
  String(s).replace(/@(everyone|here)/gi, '@\u200b$1').replace(/<@/g, '<@\u200b')

const truncate = (s = '', n = 200) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

const fullName = (p) => [p?.first_name, p?.last_name].filter(Boolean).join(' ')

// ส่ง Discord ผ่าน utility เดิม (→ Edge Function) — ไม่ throw และคืนค่า true/false
const notifyDiscordSafe = async (message) => {
  try {
    return Boolean(await notifyDiscord(message))
  } catch (err) {
    console.error('Discord notify failed:', err?.message || err)
    return false
  }
}

/* =====================================================================
 * Icons
 * ===================================================================== */
const Icon = ({ children, className = 'h-4 w-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
)
const PlusIcon = () => <Icon><path d="M12 5v14M5 12h14" /></Icon>
const TrashIcon = ({ className }) => <Icon className={className}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" /></Icon>
const SearchIcon = () => <Icon><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Icon>
const DownloadIcon = () => <Icon><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14" /></Icon>
const UploadIcon = ({ className = 'h-5 w-5' }) => <Icon className={className}><path d="M12 16V5M7.5 9.5L12 5l4.5 4.5M5 19h14" /></Icon>
const ChevronIcon = () => <Icon className="h-3.5 w-3.5"><path d="M6 9l6 6 6-6" /></Icon>
const XIcon = () => <Icon className="h-3.5 w-3.5"><path d="M6 6l12 12M18 6L6 18" /></Icon>
const CheckIcon = () => <Icon className="h-4 w-4"><path d="M5 12.5l4.5 4.5L19 7.5" /></Icon>
const AlertIcon = () => <Icon className="h-4 w-4"><path d="M12 8v5M12 16.5v.01M10.3 4.2L2.8 17.5A2 2 0 004.5 20.5h15a2 2 0 001.7-3L13.7 4.2a2 2 0 00-3.4 0z" /></Icon>
const FileIcon = ({ className = 'h-6 w-6' }) => <Icon className={className}><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5zM14 3v5h5M9 13h6M9 17h4" /></Icon>
const FolderIcon = () => <Icon className="h-7 w-7"><path d="M3 7a2 2 0 012-2h4l2 2.5h8a2 2 0 012 2V17a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></Icon>

const TOAST_ICON = { success: CheckIcon, error: AlertIcon, warning: AlertIcon }

// select พร้อมลูกศรแบบกำหนดเอง (ใช้ได้ทั้งในตัวกรองและฟอร์ม)
const Select = ({ className = '', style, children, ...props }) => (
  <div className="rc-select-wrap">
    <select className={`rc-input rc-select ${className}`} style={style} {...props}>
      {children}
    </select>
    <span className="rc-select-chevron"><ChevronIcon /></span>
  </div>
)

/* =====================================================================
 * Page
 * ===================================================================== */
export default function ResourceCenter() {
  const { profile } = useAuth()
  const canManage = MANAGE_ROLES.includes(profile?.role)

  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  // filters
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  // create
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [formData, setFormData] = useState({
    title: '',
    academic_year: String(new Date().getFullYear() + 543),
    semester: '1',
    sec: 'SEC 1',
    year_level: '1',
  })

  // delete
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // notifications (toast)
  const [toasts, setToasts] = useState([])
  const toastTimers = useRef(new Map())
  const toastSeq = useRef(0)

  /* ---------- Toast ---------- */
  const dismissToast = useCallback((id) => {
    clearTimeout(toastTimers.current.get(id))
    toastTimers.current.delete(id)
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((type, message, description) => {
    const id = ++toastSeq.current
    setToasts((list) => [...list.slice(-2), { id, type, message, description }])
    toastTimers.current.set(id, setTimeout(() => dismissToast(id), TOAST_MS))
  }, [dismissToast])

  useEffect(() => {
    const timers = toastTimers.current
    return () => timers.forEach((t) => clearTimeout(t))
  }, [])

  // ส่ง Discord แบบไม่บล็อก UI — ถ้าล้มเหลวให้แจ้งผู้ใช้ว่าข้อมูลถูกบันทึกแล้ว
  const sendDiscord = useCallback(async (message) => {
    const ok = await notifyDiscordSafe(message)
    if (!ok) showToast('warning', 'ส่งแจ้งเตือนไป Discord ไม่สำเร็จ', 'ข้อมูลถูกบันทึกในระบบเรียบร้อยแล้ว')
  }, [showToast])

  const actor = cleanForDiscord(profile?.first_name || 'System')

  /* ---------- Fetch ---------- */
  const fetchResources = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      setLoadError(false)
      const { data, error } = await supabase
        .from('resource_center')
        .select('*, author:profiles(first_name, last_name)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setResources(data || [])
    } catch (err) {
      console.error('Error fetching resources:', err.message)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    document.title = 'Resource Center | SE-CONSOLE'
    fetchResources()
  }, [fetchResources])

  /* ---------- Modal behaviour (ESC / scroll lock) ---------- */
  const modalOpen = showForm || Boolean(deleteTarget)

  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (deleting || submitting) return
      setShowForm(false)
      setFile(null)
      setFormErrors({})
      setDeleteTarget(null)
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [modalOpen, deleting, submitting])

  /* ---------- Form ---------- */
  const openForm = () => {
    setFormErrors({})
    setShowForm(true)
  }

  const closeForm = () => {
    if (submitting) return
    setShowForm(false)
    setFile(null)
    setFormErrors({})
  }

  const setField = (name) => (e) => {
    setFormData((f) => ({ ...f, [name]: e.target.value }))
    if (formErrors[name]) setFormErrors((er) => ({ ...er, [name]: undefined }))
  }

  const pickFile = (f) => {
    if (!f) return
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setFile(null)
      setFormErrors((er) => ({ ...er, file: `ไฟล์ต้องมีขนาดไม่เกิน ${MAX_FILE_MB} MB (ไฟล์ที่เลือก ${formatBytes(f.size)})` }))
      return
    }
    setFile(f)
    setFormErrors((er) => ({ ...er, file: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting || !canManage) return

    const title = formData.title.trim()

    const errs = {}
    if (!title) errs.title = 'กรุณากรอกชื่อเอกสาร'
    if (!/^\d{4}$/.test(String(formData.academic_year).trim())) errs.academic_year = 'ปีการศึกษาไม่ถูกต้อง'
    if (!file) errs.file = 'กรุณาแนบไฟล์'
    else if (file.size > MAX_FILE_MB * 1024 * 1024) errs.file = `ไฟล์ต้องมีขนาดไม่เกิน ${MAX_FILE_MB} MB`
    setFormErrors(errs)
    if (Object.keys(errs).length > 0) return

    let uploadedPath = null

    try {
      setSubmitting(true)
      if (!profile?.id) throw new Error('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่')

      // จัดเก็บไฟล์แยกโฟลเดอร์ตาม ปีการศึกษา/เทอม/SEC
      const academicYear = String(formData.academic_year).trim()
      const filePath = `${academicYear}/Term_${formData.semester}/${formData.sec.replace(' ', '')}/${Date.now()}_${safeStorageName(file.name)}`

      // 1. อัปโหลดไฟล์
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file)
      if (uploadError) throw uploadError
      uploadedPath = filePath

      // 2. ดึง URL
      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
      const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2)

      // 3. บันทึกลง Database
      const { error: dbError } = await supabase.from('resource_center').insert([
        {
          title,
          academic_year: academicYear,
          semester: formData.semester,
          sec: formData.sec,
          year_level: parseInt(formData.year_level),
          file_url: publicUrl,
          file_path: filePath,
          file_name: file.name,
          file_size_mb: parseFloat(fileSizeMb),
          author_id: profile.id,
        },
      ])
      if (dbError) throw dbError

      // 4. ปิดฟอร์ม แจ้งผล และรีเฟรชรายการ (เคลียร์แค่ชื่อ เรื่องอื่นจำค่าเดิมเผื่ออัปโหลดต่อ)
      const snapshot = { ...formData, academic_year: academicYear }
      setShowForm(false)
      setFile(null)
      setFormErrors({})
      setFormData((f) => ({ ...f, title: '', academic_year: academicYear }))
      showToast('success', 'อัปโหลดเอกสารแล้ว', title)
      fetchResources({ silent: true })

      // 5. แจ้งเตือน Discord (ผ่าน Edge Function ใน utility เดิม) — ไม่รอผล
      sendDiscord(
        `📁 **อัปโหลดเอกสารใหม่**\n` +
          `📌 **เรื่อง:** ${cleanForDiscord(truncate(title))}\n` +
          `🗂 **หมวด:** ปีการศึกษา ${snapshot.academic_year} เทอม ${snapshot.semester} | ${snapshot.sec} (ชั้นปี ${snapshot.year_level})\n` +
          `💾 **ขนาดไฟล์:** ${fileSizeMb} MB\n` +
          `👤 **อัปโหลดโดย:** ${actor}`
      )
    } catch (err) {
      console.error('Submit Error:', err.message)
      // ถ้าไฟล์ถูกอัปโหลดไปแล้วแต่บันทึกข้อมูลไม่สำเร็จ ให้ลบไฟล์ที่ค้างออก (best-effort)
      if (uploadedPath) supabase.storage.from(BUCKET).remove([uploadedPath]).catch(() => {})
      showToast('error', 'อัปโหลดเอกสารไม่สำเร็จ', err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------- Delete ---------- */
  const confirmDelete = async () => {
    if (!deleteTarget || deleting || !canManage) return
    const target = deleteTarget

    try {
      setDeleting(true)

      // 1. ลบข้อมูลก่อน — ใส่ .select() เพื่อตรวจว่าลบได้จริง (RLS ที่บล็อกจะไม่ error แต่คืน 0 แถว)
      //    ทำก่อนลบไฟล์ เพื่อไม่ให้เหลือเอกสารที่ไฟล์หายไปแล้วหากลบข้อมูลไม่สำเร็จ
      const { data, error } = await supabase.from('resource_center').delete().eq('id', target.id).select('id')
      if (error) throw error
      if (!data || data.length === 0) throw new Error('ไม่มีสิทธิ์ลบเอกสารนี้ หรือเอกสารถูกลบไปแล้ว')

      setResources((prev) => prev.filter((r) => r.id !== target.id))
      setDeleteTarget(null)
      showToast('success', 'ลบเอกสารแล้ว', target.title)

      // 2. ลบไฟล์ใน Storage (ถ้า policy ไม่อนุญาต จะไม่ error แต่คืนอาร์เรย์ว่าง จึงตรวจทั้งสองกรณี)
      if (target.file_path) {
        const { data: removed, error: removeError } = await supabase.storage.from(BUCKET).remove([target.file_path])
        if (removeError || !removed || removed.length === 0) {
          console.error('Remove file error:', removeError?.message || 'no file removed', target.file_path)
          showToast('warning', 'ลบเอกสารแล้ว แต่ลบไฟล์ไม่สำเร็จ', 'ไฟล์ยังค้างอยู่ใน Storage กรุณาตรวจสอบสิทธิ์การลบของ bucket')
        }
      }

      // 3. แจ้งเตือน Discord
      sendDiscord(
        `🗑️ **ลบเอกสาร: ${cleanForDiscord(truncate(target.title))}**\n` +
          `🗂 **หมวด:** ปีการศึกษา ${target.academic_year} เทอม ${target.semester} | ${target.sec} (ชั้นปี ${target.year_level})\n` +
          `✍️ **อัปโหลดโดย:** ${cleanForDiscord(fullName(target.author) || 'System')}\n` +
          `👤 **ลบโดย:** ${actor}\n` +
          `ถูกลบออกจากคลังเอกสารกลาง`
      )
    } catch (err) {
      console.error('Delete Error:', err.message)
      showToast('error', 'ลบเอกสารไม่สำเร็จ', err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  /* ---------- Derived ---------- */
  // รายการปีการศึกษาที่มีในระบบสำหรับตัวกรอง (ไม่ซ้ำ ใหม่ → เก่า)
  const availableYears = useMemo(
    () => [...new Set(resources.map((r) => String(r.academic_year)))].sort().reverse(),
    [resources]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return resources.filter((r) => {
      if (filters.year !== 'all' && String(r.academic_year) !== filters.year) return false
      if (filters.term !== 'all' && String(r.semester) !== filters.term) return false
      if (filters.sec !== 'all' && r.sec !== filters.sec) return false
      if (filters.level !== 'all' && String(r.year_level) !== filters.level) return false
      if (!q) return true
      return `${r.title} ${r.file_name ?? ''}`.toLowerCase().includes(q)
    })
  }, [resources, filters, query])

  const hasActiveFilter = query.trim() !== '' || Object.keys(filters).some((k) => filters[k] !== 'all')
  const setFilter = (name) => (e) => setFilters((f) => ({ ...f, [name]: e.target.value }))
  const clearFilters = () => {
    setQuery('')
    setFilters(DEFAULT_FILTERS)
  }

  /* =====================================================================
   * Render
   * ===================================================================== */
  return (
    <div className="se-rc relative mx-auto w-full max-w-[1100px] pb-12">
      {/*
        Design tokens — ผูกกับธีมเดิมของโปรเจกต์ (--color-se-*)
        เวอร์ชัน Dark Mode: ทำเพียง override ตัวแปรในบล็อก :root[data-theme='dark'] / .dark ด้านล่าง
        (Toast, Modal, Chip, Input ใช้ตัวแปรชุดนี้ทั้งหมด จึงเปลี่ยนตามธีมเอง)
      */}
      <style>{`
        .se-rc {
          --rc-bg: var(--color-se-background, #f5f5f7);
          --rc-card: var(--color-se-surface, #ffffff);
          --rc-border: var(--color-se-border, rgba(0,0,0,0.12));
          --rc-text: var(--color-se-text-main, #1d1d1f);
          --rc-muted: var(--color-se-text-muted, #6e6e73);
          --rc-primary: var(--color-se-primary, #0071e3);
          --rc-primary-hover: var(--color-se-primary-hover, #0077ed);

          --rc-subtle: color-mix(in srgb, var(--rc-text) 6%, transparent);
          --rc-subtle-hover: color-mix(in srgb, var(--rc-text) 11%, transparent);
          --rc-border-strong: color-mix(in srgb, var(--rc-text) 22%, transparent);
          --rc-primary-soft: color-mix(in srgb, var(--rc-primary) 14%, transparent);

          --rc-danger: #d70015;
          --rc-danger-solid: #ff3b30;
          --rc-danger-soft: rgba(255,59,48,0.12);
          --rc-success: #1f8a3b;
          --rc-success-soft: rgba(52,199,89,0.16);
          --rc-warning: #b25000;
          --rc-warning-soft: rgba(255,149,0,0.16);

          --rc-overlay: rgba(0,0,0,0.38);
          --rc-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05);
          --rc-shadow-hover: 0 1px 2px rgba(0,0,0,0.04), 0 14px 36px rgba(0,0,0,0.09);
          --rc-shadow-lg: 0 24px 80px rgba(0,0,0,0.20);
          color: var(--rc-text);
        }
        :root[data-theme='dark'] .se-rc,
        .dark .se-rc {
          color-scheme: dark;
          --rc-danger: #ff6961;
          --rc-danger-solid: #ff453a;
          --rc-danger-soft: rgba(255,69,58,0.18);
          --rc-success: #30d158;
          --rc-success-soft: rgba(48,209,88,0.18);
          --rc-warning: #ff9f0a;
          --rc-warning-soft: rgba(255,159,10,0.18);
          --rc-overlay: rgba(0,0,0,0.6);
          --rc-shadow: 0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.25);
          --rc-shadow-hover: 0 1px 2px rgba(0,0,0,0.3), 0 14px 36px rgba(0,0,0,0.4);
          --rc-shadow-lg: 0 24px 80px rgba(0,0,0,0.6);
        }

        @keyframes rc-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes rc-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes rc-pop  { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: none; } }
        @keyframes rc-pulse { 50% { opacity: .5; } }
        .rc-rise { animation: rc-rise .6s cubic-bezier(.28,.11,.32,1) both; }

        .rc-muted { color: var(--rc-muted); }

        .rc-card {
          background: var(--rc-card);
          border: 1px solid var(--rc-border);
          border-radius: 24px;
          box-shadow: var(--rc-shadow);
        }
        .rc-card-hover { transition: box-shadow .35s; }
        .rc-card-hover:hover { box-shadow: var(--rc-shadow-hover); }

        .rc-tile {
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          width: 48px; height: 48px; border-radius: 15px;
          background: var(--rc-primary-soft); color: var(--rc-primary);
        }

        .rc-input {
          width: 100%; height: 44px; padding: 0 14px; border-radius: 12px;
          border: 1px solid var(--rc-border); background: var(--rc-bg); color: var(--rc-text);
          font-size: 15px; outline: none; transition: border-color .2s, box-shadow .2s, background .2s;
        }
        .rc-input::placeholder { color: var(--rc-muted); opacity: .7; }
        .rc-input:focus { border-color: var(--rc-primary); background: var(--rc-card); box-shadow: 0 0 0 4px var(--rc-primary-soft); }
        .rc-input[aria-invalid='true'] { border-color: var(--rc-danger-solid); }
        .rc-input[aria-invalid='true']:focus { box-shadow: 0 0 0 4px var(--rc-danger-soft); }

        .rc-select-wrap { position: relative; width: 100%; }
        .rc-select { appearance: none; -webkit-appearance: none; padding-right: 36px; cursor: pointer; }
        .rc-select-chevron { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--rc-muted); display: flex; }
        .rc-pill { height: 40px; border-radius: 999px; font-size: 14px; padding-left: 16px; }

        .rc-label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; }
        .rc-error { margin-top: 6px; font-size: 13px; color: var(--rc-danger); }

        .rc-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          height: 40px; padding: 0 20px; border: 0; border-radius: 999px;
          font-size: 14px; font-weight: 500; cursor: pointer; white-space: nowrap; text-decoration: none;
          transition: background .2s, opacity .2s, transform .1s;
        }
        .rc-btn:active:not(:disabled) { transform: scale(.98); }
        .rc-btn:disabled { opacity: .6; cursor: not-allowed; }
        .rc-btn-primary { background: var(--rc-primary); color: #fff; }
        .rc-btn-primary:hover:not(:disabled) { background: var(--rc-primary-hover); }
        .rc-btn-ghost { background: var(--rc-subtle); color: var(--rc-text); }
        .rc-btn-ghost:hover:not(:disabled) { background: var(--rc-subtle-hover); }
        .rc-btn-soft { background: var(--rc-primary-soft); color: var(--rc-primary); width: 100%; }
        .rc-btn-soft:hover { background: color-mix(in srgb, var(--rc-primary) 22%, transparent); }
        .rc-btn-soft[aria-disabled='true'] { background: var(--rc-subtle); color: var(--rc-muted); cursor: not-allowed; pointer-events: none; }
        .rc-btn-danger { background: var(--rc-danger-solid); color: #fff; }
        .rc-btn-danger:hover:not(:disabled) { filter: brightness(.94); }

        .rc-icon-btn {
          display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
          width: 36px; height: 36px; border: 0; border-radius: 999px; background: transparent;
          color: var(--rc-muted); cursor: pointer; transition: background .2s, color .2s;
        }
        .rc-icon-btn:hover { background: var(--rc-danger-soft); color: var(--rc-danger); }
        .rc-icon-btn-neutral:hover { background: var(--rc-subtle-hover); color: var(--rc-text); }
        .rc-icon-btn:focus-visible, .rc-btn:focus-visible, .rc-link:focus-visible, .rc-drop:focus-within {
          outline: 2px solid var(--rc-primary); outline-offset: 2px;
        }

        .rc-chip {
          display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px;
          font-size: 12px; font-weight: 500; background: var(--rc-subtle); color: var(--rc-muted);
        }
        .rc-chip-primary { background: var(--rc-primary-soft); color: var(--rc-primary); }

        .rc-link { background: none; border: 0; padding: 0; font-size: 14px; color: var(--rc-primary); cursor: pointer; }
        .rc-link:hover { text-decoration: underline; text-underline-offset: 4px; }

        .rc-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        .rc-drop {
          position: relative; display: flex; align-items: center; gap: 14px; width: 100%;
          padding: 14px 16px; border-radius: 16px; border: 1.5px dashed var(--rc-border-strong);
          background: var(--rc-bg); cursor: pointer; transition: border-color .2s, background .2s;
        }
        .rc-drop:hover, .rc-drop[data-active='true'] { border-color: var(--rc-primary); background: var(--rc-primary-soft); }
        .rc-drop[data-invalid='true'] { border-color: var(--rc-danger-solid); }
        .rc-drop input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
        .rc-file {
          display: flex; align-items: center; gap: 14px; width: 100%; padding: 12px 12px 12px 16px;
          border-radius: 16px; border: 1px solid var(--rc-border); background: var(--rc-bg);
        }

        .rc-backdrop {
          position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center;
          padding: 16px; background: var(--rc-overlay); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          animation: rc-fade .25s both;
        }
        .rc-modal {
          width: 100%; max-height: calc(100vh - 32px); overflow-y: auto;
          background: var(--rc-card); border: 1px solid var(--rc-border); border-radius: 28px;
          box-shadow: var(--rc-shadow-lg); animation: rc-pop .35s cubic-bezier(.28,.11,.32,1) both;
        }

        /* ===== Custom notification (toast) ===== */
        .rc-toasts {
          position: fixed; left: 50%; bottom: 24px; z-index: 70; transform: translateX(-50%);
          display: flex; flex-direction: column; gap: 10px; width: min(400px, calc(100vw - 32px)); pointer-events: none;
        }
        .rc-toast {
          pointer-events: auto; display: flex; align-items: flex-start; gap: 12px; padding: 12px 12px 12px 14px;
          border-radius: 20px; border: 1px solid var(--rc-border);
          background: color-mix(in srgb, var(--rc-card) 82%, transparent);
          backdrop-filter: blur(24px) saturate(180%); -webkit-backdrop-filter: blur(24px) saturate(180%);
          box-shadow: var(--rc-shadow-lg); animation: rc-pop .35s cubic-bezier(.28,.11,.32,1) both;
        }
        .rc-toast-icon {
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          width: 28px; height: 28px; border-radius: 999px;
        }
        .rc-toast-success .rc-toast-icon { background: var(--rc-success-soft); color: var(--rc-success); }
        .rc-toast-error .rc-toast-icon { background: var(--rc-danger-soft); color: var(--rc-danger); }
        .rc-toast-warning .rc-toast-icon { background: var(--rc-warning-soft); color: var(--rc-warning); }

        .rc-skeleton { background: var(--rc-subtle); border-radius: 10px; animation: rc-pulse 1.6s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .rc-rise, .rc-backdrop, .rc-modal, .rc-toast, .rc-skeleton { animation: none; }
          .rc-card-hover { transition: none; }
        }
      `}</style>

      {/* ===== Header ===== */}
      <div className="rc-rise mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[32px] font-semibold leading-[1.15] tracking-[-0.03em] md:text-[40px]">Resource Center</h1>
          <p className="rc-muted mt-1 text-[16px]">คลังเอกสารกลาง แยกตามปีการศึกษา เทอม กลุ่มเรียน และชั้นปี</p>
        </div>
        {canManage && (
          <button type="button" className="rc-btn rc-btn-primary self-start sm:self-auto" onClick={openForm}>
            <PlusIcon /> อัปโหลดเอกสาร
          </button>
        )}
      </div>

      {/* ===== Filters ===== */}
      <div className="rc-rise mb-5" style={{ animationDelay: '60ms' }}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-[300px]">
            <span className="rc-muted pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
              <SearchIcon />
            </span>
            <input
              type="search"
              className="rc-input rc-pill"
              style={{ paddingLeft: 40 }}
              placeholder="ค้นหาชื่อเอกสารหรือชื่อไฟล์"
              aria-label="ค้นหาเอกสาร"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
            <Select className="rc-pill" aria-label="กรองตามปีการศึกษา" value={filters.year} onChange={setFilter('year')}>
              <option value="all">ทุกปีการศึกษา</option>
              {availableYears.map((y) => <option key={y} value={y}>ปีการศึกษา {y}</option>)}
            </Select>
            <Select className="rc-pill" aria-label="กรองตามเทอม" value={filters.term} onChange={setFilter('term')}>
              <option value="all">ทุกเทอม</option>
              <option value="1">เทอม 1</option>
              <option value="2">เทอม 2</option>
              <option value="3">เทอม 3 (ซัมเมอร์)</option>
            </Select>
            <Select className="rc-pill" aria-label="กรองตามชั้นปี" value={filters.level} onChange={setFilter('level')}>
              <option value="all">ทุกชั้นปี</option>
              {YEAR_LEVELS.map((l) => <option key={l} value={l}>ชั้นปี {l}</option>)}
            </Select>
            <Select className="rc-pill" aria-label="กรองตามกลุ่มเรียน" value={filters.sec} onChange={setFilter('sec')}>
              <option value="all">ทุกกลุ่มเรียน</option>
              {SECS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </div>

        {!loading && !loadError && resources.length > 0 && (
          <div className="mt-3 flex items-center justify-between px-1">
            <span className="rc-muted text-[13px] tabular-nums">{filtered.length} เอกสาร</span>
            {hasActiveFilter && (
              <button type="button" className="rc-link text-[13px]" onClick={clearFilters}>ล้างตัวกรอง</button>
            )}
          </div>
        )}
      </div>

      {/* ===== List ===== */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rc-card p-6">
              <div className="rc-skeleton h-12 w-12" style={{ borderRadius: 15 }} />
              <div className="rc-skeleton mt-5 h-5 w-2/3" />
              <div className="rc-skeleton mt-3 h-4 w-1/2" />
              <div className="rc-skeleton mt-6 h-10 w-full" style={{ borderRadius: 999 }} />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="rc-card px-8 py-14 text-center">
          <h3 className="text-[20px] font-semibold tracking-[-0.02em]">โหลดเอกสารไม่สำเร็จ</h3>
          <p className="rc-muted mt-2 text-[15px]">เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง</p>
          <button type="button" className="rc-btn rc-btn-primary mt-6" onClick={() => fetchResources()}>
            ลองใหม่อีกครั้ง
          </button>
        </div>
      ) : resources.length === 0 ? (
        <div className="rc-card flex flex-col items-center px-8 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'var(--rc-primary-soft)', color: 'var(--rc-primary)' }}>
            <FolderIcon />
          </div>
          <h3 className="mt-5 text-[20px] font-semibold tracking-[-0.02em]">ยังไม่มีเอกสารในคลัง</h3>
          <p className="rc-muted mt-2 text-[15px]">
            {canManage ? 'อัปโหลดเอกสารแรกเพื่อแชร์ให้ทุกคนในกลุ่มเรียน' : 'เมื่อมีการอัปโหลดเอกสาร จะแสดงที่นี่'}
          </p>
          {canManage && (
            <button type="button" className="rc-btn rc-btn-primary mt-6" onClick={openForm}>
              <PlusIcon /> อัปโหลดเอกสาร
            </button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rc-card px-8 py-14 text-center">
          <h3 className="text-[20px] font-semibold tracking-[-0.02em]">ไม่พบเอกสารในหมวดหมู่นี้</h3>
          <button type="button" className="rc-link mt-3" onClick={clearFilters}>ล้างตัวกรอง</button>
        </div>
      ) : (
        <ul className="rc-rise grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" style={{ animationDelay: '100ms' }}>
          {filtered.map((item) => {
            const href = safeUrl(item.file_url)
            const author = fullName(item.author) || 'System'

            return (
              <li key={item.id} className="rc-card rc-card-hover flex flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="rc-tile"><FileIcon /></div>
                  {canManage && (
                    <button
                      type="button"
                      className="rc-icon-btn -mr-2 -mt-1"
                      aria-label={`ลบเอกสาร ${item.title}`}
                      title="ลบเอกสาร"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>

                <h3
                  className="rc-clamp-2 mt-4 text-[19px] font-semibold leading-[1.35] tracking-[-0.02em] [overflow-wrap:anywhere]"
                  title={item.title}
                >
                  {item.title}
                </h3>
                <p className="rc-muted mt-1 truncate text-[14px]" title={item.file_name}>{item.file_name}</p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rc-chip rc-chip-primary">{item.sec}</span>
                  <span className="rc-chip">ชั้นปี {item.year_level}</span>
                  <span className="rc-chip">ปี {item.academic_year} เทอม {item.semester}</span>
                </div>

                <div className="flex-grow" />

                <div className="mt-6">
                  <a
                    className="rc-btn rc-btn-soft"
                    href={href || undefined}
                    aria-disabled={!href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <DownloadIcon />
                    {href ? `ดาวน์โหลดไฟล์ (${formatSizeMb(item.file_size_mb)})` : 'ไม่พบไฟล์'}
                  </a>
                  <div className="rc-muted mt-3 flex items-center justify-between gap-3 text-[12px]">
                    <span className="truncate">โดย {author}</span>
                    <time className="whitespace-nowrap" dateTime={item.created_at} title={new Date(item.created_at).toLocaleString('th-TH')}>
                      {formatDate(item.created_at)}
                    </time>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* ===== Upload modal ===== */}
      {showForm && canManage && (
        <div
          className="rc-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeForm()
          }}
        >
          <div className="rc-modal max-w-[640px] p-7 md:p-9" role="dialog" aria-modal="true" aria-labelledby="rc-create-title">
            <h2 id="rc-create-title" className="text-[24px] font-semibold tracking-[-0.025em]">อัปโหลดเอกสารเข้าคลัง</h2>
            <p className="rc-muted mt-1 text-[14px]">ไฟล์ขนาดไม่เกิน {MAX_FILE_MB} MB และจะแจ้งเตือนไปยัง Discord อัตโนมัติ</p>

            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
              <div>
                <label className="rc-label" htmlFor="rc-title">ชื่อเอกสาร / หัวข้อ</label>
                <input
                  id="rc-title"
                  type="text"
                  className="rc-input"
                  placeholder="เช่น สไลด์เรียนบทที่ 1"
                  maxLength={150}
                  value={formData.title}
                  onChange={setField('title')}
                  aria-invalid={Boolean(formErrors.title)}
                  autoFocus
                />
                {formErrors.title && <p className="rc-error">{formErrors.title}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <label className="rc-label" htmlFor="rc-year">ปีการศึกษา</label>
                  <input
                    id="rc-year"
                    type="number"
                    inputMode="numeric"
                    className="rc-input"
                    value={formData.academic_year}
                    onChange={setField('academic_year')}
                    aria-invalid={Boolean(formErrors.academic_year)}
                  />
                  {formErrors.academic_year && <p className="rc-error">{formErrors.academic_year}</p>}
                </div>
                <div>
                  <label className="rc-label" htmlFor="rc-sem">เทอม</label>
                  <Select id="rc-sem" value={formData.semester} onChange={setField('semester')}>
                    {SEMESTERS.map((s) => <option key={s} value={s}>เทอม {s}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="rc-label" htmlFor="rc-level">ชั้นปี</label>
                  <Select id="rc-level" value={formData.year_level} onChange={setField('year_level')}>
                    {YEAR_LEVELS.map((l) => <option key={l} value={l}>ชั้นปี {l}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="rc-label" htmlFor="rc-sec">กลุ่มเรียน (SEC)</label>
                  <Select id="rc-sec" value={formData.sec} onChange={setField('sec')}>
                    {SECS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </div>
              </div>

              <div>
                <span className="rc-label">ไฟล์เอกสาร</span>
                {file ? (
                  <div className="rc-file">
                    <div className="rc-tile" style={{ width: 40, height: 40, borderRadius: 12 }}>
                      <FileIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium">{file.name}</p>
                      <p className="rc-muted text-[12px] tabular-nums">{formatBytes(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      className="rc-icon-btn rc-icon-btn-neutral"
                      aria-label="เอาไฟล์ออก"
                      title="เอาไฟล์ออก"
                      onClick={() => setFile(null)}
                      disabled={submitting}
                    >
                      <XIcon />
                    </button>
                  </div>
                ) : (
                  <label
                    className="rc-drop"
                    data-active={dragging}
                    data-invalid={Boolean(formErrors.file)}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragging(false)
                      pickFile(e.dataTransfer.files?.[0])
                    }}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'var(--rc-primary-soft)', color: 'var(--rc-primary)' }}>
                      <UploadIcon />
                    </span>
                    <span>
                      <span className="block text-[14px] font-medium">เลือกไฟล์ หรือลากมาวางที่นี่</span>
                      <span className="rc-muted block text-[12px]">PDF, DOCX, ZIP, JPG ฯลฯ ไม่เกิน {MAX_FILE_MB} MB</span>
                    </span>
                    <input
                      type="file"
                      onChange={(e) => {
                        pickFile(e.target.files?.[0])
                        e.target.value = '' // ให้เลือกไฟล์เดิมซ้ำได้ หลังถูกปฏิเสธเพราะขนาดเกิน
                      }}
                    />
                  </label>
                )}
                {formErrors.file && <p className="rc-error">{formErrors.file}</p>}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="rc-btn rc-btn-ghost" onClick={closeForm} disabled={submitting}>
                  ยกเลิก
                </button>
                <button type="submit" className="rc-btn rc-btn-primary" disabled={submitting}>
                  {submitting ? 'กำลังอัปโหลด...' : 'อัปโหลดเอกสาร'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Delete confirm modal ===== */}
      {deleteTarget && (
        <div
          className="rc-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeleteTarget(null)
          }}
        >
          <div className="rc-modal max-w-[440px] p-7 text-center md:p-8" role="alertdialog" aria-modal="true" aria-labelledby="rc-del-title">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: 'var(--rc-danger-soft)', color: 'var(--rc-danger)' }}
            >
              <TrashIcon className="h-6 w-6" />
            </div>
            <h2 id="rc-del-title" className="mt-5 text-[22px] font-semibold tracking-[-0.025em]">ลบเอกสารนี้ใช่หรือไม่?</h2>
            <p className="rc-muted mt-2 text-[15px] leading-[1.6]">
              “<span className="font-medium [overflow-wrap:anywhere]" style={{ color: 'var(--rc-text)' }}>{deleteTarget.title}</span>”
              <br />
              ไฟล์จะถูกลบออกจากระบบด้วย การลบไม่สามารถย้อนกลับได้ และจะมีการแจ้งเตือนไปยัง Discord
            </p>
            <div className="mt-7 flex gap-3">
              <button type="button" className="rc-btn rc-btn-ghost flex-1" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                ยกเลิก
              </button>
              <button type="button" className="rc-btn rc-btn-danger flex-1" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'กำลังลบ...' : 'ลบเอกสาร'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Notifications ===== */}
      <div className="rc-toasts" aria-live="polite">
        {toasts.map((t) => {
          const ToastIcon = TOAST_ICON[t.type] || CheckIcon
          return (
            <div key={t.id} className={`rc-toast rc-toast-${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
              <span className="rc-toast-icon"><ToastIcon /></span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[14px] font-semibold leading-[1.4]">{t.message}</p>
                {t.description && (
                  <p className="rc-muted rc-clamp-2 mt-0.5 text-[13px] leading-[1.45] [overflow-wrap:anywhere]">{t.description}</p>
                )}
              </div>
              <button type="button" className="rc-icon-btn rc-icon-btn-neutral" style={{ width: 28, height: 28 }} aria-label="ปิดการแจ้งเตือน" onClick={() => dismissToast(t.id)}>
                <XIcon />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}