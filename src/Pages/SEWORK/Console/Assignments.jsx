import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { notifyDiscord } from '../../../lib/discord'

/* =====================================================================
 * Config
 * ===================================================================== */
const SECS = ['SEC 1', 'SEC 2']
const BUCKET = 'assignment-attachments'
const MAX_FILE_MB = 20
const LONG_TEXT_CHARS = 260
const TOAST_MS = 3500

// ใครเห็นปุ่มลบ: ตอนนี้ทุกคนที่เข้าหน้านี้ได้ — สิทธิ์จริงถูกบังคับด้วย RLS ใน Supabase
// อยากจำกัด เช่น เฉพาะเจ้าของหรือแอดมิน:
//   return item.author_id === profile?.id || ['admin', 'ceo'].includes(profile?.role?.toLowerCase())
// eslint-disable-next-line no-unused-vars
const canDelete = (item, profile) => true

/* =====================================================================
 * Helpers
 * ===================================================================== */
const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })

const formatBytes = (n) => {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

// สถานะกำหนดส่ง: overdue | soon | active | null (ไม่มีกำหนด)
const deadlineInfo = (iso) => {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  if (diff < 0) return { key: 'overdue', label: 'เลยกำหนดแล้ว', tone: 'danger' }
  const hours = diff / 3600000
  if (hours < 1) return { key: 'soon', label: 'เหลือไม่ถึง 1 ชั่วโมง', tone: 'warn' }
  if (hours < 24) return { key: 'soon', label: `เหลือ ${Math.floor(hours)} ชั่วโมง`, tone: 'warn' }
  const days = Math.ceil(hours / 24)
  return { key: days <= 3 ? 'soon' : 'active', label: `เหลือ ${days} วัน`, tone: days <= 3 ? 'warn' : 'ok' }
}

const fileExt = (url) => {
  const ext = url?.split('?')[0].split('.').pop() || ''
  return ext.length > 0 && ext.length <= 5 ? ext.toUpperCase() : 'FILE'
}

// ดึง path ในบัคเก็ตจาก public URL เพื่อลบไฟล์แนบตอนลบงาน
const storagePathFromUrl = (url) => {
  if (!url) return null
  const marker = `/${BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  try {
    return decodeURIComponent(url.slice(i + marker.length).split('?')[0])
  } catch {
    return null
  }
}

// กัน @everyone / @here / <@id> จากข้อความผู้ใช้ไม่ให้ ping คนใน Discord
const cleanForDiscord = (s = '') =>
  String(s).replace(/@(everyone|here)/gi, '@\u200b$1').replace(/<@/g, '<@\u200b')

// ส่ง Discord ผ่าน utility เดิม (→ Edge Function) — ล้มเหลวแล้วต้องไม่กระทบผู้ใช้
const notifyDiscordSafe = async (message) => {
  try {
    await notifyDiscord(message)
  } catch (err) {
    console.error('Discord notify failed:', err?.message || err)
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
const TrashPath = () => <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" />
const TrashIcon = () => <Icon><TrashPath /></Icon>
const SearchIcon = () => <Icon><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Icon>
const ClipIcon = () => <Icon><path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></Icon>
const UploadIcon = () => <Icon className="h-6 w-6"><path d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></Icon>
const XIcon = () => <Icon><path d="M6 6l12 12M18 6L6 18" /></Icon>
const ClipboardIcon = () => (
  <Icon className="h-7 w-7"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6M9 12h6M9 16h4" /></Icon>
)

/* =====================================================================
 * Page
 * ===================================================================== */
export default function Assignments() {
  const { profile } = useAuth()

  const [assignments, setAssignments] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  // create
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [file, setFile] = useState(null)
  const [fileKey, setFileKey] = useState(0) // รีเซ็ต <input type="file">
  const [dragOver, setDragOver] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    academic_year: new Date().getFullYear() + 543,
    semester: 1,
    sec: 'SEC 2',
    subject_id: '',
  })

  // delete
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // view
  const [query, setQuery] = useState('')
  const [secFilter, setSecFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all') // all | active | overdue
  const [expanded, setExpanded] = useState(() => new Set())
  const [toast, setToast] = useState(null)

  const titleRef = useRef(null)
  const toastTimer = useRef(null)

  /* ---------- Toast ---------- */
  const showToast = useCallback((type, message) => {
    clearTimeout(toastTimer.current)
    setToast({ type, message })
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  /* ---------- Fetch ---------- */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(false)

      const [subjectRes, assignmentRes] = await Promise.all([
        supabase.from('subjects').select('id, subject_code, subject_name, sec'),
        supabase
          .from('assignments')
          .select(`
            id, title, description, deadline, attachment_url, academic_year, semester, sec, created_at, author_id,
            subject:subjects(subject_code, subject_name),
            author:profiles(first_name)
          `)
          .order('created_at', { ascending: false }),
      ])

      if (subjectRes.error) console.error('Error fetching subjects:', subjectRes.error.message)
      if (assignmentRes.error) throw assignmentRes.error

      const subjectData = subjectRes.data || []
      setSubjects(subjectData)
      setAssignments(assignmentRes.data || [])

      // ตั้งรายวิชาเริ่มต้นให้ตรงกับ SEC ที่เลือก (ไม่ทับค่าที่ผู้ใช้เลือกไว้แล้ว)
      setFormData((prev) => {
        const valid = subjectData.some((s) => s.id === prev.subject_id && s.sec === prev.sec)
        if (valid) return prev
        const first = subjectData.find((s) => s.sec === prev.sec)
        return { ...prev, subject_id: first?.id || '' }
      })
    } catch (err) {
      console.error('Error fetching data:', err.message)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    document.title = 'Assignments | SE-CONSOLE'
    fetchData()
  }, [fetchData])

  /* ---------- Modal behaviour (ESC / scroll lock / focus) ---------- */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, deleting, submitting])

  useEffect(() => {
    if (showForm) titleRef.current?.focus()
  }, [showForm])

  /* ---------- Form helpers ---------- */
  const subjectsForSec = useMemo(() => subjects.filter((s) => s.sec === formData.sec), [subjects, formData.sec])

  const setField = (name) => (e) => {
    setFormData((f) => ({ ...f, [name]: e.target.value }))
    if (formErrors[name]) setFormErrors((er) => ({ ...er, [name]: undefined }))
  }

  // เปลี่ยน SEC → เลือกวิชาแรกของ SEC นั้นให้อัตโนมัติ
  const setSec = (e) => {
    const sec = e.target.value
    const first = subjects.find((s) => s.sec === sec)
    setFormData((f) => ({ ...f, sec, subject_id: first?.id || '' }))
    setFormErrors((er) => ({ ...er, subject_id: undefined }))
  }

  const pickFile = (f) => {
    if (!f) return
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setFormErrors((er) => ({ ...er, file: `ไฟล์ใหญ่เกินไป (สูงสุด ${MAX_FILE_MB} MB)` }))
      return
    }
    setFile(f)
    setFormErrors((er) => ({ ...er, file: undefined }))
  }

  const removeFile = () => {
    setFile(null)
    setFileKey((k) => k + 1)
    setFormErrors((er) => ({ ...er, file: undefined }))
  }

  function closeForm() {
    setShowForm(false)
    setFile(null)
    setFileKey((k) => k + 1)
    setFormErrors({})
    setDragOver(false)
  }

  /* ---------- Create ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    const errs = {}
    if (!formData.title.trim()) errs.title = 'กรุณากรอกหัวข้องาน'
    if (!formData.subject_id) errs.subject_id = 'กรุณาเลือกรายวิชา'
    if (!parseInt(formData.academic_year)) errs.academic_year = 'ปีการศึกษาไม่ถูกต้อง'
    setFormErrors(errs)
    if (Object.keys(errs).length > 0) return

    let uploadedPath = null

    try {
      setSubmitting(true)
      if (!profile?.id) throw new Error('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่')

      let uploadedAttachmentUrl = null

      // 1. อัปโหลดไฟล์ (ถ้ามี)
      if (file) {
        const ext = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${ext}`
        const filePath = `${formData.academic_year}/${formData.semester}/${formData.sec}/${fileName}`

        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file)
        if (uploadError) throw uploadError
        uploadedPath = filePath

        const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
        uploadedAttachmentUrl = data.publicUrl
      }

      const selectedSubject = subjects.find((s) => s.id === formData.subject_id)

      // 2. บันทึกงานลง Database
      const { error } = await supabase
        .from('assignments')
        .insert([
          {
            title: formData.title.trim(),
            description: formData.description.trim(),
            deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
            attachment_url: uploadedAttachmentUrl,
            academic_year: parseInt(formData.academic_year),
            semester: parseInt(formData.semester),
            sec: formData.sec,
            subject_id: formData.subject_id,
            author_id: profile.id,
          },
        ])

      if (error) throw error

      // 3. ปิดฟอร์ม ล้างค่า แจ้งผล และโหลดข้อมูลใหม่
      const submitted = { ...formData }
      closeForm()
      setFormData((f) => ({ ...f, title: '', description: '', deadline: '' }))
      showToast('success', 'สั่งงานเรียบร้อยแล้ว')
      fetchData()

      // 4. แจ้งเตือน Discord (ผ่าน Edge Function ใน utility เดิม)
      const attachmentText = uploadedAttachmentUrl ? `\n📎 **ไฟล์แนบ:** [คลิกเพื่อดูไฟล์](${uploadedAttachmentUrl})` : ''
      await notifyDiscordSafe(
        `📝 **สั่งงานใหม่: ${cleanForDiscord(submitted.title.trim())}**\n` +
          `📚 **วิชา:** ${cleanForDiscord(selectedSubject?.subject_code || '')} ${cleanForDiscord(selectedSubject?.subject_name || '')}\n` +
          `📅 **กำหนดส่ง:** ${submitted.deadline ? new Date(submitted.deadline).toLocaleString('th-TH') : 'ไม่มีกำหนด'}\n` +
          `📌 **กลุ่มเรียน:** ${submitted.sec}${attachmentText}\n` +
          `👤 **ผู้สั่ง:** ${cleanForDiscord(profile?.first_name || 'System')}`
      )
    } catch (err) {
      console.error('Submit Error:', err.message)
      // บันทึกไม่สำเร็จ → ลบไฟล์ที่เพิ่งอัปโหลดทิ้ง ไม่ให้ค้างในบัคเก็ต
      if (uploadedPath) {
        supabase.storage.from(BUCKET).remove([uploadedPath]).catch(() => {})
      }
      showToast('error', `เกิดข้อผิดพลาด: ${err.message}`)
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

      // 1. ลบจาก Supabase — ใส่ .select() เพื่อตรวจว่าลบได้จริง (RLS ที่บล็อกจะไม่ error แต่คืน 0 แถว)
      const { data, error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', target.id)
        .select('id')

      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('ไม่มีสิทธิ์ลบงานนี้ หรืองานถูกลบไปแล้ว')
      }

      // 2. อัปเดตหน้าจอทันที
      setAssignments((prev) => prev.filter((a) => a.id !== target.id))
      setDeleteTarget(null)
      showToast('success', 'ลบงานเรียบร้อยแล้ว')

      // 3. ลบไฟล์แนบออกจาก Storage (best-effort: ไม่สำเร็จก็ไม่กระทบการลบงาน)
      const path = storagePathFromUrl(target.attachment_url)
      let attachmentRemoved = false
      if (path) {
        const { error: rmError } = await supabase.storage.from(BUCKET).remove([path])
        attachmentRemoved = !rmError
        if (rmError) console.error('Remove attachment failed:', rmError.message)
      }

      // 4. แจ้งเตือน Discord
      await notifyDiscordSafe(
        `🗑️ **ลบงาน: ${cleanForDiscord(target.title)}**\n` +
          `📚 **วิชา:** ${cleanForDiscord(target.subject?.subject_code || '')} ${cleanForDiscord(target.subject?.subject_name || '')}\n` +
          `📅 **กำหนดส่งเดิม:** ${target.deadline ? new Date(target.deadline).toLocaleString('th-TH') : 'ไม่มีกำหนด'}\n` +
          `📌 **กลุ่มเรียน:** ${target.sec} (ปีการศึกษา ${target.academic_year} เทอม ${target.semester})\n` +
          `✍️ **ผู้สั่งเดิม:** ${cleanForDiscord(target.author?.first_name || 'System')}\n` +
          `👤 **ลบโดย:** ${cleanForDiscord(profile?.first_name || 'System')}` +
          (attachmentRemoved ? '\n📎 ลบไฟล์แนบแล้ว' : '')
      )
    } catch (err) {
      console.error('Delete Assignment Error:', err.message)
      showToast('error', err.message || 'เกิดข้อผิดพลาดในการลบงาน')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  /* ---------- Derived ---------- */
  const counts = useMemo(() => {
    const overdue = assignments.filter((a) => deadlineInfo(a.deadline)?.key === 'overdue').length
    return { all: assignments.length, overdue, active: assignments.length - overdue }
  }, [assignments])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return assignments.filter((a) => {
      if (secFilter !== 'all' && a.sec !== secFilter) return false
      const overdue = deadlineInfo(a.deadline)?.key === 'overdue'
      if (statusFilter === 'active' && overdue) return false
      if (statusFilter === 'overdue' && !overdue) return false
      if (!q) return true
      const hay = `${a.title} ${a.description || ''} ${a.subject?.subject_code || ''} ${a.subject?.subject_name || ''}`
      return hay.toLowerCase().includes(q)
    })
  }, [assignments, query, secFilter, statusFilter])

  const toggleExpand = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  /* =====================================================================
   * Render
   * ===================================================================== */
  return (
    <div className="se-ann relative mx-auto w-full max-w-[1100px]">
      {/*
        Design tokens — ผูกกับธีมเดิมของโปรเจกต์ (--color-se-*)
        เวอร์ชัน Dark Mode: ทำเพียง override ตัวแปรในบล็อก :root[data-theme='dark'] / .dark ด้านล่าง
        บล็อก CSS นี้ใช้ร่วมกับหน้า Announcements ได้ — ย้ายไปไฟล์ CSS กลางได้เลยเมื่อพร้อม
      */}
      <style>{`
        .se-ann {
          --ann-bg: var(--color-se-background, #f5f5f7);
          --ann-card: var(--color-se-surface, #ffffff);
          --ann-border: var(--color-se-border, rgba(0,0,0,0.12));
          --ann-text: var(--color-se-text-main, #1d1d1f);
          --ann-muted: var(--color-se-text-muted, #6e6e73);
          --ann-primary: var(--color-se-primary, #0071e3);
          --ann-primary-hover: var(--color-se-primary-hover, #0077ed);

          --ann-subtle: color-mix(in srgb, var(--ann-text) 6%, transparent);
          --ann-subtle-hover: color-mix(in srgb, var(--ann-text) 11%, transparent);
          --ann-primary-soft: color-mix(in srgb, var(--ann-primary) 14%, transparent);

          --ann-danger: #d70015;
          --ann-danger-solid: #ff3b30;
          --ann-danger-soft: rgba(255,59,48,0.12);
          --ann-warn: #b25f00;
          --ann-warn-soft: rgba(255,159,10,0.16);
          --ann-ok: #248a3d;
          --ann-ok-soft: rgba(52,199,89,0.15);
          --ann-success-dot: #34c759;

          --ann-overlay: rgba(0,0,0,0.38);
          --ann-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05);
          --ann-shadow-hover: 0 1px 2px rgba(0,0,0,0.04), 0 16px 40px rgba(0,0,0,0.09);
          --ann-shadow-lg: 0 24px 80px rgba(0,0,0,0.20);
          color: var(--ann-text);
        }
        :root[data-theme='dark'] .se-ann,
        .dark .se-ann {
          color-scheme: dark;
          --ann-danger: #ff6961;
          --ann-danger-solid: #ff453a;
          --ann-danger-soft: rgba(255,69,58,0.18);
          --ann-warn: #ffb340;
          --ann-warn-soft: rgba(255,159,10,0.2);
          --ann-ok: #30d158;
          --ann-ok-soft: rgba(48,209,88,0.18);
          --ann-success-dot: #30d158;
          --ann-overlay: rgba(0,0,0,0.6);
          --ann-shadow: 0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.25);
          --ann-shadow-hover: 0 1px 2px rgba(0,0,0,0.3), 0 16px 40px rgba(0,0,0,0.4);
          --ann-shadow-lg: 0 24px 80px rgba(0,0,0,0.6);
        }

        @keyframes ann-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ann-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ann-pop  { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: none; } }
        @keyframes ann-pulse { 50% { opacity: .5; } }
        .ann-rise { animation: ann-rise .6s cubic-bezier(.28,.11,.32,1) both; }

        .ann-muted { color: var(--ann-muted); }

        .ann-card {
          background: var(--ann-card);
          border: 1px solid var(--ann-border);
          border-radius: 24px;
          box-shadow: var(--ann-shadow);
        }
        .ann-card-hover { transition: box-shadow .4s, transform .4s; }
        .ann-card-hover:hover { box-shadow: var(--ann-shadow-hover); transform: translateY(-2px); }

        .ann-input {
          width: 100%; height: 44px; padding: 0 14px; border-radius: 12px;
          border: 1px solid var(--ann-border); background: var(--ann-bg); color: var(--ann-text);
          font-size: 15px; outline: none; transition: border-color .2s, box-shadow .2s, background .2s;
        }
        textarea.ann-input { height: auto; padding: 12px 14px; line-height: 1.6; resize: vertical; }
        .ann-input::placeholder { color: var(--ann-muted); opacity: .7; }
        .ann-input:focus { border-color: var(--ann-primary); background: var(--ann-card); box-shadow: 0 0 0 4px var(--ann-primary-soft); }
        .ann-input:disabled { opacity: .6; cursor: not-allowed; }
        .ann-input[aria-invalid='true'] { border-color: var(--ann-danger-solid); }
        .ann-input[aria-invalid='true']:focus { box-shadow: 0 0 0 4px var(--ann-danger-soft); }

        .ann-label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; }
        .ann-error { margin-top: 6px; font-size: 13px; color: var(--ann-danger); }

        .ann-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          height: 40px; padding: 0 20px; border: 0; border-radius: 999px;
          font-size: 14px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background .2s, opacity .2s, transform .1s;
        }
        .ann-btn:active:not(:disabled) { transform: scale(.98); }
        .ann-btn:disabled { opacity: .6; cursor: not-allowed; }
        .ann-btn-primary { background: var(--ann-primary); color: #fff; }
        .ann-btn-primary:hover:not(:disabled) { background: var(--ann-primary-hover); }
        .ann-btn-ghost { background: var(--ann-subtle); color: var(--ann-text); }
        .ann-btn-ghost:hover:not(:disabled) { background: var(--ann-subtle-hover); }
        .ann-btn-danger { background: var(--ann-danger-solid); color: #fff; }
        .ann-btn-danger:hover:not(:disabled) { filter: brightness(.94); }

        .ann-icon-btn {
          display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
          width: 36px; height: 36px; border: 0; border-radius: 999px; background: transparent;
          color: var(--ann-muted); cursor: pointer; transition: background .2s, color .2s;
        }
        .ann-icon-btn:hover { background: var(--ann-danger-soft); color: var(--ann-danger); }
        .ann-icon-btn:focus-visible, .ann-btn:focus-visible, .ann-seg button:focus-visible, .ann-link:focus-visible, .ann-attach:focus-visible {
          outline: 2px solid var(--ann-primary); outline-offset: 2px;
        }

        .ann-chip {
          display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px;
          font-size: 12px; font-weight: 500; background: var(--ann-subtle); color: var(--ann-muted);
        }
        .ann-chip-primary { background: var(--ann-primary-soft); color: var(--ann-primary); }
        .ann-chip-danger { background: var(--ann-danger-soft); color: var(--ann-danger); }
        .ann-chip-warn { background: var(--ann-warn-soft); color: var(--ann-warn); }
        .ann-chip-ok { background: var(--ann-ok-soft); color: var(--ann-ok); }

        .ann-seg { display: inline-flex; padding: 3px; border-radius: 999px; background: var(--ann-subtle); }
        .ann-seg button {
          height: 32px; padding: 0 14px; border: 0; border-radius: 999px; background: transparent;
          font-size: 13px; font-weight: 500; color: var(--ann-muted); cursor: pointer; transition: all .2s; white-space: nowrap;
        }
        .ann-seg button[aria-pressed='true'] { background: var(--ann-card); color: var(--ann-text); box-shadow: 0 1px 3px rgba(0,0,0,0.14); }

        .ann-link { background: none; border: 0; padding: 0; font-size: 14px; color: var(--ann-primary); cursor: pointer; }
        .ann-link:hover { text-decoration: underline; text-underline-offset: 4px; }

        .ann-attach {
          display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px 7px 12px; border-radius: 12px;
          background: var(--ann-primary-soft); color: var(--ann-primary); font-size: 14px; font-weight: 500;
          text-decoration: none; transition: filter .2s;
        }
        .ann-attach:hover { filter: brightness(.95); }
        .ann-ext { padding: 1px 6px; border-radius: 6px; font-size: 10px; font-weight: 700; letter-spacing: .04em; background: var(--ann-primary); color: #fff; }

        .ann-drop {
          display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 22px 16px; text-align: center;
          border: 1.5px dashed var(--ann-border); border-radius: 16px; background: var(--ann-bg);
          color: var(--ann-muted); cursor: pointer; transition: border-color .2s, background .2s, color .2s;
        }
        .ann-drop:hover, .ann-drop.is-over { border-color: var(--ann-primary); background: var(--ann-primary-soft); color: var(--ann-primary); }
        .ann-drop:focus-within { outline: 2px solid var(--ann-primary); outline-offset: 2px; }
        .ann-file {
          display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 14px;
          background: var(--ann-subtle); font-size: 14px;
        }

        .ann-banner { padding: 12px 14px; border-radius: 14px; font-size: 14px; background: var(--ann-warn-soft); color: var(--ann-warn); }

        .ann-clamp { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }

        .ann-backdrop {
          position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center;
          padding: 16px; background: var(--ann-overlay); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          animation: ann-fade .25s both;
        }
        .ann-modal {
          width: 100%; max-height: calc(100vh - 32px); overflow-y: auto;
          background: var(--ann-card); border: 1px solid var(--ann-border); border-radius: 28px;
          box-shadow: var(--ann-shadow-lg); animation: ann-pop .35s cubic-bezier(.28,.11,.32,1) both;
        }

        .ann-toast {
          position: fixed; left: 50%; bottom: 24px; z-index: 60; transform: translateX(-50%);
          display: flex; align-items: center; gap: 10px; padding: 12px 20px; border-radius: 999px;
          background: var(--ann-text); color: var(--ann-card); font-size: 14px; font-weight: 500;
          box-shadow: var(--ann-shadow-lg); animation: ann-pop .35s cubic-bezier(.28,.11,.32,1) both;
          max-width: calc(100vw - 32px);
        }

        .ann-skeleton { background: var(--ann-subtle); border-radius: 10px; animation: ann-pulse 1.6s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .ann-rise, .ann-backdrop, .ann-modal, .ann-toast { animation: none; }
          .ann-card-hover, .ann-card-hover:hover { transition: none; transform: none; }
        }
      `}</style>

      {/* ===== Header ===== */}
      <div className="ann-rise mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[32px] font-semibold leading-[1.15] tracking-[-0.03em] md:text-[40px]">Assignments</h1>
          <p className="ann-muted mt-1 text-[16px]">จัดการงานที่มอบหมาย</p>
        </div>
        <button type="button" className="ann-btn ann-btn-primary self-start sm:self-auto" onClick={() => setShowForm(true)}>
          <PlusIcon /> สั่งงานใหม่
        </button>
      </div>

      {/* ===== Toolbar ===== */}
      <div className="ann-rise mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between" style={{ animationDelay: '60ms' }}>
        <div className="relative w-full lg:max-w-[320px]">
          <span className="ann-muted pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
            <SearchIcon />
          </span>
          <input
            type="search"
            className="ann-input"
            style={{ paddingLeft: 40, borderRadius: 999 }}
            placeholder="ค้นหางานหรือรายวิชา"
            aria-label="ค้นหางานหรือรายวิชา"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="ann-seg" role="group" aria-label="กรองตามสถานะ">
            {[
              ['all', 'ทั้งหมด', counts.all],
              ['active', 'ยังไม่เลยกำหนด', counts.active],
              ['overdue', 'เลยกำหนด', counts.overdue],
            ].map(([key, label, n]) => (
              <button key={key} type="button" aria-pressed={statusFilter === key} onClick={() => setStatusFilter(key)}>
                {label} <span className="tabular-nums opacity-70">{loading ? '' : n}</span>
              </button>
            ))}
          </div>
          <div className="ann-seg" role="group" aria-label="กรองตาม SEC">
            {['all', ...SECS].map((s) => (
              <button key={s} type="button" aria-pressed={secFilter === s} onClick={() => setSecFilter(s)}>
                {s === 'all' ? 'ทุก SEC' : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== List ===== */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="ann-card p-6">
              <div className="ann-skeleton h-5 w-1/3" />
              <div className="ann-skeleton mt-3 h-4 w-1/4" />
              <div className="ann-skeleton mt-5 h-4 w-full" />
              <div className="ann-skeleton mt-2 h-4 w-3/5" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="ann-card px-8 py-14 text-center">
          <h3 className="text-[20px] font-semibold tracking-[-0.02em]">โหลดข้อมูลไม่สำเร็จ</h3>
          <p className="ann-muted mt-2 text-[15px]">เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง</p>
          <button type="button" className="ann-btn ann-btn-primary mt-6" onClick={fetchData}>
            ลองใหม่อีกครั้ง
          </button>
        </div>
      ) : assignments.length === 0 ? (
        <div className="ann-card flex flex-col items-center px-8 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'var(--ann-primary-soft)', color: 'var(--ann-primary)' }}>
            <ClipboardIcon />
          </div>
          <h3 className="mt-5 text-[20px] font-semibold tracking-[-0.02em]">ยังไม่มีงานที่มอบหมาย</h3>
          <p className="ann-muted mt-2 text-[15px]">เริ่มต้นโดยสั่งงานชิ้นแรกให้นักศึกษา</p>
          <button type="button" className="ann-btn ann-btn-primary mt-6" onClick={() => setShowForm(true)}>
            <PlusIcon /> สั่งงานใหม่
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="ann-card px-8 py-14 text-center">
          <h3 className="text-[20px] font-semibold tracking-[-0.02em]">ไม่พบงานที่ตรงกับเงื่อนไข</h3>
          <button
            type="button"
            className="ann-link mt-3"
            onClick={() => {
              setQuery('')
              setSecFilter('all')
              setStatusFilter('all')
            }}
          >
            ล้างตัวกรอง
          </button>
        </div>
      ) : (
        <ul className="space-y-4">
          {filtered.map((item, i) => {
            const info = deadlineInfo(item.deadline)
            const desc = item.description || ''
            const isLong = desc.length > LONG_TEXT_CHARS || desc.split('\n').length > 4
            const open = expanded.has(item.id)

            return (
              <li
                key={item.id}
                className="ann-card ann-card-hover ann-rise p-6 md:p-7"
                style={{ animationDelay: `${Math.min(i, 8) * 40 + 100}ms` }}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-[19px] font-semibold leading-[1.35] tracking-[-0.02em] [overflow-wrap:anywhere]">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-[14px] font-medium" style={{ color: 'var(--ann-primary)' }}>
                      {item.subject?.subject_code} {item.subject?.subject_name}
                    </p>
                  </div>

                  <div className="flex flex-shrink-0 items-start gap-2 sm:text-right">
                    {item.deadline ? (
                      <div className="flex flex-col gap-1.5 sm:items-end">
                        <span className="ann-muted text-[11px] font-semibold uppercase tracking-[0.08em]">Deadline</span>
                        <span className="text-[14px] font-medium tabular-nums">{formatDateTime(item.deadline)}</span>
                        {info && <span className={`ann-chip ann-chip-${info.tone}`}>{info.label}</span>}
                      </div>
                    ) : (
                      <span className="ann-chip">ไม่มีกำหนดส่ง</span>
                    )}

                    {canDelete(item, profile) && (
                      <button
                        type="button"
                        className="ann-icon-btn"
                        aria-label={`ลบงาน ${item.title}`}
                        title="ลบงาน"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                </div>

                {desc && (
                  <>
                    <p className={`ann-muted mt-4 whitespace-pre-wrap text-[15px] leading-[1.7] [overflow-wrap:anywhere] ${isLong && !open ? 'ann-clamp' : ''}`}>
                      {desc}
                    </p>
                    {isLong && (
                      <button type="button" className="ann-link mt-2" onClick={() => toggleExpand(item.id)}>
                        {open ? 'แสดงน้อยลง' : 'อ่านเพิ่มเติม'}
                      </button>
                    )}
                  </>
                )}

                {item.attachment_url && (
                  <div className="mt-4">
                    <a href={item.attachment_url} target="_blank" rel="noopener noreferrer" className="ann-attach">
                      <ClipIcon />
                      เปิดไฟล์แนบ
                      <span className="ann-ext">{fileExt(item.attachment_url)}</span>
                    </a>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="ann-chip">ปี {item.academic_year} เทอม {item.semester}</span>
                  <span className="ann-chip ann-chip-primary">{item.sec}</span>
                  <span className="ann-muted text-[13px]">ผู้สั่ง: {item.author?.first_name || 'System'}</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* ===== Create modal ===== */}
      {showForm && (
        <div
          className="ann-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !submitting) closeForm()
          }}
        >
          <div className="ann-modal max-w-[680px] p-7 md:p-9" role="dialog" aria-modal="true" aria-labelledby="asg-create-title">
            <h2 id="asg-create-title" className="text-[24px] font-semibold tracking-[-0.025em]">สร้างงานใหม่</h2>
            <p className="ann-muted mt-1 text-[14px]">งานจะแจ้งเตือนไปยัง Discord อัตโนมัติ</p>

            {subjects.length === 0 && (
              <div className="ann-banner mt-5">
                ⚠️ คุณยังไม่มีรายวิชาในระบบ โปรดเพิ่มรายวิชาก่อนเพื่อให้แสดงในตัวเลือก
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="ann-label" htmlFor="asg-year">ปีการศึกษา</label>
                  <input
                    id="asg-year"
                    type="number"
                    className="ann-input"
                    value={formData.academic_year}
                    onChange={setField('academic_year')}
                    aria-invalid={Boolean(formErrors.academic_year)}
                  />
                  {formErrors.academic_year && <p className="ann-error">{formErrors.academic_year}</p>}
                </div>
                <div>
                  <label className="ann-label" htmlFor="asg-sem">ภาคเรียน</label>
                  <select id="asg-sem" className="ann-input" value={formData.semester} onChange={setField('semester')}>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </div>
                <div>
                  <label className="ann-label" htmlFor="asg-sec">SEC</label>
                  <select id="asg-sec" className="ann-input" value={formData.sec} onChange={setSec}>
                    {SECS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="ann-label" htmlFor="asg-subject">รายวิชา</label>
                <select
                  id="asg-subject"
                  className="ann-input"
                  value={formData.subject_id}
                  onChange={setField('subject_id')}
                  disabled={subjectsForSec.length === 0}
                  aria-invalid={Boolean(formErrors.subject_id)}
                >
                  <option value="" disabled>
                    {subjectsForSec.length === 0 ? `ยังไม่มีรายวิชาใน ${formData.sec}` : '-- เลือกรายวิชา --'}
                  </option>
                  {subjectsForSec.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.subject_code} {sub.subject_name}</option>
                  ))}
                </select>
                {formErrors.subject_id && <p className="ann-error">{formErrors.subject_id}</p>}
              </div>

              <div>
                <label className="ann-label" htmlFor="asg-title">หัวข้องาน</label>
                <input
                  id="asg-title"
                  ref={titleRef}
                  type="text"
                  className="ann-input"
                  maxLength={150}
                  value={formData.title}
                  onChange={setField('title')}
                  aria-invalid={Boolean(formErrors.title)}
                />
                {formErrors.title && <p className="ann-error">{formErrors.title}</p>}
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <label className="ann-label" htmlFor="asg-desc">รายละเอียดงาน (ทางเลือก)</label>
                  <span className="ann-muted text-[12px] tabular-nums">{formData.description.length}/2000</span>
                </div>
                <textarea
                  id="asg-desc"
                  rows={4}
                  className="ann-input"
                  maxLength={2000}
                  value={formData.description}
                  onChange={setField('description')}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="ann-label" htmlFor="asg-deadline">กำหนดส่ง (Deadline)</label>
                  <input
                    id="asg-deadline"
                    type="datetime-local"
                    className="ann-input"
                    value={formData.deadline}
                    onChange={setField('deadline')}
                  />
                </div>

                <div>
                  <span className="ann-label">ไฟล์แนบ (ถ้ามี)</span>
                  {file ? (
                    <div className="ann-file">
                      <span style={{ color: 'var(--ann-primary)' }}><ClipIcon /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{file.name}</span>
                        <span className="ann-muted block text-[12px]">{formatBytes(file.size)}</span>
                      </span>
                      <button type="button" className="ann-icon-btn" aria-label="เอาไฟล์ออก" onClick={removeFile}>
                        <XIcon />
                      </button>
                    </div>
                  ) : (
                    <label
                      className={`ann-drop ${dragOver ? 'is-over' : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setDragOver(true)
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault()
                        setDragOver(false)
                        pickFile(e.dataTransfer.files?.[0])
                      }}
                    >
                      <input
                        key={fileKey}
                        type="file"
                        className="sr-only"
                        onChange={(e) => pickFile(e.target.files?.[0])}
                      />
                      <UploadIcon />
                      <span className="text-[13px] font-medium">ลากไฟล์มาวาง หรือคลิกเพื่อเลือก</span>
                      <span className="text-[12px] opacity-80">ขนาดไม่เกิน {MAX_FILE_MB} MB</span>
                    </label>
                  )}
                  {formErrors.file && <p className="ann-error">{formErrors.file}</p>}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="ann-btn ann-btn-ghost" onClick={closeForm} disabled={submitting}>
                  ยกเลิก
                </button>
                <button type="submit" className="ann-btn ann-btn-primary" disabled={submitting || subjects.length === 0}>
                  {submitting ? (file ? 'กำลังอัปโหลดและบันทึก...' : 'กำลังบันทึก...') : 'สั่งงาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Delete confirm modal ===== */}
      {deleteTarget && (
        <div
          className="ann-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeleteTarget(null)
          }}
        >
          <div className="ann-modal max-w-[440px] p-7 text-center md:p-8" role="alertdialog" aria-modal="true" aria-labelledby="asg-del-title">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: 'var(--ann-danger-soft)', color: 'var(--ann-danger)' }}
            >
              <Icon className="h-6 w-6"><TrashPath /></Icon>
            </div>
            <h2 id="asg-del-title" className="mt-5 text-[22px] font-semibold tracking-[-0.025em]">ลบงานนี้ใช่หรือไม่?</h2>
            <p className="ann-muted mt-2 text-[15px] leading-[1.6]">
              “<span className="font-medium" style={{ color: 'var(--ann-text)' }}>{deleteTarget.title}</span>”
              <br />
              {deleteTarget.attachment_url ? 'ไฟล์แนบจะถูกลบไปด้วย ' : ''}
              การลบไม่สามารถย้อนกลับได้ และจะมีการแจ้งเตือนไปยัง Discord
            </p>
            <div className="mt-7 flex gap-3">
              <button type="button" className="ann-btn ann-btn-ghost flex-1" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                ยกเลิก
              </button>
              <button type="button" className="ann-btn ann-btn-danger flex-1" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'กำลังลบ...' : 'ลบงาน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Toast ===== */}
      {toast && (
        <div className="ann-toast" role="status" aria-live="polite">
          <span
            className="h-2 w-2 flex-shrink-0 rounded-full"
            style={{ background: toast.type === 'error' ? 'var(--ann-danger-solid)' : 'var(--ann-success-dot)' }}
          />
          {toast.message}
        </div>
      )}
    </div>
  )
}