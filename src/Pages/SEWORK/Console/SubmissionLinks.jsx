import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { notifyDiscord } from '../../../lib/discord'

/* =====================================================================
 * Config
 * ===================================================================== */
const SECS = ['SEC 1', 'SEC 2']
const SEMESTERS = [1, 2, 3]
const TOAST_MS = 4200

// ใครเห็นปุ่มลบ: ตอนนี้ทุกคนที่เข้าหน้านี้ได้ — สิทธิ์จริงถูกบังคับด้วย RLS ใน Supabase
// อยากจำกัด เช่น เฉพาะเจ้าของหรือแอดมิน:
//   return item.author_id === profile?.id || ['admin', 'ceo'].includes(profile?.role?.toLowerCase())
// eslint-disable-next-line no-unused-vars
const canDelete = (item, profile) => true

// ชื่อเรียกที่เข้าใจง่ายของปลายทางที่พบบ่อย (ไม่ตรงจะแสดงชื่อโดเมนแทน)
const PROVIDERS = [
  [/(^|\.)drive\.google\.com$/, 'Google Drive'],
  [/(^|\.)(onedrive\.live\.com|1drv\.ms|sharepoint\.com)$/, 'OneDrive'],
  [/(^|\.)dropbox\.com$/, 'Dropbox'],
  [/(^|\.)github\.com$/, 'GitHub'],
]

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

// อนุญาตเฉพาะ http(s) — กัน javascript: / data: ที่อาจถูกกรอกเข้ามาใน destination_url
const safeUrl = (u) => {
  try {
    const url = new URL(String(u || '').trim())
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

// ผู้ใช้ลืมพิมพ์ https:// → เติมให้ (ถ้ามี scheme อื่น เช่น javascript: จะถูก safeUrl ปฏิเสธ)
const normalizeUrl = (input) => {
  const v = String(input || '').trim()
  if (!v) return null
  return safeUrl(/^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`)
}

const describeUrl = (url) => {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    const hit = PROVIDERS.find(([re]) => re.test(host))
    return hit ? hit[1] : host
  } catch {
    return ''
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
const ExternalIcon = () => <Icon><path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4" /></Icon>
const XIcon = () => <Icon className="h-3.5 w-3.5"><path d="M6 6l12 12M18 6L6 18" /></Icon>
const CheckIcon = () => <Icon className="h-4 w-4"><path d="M5 12.5l4.5 4.5L19 7.5" /></Icon>
const AlertIcon = () => <Icon className="h-4 w-4"><path d="M12 8v5M12 16.5v.01M10.3 4.2L2.8 17.5A2 2 0 004.5 20.5h15a2 2 0 001.7-3L13.7 4.2a2 2 0 00-3.4 0z" /></Icon>
const LinkIcon = ({ className = 'h-6 w-6' }) => <Icon className={className}><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" /></Icon>

const TOAST_ICON = { success: CheckIcon, error: AlertIcon, warning: AlertIcon }

/* =====================================================================
 * Page
 * ===================================================================== */
export default function SubmissionLinks() {
  const { profile } = useAuth()

  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  // create
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [formData, setFormData] = useState({
    academic_year: new Date().getFullYear() + 543,
    semester: 1,
    sec: 'SEC 2',
    destination_name: '',
    destination_url: '',
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

  /* ---------- Fetch ---------- */
  const fetchLinks = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      setLoadError(false)
      const { data, error } = await supabase
        .from('submission_links')
        .select(`
          id, academic_year, semester, sec, destination_name, destination_url, created_at,
          author:profiles(first_name, last_name)
        `)
        .order('academic_year', { ascending: false })
        .order('semester', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setLinks(data || [])
    } catch (err) {
      console.error('Error fetching submission links:', err.message)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    document.title = 'Submission Links | SE-CONSOLE'
    fetchLinks()
  }, [fetchLinks])

  /* ---------- Modal behaviour (ESC / scroll lock) ---------- */
  const modalOpen = showForm || Boolean(deleteTarget)

  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (deleting || submitting) return
      setShowForm(false)
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
  const closeForm = () => {
    if (submitting) return
    setShowForm(false)
    setFormErrors({})
  }

  const setField = (name) => (e) => {
    setFormData((f) => ({ ...f, [name]: e.target.value }))
    if (formErrors[name]) setFormErrors((er) => ({ ...er, [name]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    const name = formData.destination_name.trim()
    const url = normalizeUrl(formData.destination_url)

    const errs = {}
    if (!name) errs.destination_name = 'กรุณากรอกชื่อปลายทาง'
    if (!formData.destination_url.trim()) errs.destination_url = 'กรุณากรอก URL'
    else if (!url) errs.destination_url = 'URL ไม่ถูกต้อง ต้องเป็นลิงก์ที่ขึ้นต้นด้วย https://'
    if (!parseInt(formData.academic_year)) errs.academic_year = 'ปีการศึกษาไม่ถูกต้อง'
    setFormErrors(errs)
    if (Object.keys(errs).length > 0) return

    try {
      setSubmitting(true)

      // 1. บันทึกข้อมูลลง Supabase (ใส่ author_id ถ้ามี profile เพื่อให้แสดงชื่อผู้เพิ่มได้)
      const { error } = await supabase.from('submission_links').insert([
        {
          academic_year: parseInt(formData.academic_year),
          semester: parseInt(formData.semester),
          sec: formData.sec,
          destination_name: name,
          destination_url: url,
          ...(profile?.id ? { author_id: profile.id } : {}),
        },
      ])
      if (error) throw error

      // 2. ปิดฟอร์ม ล้างค่า แจ้งผล และรีเฟรชรายการ (ไม่ต้องโชว์ skeleton)
      const snapshot = { ...formData }
      setShowForm(false)
      setFormErrors({})
      setFormData((f) => ({ ...f, destination_name: '', destination_url: '' }))
      showToast('success', 'เพิ่มลิงก์ส่งงานแล้ว', name)
      fetchLinks({ silent: true })

      // 3. แจ้งเตือน Discord (ผ่าน Edge Function ใน utility เดิม) — ไม่รอผล
      sendDiscord(
        `🔗 **เพิ่มลิงก์ส่งงานใหม่**\n` +
          `📂 **ชื่อปลายทาง:** ${cleanForDiscord(truncate(name))}\n` +
          `📌 **กลุ่มเรียน:** ${snapshot.sec} (ปีการศึกษา ${snapshot.academic_year} เทอม ${snapshot.semester})\n` +
          `👤 **เพิ่มโดย:** ${cleanForDiscord(profile?.first_name || 'System')}\n` +
          `🔗 **ลิงก์:** [คลิกเพื่อเปิดลิงก์ส่งงาน](${discordLink(url)})`
      )
    } catch (err) {
      console.error('Submit Error:', err.message)
      showToast('error', 'เพิ่มลิงก์ส่งงานไม่สำเร็จ', err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
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
      const { data, error } = await supabase.from('submission_links').delete().eq('id', target.id).select('id')
      if (error) throw error
      if (!data || data.length === 0) throw new Error('ไม่มีสิทธิ์ลบลิงก์นี้ หรือลิงก์ถูกลบไปแล้ว')

      setLinks((prev) => prev.filter((l) => l.id !== target.id))
      setDeleteTarget(null)
      showToast('success', 'ลบลิงก์ส่งงานแล้ว', target.destination_name)

      sendDiscord(
        `🗑️ **ลบลิงก์ส่งงาน: ${cleanForDiscord(truncate(target.destination_name))}**\n` +
          `📌 **กลุ่มเรียน:** ${target.sec} (ปีการศึกษา ${target.academic_year} เทอม ${target.semester})\n` +
          `✍️ **เพิ่มโดย:** ${cleanForDiscord(fullName(target.author) || 'System')}\n` +
          `👤 **ลบโดย:** ${cleanForDiscord(profile?.first_name || 'System')}`
      )
    } catch (err) {
      console.error('Delete Error:', err.message)
      showToast('error', 'ลบลิงก์ส่งงานไม่สำเร็จ', err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  /* ---------- Derived ---------- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return links.filter((l) => {
      if (secFilter !== 'all' && l.sec !== secFilter) return false
      if (!q) return true
      return `${l.destination_name} ${describeUrl(l.destination_url)}`.toLowerCase().includes(q)
    })
  }, [links, query, secFilter])

  /* =====================================================================
   * Render
   * ===================================================================== */
  return (
    <div className="se-sl relative mx-auto w-full max-w-[1100px]">
      {/*
        Design tokens — ผูกกับธีมเดิมของโปรเจกต์ (--color-se-*)
        เวอร์ชัน Dark Mode: ทำเพียง override ตัวแปรในบล็อก :root[data-theme='dark'] / .dark ด้านล่าง
        (Toast, Modal, Chip, Input ใช้ตัวแปรชุดนี้ทั้งหมด จึงเปลี่ยนตามธีมเอง)
      */}
      <style>{`
        .se-sl {
          --sl-bg: var(--color-se-background, #f5f5f7);
          --sl-card: var(--color-se-surface, #ffffff);
          --sl-border: var(--color-se-border, rgba(0,0,0,0.12));
          --sl-text: var(--color-se-text-main, #1d1d1f);
          --sl-muted: var(--color-se-text-muted, #6e6e73);
          --sl-primary: var(--color-se-primary, #0071e3);
          --sl-primary-hover: var(--color-se-primary-hover, #0077ed);

          --sl-subtle: color-mix(in srgb, var(--sl-text) 6%, transparent);
          --sl-subtle-hover: color-mix(in srgb, var(--sl-text) 11%, transparent);
          --sl-primary-soft: color-mix(in srgb, var(--sl-primary) 14%, transparent);

          --sl-danger: #d70015;
          --sl-danger-solid: #ff3b30;
          --sl-danger-soft: rgba(255,59,48,0.12);
          --sl-success: #1f8a3b;
          --sl-success-soft: rgba(52,199,89,0.16);
          --sl-warning: #b25000;
          --sl-warning-soft: rgba(255,149,0,0.16);

          --sl-overlay: rgba(0,0,0,0.38);
          --sl-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05);
          --sl-shadow-hover: 0 1px 2px rgba(0,0,0,0.04), 0 14px 36px rgba(0,0,0,0.09);
          --sl-shadow-lg: 0 24px 80px rgba(0,0,0,0.20);
          color: var(--sl-text);
        }
        :root[data-theme='dark'] .se-sl,
        .dark .se-sl {
          color-scheme: dark;
          --sl-danger: #ff6961;
          --sl-danger-solid: #ff453a;
          --sl-danger-soft: rgba(255,69,58,0.18);
          --sl-success: #30d158;
          --sl-success-soft: rgba(48,209,88,0.18);
          --sl-warning: #ff9f0a;
          --sl-warning-soft: rgba(255,159,10,0.18);
          --sl-overlay: rgba(0,0,0,0.6);
          --sl-shadow: 0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.25);
          --sl-shadow-hover: 0 1px 2px rgba(0,0,0,0.3), 0 14px 36px rgba(0,0,0,0.4);
          --sl-shadow-lg: 0 24px 80px rgba(0,0,0,0.6);
        }

        @keyframes sl-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sl-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sl-pop  { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: none; } }
        @keyframes sl-pulse { 50% { opacity: .5; } }
        .sl-rise { animation: sl-rise .6s cubic-bezier(.28,.11,.32,1) both; }

        .sl-muted { color: var(--sl-muted); }

        .sl-card {
          background: var(--sl-card);
          border: 1px solid var(--sl-border);
          border-radius: 24px;
          box-shadow: var(--sl-shadow);
        }
        .sl-card-hover { transition: box-shadow .35s; }
        .sl-card-hover:hover { box-shadow: var(--sl-shadow-hover); }

        .sl-tile {
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          width: 48px; height: 48px; border-radius: 15px;
          background: var(--sl-primary-soft); color: var(--sl-primary);
        }

        .sl-input {
          width: 100%; height: 44px; padding: 0 14px; border-radius: 12px;
          border: 1px solid var(--sl-border); background: var(--sl-bg); color: var(--sl-text);
          font-size: 15px; outline: none; transition: border-color .2s, box-shadow .2s, background .2s;
        }
        .sl-input::placeholder { color: var(--sl-muted); opacity: .7; }
        .sl-input:focus { border-color: var(--sl-primary); background: var(--sl-card); box-shadow: 0 0 0 4px var(--sl-primary-soft); }
        .sl-input[aria-invalid='true'] { border-color: var(--sl-danger-solid); }
        .sl-input[aria-invalid='true']:focus { box-shadow: 0 0 0 4px var(--sl-danger-soft); }

        .sl-label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; }
        .sl-error { margin-top: 6px; font-size: 13px; color: var(--sl-danger); }

        .sl-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          height: 40px; padding: 0 20px; border: 0; border-radius: 999px;
          font-size: 14px; font-weight: 500; cursor: pointer; white-space: nowrap; text-decoration: none;
          transition: background .2s, opacity .2s, transform .1s;
        }
        .sl-btn:active:not(:disabled) { transform: scale(.98); }
        .sl-btn:disabled { opacity: .6; cursor: not-allowed; }
        .sl-btn-primary { background: var(--sl-primary); color: #fff; }
        .sl-btn-primary:hover:not(:disabled) { background: var(--sl-primary-hover); }
        .sl-btn-ghost { background: var(--sl-subtle); color: var(--sl-text); }
        .sl-btn-ghost:hover:not(:disabled) { background: var(--sl-subtle-hover); }
        .sl-btn-soft { background: var(--sl-primary-soft); color: var(--sl-primary); width: 100%; }
        .sl-btn-soft:hover { background: color-mix(in srgb, var(--sl-primary) 22%, transparent); }
        .sl-btn-danger { background: var(--sl-danger-solid); color: #fff; }
        .sl-btn-danger:hover:not(:disabled) { filter: brightness(.94); }

        .sl-icon-btn {
          display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
          width: 36px; height: 36px; border: 0; border-radius: 999px; background: transparent;
          color: var(--sl-muted); cursor: pointer; transition: background .2s, color .2s;
        }
        .sl-icon-btn:hover { background: var(--sl-danger-soft); color: var(--sl-danger); }
        .sl-icon-btn-neutral:hover { background: var(--sl-subtle-hover); color: var(--sl-text); }
        .sl-icon-btn:focus-visible, .sl-btn:focus-visible, .sl-seg button:focus-visible, .sl-link:focus-visible {
          outline: 2px solid var(--sl-primary); outline-offset: 2px;
        }

        .sl-chip {
          display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px;
          font-size: 12px; font-weight: 500; background: var(--sl-subtle); color: var(--sl-muted);
        }
        .sl-chip-primary { background: var(--sl-primary-soft); color: var(--sl-primary); }

        .sl-seg { display: inline-flex; padding: 3px; border-radius: 999px; background: var(--sl-subtle); }
        .sl-seg button {
          height: 32px; padding: 0 14px; border: 0; border-radius: 999px; background: transparent;
          font-size: 13px; font-weight: 500; color: var(--sl-muted); cursor: pointer; transition: all .2s;
        }
        .sl-seg button[aria-pressed='true'] { background: var(--sl-card); color: var(--sl-text); box-shadow: 0 1px 3px rgba(0,0,0,0.14); }

        .sl-link { background: none; border: 0; padding: 0; font-size: 14px; color: var(--sl-primary); cursor: pointer; }
        .sl-link:hover { text-decoration: underline; text-underline-offset: 4px; }

        .sl-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        .sl-backdrop {
          position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center;
          padding: 16px; background: var(--sl-overlay); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          animation: sl-fade .25s both;
        }
        .sl-modal {
          width: 100%; max-height: calc(100vh - 32px); overflow-y: auto;
          background: var(--sl-card); border: 1px solid var(--sl-border); border-radius: 28px;
          box-shadow: var(--sl-shadow-lg); animation: sl-pop .35s cubic-bezier(.28,.11,.32,1) both;
        }

        /* ===== Custom notification (toast) ===== */
        .sl-toasts {
          position: fixed; left: 50%; bottom: 24px; z-index: 70; transform: translateX(-50%);
          display: flex; flex-direction: column; gap: 10px; width: min(400px, calc(100vw - 32px)); pointer-events: none;
        }
        .sl-toast {
          pointer-events: auto; display: flex; align-items: flex-start; gap: 12px; padding: 12px 12px 12px 14px;
          border-radius: 20px; border: 1px solid var(--sl-border);
          background: color-mix(in srgb, var(--sl-card) 82%, transparent);
          backdrop-filter: blur(24px) saturate(180%); -webkit-backdrop-filter: blur(24px) saturate(180%);
          box-shadow: var(--sl-shadow-lg); animation: sl-pop .35s cubic-bezier(.28,.11,.32,1) both;
        }
        .sl-toast-icon {
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          width: 28px; height: 28px; border-radius: 999px;
        }
        .sl-toast-success .sl-toast-icon { background: var(--sl-success-soft); color: var(--sl-success); }
        .sl-toast-error .sl-toast-icon { background: var(--sl-danger-soft); color: var(--sl-danger); }
        .sl-toast-warning .sl-toast-icon { background: var(--sl-warning-soft); color: var(--sl-warning); }

        .sl-skeleton { background: var(--sl-subtle); border-radius: 10px; animation: sl-pulse 1.6s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .sl-rise, .sl-backdrop, .sl-modal, .sl-toast, .sl-skeleton { animation: none; }
          .sl-card-hover { transition: none; }
        }
      `}</style>

      {/* ===== Header ===== */}
      <div className="sl-rise mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[32px] font-semibold leading-[1.15] tracking-[-0.03em] md:text-[40px]">Submission Links</h1>
          <p className="sl-muted mt-1 text-[16px]">จัดการแหล่งส่งงาน (Google Drive, OneDrive ฯลฯ)</p>
        </div>
        <button
          type="button"
          className="sl-btn sl-btn-primary self-start sm:self-auto"
          onClick={() => {
            setFormErrors({})
            setShowForm(true)
          }}
        >
          <PlusIcon /> เพิ่มลิงก์ส่งงาน
        </button>
      </div>

      {/* ===== Toolbar ===== */}
      <div className="sl-rise mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between" style={{ animationDelay: '60ms' }}>
        <div className="relative w-full md:max-w-[360px]">
          <span className="sl-muted pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
            <SearchIcon />
          </span>
          <input
            type="search"
            className="sl-input"
            style={{ paddingLeft: 40, borderRadius: 999 }}
            placeholder="ค้นหาชื่อปลายทางหรือเว็บไซต์"
            aria-label="ค้นหาลิงก์ส่งงาน"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between gap-4 md:justify-end">
          <div className="sl-seg" role="group" aria-label="กรองตาม SEC">
            {['all', ...SECS].map((s) => (
              <button key={s} type="button" aria-pressed={secFilter === s} onClick={() => setSecFilter(s)}>
                {s === 'all' ? 'ทั้งหมด' : s}
              </button>
            ))}
          </div>
          {!loading && !loadError && (
            <span className="sl-muted whitespace-nowrap text-[13px] tabular-nums">{filtered.length} ลิงก์</span>
          )}
        </div>
      </div>

      {/* ===== List ===== */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="sl-card p-6">
              <div className="sl-skeleton h-12 w-12" style={{ borderRadius: 15 }} />
              <div className="sl-skeleton mt-5 h-5 w-2/3" />
              <div className="sl-skeleton mt-3 h-4 w-1/3" />
              <div className="sl-skeleton mt-6 h-10 w-full" style={{ borderRadius: 999 }} />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="sl-card px-8 py-14 text-center">
          <h3 className="text-[20px] font-semibold tracking-[-0.02em]">โหลดลิงก์ส่งงานไม่สำเร็จ</h3>
          <p className="sl-muted mt-2 text-[15px]">เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง</p>
          <button type="button" className="sl-btn sl-btn-primary mt-6" onClick={() => fetchLinks()}>
            ลองใหม่อีกครั้ง
          </button>
        </div>
      ) : links.length === 0 ? (
        <div className="sl-card flex flex-col items-center px-8 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'var(--sl-primary-soft)', color: 'var(--sl-primary)' }}>
            <LinkIcon className="h-7 w-7" />
          </div>
          <h3 className="mt-5 text-[20px] font-semibold tracking-[-0.02em]">ยังไม่มีลิงก์ส่งงาน</h3>
          <p className="sl-muted mt-2 text-[15px]">เพิ่มลิงก์โฟลเดอร์ส่งงาน เพื่อให้เพื่อน ๆ ในกลุ่มเรียนเปิดได้จากที่เดียว</p>
          <button type="button" className="sl-btn sl-btn-primary mt-6" onClick={() => setShowForm(true)}>
            <PlusIcon /> เพิ่มลิงก์ส่งงาน
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="sl-card px-8 py-14 text-center">
          <h3 className="text-[20px] font-semibold tracking-[-0.02em]">ไม่พบลิงก์ที่ตรงกับเงื่อนไข</h3>
          <button
            type="button"
            className="sl-link mt-3"
            onClick={() => {
              setQuery('')
              setSecFilter('all')
            }}
          >
            ล้างตัวกรอง
          </button>
        </div>
      ) : (
        <ul className="sl-rise grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" style={{ animationDelay: '100ms' }}>
          {filtered.map((item) => {
            const href = safeUrl(item.destination_url)
            const provider = describeUrl(item.destination_url)
            const author = fullName(item.author) || 'System'

            return (
              <li key={item.id} className="sl-card sl-card-hover flex flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="sl-tile"><LinkIcon /></div>
                  {canDelete(item, profile) && (
                    <button
                      type="button"
                      className="sl-icon-btn -mr-2 -mt-1"
                      aria-label={`ลบลิงก์ส่งงาน ${item.destination_name}`}
                      title="ลบลิงก์ส่งงาน"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>

                <h3
                  className="sl-clamp-2 mt-4 text-[19px] font-semibold leading-[1.35] tracking-[-0.02em] [overflow-wrap:anywhere]"
                  title={item.destination_name}
                >
                  {item.destination_name}
                </h3>
                {provider && <p className="sl-muted mt-1 truncate text-[14px]">{provider}</p>}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="sl-chip sl-chip-primary">{item.sec}</span>
                  <span className="sl-chip">ปี {item.academic_year} เทอม {item.semester}</span>
                </div>

                <div className="flex-grow" />

                <div className="mt-6">
                  <a
                    className="sl-btn sl-btn-soft"
                    href={href || undefined}
                    aria-disabled={!href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalIcon />
                    {href ? 'เปิดลิงก์ส่งงาน' : 'ลิงก์ไม่ถูกต้อง'}
                  </a>
                  <div className="sl-muted mt-3 flex items-center justify-between gap-3 text-[12px]">
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
          className="sl-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeForm()
          }}
        >
          <div className="sl-modal max-w-[560px] p-7 md:p-9" role="dialog" aria-modal="true" aria-labelledby="sl-create-title">
            <h2 id="sl-create-title" className="text-[24px] font-semibold tracking-[-0.025em]">เพิ่มลิงก์ส่งงาน</h2>
            <p className="sl-muted mt-1 text-[14px]">ลิงก์ใหม่จะแจ้งเตือนไปยัง Discord อัตโนมัติ</p>

            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="sl-label" htmlFor="sl-year">ปีการศึกษา</label>
                  <input
                    id="sl-year"
                    type="number"
                    className="sl-input"
                    value={formData.academic_year}
                    onChange={setField('academic_year')}
                    aria-invalid={Boolean(formErrors.academic_year)}
                  />
                  {formErrors.academic_year && <p className="sl-error">{formErrors.academic_year}</p>}
                </div>
                <div>
                  <label className="sl-label" htmlFor="sl-sem">ภาคเรียน</label>
                  <select id="sl-sem" className="sl-input" value={formData.semester} onChange={setField('semester')}>
                    {SEMESTERS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="sl-label" htmlFor="sl-sec">SEC</label>
                  <select id="sl-sec" className="sl-input" value={formData.sec} onChange={setField('sec')}>
                    {SECS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="sl-label" htmlFor="sl-name">ชื่อปลายทาง / วิชา</label>
                <input
                  id="sl-name"
                  type="text"
                  className="sl-input"
                  placeholder="เช่น โฟลเดอร์ส่งงานวิชา SWE101"
                  maxLength={150}
                  value={formData.destination_name}
                  onChange={setField('destination_name')}
                  aria-invalid={Boolean(formErrors.destination_name)}
                  autoFocus
                />
                {formErrors.destination_name && <p className="sl-error">{formErrors.destination_name}</p>}
              </div>

              <div>
                <label className="sl-label" htmlFor="sl-url">URL (Drive / OneDrive / ฯลฯ)</label>
                <input
                  id="sl-url"
                  type="url"
                  inputMode="url"
                  className="sl-input"
                  placeholder="https://"
                  value={formData.destination_url}
                  onChange={setField('destination_url')}
                  aria-invalid={Boolean(formErrors.destination_url)}
                />
                {formErrors.destination_url && <p className="sl-error">{formErrors.destination_url}</p>}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="sl-btn sl-btn-ghost" onClick={closeForm} disabled={submitting}>
                  ยกเลิก
                </button>
                <button type="submit" className="sl-btn sl-btn-primary" disabled={submitting}>
                  {submitting ? 'กำลังบันทึก...' : 'เพิ่มลิงก์ส่งงาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Delete confirm modal ===== */}
      {deleteTarget && (
        <div
          className="sl-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeleteTarget(null)
          }}
        >
          <div className="sl-modal max-w-[440px] p-7 text-center md:p-8" role="alertdialog" aria-modal="true" aria-labelledby="sl-del-title">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: 'var(--sl-danger-soft)', color: 'var(--sl-danger)' }}
            >
              <TrashIcon className="h-6 w-6" />
            </div>
            <h2 id="sl-del-title" className="mt-5 text-[22px] font-semibold tracking-[-0.025em]">ลบลิงก์ส่งงานนี้ใช่หรือไม่?</h2>
            <p className="sl-muted mt-2 text-[15px] leading-[1.6]">
              “<span className="font-medium [overflow-wrap:anywhere]" style={{ color: 'var(--sl-text)' }}>{deleteTarget.destination_name}</span>”
              <br />
              การลบไม่สามารถย้อนกลับได้ และจะมีการแจ้งเตือนไปยัง Discord
            </p>
            <div className="mt-7 flex gap-3">
              <button type="button" className="sl-btn sl-btn-ghost flex-1" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                ยกเลิก
              </button>
              <button type="button" className="sl-btn sl-btn-danger flex-1" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'กำลังลบ...' : 'ลบลิงก์ส่งงาน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Notifications ===== */}
      <div className="sl-toasts" aria-live="polite">
        {toasts.map((t) => {
          const ToastIcon = TOAST_ICON[t.type] || CheckIcon
          return (
            <div key={t.id} className={`sl-toast sl-toast-${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
              <span className="sl-toast-icon"><ToastIcon /></span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[14px] font-semibold leading-[1.4]">{t.message}</p>
                {t.description && (
                  <p className="sl-muted sl-clamp-2 mt-0.5 text-[13px] leading-[1.45] [overflow-wrap:anywhere]">{t.description}</p>
                )}
              </div>
              <button type="button" className="sl-icon-btn sl-icon-btn-neutral" style={{ width: 28, height: 28 }} aria-label="ปิดการแจ้งเตือน" onClick={() => dismissToast(t.id)}>
                <XIcon />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}