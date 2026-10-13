import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { notifyDiscord } from '../../../lib/discord'

/* =====================================================================
 * Config
 * ===================================================================== */
const SEMESTERS = [1, 2, 3]
const YEAR_MIN = 2500 // พ.ศ. — กันกรอกเป็น ค.ศ. โดยไม่ตั้งใจ
const YEAR_MAX = 2699
const TOAST_MS = 4200

/* =====================================================================
 * Helpers
 * ===================================================================== */
const termLabel = (s) => `ปีการศึกษา ${s.academic_year} เทอม ${s.semester}`

const compareTerm = (a, b) => a.academic_year - b.academic_year || a.semester - b.semester

// กัน @everyone / @here / <@id> จากข้อความผู้ใช้ไม่ให้ ping คนใน Discord
const cleanForDiscord = (s = '') =>
  String(s).replace(/@(everyone|here)/gi, '@\u200b$1').replace(/<@/g, '<@\u200b')

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
const XIcon = () => <Icon className="h-3.5 w-3.5"><path d="M6 6l12 12M18 6L6 18" /></Icon>
const CheckIcon = () => <Icon className="h-4 w-4"><path d="M5 12.5l4.5 4.5L19 7.5" /></Icon>
const AlertIcon = () => <Icon className="h-4 w-4"><path d="M12 8v5M12 16.5v.01M10.3 4.2L2.8 17.5A2 2 0 004.5 20.5h15a2 2 0 001.7-3L13.7 4.2a2 2 0 00-3.4 0z" /></Icon>
const CalendarIcon = ({ className = 'h-7 w-7' }) => <Icon className={className}><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M8 3v4M16 3v4M3.5 10h17" /></Icon>
const CalendarCheckIcon = ({ className = 'h-6 w-6' }) => <Icon className={className}><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M8 3v4M16 3v4M3.5 10h17M9 15l2 2 4-4" /></Icon>

const TOAST_ICON = { success: CheckIcon, error: AlertIcon, warning: AlertIcon }

/* =====================================================================
 * Page
 * ===================================================================== */
export default function Semesters() {
  const { profile } = useAuth()

  const [semesters, setSemesters] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  // create
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [formData, setFormData] = useState({
    academic_year: new Date().getFullYear() + 543,
    semester: 1,
  })

  // confirm dialog: { type: 'current' | 'delete', item }
  const [dialog, setDialog] = useState(null)
  const [working, setWorking] = useState(false)

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
  const fetchSemesters = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      setLoadError(false)
      const { data, error } = await supabase
        .from('semesters')
        .select('*')
        .order('academic_year', { ascending: false })
        .order('semester', { ascending: false })

      if (error) throw error
      setSemesters(data || [])
    } catch (err) {
      console.error('Error fetching semesters:', err.message)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    document.title = 'Semesters | SE-CONSOLE'
    fetchSemesters()
  }, [fetchSemesters])

  /* ---------- Modal behaviour (ESC / scroll lock) ---------- */
  const modalOpen = showForm || Boolean(dialog)

  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (working || submitting) return
      setShowForm(false)
      setFormErrors({})
      setDialog(null)
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [modalOpen, working, submitting])

  /* ---------- Derived ---------- */
  const current = useMemo(() => semesters.find((s) => s.is_current) || null, [semesters])

  // จัดกลุ่มตามปีการศึกษา (ข้อมูลเรียงจากใหม่ → เก่าอยู่แล้ว)
  const groups = useMemo(() => {
    const map = new Map()
    semesters.forEach((s) => {
      if (!map.has(s.academic_year)) map.set(s.academic_year, [])
      map.get(s.academic_year).push(s)
    })
    return [...map.entries()].map(([year, items]) => ({ year, items }))
  }, [semesters])

  const relationLabel = (item) => {
    if (!current || item.is_current) return null
    return compareTerm(item, current) < 0 ? 'เทอมที่ผ่านมาแล้ว' : 'เทอมที่ยังไม่ถึง'
  }

  /* ---------- Create ---------- */
  const openForm = () => {
    setFormErrors({})
    setShowForm(true)
  }

  const closeForm = () => {
    if (submitting) return
    setShowForm(false)
    setFormErrors({})
  }

  const setField = (name, value) => {
    setFormData((f) => ({ ...f, [name]: value }))
    if (formErrors.academic_year) setFormErrors({})
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    const year = parseInt(formData.academic_year)
    const sem = parseInt(formData.semester)

    const errs = {}
    if (!(year >= YEAR_MIN && year <= YEAR_MAX)) {
      errs.academic_year = 'กรุณากรอกปีการศึกษาเป็น พ.ศ. เช่น 2569'
    } else if (semesters.some((s) => s.academic_year === year && s.semester === sem)) {
      errs.academic_year = `${termLabel({ academic_year: year, semester: sem })} มีอยู่ในระบบแล้ว`
    }
    setFormErrors(errs)
    if (Object.keys(errs).length > 0) return

    try {
      setSubmitting(true)
      const isFirst = semesters.length === 0 // เทอมแรกในระบบให้เป็นเทอมปัจจุบันอัตโนมัติ

      const { error } = await supabase
        .from('semesters')
        .insert([{ academic_year: year, semester: sem, is_current: isFirst }])
      if (error) throw error

      setShowForm(false)
      setFormErrors({})
      showToast('success', 'เพิ่มปีการศึกษาแล้ว', termLabel({ academic_year: year, semester: sem }))
      fetchSemesters({ silent: true })

      sendDiscord(
        `📆 **เพิ่มปีการศึกษาใหม่**\n` +
          `🗓️ **ปีการศึกษา:** ปี ${year} เทอม ${sem}\n` +
          (isFirst ? `⭐ **ตั้งเป็นเทอมปัจจุบันอัตโนมัติ** (เป็นเทอมแรกในระบบ)\n` : '') +
          `👤 **เพิ่มโดย:** ${actor}`
      )
    } catch (err) {
      console.error('Submit Error:', err.message)
      if (err.code === '23505') {
        // unique constraint: มีปี/เทอมนี้อยู่แล้ว (กรณีมีคนเพิ่มพร้อมกัน)
        setFormErrors({ academic_year: `${termLabel({ academic_year: year, semester: sem })} มีอยู่ในระบบแล้ว` })
        fetchSemesters({ silent: true })
      } else {
        showToast('error', 'เพิ่มปีการศึกษาไม่สำเร็จ', err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
      }
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------- Set current ---------- */
  const doSetCurrent = async (item) => {
    const previous = semesters.filter((s) => s.is_current)
    let unset = false

    try {
      setWorking(true)

      // 1. ยกเลิกเทอมปัจจุบันเดิม (ตรวจผลด้วย .select() เพราะ RLS ที่บล็อกจะไม่ error แต่คืน 0 แถว)
      if (previous.length > 0) {
        const { data: cleared, error: clearError } = await supabase
          .from('semesters')
          .update({ is_current: false })
          .eq('is_current', true)
          .select('id')
        if (clearError) throw clearError
        if ((cleared?.length ?? 0) < previous.length) throw new Error('ไม่มีสิทธิ์เปลี่ยนเทอมปัจจุบัน')
        unset = true
      }

      // 2. ตั้งเทอมใหม่เป็นเทอมปัจจุบัน
      const { data, error } = await supabase
        .from('semesters')
        .update({ is_current: true })
        .eq('id', item.id)
        .select('id')
      if (error) throw error
      if (!data || data.length === 0) throw new Error('ไม่พบปีการศึกษานี้ หรือไม่มีสิทธิ์แก้ไข')

      setSemesters((prev) => prev.map((s) => ({ ...s, is_current: s.id === item.id })))
      setDialog(null)
      showToast('success', 'ตั้งเป็นเทอมปัจจุบันแล้ว', termLabel(item))

      sendDiscord(
        `🔄 **เปลี่ยนเทอมปัจจุบัน**\n` +
          `✅ **ระบบใช้งานตอนนี้:** ปี ${item.academic_year} เทอม ${item.semester}\n` +
          (previous[0] ? `⏮️ **เทอมก่อนหน้า:** ปี ${previous[0].academic_year} เทอม ${previous[0].semester}\n` : '') +
          `👤 **เปลี่ยนโดย:** ${actor}`
      )
    } catch (err) {
      console.error('Set current error:', err.message)

      // ขั้นที่ 2 ล้มเหลวหลังยกเลิกเทอมเดิมไปแล้ว → คืนค่าเดิมกลับ (best-effort) กันระบบไม่มีเทอมปัจจุบัน
      if (unset && previous.length > 0) {
        try {
          await supabase.from('semesters').update({ is_current: true }).in('id', previous.map((p) => p.id))
        } catch (rollbackErr) {
          console.error('Rollback failed:', rollbackErr?.message || rollbackErr)
        }
      }

      showToast('error', 'ตั้งเป็นเทอมปัจจุบันไม่สำเร็จ', err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
      setDialog(null)
      fetchSemesters({ silent: true })
    } finally {
      setWorking(false)
    }
  }

  /* ---------- Delete ---------- */
  const requestDelete = (item) => {
    if (item.is_current) {
      showToast('warning', 'ลบเทอมปัจจุบันไม่ได้', 'ตั้งเทอมอื่นเป็นเทอมปัจจุบันก่อน แล้วจึงลบ')
      return
    }
    setDialog({ type: 'delete', item })
  }

  const doDelete = async (item) => {
    if (item.is_current) return

    try {
      setWorking(true)

      const { data, error } = await supabase.from('semesters').delete().eq('id', item.id).select('id')
      if (error) throw error
      if (!data || data.length === 0) throw new Error('ไม่มีสิทธิ์ลบปีการศึกษานี้ หรือรายการถูกลบไปแล้ว')

      setSemesters((prev) => prev.filter((s) => s.id !== item.id))
      setDialog(null)
      showToast('success', 'ลบปีการศึกษาแล้ว', termLabel(item))

      sendDiscord(
        `🗑️ **ลบปีการศึกษา**\n` +
          `🗓️ **ปีการศึกษา:** ปี ${item.academic_year} เทอม ${item.semester} ถูกลบออกจากระบบ\n` +
          `👤 **ลบโดย:** ${actor}`
      )
    } catch (err) {
      console.error('Delete Error:', err.message)
      const message =
        err.code === '23503'
          ? 'มีข้อมูลรายวิชาหรืองานผูกอยู่กับเทอมนี้ จึงลบไม่ได้'
          : err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
      showToast('error', 'ลบปีการศึกษาไม่สำเร็จ', message)
      setDialog(null)
    } finally {
      setWorking(false)
    }
  }

  const confirmDialog = () => {
    if (!dialog || working) return
    return dialog.type === 'current' ? doSetCurrent(dialog.item) : doDelete(dialog.item)
  }

  /* =====================================================================
   * Render
   * ===================================================================== */
  return (
    <div className="se-sm relative mx-auto w-full max-w-[1100px]">
      {/*
        Design tokens — ผูกกับธีมเดิมของโปรเจกต์ (--color-se-*)
        เวอร์ชัน Dark Mode: ทำเพียง override ตัวแปรในบล็อก :root[data-theme='dark'] / .dark ด้านล่าง
        (Toast, Modal, Chip, Input ใช้ตัวแปรชุดนี้ทั้งหมด จึงเปลี่ยนตามธีมเอง)
      */}
      <style>{`
        .se-sm {
          --sm-bg: var(--color-se-background, #f5f5f7);
          --sm-card: var(--color-se-surface, #ffffff);
          --sm-border: var(--color-se-border, rgba(0,0,0,0.12));
          --sm-text: var(--color-se-text-main, #1d1d1f);
          --sm-muted: var(--color-se-text-muted, #6e6e73);
          --sm-primary: var(--color-se-primary, #0071e3);
          --sm-primary-hover: var(--color-se-primary-hover, #0077ed);

          --sm-subtle: color-mix(in srgb, var(--sm-text) 6%, transparent);
          --sm-subtle-hover: color-mix(in srgb, var(--sm-text) 11%, transparent);
          --sm-primary-soft: color-mix(in srgb, var(--sm-primary) 14%, transparent);
          --sm-primary-faint: color-mix(in srgb, var(--sm-primary) 6%, transparent);

          --sm-danger: #d70015;
          --sm-danger-solid: #ff3b30;
          --sm-danger-soft: rgba(255,59,48,0.12);
          --sm-success: #1f8a3b;
          --sm-success-dot: #34c759;
          --sm-success-soft: rgba(52,199,89,0.16);
          --sm-warning: #b25000;
          --sm-warning-soft: rgba(255,149,0,0.16);

          --sm-overlay: rgba(0,0,0,0.38);
          --sm-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05);
          --sm-shadow-lg: 0 24px 80px rgba(0,0,0,0.20);
          color: var(--sm-text);
        }
        :root[data-theme='dark'] .se-sm,
        .dark .se-sm {
          color-scheme: dark;
          --sm-danger: #ff6961;
          --sm-danger-solid: #ff453a;
          --sm-danger-soft: rgba(255,69,58,0.18);
          --sm-success: #30d158;
          --sm-success-dot: #30d158;
          --sm-success-soft: rgba(48,209,88,0.18);
          --sm-warning: #ff9f0a;
          --sm-warning-soft: rgba(255,159,10,0.18);
          --sm-overlay: rgba(0,0,0,0.6);
          --sm-shadow: 0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.25);
          --sm-shadow-lg: 0 24px 80px rgba(0,0,0,0.6);
        }

        @keyframes sm-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sm-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sm-pop  { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: none; } }
        @keyframes sm-pulse { 50% { opacity: .5; } }
        .sm-rise { animation: sm-rise .6s cubic-bezier(.28,.11,.32,1) both; }

        .sm-muted { color: var(--sm-muted); }

        .sm-card {
          background: var(--sm-card);
          border: 1px solid var(--sm-border);
          border-radius: 24px;
          box-shadow: var(--sm-shadow);
        }

        /* รายการแบบ inset-grouped: แถวคั่นด้วยเส้นบาง ๆ ภายในการ์ดเดียว */
        .sm-list { overflow: hidden; }
        .sm-row { display: flex; flex-direction: column; gap: 14px; padding: 18px 22px; transition: background .2s; }
        .sm-row + .sm-row { border-top: 1px solid var(--sm-border); }
        .sm-row[data-current='true'] { background: var(--sm-primary-faint); }
        @media (min-width: 640px) { .sm-row { flex-direction: row; align-items: center; justify-content: space-between; } }

        .sm-badge {
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          width: 44px; height: 44px; border-radius: 999px; font-size: 18px; font-weight: 600;
          background: var(--sm-subtle); color: var(--sm-muted);
        }
        .sm-row[data-current='true'] .sm-badge { background: var(--sm-primary-soft); color: var(--sm-primary); }

        .sm-input {
          width: 100%; height: 44px; padding: 0 14px; border-radius: 12px;
          border: 1px solid var(--sm-border); background: var(--sm-bg); color: var(--sm-text);
          font-size: 15px; outline: none; transition: border-color .2s, box-shadow .2s, background .2s;
        }
        .sm-input::placeholder { color: var(--sm-muted); opacity: .7; }
        .sm-input:focus { border-color: var(--sm-primary); background: var(--sm-card); box-shadow: 0 0 0 4px var(--sm-primary-soft); }
        .sm-input[aria-invalid='true'] { border-color: var(--sm-danger-solid); }
        .sm-input[aria-invalid='true']:focus { box-shadow: 0 0 0 4px var(--sm-danger-soft); }

        .sm-label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; }
        .sm-error { margin-top: 6px; font-size: 13px; color: var(--sm-danger); }

        .sm-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          height: 40px; padding: 0 20px; border: 0; border-radius: 999px;
          font-size: 14px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background .2s, opacity .2s, transform .1s;
        }
        .sm-btn:active:not(:disabled) { transform: scale(.98); }
        .sm-btn:disabled { opacity: .6; cursor: not-allowed; }
        .sm-btn-sm { height: 34px; padding: 0 16px; font-size: 13px; }
        .sm-btn-primary { background: var(--sm-primary); color: #fff; }
        .sm-btn-primary:hover:not(:disabled) { background: var(--sm-primary-hover); }
        .sm-btn-ghost { background: var(--sm-subtle); color: var(--sm-text); }
        .sm-btn-ghost:hover:not(:disabled) { background: var(--sm-subtle-hover); }
        .sm-btn-soft { background: var(--sm-primary-soft); color: var(--sm-primary); }
        .sm-btn-soft:hover:not(:disabled) { background: color-mix(in srgb, var(--sm-primary) 22%, transparent); }
        .sm-btn-danger { background: var(--sm-danger-solid); color: #fff; }
        .sm-btn-danger:hover:not(:disabled) { filter: brightness(.94); }

        .sm-icon-btn {
          display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
          width: 36px; height: 36px; border: 0; border-radius: 999px; background: transparent;
          color: var(--sm-muted); cursor: pointer; transition: background .2s, color .2s;
        }
        .sm-icon-btn:hover { background: var(--sm-danger-soft); color: var(--sm-danger); }
        .sm-icon-btn[aria-disabled='true'] { opacity: .4; cursor: not-allowed; }
        .sm-icon-btn[aria-disabled='true']:hover { background: transparent; color: var(--sm-muted); }
        .sm-icon-btn-neutral:hover { background: var(--sm-subtle-hover); color: var(--sm-text); }
        .sm-icon-btn:focus-visible, .sm-btn:focus-visible, .sm-seg button:focus-visible {
          outline: 2px solid var(--sm-primary); outline-offset: 2px;
        }

        .sm-chip {
          display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px;
          font-size: 12px; font-weight: 500; background: var(--sm-subtle); color: var(--sm-muted);
        }
        .sm-chip-success { background: var(--sm-success-soft); color: var(--sm-success); }
        .sm-dot { width: 7px; height: 7px; border-radius: 999px; background: var(--sm-success-dot); }

        .sm-seg { display: flex; width: 100%; padding: 3px; border-radius: 999px; background: var(--sm-subtle); }
        .sm-seg button {
          flex: 1; height: 38px; padding: 0 14px; border: 0; border-radius: 999px; background: transparent;
          font-size: 14px; font-weight: 500; color: var(--sm-muted); cursor: pointer; transition: all .2s;
        }
        .sm-seg button[aria-pressed='true'] { background: var(--sm-card); color: var(--sm-text); box-shadow: 0 1px 3px rgba(0,0,0,0.14); }

        .sm-banner {
          display: flex; align-items: flex-start; gap: 12px; padding: 14px 18px; border-radius: 18px;
          background: var(--sm-warning-soft); color: var(--sm-text);
        }
        .sm-banner-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 28px; height: 28px; border-radius: 999px; color: var(--sm-warning); }

        .sm-backdrop {
          position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center;
          padding: 16px; background: var(--sm-overlay); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          animation: sm-fade .25s both;
        }
        .sm-modal {
          width: 100%; max-height: calc(100vh - 32px); overflow-y: auto;
          background: var(--sm-card); border: 1px solid var(--sm-border); border-radius: 28px;
          box-shadow: var(--sm-shadow-lg); animation: sm-pop .35s cubic-bezier(.28,.11,.32,1) both;
        }

        /* ===== Custom notification (toast) ===== */
        .sm-toasts {
          position: fixed; left: 50%; bottom: 24px; z-index: 70; transform: translateX(-50%);
          display: flex; flex-direction: column; gap: 10px; width: min(400px, calc(100vw - 32px)); pointer-events: none;
        }
        .sm-toast {
          pointer-events: auto; display: flex; align-items: flex-start; gap: 12px; padding: 12px 12px 12px 14px;
          border-radius: 20px; border: 1px solid var(--sm-border);
          background: color-mix(in srgb, var(--sm-card) 82%, transparent);
          backdrop-filter: blur(24px) saturate(180%); -webkit-backdrop-filter: blur(24px) saturate(180%);
          box-shadow: var(--sm-shadow-lg); animation: sm-pop .35s cubic-bezier(.28,.11,.32,1) both;
        }
        .sm-toast-icon {
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          width: 28px; height: 28px; border-radius: 999px;
        }
        .sm-toast-success .sm-toast-icon { background: var(--sm-success-soft); color: var(--sm-success); }
        .sm-toast-error .sm-toast-icon { background: var(--sm-danger-soft); color: var(--sm-danger); }
        .sm-toast-warning .sm-toast-icon { background: var(--sm-warning-soft); color: var(--sm-warning); }

        .sm-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .sm-skeleton { background: var(--sm-subtle); border-radius: 10px; animation: sm-pulse 1.6s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .sm-rise, .sm-backdrop, .sm-modal, .sm-toast, .sm-skeleton { animation: none; }
          .sm-row { transition: none; }
        }
      `}</style>

      {/* ===== Header ===== */}
      <div className="sm-rise mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[32px] font-semibold leading-[1.15] tracking-[-0.03em] md:text-[40px]">Semesters</h1>
          <p className="sm-muted mt-1 text-[16px]">จัดการปีการศึกษาและภาคเรียน</p>
        </div>
        <button type="button" className="sm-btn sm-btn-primary self-start sm:self-auto" onClick={openForm}>
          <PlusIcon /> เพิ่มปีการศึกษา
        </button>
      </div>

      {/* ===== Content ===== */}
      {loading ? (
        <div className="space-y-8">
          {[0, 1].map((i) => (
            <div key={i}>
              <div className="sm-skeleton mb-3 h-6 w-40" />
              <div className="sm-card p-6">
                <div className="flex items-center gap-4">
                  <div className="sm-skeleton h-11 w-11" style={{ borderRadius: 999 }} />
                  <div className="flex-1">
                    <div className="sm-skeleton h-5 w-1/4" />
                    <div className="sm-skeleton mt-2 h-4 w-1/3" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="sm-card px-8 py-14 text-center">
          <h3 className="text-[20px] font-semibold tracking-[-0.02em]">โหลดข้อมูลปีการศึกษาไม่สำเร็จ</h3>
          <p className="sm-muted mt-2 text-[15px]">เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง</p>
          <button type="button" className="sm-btn sm-btn-primary mt-6" onClick={() => fetchSemesters()}>
            ลองใหม่อีกครั้ง
          </button>
        </div>
      ) : semesters.length === 0 ? (
        <div className="sm-card flex flex-col items-center px-8 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'var(--sm-primary-soft)', color: 'var(--sm-primary)' }}>
            <CalendarIcon />
          </div>
          <h3 className="mt-5 text-[20px] font-semibold tracking-[-0.02em]">ยังไม่มีข้อมูลปีการศึกษา</h3>
          <p className="sm-muted mt-2 text-[15px]">เพิ่มปีการศึกษาแรก ระบบจะตั้งเป็นเทอมปัจจุบันให้อัตโนมัติ</p>
          <button type="button" className="sm-btn sm-btn-primary mt-6" onClick={openForm}>
            <PlusIcon /> เพิ่มปีการศึกษา
          </button>
        </div>
      ) : (
        <div className="sm-rise space-y-8" style={{ animationDelay: '80ms' }}>
          {!current && (
            <div className="sm-banner" role="status">
              <span className="sm-banner-icon"><AlertIcon /></span>
              <div>
                <p className="text-[15px] font-semibold">ยังไม่ได้ตั้งเทอมปัจจุบัน</p>
                <p className="sm-muted mt-0.5 text-[14px]">เลือก “ตั้งเป็นปัจจุบัน” ที่เทอมที่ระบบควรใช้งานอยู่ตอนนี้</p>
              </div>
            </div>
          )}

          {groups.map(({ year, items }) => (
            <section key={year} aria-labelledby={`sm-year-${year}`}>
              <h2 id={`sm-year-${year}`} className="mb-3 px-1 text-[20px] font-semibold tracking-[-0.02em]">
                ปีการศึกษา {year}
              </h2>
              <ul className="sm-card sm-list">
                {items.map((item) => {
                  const relation = relationLabel(item)
                  return (
                    <li key={item.id} className="sm-row" data-current={Boolean(item.is_current)}>
                      <div className="flex items-center gap-4">
                        <div className="sm-badge" aria-hidden>{item.semester}</div>
                        <div className="min-w-0">
                          <h3 className="text-[17px] font-semibold leading-[1.35] tracking-[-0.01em]">เทอม {item.semester}</h3>
                          <div className="mt-1">
                            {item.is_current ? (
                              <span className="sm-chip sm-chip-success"><span className="sm-dot" />เทอมปัจจุบัน</span>
                            ) : relation ? (
                              <span className="sm-muted text-[13px]">{relation}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {!item.is_current && (
                          <button
                            type="button"
                            className="sm-btn sm-btn-soft sm-btn-sm"
                            onClick={() => setDialog({ type: 'current', item })}
                          >
                            ตั้งเป็นปัจจุบัน
                          </button>
                        )}
                        <button
                          type="button"
                          className="sm-icon-btn"
                          aria-label={`ลบ ${termLabel(item)}`}
                          aria-disabled={Boolean(item.is_current)}
                          title={item.is_current ? 'ลบเทอมปัจจุบันไม่ได้' : 'ลบปีการศึกษา'}
                          onClick={() => requestDelete(item)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* ===== Create modal ===== */}
      {showForm && (
        <div
          className="sm-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeForm()
          }}
        >
          <div className="sm-modal max-w-[440px] p-7 md:p-8" role="dialog" aria-modal="true" aria-labelledby="sm-create-title">
            <h2 id="sm-create-title" className="text-[24px] font-semibold tracking-[-0.025em]">เพิ่มปีการศึกษา</h2>
            <p className="sm-muted mt-1 text-[14px]">การเพิ่มจะแจ้งเตือนไปยัง Discord อัตโนมัติ</p>

            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
              <div>
                <label className="sm-label" htmlFor="sm-year">ปีการศึกษา (พ.ศ.)</label>
                <input
                  id="sm-year"
                  type="number"
                  inputMode="numeric"
                  className="sm-input"
                  value={formData.academic_year}
                  onChange={(e) => setField('academic_year', e.target.value)}
                  aria-invalid={Boolean(formErrors.academic_year)}
                  autoFocus
                />
                {formErrors.academic_year && <p className="sm-error">{formErrors.academic_year}</p>}
              </div>

              <div>
                <span className="sm-label">ภาคเรียน</span>
                <div className="sm-seg" role="group" aria-label="ภาคเรียน">
                  {SEMESTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={parseInt(formData.semester) === s}
                      onClick={() => setField('semester', s)}
                    >
                      เทอม {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="sm-btn sm-btn-ghost" onClick={closeForm} disabled={submitting}>
                  ยกเลิก
                </button>
                <button type="submit" className="sm-btn sm-btn-primary" disabled={submitting}>
                  {submitting ? 'กำลังบันทึก...' : 'เพิ่มปีการศึกษา'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Confirm dialog (set current / delete) ===== */}
      {dialog && (
        <div
          className="sm-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !working) setDialog(null)
          }}
        >
          <div className="sm-modal max-w-[440px] p-7 text-center md:p-8" role="alertdialog" aria-modal="true" aria-labelledby="sm-dialog-title">
            {dialog.type === 'delete' ? (
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'var(--sm-danger-soft)', color: 'var(--sm-danger)' }}>
                <TrashIcon className="h-6 w-6" />
              </div>
            ) : (
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'var(--sm-primary-soft)', color: 'var(--sm-primary)' }}>
                <CalendarCheckIcon />
              </div>
            )}

            <h2 id="sm-dialog-title" className="mt-5 text-[22px] font-semibold tracking-[-0.025em]">
              {dialog.type === 'delete' ? 'ลบปีการศึกษานี้ใช่หรือไม่?' : 'ตั้งเป็นเทอมปัจจุบันใช่หรือไม่?'}
            </h2>
            <p className="sm-muted mt-2 text-[15px] leading-[1.6]">
              <span className="font-medium" style={{ color: 'var(--sm-text)' }}>{termLabel(dialog.item)}</span>
              <br />
              {dialog.type === 'delete'
                ? 'การลบไม่สามารถย้อนกลับได้ และจะมีการแจ้งเตือนไปยัง Discord'
                : 'ระบบจะใช้เทอมนี้เป็นเทอมปัจจุบัน และจะมีการแจ้งเตือนไปยัง Discord'}
            </p>

            <div className="mt-7 flex gap-3">
              <button type="button" className="sm-btn sm-btn-ghost flex-1" onClick={() => setDialog(null)} disabled={working}>
                ยกเลิก
              </button>
              <button
                type="button"
                className={`sm-btn flex-1 ${dialog.type === 'delete' ? 'sm-btn-danger' : 'sm-btn-primary'}`}
                onClick={confirmDialog}
                disabled={working}
              >
                {dialog.type === 'delete'
                  ? working ? 'กำลังลบ...' : 'ลบปีการศึกษา'
                  : working ? 'กำลังบันทึก...' : 'ตั้งเป็นปัจจุบัน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Notifications ===== */}
      <div className="sm-toasts" aria-live="polite">
        {toasts.map((t) => {
          const ToastIcon = TOAST_ICON[t.type] || CheckIcon
          return (
            <div key={t.id} className={`sm-toast sm-toast-${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
              <span className="sm-toast-icon"><ToastIcon /></span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[14px] font-semibold leading-[1.4]">{t.message}</p>
                {t.description && (
                  <p className="sm-muted sm-clamp-2 mt-0.5 text-[13px] leading-[1.45] [overflow-wrap:anywhere]">{t.description}</p>
                )}
              </div>
              <button type="button" className="sm-icon-btn sm-icon-btn-neutral" style={{ width: 28, height: 28 }} aria-label="ปิดการแจ้งเตือน" onClick={() => dismissToast(t.id)}>
                <XIcon />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}