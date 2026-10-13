import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { notifyDiscord } from '../../../lib/discord'

/* =====================================================================
 * Config
 * ===================================================================== */
const SECS = ['SEC 1', 'SEC 2']
const SEMESTERS = [1, 2, 3]
const BUCKET = 'sheet-data-files'
const MAX_FILE_MB = 50 // ปรับให้ตรงกับ file size limit ของ bucket ใน Supabase
const TOAST_MS = 4200

const TYPES = [
  { value: 'Document', label: 'เอกสาร' },
  { value: 'Slide', label: 'สไลด์' },
  { value: 'Other Link', label: 'ลิงก์ภายนอก' },
]

// ใครเห็นปุ่มลบ: ตอนนี้ทุกคนที่เข้าหน้านี้ได้ — สิทธิ์จริงถูกบังคับด้วย RLS ใน Supabase
// อยากจำกัด เช่น เฉพาะเจ้าของหรือแอดมิน:
//   return item.author_id === profile?.id || ['admin', 'ceo'].includes(profile?.role?.toLowerCase())
// eslint-disable-next-line no-unused-vars
const canDelete = (item, profile) => true

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

// อนุญาตเฉพาะ http(s) — กัน javascript: / data: ที่อาจถูกกรอกเข้ามาใน external_url
const safeUrl = (u) => {
  try {
    const url = new URL(String(u || '').trim())
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

// แปลง public URL ของ Supabase Storage กลับเป็น path ใน bucket (ใช้ตอนลบไฟล์)
// เช่น .../object/public/sheet-data-files/2569/1/SEC%202/xxx.pdf → 2569/1/SEC 2/xxx.pdf
const storagePathFromUrl = (url) => {
  if (!url) return null
  try {
    const marker = `/${BUCKET}/`
    const { pathname } = new URL(url)
    const i = pathname.indexOf(marker)
    return i === -1 ? null : decodeURIComponent(pathname.slice(i + marker.length))
  } catch {
    return null
  }
}

// กัน @everyone / @here / <@id> จากข้อความผู้ใช้ไม่ให้ ping คนใน Discord
const cleanForDiscord = (s = '') =>
  String(s).replace(/@(everyone|here)/gi, '@\u200b$1').replace(/<@/g, '<@\u200b')

const truncate = (s = '', n = 200) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

// วงเล็บใน URL จะทำให้ markdown link ของ Discord พัง
const discordLink = (url) => url.replace(/\(/g, '%28').replace(/\)/g, '%29')

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
const ExternalIcon = () => <Icon><path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4" /></Icon>
const UploadIcon = ({ className = 'h-5 w-5' }) => <Icon className={className}><path d="M12 16V5M7.5 9.5L12 5l4.5 4.5M5 19h14" /></Icon>
const XIcon = () => <Icon className="h-3.5 w-3.5"><path d="M6 6l12 12M18 6L6 18" /></Icon>
const CheckIcon = () => <Icon className="h-4 w-4"><path d="M5 12.5l4.5 4.5L19 7.5" /></Icon>
const AlertIcon = () => <Icon className="h-4 w-4"><path d="M12 8v5M12 16.5v.01M10.3 4.2L2.8 17.5A2 2 0 004.5 20.5h15a2 2 0 001.7-3L13.7 4.2a2 2 0 00-3.4 0z" /></Icon>
const DocIcon = ({ className = 'h-6 w-6' }) => <Icon className={className}><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5zM14 3v5h5M9 13h6M9 17h4" /></Icon>
const SlideIcon = ({ className = 'h-6 w-6' }) => <Icon className={className}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M12 16v4M8 20h8M8 12l2.5-3 2 2 3-3.5" /></Icon>
const LinkIcon = ({ className = 'h-6 w-6' }) => <Icon className={className}><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" /></Icon>
const FolderIcon = () => <Icon className="h-7 w-7"><path d="M3 7a2 2 0 012-2h4l2 2.5h8a2 2 0 012 2V17a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></Icon>

const TYPE_META = {
  Document: { label: 'เอกสาร', tone: 'doc', Icon: DocIcon },
  Slide: { label: 'สไลด์', tone: 'slide', Icon: SlideIcon },
  'Other Link': { label: 'ลิงก์ภายนอก', tone: 'link', Icon: LinkIcon },
}

const TOAST_ICON = { success: CheckIcon, error: AlertIcon, warning: AlertIcon }

/* =====================================================================
 * Page
 * ===================================================================== */
export default function SheetData() {
  const { profile } = useAuth()

  const [sheets, setSheets] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  // create
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [formData, setFormData] = useState({
    academic_year: new Date().getFullYear() + 543,
    semester: 1,
    sec: 'SEC 2',
    subject_id: '',
    teaching_week: 1,
    document_title: '',
    type: 'Document',
    external_url: '',
  })

  // delete
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // view
  const [query, setQuery] = useState('')
  const [secFilter, setSecFilter] = useState('all')

  // notifications (toast)
  const [toasts, setToasts] = useState([])
  const toastTimers = useRef(new Map())
  const toastSeq = useRef(0)

  /* ---------- Toast ---------- */
  const dismissToast = useCallback((id) => {
    clearTimeout(toastTimers.current.get(id))
    toastTimers.current.delete(id)
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [toastTimers])

  const showToast = useCallback((type, message, description) => {
    const id = ++toastSeq.current
    setToasts((list) => [...list.slice(-2), { id, type, message, description }])
    toastTimers.current.set(id, setTimeout(() => dismissToast(id), TOAST_MS))
  }, [dismissToast, toastSeq, toastTimers])

  useEffect(() => {
    const timers = toastTimers.current
    return () => timers.forEach((t) => clearTimeout(t))
  }, [toastTimers])

  // ส่ง Discord แบบไม่บล็อก UI — ถ้าล้มเหลวให้แจ้งผู้ใช้ว่าข้อมูลถูกบันทึกแล้ว
  const sendDiscord = useCallback(async (message) => {
    const ok = await notifyDiscordSafe(message)
    if (!ok) showToast('warning', 'ส่งแจ้งเตือนไป Discord ไม่สำเร็จ', 'ข้อมูลถูกบันทึกในระบบเรียบร้อยแล้ว')
  }, [showToast])

  /* ---------- Fetch ---------- */
  const fetchData = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      setLoadError(false)

      const [subjectRes, sheetRes] = await Promise.all([
        supabase.from('subjects').select('id, subject_code, subject_name, sec'),
        supabase
          .from('sheet_data')
          .select(`
            id, academic_year, semester, sec, teaching_week, document_title, type, attached_file_url, external_url, created_at,
            subject:subjects(subject_code, subject_name),
            author:profiles(first_name, last_name)
          `)
          .order('teaching_week', { ascending: false })
          .order('created_at', { ascending: false }),
      ])

      if (sheetRes.error) throw sheetRes.error
      if (!subjectRes.error) setSubjects(subjectRes.data || [])
      setSheets(sheetRes.data || [])
    } catch (err) {
      console.error('Error fetching sheet data:', err.message)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    document.title = 'Sheet Data | SE-CONSOLE'
    fetchData()
  }, [fetchData])

  /* ---------- Subjects follow the selected SEC ---------- */
  const subjectsForSec = useMemo(
    () => subjects.filter((s) => s.sec === formData.sec),
    [subjects, formData.sec]
  )

  useEffect(() => {
    if (subjectsForSec.some((s) => s.id === formData.subject_id)) return
    setFormData((f) => ({ ...f, subject_id: subjectsForSec[0]?.id ?? '' }))
  }, [subjectsForSec, formData.subject_id])

  /* ---------- Modal behaviour (ESC / scroll lock) ---------- */
  const modalOpen = showForm || Boolean(deleteTarget)

  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (deleting || submitting) return
      closeForm()
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
  const closeForm = () => {
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
    setFile(f)
    setFormErrors((er) => ({ ...er, file: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    const isLink = formData.type === 'Other Link'
    const externalUrl = safeUrl(formData.external_url)

    const errs = {}
    if (!formData.subject_id) errs.subject_id = 'กรุณาเลือกรายวิชา'
    if (!formData.document_title.trim()) errs.document_title = 'กรุณากรอกชื่อเอกสาร'
    if (!parseInt(formData.academic_year)) errs.academic_year = 'ปีการศึกษาไม่ถูกต้อง'
    if (!(parseInt(formData.teaching_week) >= 1)) errs.teaching_week = 'ต้องเป็นตัวเลขตั้งแต่ 1'
    if (isLink) {
      if (!externalUrl) errs.external_url = 'กรุณากรอก URL ที่ขึ้นต้นด้วย https://'
    } else if (!file) {
      errs.file = 'กรุณาเลือกไฟล์'
    } else if (file.size > MAX_FILE_MB * 1024 * 1024) {
      errs.file = `ไฟล์ต้องมีขนาดไม่เกิน ${MAX_FILE_MB} MB`
    }
    setFormErrors(errs)
    if (Object.keys(errs).length > 0) return

    let uploadedPath = null

    try {
      setSubmitting(true)
      if (!profile?.id) throw new Error('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่')

      // 1. อัปโหลดไฟล์ (ถ้าประเภทไม่ใช่ลิงก์ภายนอก)
      let uploadedFileUrl = null
      if (!isLink && file) {
        const fileExt = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`
        const filePath = `${formData.academic_year}/${formData.semester}/${formData.sec}/${fileName}`

        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file)
        if (uploadError) throw uploadError
        uploadedPath = filePath

        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
        uploadedFileUrl = publicUrl
      }

      // 2. บันทึกข้อมูลลง Supabase
      const { error } = await supabase.from('sheet_data').insert([
        {
          academic_year: parseInt(formData.academic_year),
          semester: parseInt(formData.semester),
          sec: formData.sec,
          subject_id: formData.subject_id,
          teaching_week: parseInt(formData.teaching_week),
          document_title: formData.document_title.trim(),
          type: formData.type,
          attached_file_url: uploadedFileUrl,
          external_url: isLink ? externalUrl : null,
          author_id: profile.id,
        },
      ])
      if (error) throw error

      // 3. ปิดฟอร์ม ล้างค่า แจ้งผล และรีเฟรชรายการ (ไม่ต้องโชว์ skeleton)
      const title = formData.document_title.trim()
      const subject = subjects.find((s) => s.id === formData.subject_id)
      const accessUrl = safeUrl(uploadedFileUrl || externalUrl)
      const snapshot = { ...formData }

      setShowForm(false)
      setFile(null)
      setFormErrors({})
      setFormData((f) => ({ ...f, document_title: '', external_url: '', type: 'Document' }))
      showToast('success', 'บันทึกเอกสารแล้ว', title)
      fetchData({ silent: true })

      // 4. แจ้งเตือน Discord (ผ่าน Edge Function ใน utility เดิม) — ไม่รอผล
      sendDiscord(
        `📄 **อัปโหลดเอกสารประกอบการเรียน**\n` +
          `📚 **วิชา:** ${cleanForDiscord(`${subject?.subject_code ?? ''} ${subject?.subject_name ?? ''}`.trim())}\n` +
          `📅 **สัปดาห์ที่:** ${snapshot.teaching_week}\n` +
          `📝 **หัวข้อ:** ${cleanForDiscord(truncate(title))}\n` +
          `📌 **กลุ่มเรียน:** ${snapshot.sec} (ปีการศึกษา ${snapshot.academic_year} เทอม ${snapshot.semester})\n` +
          `👤 **อัปโหลดโดย:** ${cleanForDiscord(profile?.first_name || 'System')}` +
          (accessUrl ? `\n🔗 **ลิงก์เอกสาร:** [คลิกเพื่อเปิดเอกสาร](${discordLink(accessUrl)})` : '')
      )
    } catch (err) {
      console.error('Submit Error:', err.message)
      // ถ้าไฟล์ถูกอัปโหลดไปแล้วแต่บันทึกข้อมูลไม่สำเร็จ ให้ลบไฟล์ที่ค้างออก (best-effort)
      if (uploadedPath) supabase.storage.from(BUCKET).remove([uploadedPath]).catch(() => {})
      showToast('error', 'บันทึกเอกสารไม่สำเร็จ', err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------- Delete ---------- */
  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return
    const target = deleteTarget

    try {
      setDeleting(true)

      // ใส่ .select() เพื่อตรวจว่าลบได้จริง (RLS ที่บล็อกจะไม่ error แต่คืน 0 แถว)
      const { data, error } = await supabase.from('sheet_data').delete().eq('id', target.id).select('id')
      if (error) throw error
      if (!data || data.length === 0) throw new Error('ไม่มีสิทธิ์ลบเอกสารนี้ หรือเอกสารถูกลบไปแล้ว')

      setSheets((prev) => prev.filter((s) => s.id !== target.id))
      setDeleteTarget(null)
      showToast('success', 'ลบเอกสารแล้ว', target.document_title)

      // ลบไฟล์ที่แนบใน Storage ด้วย (ทำหลังลบแถวสำเร็จ เพื่อไม่ให้เหลือเอกสารที่ไฟล์หาย)
      // ถ้าไม่มี policy ให้ลบ Storage จะไม่ error แต่คืนอาร์เรย์ว่าง จึงตรวจทั้งสองกรณี
      const filePath = storagePathFromUrl(target.attached_file_url)
      if (filePath) {
        const { data: removed, error: removeError } = await supabase.storage.from(BUCKET).remove([filePath])
        if (removeError || !removed || removed.length === 0) {
          console.error('Remove file error:', removeError?.message || 'no file removed', filePath)
          showToast('warning', 'ลบเอกสารแล้ว แต่ลบไฟล์ไม่สำเร็จ', 'ไฟล์ยังค้างอยู่ใน Storage กรุณาตรวจสอบสิทธิ์การลบของ bucket')
        }
      }

      sendDiscord(
        `🗑️ **ลบเอกสาร: ${cleanForDiscord(truncate(target.document_title))}**\n` +
          `📚 **วิชา:** ${cleanForDiscord(`${target.subject?.subject_code ?? ''} ${target.subject?.subject_name ?? ''}`.trim() || '-')}\n` +
          `📅 **สัปดาห์ที่:** ${target.teaching_week}\n` +
          `📌 **กลุ่มเรียน:** ${target.sec} (ปีการศึกษา ${target.academic_year} เทอม ${target.semester})\n` +
          `✍️ **อัปโหลดโดย:** ${cleanForDiscord(fullName(target.author) || 'System')}\n` +
          `👤 **ลบโดย:** ${cleanForDiscord(profile?.first_name || 'System')}`
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
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sheets.filter((s) => {
      if (secFilter !== 'all' && s.sec !== secFilter) return false
      if (!q) return true
      return `${s.document_title} ${s.subject?.subject_code ?? ''} ${s.subject?.subject_name ?? ''}`.toLowerCase().includes(q)
    })
  }, [sheets, query, secFilter])

  const isLinkType = formData.type === 'Other Link'

  /* =====================================================================
   * Render
   * ===================================================================== */
  return (
    <div className="se-sd relative mx-auto w-full max-w-[1100px]">
      {/*
        Design tokens — ผูกกับธีมเดิมของโปรเจกต์ (--color-se-*)
        เวอร์ชัน Dark Mode: ทำเพียง override ตัวแปรในบล็อก :root[data-theme='dark'] / .dark ด้านล่าง
        (Toast, Modal, Chip, Input ใช้ตัวแปรชุดนี้ทั้งหมด จึงเปลี่ยนตามธีมเอง)
      */}
      <style>{`
        .se-sd {
          --sd-bg: var(--color-se-background, #f5f5f7);
          --sd-card: var(--color-se-surface, #ffffff);
          --sd-border: var(--color-se-border, rgba(0,0,0,0.12));
          --sd-text: var(--color-se-text-main, #1d1d1f);
          --sd-muted: var(--color-se-text-muted, #6e6e73);
          --sd-primary: var(--color-se-primary, #0071e3);
          --sd-primary-hover: var(--color-se-primary-hover, #0077ed);

          --sd-subtle: color-mix(in srgb, var(--sd-text) 6%, transparent);
          --sd-subtle-hover: color-mix(in srgb, var(--sd-text) 11%, transparent);
          --sd-border-strong: color-mix(in srgb, var(--sd-text) 22%, transparent);
          --sd-primary-soft: color-mix(in srgb, var(--sd-primary) 14%, transparent);

          --sd-danger: #d70015;
          --sd-danger-solid: #ff3b30;
          --sd-danger-soft: rgba(255,59,48,0.12);
          --sd-success: #1f8a3b;
          --sd-success-soft: rgba(52,199,89,0.16);
          --sd-warning: #b25000;
          --sd-warning-soft: rgba(255,149,0,0.16);

          --sd-tone-doc: var(--sd-primary);
          --sd-tone-slide: #d97100;
          --sd-tone-link: #1f8a3b;

          --sd-overlay: rgba(0,0,0,0.38);
          --sd-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05);
          --sd-shadow-hover: 0 1px 2px rgba(0,0,0,0.04), 0 14px 36px rgba(0,0,0,0.09);
          --sd-shadow-lg: 0 24px 80px rgba(0,0,0,0.20);
          color: var(--sd-text);
        }
        :root[data-theme='dark'] .se-sd,
        .dark .se-sd {
          color-scheme: dark;
          --sd-danger: #ff6961;
          --sd-danger-solid: #ff453a;
          --sd-danger-soft: rgba(255,69,58,0.18);
          --sd-success: #30d158;
          --sd-success-soft: rgba(48,209,88,0.18);
          --sd-warning: #ff9f0a;
          --sd-warning-soft: rgba(255,159,10,0.18);
          --sd-tone-slide: #ff9f0a;
          --sd-tone-link: #30d158;
          --sd-overlay: rgba(0,0,0,0.6);
          --sd-shadow: 0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.25);
          --sd-shadow-hover: 0 1px 2px rgba(0,0,0,0.3), 0 14px 36px rgba(0,0,0,0.4);
          --sd-shadow-lg: 0 24px 80px rgba(0,0,0,0.6);
        }

        @keyframes sd-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sd-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sd-pop  { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: none; } }
        @keyframes sd-pulse { 50% { opacity: .5; } }
        .sd-rise { animation: sd-rise .6s cubic-bezier(.28,.11,.32,1) both; }

        .sd-muted { color: var(--sd-muted); }

        .sd-card {
          background: var(--sd-card);
          border: 1px solid var(--sd-border);
          border-radius: 24px;
          box-shadow: var(--sd-shadow);
        }
        .sd-card-hover { transition: box-shadow .35s; }
        .sd-card-hover:hover { box-shadow: var(--sd-shadow-hover); }

        .sd-tile {
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          width: 48px; height: 48px; border-radius: 15px;
          background: color-mix(in srgb, var(--sd-tone) 14%, transparent); color: var(--sd-tone);
        }
        .sd-tone-doc { --sd-tone: var(--sd-tone-doc); }
        .sd-tone-slide { --sd-tone: var(--sd-tone-slide); }
        .sd-tone-link { --sd-tone: var(--sd-tone-link); }

        .sd-input {
          width: 100%; height: 44px; padding: 0 14px; border-radius: 12px;
          border: 1px solid var(--sd-border); background: var(--sd-bg); color: var(--sd-text);
          font-size: 15px; outline: none; transition: border-color .2s, box-shadow .2s, background .2s;
        }
        .sd-input::placeholder { color: var(--sd-muted); opacity: .7; }
        .sd-input:focus { border-color: var(--sd-primary); background: var(--sd-card); box-shadow: 0 0 0 4px var(--sd-primary-soft); }
        .sd-input[aria-invalid='true'] { border-color: var(--sd-danger-solid); }
        .sd-input[aria-invalid='true']:focus { box-shadow: 0 0 0 4px var(--sd-danger-soft); }

        .sd-label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; }
        .sd-error { margin-top: 6px; font-size: 13px; color: var(--sd-danger); }

        .sd-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          height: 40px; padding: 0 20px; border: 0; border-radius: 999px;
          font-size: 14px; font-weight: 500; cursor: pointer; white-space: nowrap; text-decoration: none;
          transition: background .2s, opacity .2s, transform .1s;
        }
        .sd-btn:active:not(:disabled) { transform: scale(.98); }
        .sd-btn:disabled { opacity: .6; cursor: not-allowed; }
        .sd-btn-primary { background: var(--sd-primary); color: #fff; }
        .sd-btn-primary:hover:not(:disabled) { background: var(--sd-primary-hover); }
        .sd-btn-ghost { background: var(--sd-subtle); color: var(--sd-text); }
        .sd-btn-ghost:hover:not(:disabled) { background: var(--sd-subtle-hover); }
        .sd-btn-soft { background: var(--sd-primary-soft); color: var(--sd-primary); width: 100%; }
        .sd-btn-soft:hover { background: color-mix(in srgb, var(--sd-primary) 22%, transparent); }
        .sd-btn-soft[aria-disabled='true'] { background: var(--sd-subtle); color: var(--sd-muted); cursor: not-allowed; pointer-events: none; }
        .sd-btn-danger { background: var(--sd-danger-solid); color: #fff; }
        .sd-btn-danger:hover:not(:disabled) { filter: brightness(.94); }

        .sd-icon-btn {
          display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
          width: 36px; height: 36px; border: 0; border-radius: 999px; background: transparent;
          color: var(--sd-muted); cursor: pointer; transition: background .2s, color .2s;
        }
        .sd-icon-btn:hover { background: var(--sd-danger-soft); color: var(--sd-danger); }
        .sd-icon-btn-neutral:hover { background: var(--sd-subtle-hover); color: var(--sd-text); }
        .sd-icon-btn:focus-visible, .sd-btn:focus-visible, .sd-seg button:focus-visible, .sd-link:focus-visible, .sd-drop:focus-within {
          outline: 2px solid var(--sd-primary); outline-offset: 2px;
        }

        .sd-chip {
          display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px;
          font-size: 12px; font-weight: 500; background: var(--sd-subtle); color: var(--sd-muted);
        }
        .sd-chip-primary { background: var(--sd-primary-soft); color: var(--sd-primary); }

        .sd-seg { display: inline-flex; padding: 3px; border-radius: 999px; background: var(--sd-subtle); }
        .sd-seg button {
          height: 32px; padding: 0 14px; border: 0; border-radius: 999px; background: transparent;
          font-size: 13px; font-weight: 500; color: var(--sd-muted); cursor: pointer; transition: all .2s;
        }
        .sd-seg button[aria-pressed='true'] { background: var(--sd-card); color: var(--sd-text); box-shadow: 0 1px 3px rgba(0,0,0,0.14); }
        .sd-seg-full { display: flex; width: 100%; }
        .sd-seg-full button { flex: 1; height: 38px; }

        .sd-link { background: none; border: 0; padding: 0; font-size: 14px; color: var(--sd-primary); cursor: pointer; }
        .sd-link:hover { text-decoration: underline; text-underline-offset: 4px; }

        .sd-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        .sd-drop {
          position: relative; display: flex; align-items: center; gap: 14px; width: 100%;
          padding: 14px 16px; border-radius: 16px; border: 1.5px dashed var(--sd-border-strong);
          background: var(--sd-bg); cursor: pointer; transition: border-color .2s, background .2s;
        }
        .sd-drop:hover, .sd-drop[data-active='true'] { border-color: var(--sd-primary); background: var(--sd-primary-soft); }
        .sd-drop[data-invalid='true'] { border-color: var(--sd-danger-solid); }
        .sd-drop input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
        .sd-file {
          display: flex; align-items: center; gap: 14px; width: 100%; padding: 12px 12px 12px 16px;
          border-radius: 16px; border: 1px solid var(--sd-border); background: var(--sd-bg);
        }

        .sd-backdrop {
          position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center;
          padding: 16px; background: var(--sd-overlay); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          animation: sd-fade .25s both;
        }
        .sd-modal {
          width: 100%; max-height: calc(100vh - 32px); overflow-y: auto;
          background: var(--sd-card); border: 1px solid var(--sd-border); border-radius: 28px;
          box-shadow: var(--sd-shadow-lg); animation: sd-pop .35s cubic-bezier(.28,.11,.32,1) both;
        }

        /* ===== Custom notification (toast) ===== */
        .sd-toasts {
          position: fixed; left: 50%; bottom: 24px; z-index: 70; transform: translateX(-50%);
          display: flex; flex-direction: column; gap: 10px; width: min(400px, calc(100vw - 32px)); pointer-events: none;
        }
        .sd-toast {
          pointer-events: auto; display: flex; align-items: flex-start; gap: 12px; padding: 12px 12px 12px 14px;
          border-radius: 20px; border: 1px solid var(--sd-border);
          background: color-mix(in srgb, var(--sd-card) 82%, transparent);
          backdrop-filter: blur(24px) saturate(180%); -webkit-backdrop-filter: blur(24px) saturate(180%);
          box-shadow: var(--sd-shadow-lg); animation: sd-pop .35s cubic-bezier(.28,.11,.32,1) both;
        }
        .sd-toast-icon {
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          width: 28px; height: 28px; border-radius: 999px;
        }
        .sd-toast-success .sd-toast-icon { background: var(--sd-success-soft); color: var(--sd-success); }
        .sd-toast-error .sd-toast-icon { background: var(--sd-danger-soft); color: var(--sd-danger); }
        .sd-toast-warning .sd-toast-icon { background: var(--sd-warning-soft); color: var(--sd-warning); }

        .sd-skeleton { background: var(--sd-subtle); border-radius: 10px; animation: sd-pulse 1.6s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .sd-rise, .sd-backdrop, .sd-modal, .sd-toast, .sd-skeleton { animation: none; }
          .sd-card-hover { transition: none; }
        }
      `}</style>

      {/* ===== Header ===== */}
      <div className="sd-rise mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[32px] font-semibold leading-[1.15] tracking-[-0.03em] md:text-[40px]">Sheet Data</h1>
          <p className="sd-muted mt-1 text-[16px]">เอกสารประกอบการเรียนรายวิชา</p>
        </div>
        <button type="button" className="sd-btn sd-btn-primary self-start sm:self-auto" onClick={() => setShowForm(true)}>
          <PlusIcon /> เพิ่มเอกสาร
        </button>
      </div>

      {/* ===== Toolbar ===== */}
      <div className="sd-rise mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between" style={{ animationDelay: '60ms' }}>
        <div className="relative w-full md:max-w-[360px]">
          <span className="sd-muted pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
            <SearchIcon />
          </span>
          <input
            type="search"
            className="sd-input"
            style={{ paddingLeft: 40, borderRadius: 999 }}
            placeholder="ค้นหาชื่อเอกสารหรือรายวิชา"
            aria-label="ค้นหาเอกสาร"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between gap-4 md:justify-end">
          <div className="sd-seg" role="group" aria-label="กรองตาม SEC">
            {['all', ...SECS].map((s) => (
              <button key={s} type="button" aria-pressed={secFilter === s} onClick={() => setSecFilter(s)}>
                {s === 'all' ? 'ทั้งหมด' : s}
              </button>
            ))}
          </div>
          {!loading && !loadError && (
            <span className="sd-muted whitespace-nowrap text-[13px] tabular-nums">{filtered.length} เอกสาร</span>
          )}
        </div>
      </div>

      {/* ===== List ===== */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="sd-card p-6">
              <div className="sd-skeleton h-12 w-12" style={{ borderRadius: 15 }} />
              <div className="sd-skeleton mt-5 h-5 w-2/3" />
              <div className="sd-skeleton mt-3 h-4 w-1/2" />
              <div className="sd-skeleton mt-6 h-10 w-full" style={{ borderRadius: 999 }} />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="sd-card px-8 py-14 text-center">
          <h3 className="text-[20px] font-semibold tracking-[-0.02em]">โหลดเอกสารไม่สำเร็จ</h3>
          <p className="sd-muted mt-2 text-[15px]">เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง</p>
          <button type="button" className="sd-btn sd-btn-primary mt-6" onClick={() => fetchData()}>
            ลองใหม่อีกครั้ง
          </button>
        </div>
      ) : sheets.length === 0 ? (
        <div className="sd-card flex flex-col items-center px-8 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'var(--sd-primary-soft)', color: 'var(--sd-primary)' }}>
            <FolderIcon />
          </div>
          <h3 className="mt-5 text-[20px] font-semibold tracking-[-0.02em]">ยังไม่มีเอกสารประกอบการเรียน</h3>
          <p className="sd-muted mt-2 text-[15px]">เพิ่มเอกสารแรกเพื่อแชร์ให้เพื่อน ๆ ในกลุ่มเรียน</p>
          <button type="button" className="sd-btn sd-btn-primary mt-6" onClick={() => setShowForm(true)}>
            <PlusIcon /> เพิ่มเอกสาร
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="sd-card px-8 py-14 text-center">
          <h3 className="text-[20px] font-semibold tracking-[-0.02em]">ไม่พบเอกสารที่ตรงกับเงื่อนไข</h3>
          <button
            type="button"
            className="sd-link mt-3"
            onClick={() => {
              setQuery('')
              setSecFilter('all')
            }}
          >
            ล้างตัวกรอง
          </button>
        </div>
      ) : (
        <ul className="sd-rise grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" style={{ animationDelay: '100ms' }}>
          {filtered.map((item) => {
            const meta = TYPE_META[item.type] || TYPE_META.Document
            const TypeIcon = meta.Icon
            const isLink = item.type === 'Other Link'
            const href = safeUrl(isLink ? item.external_url : item.attached_file_url)
            const author = fullName(item.author) || 'System'
            const subjectText = [item.subject?.subject_code, item.subject?.subject_name].filter(Boolean).join(' ')

            return (
              <li key={item.id} className="sd-card sd-card-hover flex flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className={`sd-tile sd-tone-${meta.tone}`} title={meta.label}>
                    <TypeIcon />
                  </div>
                  {canDelete(item, profile) && (
                    <button
                      type="button"
                      className="sd-icon-btn -mr-2 -mt-1"
                      aria-label={`ลบเอกสาร ${item.document_title}`}
                      title="ลบเอกสาร"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>

                <h3
                  className="sd-clamp-2 mt-4 text-[19px] font-semibold leading-[1.35] tracking-[-0.02em] [overflow-wrap:anywhere]"
                  title={item.document_title}
                >
                  {item.document_title}
                </h3>
                <p className="sd-muted mt-1 text-[14px] leading-[1.5] [overflow-wrap:anywhere]">{subjectText || '—'}</p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="sd-chip sd-chip-primary">สัปดาห์ที่ {item.teaching_week}</span>
                  <span className="sd-chip">{item.sec}</span>
                  <span className="sd-chip">ปี {item.academic_year} เทอม {item.semester}</span>
                </div>

                <div className="flex-grow" />

                <div className="mt-6">
                  <a
                    className="sd-btn sd-btn-soft"
                    href={href || undefined}
                    aria-disabled={!href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {isLink ? <ExternalIcon /> : <DownloadIcon />}
                    {!href ? 'ไม่พบไฟล์' : isLink ? 'เปิดลิงก์ภายนอก' : 'ดาวน์โหลดไฟล์'}
                  </a>
                  <div className="sd-muted mt-3 flex items-center justify-between gap-3 text-[12px]">
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

      {/* ===== Create modal ===== */}
      {showForm && (
        <div
          className="sd-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !submitting) closeForm()
          }}
        >
          <div className="sd-modal max-w-[680px] p-7 md:p-9" role="dialog" aria-modal="true" aria-labelledby="sd-create-title">
            <h2 id="sd-create-title" className="text-[24px] font-semibold tracking-[-0.025em]">เพิ่มเอกสารประกอบการเรียน</h2>
            <p className="sd-muted mt-1 text-[14px]">เอกสารจะแจ้งเตือนไปยัง Discord อัตโนมัติ</p>

            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <label className="sd-label" htmlFor="sd-year">ปีการศึกษา</label>
                  <input
                    id="sd-year"
                    type="number"
                    className="sd-input"
                    value={formData.academic_year}
                    onChange={setField('academic_year')}
                    aria-invalid={Boolean(formErrors.academic_year)}
                  />
                  {formErrors.academic_year && <p className="sd-error">{formErrors.academic_year}</p>}
                </div>
                <div>
                  <label className="sd-label" htmlFor="sd-sem">ภาคเรียน</label>
                  <select id="sd-sem" className="sd-input" value={formData.semester} onChange={setField('semester')}>
                    {SEMESTERS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="sd-label" htmlFor="sd-sec">SEC</label>
                  <select id="sd-sec" className="sd-input" value={formData.sec} onChange={setField('sec')}>
                    {SECS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="sd-label" htmlFor="sd-week">สัปดาห์ที่</label>
                  <input
                    id="sd-week"
                    type="number"
                    min="1"
                    className="sd-input"
                    value={formData.teaching_week}
                    onChange={setField('teaching_week')}
                    aria-invalid={Boolean(formErrors.teaching_week)}
                  />
                  {formErrors.teaching_week && <p className="sd-error">{formErrors.teaching_week}</p>}
                </div>
              </div>

              <div>
                <label className="sd-label" htmlFor="sd-subject">รายวิชา</label>
                <select
                  id="sd-subject"
                  className="sd-input"
                  value={formData.subject_id}
                  onChange={setField('subject_id')}
                  aria-invalid={Boolean(formErrors.subject_id)}
                  disabled={subjectsForSec.length === 0}
                >
                  {subjectsForSec.length === 0 && <option value="">ยังไม่มีรายวิชาใน {formData.sec}</option>}
                  {subjectsForSec.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.subject_code} {sub.subject_name}</option>
                  ))}
                </select>
                {subjectsForSec.length === 0 && (
                  <p className="sd-error">ยังไม่มีรายวิชาของ {formData.sec} กรุณาเพิ่มรายวิชาก่อนบันทึกเอกสาร</p>
                )}
                {formErrors.subject_id && <p className="sd-error">{formErrors.subject_id}</p>}
              </div>

              <div>
                <label className="sd-label" htmlFor="sd-title">ชื่อเอกสาร / หัวข้อ</label>
                <input
                  id="sd-title"
                  type="text"
                  className="sd-input"
                  maxLength={150}
                  value={formData.document_title}
                  onChange={setField('document_title')}
                  aria-invalid={Boolean(formErrors.document_title)}
                  autoFocus
                />
                {formErrors.document_title && <p className="sd-error">{formErrors.document_title}</p>}
              </div>

              <div>
                <span className="sd-label">ประเภท</span>
                <div className="sd-seg sd-seg-full" role="group" aria-label="ประเภทเอกสาร">
                  {TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      aria-pressed={formData.type === t.value}
                      onClick={() => {
                        setFormData((f) => ({ ...f, type: t.value }))
                        setFormErrors((er) => ({ ...er, file: undefined, external_url: undefined }))
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {isLinkType ? (
                <div>
                  <label className="sd-label" htmlFor="sd-url">URL ภายนอก</label>
                  <input
                    id="sd-url"
                    type="url"
                    inputMode="url"
                    className="sd-input"
                    placeholder="https://"
                    value={formData.external_url}
                    onChange={setField('external_url')}
                    aria-invalid={Boolean(formErrors.external_url)}
                  />
                  {formErrors.external_url && <p className="sd-error">{formErrors.external_url}</p>}
                </div>
              ) : (
                <div>
                  <span className="sd-label">ไฟล์เอกสาร</span>
                  {file ? (
                    <div className="sd-file">
                      <div className={`sd-tile ${formData.type === 'Slide' ? 'sd-tone-slide' : 'sd-tone-doc'}`} style={{ width: 40, height: 40, borderRadius: 12 }}>
                        {formData.type === 'Slide' ? <SlideIcon className="h-5 w-5" /> : <DocIcon className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium">{file.name}</p>
                        <p className="sd-muted text-[12px] tabular-nums">{formatBytes(file.size)}</p>
                      </div>
                      <button
                        type="button"
                        className="sd-icon-btn sd-icon-btn-neutral"
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
                      className="sd-drop"
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
                      <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'var(--sd-primary-soft)', color: 'var(--sd-primary)' }}>
                        <UploadIcon />
                      </span>
                      <span>
                        <span className="block text-[14px] font-medium">เลือกไฟล์ หรือลากมาวางที่นี่</span>
                        <span className="sd-muted block text-[12px]">ขนาดไม่เกิน {MAX_FILE_MB} MB</span>
                      </span>
                      <input type="file" onChange={(e) => pickFile(e.target.files?.[0])} />
                    </label>
                  )}
                  {formErrors.file && <p className="sd-error">{formErrors.file}</p>}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="sd-btn sd-btn-ghost" onClick={closeForm} disabled={submitting}>
                  ยกเลิก
                </button>
                <button type="submit" className="sd-btn sd-btn-primary" disabled={submitting || subjectsForSec.length === 0}>
                  {submitting ? 'กำลังอัปโหลด...' : 'บันทึกเอกสาร'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Delete confirm modal ===== */}
      {deleteTarget && (
        <div
          className="sd-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeleteTarget(null)
          }}
        >
          <div className="sd-modal max-w-[440px] p-7 text-center md:p-8" role="alertdialog" aria-modal="true" aria-labelledby="sd-del-title">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: 'var(--sd-danger-soft)', color: 'var(--sd-danger)' }}
            >
              <TrashIcon className="h-6 w-6" />
            </div>
            <h2 id="sd-del-title" className="mt-5 text-[22px] font-semibold tracking-[-0.025em]">ลบเอกสารนี้ใช่หรือไม่?</h2>
            <p className="sd-muted mt-2 text-[15px] leading-[1.6]">
              “<span className="font-medium [overflow-wrap:anywhere]" style={{ color: 'var(--sd-text)' }}>{deleteTarget.document_title}</span>”
              <br />
              ไฟล์ที่แนบจะถูกลบด้วย การลบไม่สามารถย้อนกลับได้ และจะมีการแจ้งเตือนไปยัง Discord
            </p>
            <div className="mt-7 flex gap-3">
              <button type="button" className="sd-btn sd-btn-ghost flex-1" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                ยกเลิก
              </button>
              <button type="button" className="sd-btn sd-btn-danger flex-1" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'กำลังลบ...' : 'ลบเอกสาร'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Notifications ===== */}
      <div className="sd-toasts" aria-live="polite">
        {toasts.map((t) => {
          const ToastIcon = TOAST_ICON[t.type] || CheckIcon
          return (
            <div key={t.id} className={`sd-toast sd-toast-${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
              <span className="sd-toast-icon"><ToastIcon /></span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[14px] font-semibold leading-[1.4]">{t.message}</p>
                {t.description && (
                  <p className="sd-muted sd-clamp-2 mt-0.5 text-[13px] leading-[1.45] [overflow-wrap:anywhere]">{t.description}</p>
                )}
              </div>
              <button type="button" className="sd-icon-btn sd-icon-btn-neutral" style={{ width: 28, height: 28 }} aria-label="ปิดการแจ้งเตือน" onClick={() => dismissToast(t.id)}>
                <XIcon />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}