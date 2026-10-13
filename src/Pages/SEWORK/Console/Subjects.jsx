import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { notifyDiscord } from '../../../lib/discord'

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const SEMESTERS = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
]

const SECS = [
  { value: 'SEC 1', label: 'SEC 1' },
  { value: 'SEC 2', label: 'SEC 2' },
]

// กัน @everyone / @here / <@id> จากข้อความผู้ใช้ไม่ให้ ping คนใน Discord
const cleanForDiscord = (s = '') =>
  String(s).replace(/@(everyone|here)/gi, '@\u200b$1').replace(/<@/g, '<@\u200b')

/**
 * ส่งแจ้งเตือนผ่าน notifyDiscord (lib/discord → Edge Function discord-notify)
 * notifyDiscord คืน true/false และไม่ throw อยู่แล้ว
 * (true เมื่อ Edge Function ตอบ { success: true }) — try/catch ไว้กันเหนียวเท่านั้น
 */
async function sendDiscord(message) {
  try {
    return (await notifyDiscord(message)) === true
  } catch (err) {
    console.error('Discord notify failed:', err?.message || err)
    return false
  }
}

/* ------------------------------------------------------------------ */
/*  Design tokens + styles                                             */
/*  Dark mode: ใส่ data-theme="dark" ที่ <html> หรือส่ง prop theme     */
/* ------------------------------------------------------------------ */

const styles = `
.sj-root {
  --ui-bg: #f5f5f7;
  --ui-surface: #ffffff;
  --ui-surface-2: #f5f5f7;
  --ui-surface-3: #e8e8ed;
  --ui-text: #1d1d1f;
  --ui-text-2: #6e6e73;
  --ui-text-3: #86868b;
  --ui-line: rgba(0, 0, 0, 0.1);

  --ui-accent: #0071e3;
  --ui-accent-soft: rgba(0, 113, 227, 0.1);
  --ui-accent-solid: #0071e3;
  --ui-accent-solid-hover: #0077ed;

  --ui-danger: #d70015;
  --ui-danger-soft: rgba(215, 0, 21, 0.08);
  --ui-danger-solid: #d70015;
  --ui-danger-solid-hover: #e30018;
  --ui-success: #248a3d;
  --ui-success-soft: rgba(36, 138, 61, 0.12);
  --ui-warning: #b25000;
  --ui-warning-soft: rgba(178, 80, 0, 0.12);

  --ui-glass: rgba(255, 255, 255, 0.78);
  --ui-overlay: rgba(0, 0, 0, 0.32);
  --ui-seg-thumb: #ffffff;
  --ui-shadow-card: 0 1px 3px rgba(0, 0, 0, 0.05);
  --ui-shadow-pop: 0 20px 60px rgba(0, 0, 0, 0.18);

  color-scheme: light;
  color: var(--ui-text);
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text',
    'Helvetica Neue', 'Noto Sans Thai', 'Sarabun', 'Leelawadee UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

[data-theme='dark'] .sj-root,
.sj-root[data-theme='dark'] {
  --ui-bg: #000000;
  --ui-surface: #1c1c1e;
  --ui-surface-2: #2c2c2e;
  --ui-surface-3: #3a3a3c;
  --ui-text: #f5f5f7;
  --ui-text-2: #a1a1a6;
  --ui-text-3: #86868b;
  --ui-line: rgba(255, 255, 255, 0.14);

  --ui-accent: #2997ff;
  --ui-accent-soft: rgba(41, 151, 255, 0.16);

  --ui-danger: #ff453a;
  --ui-danger-soft: rgba(255, 69, 58, 0.16);
  --ui-danger-solid: #e5342a;
  --ui-danger-solid-hover: #f0443a;
  --ui-success: #30d158;
  --ui-success-soft: rgba(48, 209, 88, 0.16);
  --ui-warning: #ff9f0a;
  --ui-warning-soft: rgba(255, 159, 10, 0.16);

  --ui-glass: rgba(44, 44, 46, 0.78);
  --ui-overlay: rgba(0, 0, 0, 0.6);
  --ui-seg-thumb: #636366;
  --ui-shadow-card: none;
  --ui-shadow-pop: 0 20px 60px rgba(0, 0, 0, 0.6);

  color-scheme: dark;
}

.sj-root :focus-visible {
  outline: 2px solid var(--ui-accent);
  outline-offset: 2px;
}

/* Typography */
.sj-title {
  font-size: clamp(2rem, 4.5vw, 3rem);
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.08;
  color: var(--ui-text);
}
.sj-subtitle {
  margin-top: 8px;
  font-size: 1.0625rem;
  line-height: 1.4;
  color: var(--ui-text-2);
}
.sj-group-title {
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.2;
  color: var(--ui-text);
}
.sj-group-count {
  font-size: 0.9375rem;
  color: var(--ui-text-3);
}

/* Buttons */
.sj-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 40px;
  padding: 0 20px;
  border: 0;
  border-radius: 980px;
  font: inherit;
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s, transform 0.12s;
}
.sj-btn:active:not(:disabled) { transform: scale(0.97); }
.sj-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sj-btn-lg { height: 48px; }
.sj-btn-primary { background: var(--ui-accent-solid); color: #fff; }
.sj-btn-primary:hover:not(:disabled) { background: var(--ui-accent-solid-hover); }
.sj-btn-secondary { background: var(--ui-surface-2); color: var(--ui-text); }
.sj-btn-secondary:hover:not(:disabled) { background: var(--ui-surface-3); }
.sj-btn-danger { background: var(--ui-danger-solid); color: #fff; }
.sj-btn-danger:hover:not(:disabled) { background: var(--ui-danger-solid-hover); }

.sj-iconbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ui-text-3);
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
}
.sj-iconbtn:hover { background: var(--ui-surface-2); color: var(--ui-text); }
.sj-iconbtn-danger:hover { background: var(--ui-danger-soft); color: var(--ui-danger); }

/* Cards */
.sj-card {
  display: flex;
  flex-direction: column;
  padding: 24px;
  border-radius: 24px;
  background: var(--ui-surface);
  box-shadow: var(--ui-shadow-card);
}
.sj-code {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 8px;
  background: var(--ui-accent-soft);
  color: var(--ui-accent);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
}
.sj-card-title {
  margin-top: 20px;
  font-size: 1.3125rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.25;
  color: var(--ui-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.sj-card-meta {
  flex-grow: 1;
  margin-top: 6px;
  font-size: 0.9375rem;
  line-height: 1.4;
  color: var(--ui-text-2);
}
.sj-card-foot { margin-top: 20px; display: flex; gap: 8px; }
.sj-chip {
  padding: 4px 10px;
  border-radius: 980px;
  background: var(--ui-surface-2);
  color: var(--ui-text-2);
  font-size: 12px;
  font-weight: 500;
}

/* Empty / skeleton */
.sj-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 72px 24px;
  border-radius: 28px;
  background: var(--ui-surface);
  text-align: center;
}
.sj-empty h2 { font-size: 1.5rem; font-weight: 600; letter-spacing: -0.015em; }
.sj-empty p { margin: 8px 0 24px; color: var(--ui-text-2); }
.sj-skeleton {
  height: 188px;
  border-radius: 24px;
  background: var(--ui-surface);
  animation: sj-pulse 1.4s ease-in-out infinite;
}

/* Overlay + sheet */
.sj-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--ui-overlay);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  animation: sj-fade 0.2s ease-out;
}
.sj-sheet {
  width: 100%;
  max-width: 560px;
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  padding: 32px;
  border-radius: 28px;
  background: var(--ui-surface);
  box-shadow: var(--ui-shadow-pop);
  animation: sj-pop 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.sj-sheet-title {
  font-size: 1.625rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.15;
}
.sj-alert { max-width: 340px; padding: 28px 24px 24px; text-align: center; }
.sj-alert-text { margin: 8px 0 24px; font-size: 0.9375rem; line-height: 1.45; color: var(--ui-text-2); }
.sj-alert-actions { display: flex; flex-direction: column; gap: 8px; }
.sj-alert-actions .sj-btn { width: 100%; height: 44px; }

/* Form */
.sj-label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--ui-text-2);
}
.sj-input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: var(--ui-surface-2);
  color: var(--ui-text);
  font: inherit;
  font-size: 16px;
  transition: border-color 0.15s, box-shadow 0.15s, background-color 0.15s;
}
.sj-input::placeholder { color: var(--ui-text-3); }
.sj-input:focus {
  outline: none;
  border-color: var(--ui-accent);
  background: var(--ui-surface);
  box-shadow: 0 0 0 4px var(--ui-accent-soft);
}
.sj-seg {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  height: 48px;
  padding: 3px;
  border-radius: 12px;
  background: var(--ui-surface-2);
}
.sj-seg-item {
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--ui-text-2);
  font: inherit;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s, box-shadow 0.2s;
}
.sj-seg-item[aria-checked='true'] {
  background: var(--ui-seg-thumb);
  color: var(--ui-text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

/* Toast */
.sj-toasts {
  position: fixed;
  top: max(16px, env(safe-area-inset-top));
  left: 50%;
  z-index: 60;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(calc(100vw - 32px), 400px);
  transform: translateX(-50%);
  pointer-events: none;
}
.sj-toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 12px 14px 14px;
  border-radius: 20px;
  background: var(--ui-glass);
  -webkit-backdrop-filter: saturate(180%) blur(24px);
  backdrop-filter: saturate(180%) blur(24px);
  box-shadow: var(--ui-shadow-pop), 0 0 0 0.5px var(--ui-line);
  pointer-events: auto;
  animation: sj-toast-in 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.sj-toast[data-leaving='true'] {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
  transition: opacity 0.18s, transform 0.18s;
}
.sj-toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
}
.sj-toast-icon[data-type='success'] { background: var(--ui-success-soft); color: var(--ui-success); }
.sj-toast-icon[data-type='error'] { background: var(--ui-danger-soft); color: var(--ui-danger); }
.sj-toast-icon[data-type='warning'] { background: var(--ui-warning-soft); color: var(--ui-warning); }
.sj-toast-icon[data-type='info'] { background: var(--ui-accent-soft); color: var(--ui-accent); }
.sj-toast-title { font-size: 15px; font-weight: 600; line-height: 1.3; color: var(--ui-text); }
.sj-toast-desc { margin-top: 2px; font-size: 14px; line-height: 1.4; color: var(--ui-text-2); }

.sj-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: sj-spin 0.7s linear infinite;
}

@keyframes sj-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes sj-pop {
  from { opacity: 0; transform: translateY(8px) scale(0.96); }
  to { opacity: 1; transform: none; }
}
@keyframes sj-toast-in {
  from { opacity: 0; transform: translateY(-16px) scale(0.96); }
  to { opacity: 1; transform: none; }
}
@keyframes sj-spin { to { transform: rotate(360deg); } }
@keyframes sj-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }

@media (prefers-reduced-motion: reduce) {
  .sj-root *, .sj-root *::before, .sj-root *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
`

/* ------------------------------------------------------------------ */
/*  Small UI pieces                                                    */
/* ------------------------------------------------------------------ */

function Icon({ d, size = 16, strokeWidth = 2 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}

const ICONS = {
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 13l4 4L19 7',
  alert: 'M12 7v6M12 17v.01',
  info: 'M12 11v5M12 7.5v.01',
  trash:
    'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
}

const TOAST_ICON = {
  success: ICONS.check,
  error: ICONS.alert,
  warning: ICONS.alert,
  info: ICONS.info,
}

function Segmented({ label, value, options, onChange }) {
  return (
    <div role="radiogroup" aria-label={label} className="sj-seg">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className="sj-seg-item"
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Toast (custom notification)                                        */
/* ------------------------------------------------------------------ */

function useToasts() {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // push({ type: 'success' | 'error' | 'warning' | 'info', title, description, duration })
  const push = useCallback((toast) => {
    const id = ++idRef.current
    setToasts((prev) => [
      ...prev.slice(-3),
      { id, type: 'info', duration: 4000, ...toast },
    ])
    return id
  }, [])

  return { toasts, push, dismiss }
}

function ToastItem({ toast, onDismiss }) {
  const [leaving, setLeaving] = useState(false)
  const timerRef = useRef(null)
  const closeRef = useRef(null)

  const close = useCallback(() => {
    clearTimeout(timerRef.current)
    setLeaving(true)
    closeRef.current = setTimeout(() => onDismiss(toast.id), 180)
  }, [onDismiss, toast.id])

  const startTimer = useCallback(() => {
    if (!toast.duration) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(close, toast.duration)
  }, [close, toast.duration])

  useEffect(() => {
    startTimer()
    return () => {
      clearTimeout(timerRef.current)
      clearTimeout(closeRef.current)
    }
  }, [startTimer])

  return (
    <div
      className="sj-toast"
      data-leaving={leaving}
      role={toast.type === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => clearTimeout(timerRef.current)}
      onMouseLeave={startTimer}
    >
      <span className="sj-toast-icon" data-type={toast.type}>
        <Icon d={TOAST_ICON[toast.type] || ICONS.info} size={15} strokeWidth={2.5} />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="sj-toast-title">{toast.title}</p>
        {toast.description && <p className="sj-toast-desc">{toast.description}</p>}
      </div>
      <button type="button" className="sj-iconbtn" onClick={close} aria-label="ปิดการแจ้งเตือน">
        <Icon d={ICONS.close} size={14} />
      </button>
    </div>
  )
}

function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="sj-toasts" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const initialForm = () => ({
  academic_year: new Date().getFullYear() + 543,
  semester: 1,
  sec: 'SEC 2',
  subject_code: '',
  subject_name: '',
  instructor: '',
})

export default function Subjects({ theme }) {
  const { toasts, push, dismiss } = useToasts()

  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState(initialForm)

  const setField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }))

  /* ---------- data ---------- */

  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('academic_year', { ascending: false })
        .order('semester', { ascending: false })
        .order('subject_code', { ascending: true })

      if (error) throw error
      setSubjects(data || [])
    } catch (err) {
      console.error('Error fetching subjects:', err.message)
      push({
        type: 'error',
        title: 'โหลดรายวิชาไม่สำเร็จ',
        description: 'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองรีเฟรชหน้านี้อีกครั้ง',
      })
    } finally {
      setLoading(false)
    }
  }, [push])

  useEffect(() => {
    document.title = 'Subjects | SE-CONSOLE'
    fetchSubjects()
  }, [fetchSubjects])

  // จัดกลุ่มตามปีการศึกษา + ภาคเรียน (ลำดับตาม query)
  const groups = useMemo(() => {
    const map = new Map()
    subjects.forEach((s) => {
      const key = `${s.academic_year}-${s.semester}`
      if (!map.has(key)) {
        map.set(key, { key, year: s.academic_year, semester: s.semester, items: [] })
      }
      map.get(key).items.push(s)
    })
    return [...map.values()]
  }, [subjects])

  /* ---------- modal behavior ---------- */

  useEffect(() => {
    if (!showForm && !deleteTarget) return

    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (deleteTarget) {
        if (!deleting) setDeleteTarget(null)
      } else if (!submitting) {
        setShowForm(false)
      }
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [showForm, deleteTarget, submitting, deleting])

  /* ---------- actions ---------- */

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    const code = formData.subject_code.trim()
    const name = formData.subject_name.trim()
    const instructor = formData.instructor.trim()
    if (!code || !name) return

    try {
      setSubmitting(true)
      const { error } = await supabase.from('subjects').insert([
        {
          academic_year: parseInt(formData.academic_year, 10),
          semester: parseInt(formData.semester, 10),
          sec: formData.sec,
          subject_code: code,
          subject_name: name,
          instructor: instructor || null,
        },
      ])

      if (error) throw error

      const message =
        `📚 **เพิ่มรายวิชาใหม่**\n` +
        `รหัส: ${cleanForDiscord(code)}\n` +
        `ชื่อวิชา: ${cleanForDiscord(name)}\n` +
        `ผู้สอน: ${cleanForDiscord(instructor) || '-'}\n` +
        `กลุ่มเรียน: ${formData.sec} (ปีการศึกษา ${formData.academic_year} เทอม ${formData.semester})`

      setShowForm(false)
      setFormData((prev) => ({ ...prev, subject_code: '', subject_name: '', instructor: '' }))
      fetchSubjects()
      push({ type: 'success', title: 'เพิ่มรายวิชาแล้ว', description: `${code} ${name}` })

      // ส่ง Discord แบบไม่บล็อก UI
      sendDiscord(message).then((ok) => {
        if (!ok) {
          push({
            type: 'warning',
            title: 'ส่งแจ้งเตือนไป Discord ไม่สำเร็จ',
            description: 'รายวิชาถูกเพิ่มเรียบร้อยแล้ว แต่ข้อความยังไม่ถูกส่ง',
            duration: 6000,
          })
        }
      })
    } catch (err) {
      console.error('Submit Error:', err.message)
      push({
        type: 'error',
        title: 'เพิ่มรายวิชาไม่สำเร็จ',
        description: 'ตรวจสอบข้อมูลและการเชื่อมต่อ แล้วลองอีกครั้ง',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return
    const { id, subject_code: code, subject_name: name } = deleteTarget

    try {
      setDeleting(true)
      const { data, error } = await supabase.from('subjects').delete().eq('id', id).select('id')

      if (error) throw error
      // RLS บล็อกการลบจะไม่ error แต่ได้ 0 แถว
      if (!data || data.length === 0) throw new Error('ไม่พบรายวิชา หรือไม่มีสิทธิ์ลบ')

      setSubjects((prev) => prev.filter((s) => s.id !== id))
      setDeleteTarget(null)
      push({ type: 'success', title: 'ลบรายวิชาแล้ว', description: `${code} ${name}` })

      sendDiscord(
        `🗑️ **ลบรายวิชา:** ${cleanForDiscord(code)} ${cleanForDiscord(name)} ออกจากระบบแล้ว`
      ).then((ok) => {
        if (!ok) {
          push({
            type: 'warning',
            title: 'ส่งแจ้งเตือนไป Discord ไม่สำเร็จ',
            description: 'รายวิชาถูกลบเรียบร้อยแล้ว แต่ข้อความยังไม่ถูกส่ง',
            duration: 6000,
          })
        }
      })
    } catch (err) {
      console.error('Delete Error:', err.message)
      setDeleteTarget(null)
      push({
        type: 'error',
        title: 'ลบรายวิชาไม่สำเร็จ',
        description: 'ตรวจสอบสิทธิ์การใช้งานและการเชื่อมต่อ แล้วลองอีกครั้ง',
      })
    } finally {
      setDeleting(false)
    }
  }

  /* ---------- render ---------- */

  return (
    <div className="sj-root relative" data-theme={theme}>
      <style>{styles}</style>

      {/* Header */}
      <header className="mb-12 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="sj-title">Subjects</h1>
          <p className="sj-subtitle">จัดการรายวิชาในระบบ</p>
        </div>
        <button type="button" className="sj-btn sj-btn-primary" onClick={() => setShowForm(true)}>
          <Icon d={ICONS.plus} size={16} strokeWidth={2.5} />
          เพิ่มรายวิชา
        </button>
      </header>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="sj-skeleton" />
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <div className="sj-empty">
          <h2>ยังไม่มีรายวิชา</h2>
          <p>เริ่มต้นด้วยการเพิ่มรายวิชาแรกของคุณ</p>
          <button type="button" className="sj-btn sj-btn-primary" onClick={() => setShowForm(true)}>
            เพิ่มรายวิชา
          </button>
        </div>
      ) : (
        <div className="space-y-12">
          {groups.map((group) => (
            <section key={group.key} aria-label={`ปีการศึกษา ${group.year} ภาคเรียนที่ ${group.semester}`}>
              <div className="mb-5 flex items-baseline justify-between gap-4">
                <h2 className="sj-group-title">
                  ปีการศึกษา {group.year} ภาคเรียนที่ {group.semester}
                </h2>
                <span className="sj-group-count">{group.items.length} วิชา</span>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => (
                  <article key={item.id} className="sj-card">
                    <div className="flex items-start justify-between gap-3">
                      <span className="sj-code">{item.subject_code}</span>
                      <button
                        type="button"
                        className="sj-iconbtn sj-iconbtn-danger"
                        onClick={() => setDeleteTarget(item)}
                        aria-label={`ลบรายวิชา ${item.subject_code}`}
                        title="ลบรายวิชา"
                      >
                        <Icon d={ICONS.trash} size={18} />
                      </button>
                    </div>

                    <h3 className="sj-card-title">{item.subject_name}</h3>
                    <p className="sj-card-meta">
                      {item.instructor ? `อาจารย์ ${item.instructor}` : 'ยังไม่ระบุอาจารย์ผู้สอน'}
                    </p>

                    <div className="sj-card-foot">
                      <span className="sj-chip">{item.sec}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div
          className="sj-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !submitting) setShowForm(false)
          }}
        >
          <div className="sj-sheet" role="dialog" aria-modal="true" aria-labelledby="sj-form-title">
            <div className="mb-6 flex items-start justify-between gap-4">
              <h2 id="sj-form-title" className="sj-sheet-title">
                เพิ่มรายวิชา
              </h2>
              <button
                type="button"
                className="sj-iconbtn"
                onClick={() => setShowForm(false)}
                disabled={submitting}
                aria-label="ปิด"
              >
                <Icon d={ICONS.close} size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label htmlFor="sj-year" className="sj-label">ปีการศึกษา</label>
                  <input
                    id="sj-year"
                    type="number"
                    inputMode="numeric"
                    className="sj-input"
                    value={formData.academic_year}
                    onChange={(e) => setField('academic_year', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <span className="sj-label">ภาคเรียน</span>
                  <Segmented
                    label="ภาคเรียน"
                    value={Number(formData.semester)}
                    options={SEMESTERS}
                    onChange={(v) => setField('semester', v)}
                  />
                </div>
                <div>
                  <span className="sj-label">กลุ่มเรียน</span>
                  <Segmented
                    label="กลุ่มเรียน"
                    value={formData.sec}
                    options={SECS}
                    onChange={(v) => setField('sec', v)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="md:col-span-1">
                  <label htmlFor="sj-code" className="sj-label">รหัสวิชา</label>
                  <input
                    id="sj-code"
                    type="text"
                    placeholder="เช่น SWE123"
                    className="sj-input"
                    value={formData.subject_code}
                    onChange={(e) => setField('subject_code', e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="sj-name" className="sj-label">ชื่อรายวิชา</label>
                  <input
                    id="sj-name"
                    type="text"
                    placeholder="เช่น Software Engineering"
                    className="sj-input"
                    value={formData.subject_name}
                    onChange={(e) => setField('subject_name', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="sj-instructor" className="sj-label">อาจารย์ผู้สอน (ถ้ามี)</label>
                <input
                  id="sj-instructor"
                  type="text"
                  placeholder="ชื่ออาจารย์ผู้สอน"
                  className="sj-input"
                  value={formData.instructor}
                  onChange={(e) => setField('instructor', e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  className="sj-btn sj-btn-lg sj-btn-secondary"
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                >
                  ยกเลิก
                </button>
                <button type="submit" className="sj-btn sj-btn-lg sj-btn-primary" disabled={submitting}>
                  {submitting && <span className="sj-spinner" aria-hidden="true" />}
                  {submitting ? 'กำลังเพิ่มรายวิชา...' : 'เพิ่มรายวิชา'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          className="sj-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeleteTarget(null)
          }}
        >
          <div
            className="sj-sheet sj-alert"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="sj-del-title"
            aria-describedby="sj-del-desc"
          >
            <h2 id="sj-del-title" className="sj-sheet-title" style={{ fontSize: '1.25rem' }}>
              ลบรายวิชา {deleteTarget.subject_code}?
            </h2>
            <p id="sj-del-desc" className="sj-alert-text">
              {deleteTarget.subject_name} และงานที่มอบหมายในวิชานี้จะถูกลบถาวร
            </p>
            <div className="sj-alert-actions">
              <button type="button" className="sj-btn sj-btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting && <span className="sj-spinner" aria-hidden="true" />}
                {deleting ? 'กำลังลบรายวิชา...' : 'ลบรายวิชา'}
              </button>
              <button
                type="button"
                className="sj-btn sj-btn-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                autoFocus
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}