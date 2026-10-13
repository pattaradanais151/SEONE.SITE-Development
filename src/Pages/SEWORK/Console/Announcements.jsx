import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { notifyDiscord } from '../../../lib/discord'

/* =====================================================================
 * Config
 * ===================================================================== */
const SECS = ['SEC 1', 'SEC 2']
const LONG_CONTENT_CHARS = 260
const TOAST_MS = 3500

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

const isNew = (iso) => Date.now() - new Date(iso).getTime() < 24 * 60 * 60 * 1000

// กัน @everyone / @here / <@id> จากข้อความผู้ใช้ไม่ให้ ping คนใน Discord
const cleanForDiscord = (s = '') =>
  String(s).replace(/@(everyone|here)/gi, '@\u200b$1').replace(/<@/g, '<@\u200b')

const truncate = (s = '', n = 1200) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

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
const TrashIcon = () => <Icon><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" /></Icon>
const SearchIcon = () => <Icon><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Icon>
const MegaphoneIcon = () => (
  <Icon className="h-7 w-7"><path d="M3 11v2a1 1 0 001 1h2l5 4V6L6 10H4a1 1 0 00-1 1zM15 9a4 4 0 010 6M18 6a8 8 0 010 12" /></Icon>
)

/* =====================================================================
 * Page
 * ===================================================================== */
export default function Announcements() {
  const { profile } = useAuth()

  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  // create
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    academic_year: new Date().getFullYear() + 543, // ค่าเริ่มต้นอิงปีปัจจุบันคร่าว ๆ
    semester: 1,
    sec: 'SEC 2',
  })

  // delete
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // view
  const [query, setQuery] = useState('')
  const [secFilter, setSecFilter] = useState('all')
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
  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(false)
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          id, title, content, academic_year, semester, sec, created_at, author_id,
          author:profiles(first_name, last_name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAnnouncements(data || [])
    } catch (err) {
      console.error('Error fetching announcements:', err.message)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    document.title = 'Announcements | SE-CONSOLE'
    fetchAnnouncements()
  }, [fetchAnnouncements])

  /* ---------- Modal behaviour (ESC / scroll lock / focus) ---------- */
  const modalOpen = showForm || Boolean(deleteTarget)

  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (deleting || submitting) return
      setShowForm(false)
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

  useEffect(() => {
    if (showForm) titleRef.current?.focus()
  }, [showForm])

  /* ---------- Create ---------- */
  const setField = (name) => (e) => {
    setFormData((f) => ({ ...f, [name]: e.target.value }))
    if (formErrors[name]) setFormErrors((er) => ({ ...er, [name]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    const errs = {}
    if (!formData.title.trim()) errs.title = 'กรุณากรอกหัวข้อประกาศ'
    if (!formData.content.trim()) errs.content = 'กรุณากรอกเนื้อหาประกาศ'
    if (!parseInt(formData.academic_year)) errs.academic_year = 'ปีการศึกษาไม่ถูกต้อง'
    setFormErrors(errs)
    if (Object.keys(errs).length > 0) return

    try {
      setSubmitting(true)
      if (!profile?.id) throw new Error('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่')

      // 1. บันทึกข้อมูลลง Supabase
      const { error } = await supabase
        .from('announcements')
        .insert([
          {
            title: formData.title.trim(),
            content: formData.content.trim(),
            academic_year: parseInt(formData.academic_year),
            semester: parseInt(formData.semester),
            sec: formData.sec,
            author_id: profile.id,
          },
        ])
        .select()

      if (error) throw error

      // 2. ปิดฟอร์ม ล้างค่า แจ้งผล และโหลดข้อมูลใหม่
      setShowForm(false)
      setFormErrors({})
      setFormData((f) => ({ ...f, title: '', content: '' }))
      showToast('success', 'สร้างประกาศเรียบร้อยแล้ว')
      fetchAnnouncements()

      // 3. แจ้งเตือน Discord (ผ่าน Edge Function ใน utility เดิม)
      await notifyDiscordSafe(
        `📢 **ประกาศใหม่: ${cleanForDiscord(formData.title.trim())}**\n` +
          `📝 **เนื้อหา:** ${cleanForDiscord(truncate(formData.content.trim()))}\n` +
          `📌 **กลุ่มเรียน:** ${formData.sec} (ปีการศึกษา ${formData.academic_year} เทอม ${formData.semester})\n` +
          `👤 **ประกาศโดย:** ${cleanForDiscord(profile?.first_name || 'System')}`
      )
    } catch (err) {
      console.error('Submit Announcement Error:', err.message)
      showToast('error', 'เกิดข้อผิดพลาดในการสร้างประกาศ')
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
        .from('announcements')
        .delete()
        .eq('id', target.id)
        .select('id')

      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('ไม่มีสิทธิ์ลบประกาศนี้ หรือประกาศถูกลบไปแล้ว')
      }

      // 2. อัปเดตหน้าจอทันที
      setAnnouncements((prev) => prev.filter((a) => a.id !== target.id))
      setDeleteTarget(null)
      showToast('success', 'ลบประกาศเรียบร้อยแล้ว')

      // 3. แจ้งเตือน Discord
      const author = [target.author?.first_name, target.author?.last_name].filter(Boolean).join(' ') || 'System'
      await notifyDiscordSafe(
        `🗑️ **ลบประกาศ: ${cleanForDiscord(target.title)}**\n` +
          `📌 **กลุ่มเรียน:** ${target.sec} (ปีการศึกษา ${target.academic_year} เทอม ${target.semester})\n` +
          `✍️ **ผู้ประกาศเดิม:** ${cleanForDiscord(author)}\n` +
          `👤 **ลบโดย:** ${cleanForDiscord(profile?.first_name || 'System')}`
      )
    } catch (err) {
      console.error('Delete Announcement Error:', err.message)
      showToast('error', err.message || 'เกิดข้อผิดพลาดในการลบประกาศ')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  /* ---------- Derived ---------- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return announcements.filter((a) => {
      if (secFilter !== 'all' && a.sec !== secFilter) return false
      if (!q) return true
      return `${a.title} ${a.content}`.toLowerCase().includes(q)
    })
  }, [announcements, query, secFilter])

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
        สีพื้นผิวย่อยทั้งหมดคำนวณด้วย color-mix จากสีตัวอักษร จึงปรับตามธีมเองอัตโนมัติ
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
        .ann-icon-btn:focus-visible, .ann-btn:focus-visible, .ann-seg button:focus-visible, .ann-link:focus-visible {
          outline: 2px solid var(--ann-primary); outline-offset: 2px;
        }

        .ann-chip {
          display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px;
          font-size: 12px; font-weight: 500; background: var(--ann-subtle); color: var(--ann-muted);
        }
        .ann-chip-primary { background: var(--ann-primary-soft); color: var(--ann-primary); }

        .ann-seg { display: inline-flex; padding: 3px; border-radius: 999px; background: var(--ann-subtle); }
        .ann-seg button {
          height: 32px; padding: 0 14px; border: 0; border-radius: 999px; background: transparent;
          font-size: 13px; font-weight: 500; color: var(--ann-muted); cursor: pointer; transition: all .2s;
        }
        .ann-seg button[aria-pressed='true'] { background: var(--ann-card); color: var(--ann-text); box-shadow: 0 1px 3px rgba(0,0,0,0.14); }

        .ann-link { background: none; border: 0; padding: 0; font-size: 14px; color: var(--ann-primary); cursor: pointer; }
        .ann-link:hover { text-decoration: underline; text-underline-offset: 4px; }

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
          <h1 className="text-[32px] font-semibold leading-[1.15] tracking-[-0.03em] md:text-[40px]">Announcements</h1>
          <p className="ann-muted mt-1 text-[16px]">ประกาศและข่าวสารระบบ</p>
        </div>
        <button type="button" className="ann-btn ann-btn-primary self-start sm:self-auto" onClick={() => setShowForm(true)}>
          <PlusIcon /> สร้างประกาศ
        </button>
      </div>

      {/* ===== Toolbar ===== */}
      <div className="ann-rise mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between" style={{ animationDelay: '60ms' }}>
        <div className="relative w-full md:max-w-[360px]">
          <span className="ann-muted pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
            <SearchIcon />
          </span>
          <input
            type="search"
            className="ann-input"
            style={{ paddingLeft: 40, borderRadius: 999 }}
            placeholder="ค้นหาประกาศ"
            aria-label="ค้นหาประกาศ"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between gap-4 md:justify-end">
          <div className="ann-seg" role="group" aria-label="กรองตาม SEC">
            {['all', ...SECS].map((s) => (
              <button key={s} type="button" aria-pressed={secFilter === s} onClick={() => setSecFilter(s)}>
                {s === 'all' ? 'ทั้งหมด' : s}
              </button>
            ))}
          </div>
          {!loading && !loadError && (
            <span className="ann-muted whitespace-nowrap text-[13px] tabular-nums">{filtered.length} ประกาศ</span>
          )}
        </div>
      </div>

      {/* ===== List ===== */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="ann-card p-6">
              <div className="ann-skeleton h-5 w-1/3" />
              <div className="ann-skeleton mt-3 h-4 w-1/2" />
              <div className="ann-skeleton mt-5 h-4 w-full" />
              <div className="ann-skeleton mt-2 h-4 w-4/5" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="ann-card px-8 py-14 text-center">
          <h3 className="text-[20px] font-semibold tracking-[-0.02em]">โหลดประกาศไม่สำเร็จ</h3>
          <p className="ann-muted mt-2 text-[15px]">เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง</p>
          <button type="button" className="ann-btn ann-btn-primary mt-6" onClick={fetchAnnouncements}>
            ลองใหม่อีกครั้ง
          </button>
        </div>
      ) : announcements.length === 0 ? (
        <div className="ann-card flex flex-col items-center px-8 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'var(--ann-primary-soft)', color: 'var(--ann-primary)' }}>
            <MegaphoneIcon />
          </div>
          <h3 className="mt-5 text-[20px] font-semibold tracking-[-0.02em]">ยังไม่มีประกาศในระบบ</h3>
          <p className="ann-muted mt-2 text-[15px]">เริ่มต้นโดยสร้างประกาศแรกให้สมาชิกทุกคน</p>
          <button type="button" className="ann-btn ann-btn-primary mt-6" onClick={() => setShowForm(true)}>
            <PlusIcon /> สร้างประกาศ
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="ann-card px-8 py-14 text-center">
          <h3 className="text-[20px] font-semibold tracking-[-0.02em]">ไม่พบประกาศที่ตรงกับเงื่อนไข</h3>
          <button
            type="button"
            className="ann-link mt-3"
            onClick={() => {
              setQuery('')
              setSecFilter('all')
            }}
          >
            ล้างตัวกรอง
          </button>
        </div>
      ) : (
        <ul className="space-y-4">
          {filtered.map((item, i) => {
            const isLong = item.content.length > LONG_CONTENT_CHARS || item.content.split('\n').length > 4
            const open = expanded.has(item.id)
            const author = [item.author?.first_name, item.author?.last_name].filter(Boolean).join(' ') || 'System'

            return (
              <li
                key={item.id}
                className="ann-card ann-card-hover ann-rise p-6 md:p-7"
                style={{ animationDelay: `${Math.min(i, 8) * 40 + 100}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[19px] font-semibold leading-[1.35] tracking-[-0.02em] [overflow-wrap:anywhere]">
                        {item.title}
                      </h3>
                      {isNew(item.created_at) && <span className="ann-chip ann-chip-primary">ใหม่</span>}
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <span className="ann-chip">ปี {item.academic_year} เทอม {item.semester}</span>
                      <span className="ann-chip ann-chip-primary">{item.sec}</span>
                      <span className="ann-muted text-[13px]">โดย {author}</span>
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-1">
                    <time
                      className="ann-muted whitespace-nowrap text-[13px]"
                      dateTime={item.created_at}
                      title={new Date(item.created_at).toLocaleString('th-TH')}
                    >
                      {formatDate(item.created_at)}
                    </time>
                    {canDelete(item, profile) && (
                      <button
                        type="button"
                        className="ann-icon-btn"
                        aria-label={`ลบประกาศ ${item.title}`}
                        title="ลบประกาศ"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                </div>

                <p className={`mt-4 whitespace-pre-wrap text-[15px] leading-[1.7] [overflow-wrap:anywhere] ${isLong && !open ? 'ann-clamp' : ''}`}>
                  {item.content}
                </p>
                {isLong && (
                  <button type="button" className="ann-link mt-2" onClick={() => toggleExpand(item.id)}>
                    {open ? 'แสดงน้อยลง' : 'อ่านเพิ่มเติม'}
                  </button>
                )}
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
            if (e.target === e.currentTarget && !submitting) setShowForm(false)
          }}
        >
          <div className="ann-modal max-w-[640px] p-7 md:p-9" role="dialog" aria-modal="true" aria-labelledby="ann-create-title">
            <h2 id="ann-create-title" className="text-[24px] font-semibold tracking-[-0.025em]">
              สร้างประกาศใหม่
            </h2>
            <p className="ann-muted mt-1 text-[14px]">ประกาศจะแจ้งเตือนไปยัง Discord อัตโนมัติ</p>

            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="ann-label" htmlFor="ann-year">ปีการศึกษา</label>
                  <input
                    id="ann-year"
                    type="number"
                    className="ann-input"
                    value={formData.academic_year}
                    onChange={setField('academic_year')}
                    aria-invalid={Boolean(formErrors.academic_year)}
                  />
                  {formErrors.academic_year && <p className="ann-error">{formErrors.academic_year}</p>}
                </div>
                <div>
                  <label className="ann-label" htmlFor="ann-sem">ภาคเรียน</label>
                  <select id="ann-sem" className="ann-input" value={formData.semester} onChange={setField('semester')}>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </div>
                <div>
                  <label className="ann-label" htmlFor="ann-sec">SEC</label>
                  <select id="ann-sec" className="ann-input" value={formData.sec} onChange={setField('sec')}>
                    {SECS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="ann-label" htmlFor="ann-title">หัวข้อประกาศ</label>
                <input
                  id="ann-title"
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
                  <label className="ann-label" htmlFor="ann-content">เนื้อหาประกาศ</label>
                  <span className="ann-muted text-[12px] tabular-nums">{formData.content.length}/2000</span>
                </div>
                <textarea
                  id="ann-content"
                  rows={5}
                  className="ann-input"
                  maxLength={2000}
                  value={formData.content}
                  onChange={setField('content')}
                  aria-invalid={Boolean(formErrors.content)}
                />
                {formErrors.content && <p className="ann-error">{formErrors.content}</p>}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="ann-btn ann-btn-ghost" onClick={() => setShowForm(false)} disabled={submitting}>
                  ยกเลิก
                </button>
                <button type="submit" className="ann-btn ann-btn-primary" disabled={submitting}>
                  {submitting ? 'กำลังบันทึก...' : 'ประกาศ'}
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
          <div className="ann-modal max-w-[440px] p-7 text-center md:p-8" role="alertdialog" aria-modal="true" aria-labelledby="ann-del-title">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: 'var(--ann-danger-soft)', color: 'var(--ann-danger)' }}
            >
              <Icon className="h-6 w-6"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" /></Icon>
            </div>
            <h2 id="ann-del-title" className="mt-5 text-[22px] font-semibold tracking-[-0.025em]">ลบประกาศนี้ใช่หรือไม่?</h2>
            <p className="ann-muted mt-2 text-[15px] leading-[1.6]">
              “<span className="font-medium" style={{ color: 'var(--ann-text)' }}>{deleteTarget.title}</span>”
              <br />
              การลบไม่สามารถย้อนกลับได้ และจะมีการแจ้งเตือนไปยัง Discord
            </p>
            <div className="mt-7 flex gap-3">
              <button type="button" className="ann-btn ann-btn-ghost flex-1" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                ยกเลิก
              </button>
              <button type="button" className="ann-btn ann-btn-danger flex-1" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'กำลังลบ...' : 'ลบประกาศ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Toast ===== */}
      {toast && (
        <div className="ann-toast" role="status" aria-live="polite">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: toast.type === 'error' ? 'var(--ann-danger-solid)' : 'var(--ann-success-dot)' }}
          />
          {toast.message}
        </div>
      )}
    </div>
  )
}