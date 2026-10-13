import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { notifyDiscord } from '../../../lib/discord'

/* -------------------------------------------------------------------------- */
/*  Design tokens + styles                                                    */
/*  Dark mode: ใส่ data-theme="dark" ที่ <html> หรือส่ง prop theme            */
/* -------------------------------------------------------------------------- */

const styles = `
.il-root {
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
  --ui-accent-soft-hover: rgba(0, 113, 227, 0.16);
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
  --ui-shadow-card: 0 1px 3px rgba(0, 0, 0, 0.05);
  --ui-shadow-pop: 0 20px 60px rgba(0, 0, 0, 0.18);

  color-scheme: light;
  color: var(--ui-text);
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text',
    'Helvetica Neue', 'Noto Sans Thai', 'Sarabun', 'Leelawadee UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

[data-theme='dark'] .il-root,
.il-root[data-theme='dark'] {
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
  --ui-accent-soft-hover: rgba(41, 151, 255, 0.24);

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
  --ui-shadow-card: none;
  --ui-shadow-pop: 0 20px 60px rgba(0, 0, 0, 0.6);

  color-scheme: dark;
}

.il-root :focus-visible {
  outline: 2px solid var(--ui-accent);
  outline-offset: 2px;
}

/* Header */
.il-title {
  font-size: clamp(2rem, 4.5vw, 3rem);
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.08;
}
.il-subtitle {
  margin-top: 8px;
  font-size: 1.0625rem;
  line-height: 1.4;
  color: var(--ui-text-2);
}

/* Buttons */
.il-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
  padding: 0 20px;
  border: 0;
  border-radius: 980px;
  font: inherit;
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s, transform 0.12s;
}
.il-btn:active:not(:disabled) { transform: scale(0.97); }
.il-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.il-btn-lg { height: 48px; }
.il-btn-primary { background: var(--ui-accent-solid); color: #fff; }
.il-btn-primary:hover:not(:disabled) { background: var(--ui-accent-solid-hover); }
.il-btn-secondary { background: var(--ui-surface-2); color: var(--ui-text); }
.il-btn-secondary:hover:not(:disabled) { background: var(--ui-surface-3); }
.il-btn-soft { background: var(--ui-accent-soft); color: var(--ui-accent); }
.il-btn-soft:hover:not(:disabled) { background: var(--ui-accent-soft-hover); }
.il-btn-danger { background: var(--ui-danger-solid); color: #fff; }
.il-btn-danger:hover:not(:disabled) { background: var(--ui-danger-solid-hover); }
.il-btn-square { width: 44px; height: 44px; padding: 0; flex-shrink: 0; }

.il-iconbtn {
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
.il-iconbtn:hover { background: var(--ui-surface-2); color: var(--ui-text); }
.il-iconbtn-danger:hover { background: var(--ui-danger-soft); color: var(--ui-danger); }

/* Card */
.il-card {
  display: flex;
  flex-direction: column;
  padding: 24px;
  border-radius: 24px;
  background: var(--ui-surface);
  box-shadow: var(--ui-shadow-card);
}
.il-tile {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--ui-accent-soft);
  color: var(--ui-accent);
}
.il-card-title {
  margin-top: 20px;
  font-size: 1.3125rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.25;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.il-card-host {
  margin-top: 4px;
  font-size: 0.875rem;
  color: var(--ui-text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.il-card-desc {
  flex-grow: 1;
  margin-top: 12px;
  font-size: 0.9375rem;
  line-height: 1.45;
  color: var(--ui-text-2);
  overflow-wrap: anywhere;
}
.il-card-meta { margin-top: 12px; font-size: 0.8125rem; color: var(--ui-text-3); }
.il-card-foot { display: flex; gap: 8px; margin-top: 20px; }
.il-grow { flex: 1; height: 44px; }
.il-disabled { opacity: 0.5; cursor: default; pointer-events: none; }

/* Empty + skeleton */
.il-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 72px 24px;
  border-radius: 28px;
  background: var(--ui-surface);
  text-align: center;
}
.il-empty h2 { font-size: 1.5rem; font-weight: 600; letter-spacing: -0.015em; }
.il-empty p { margin: 8px 0 24px; color: var(--ui-text-2); }
.il-empty p:last-child { margin-bottom: 0; }
.il-skeleton {
  height: 252px;
  border-radius: 24px;
  background: var(--ui-surface);
  animation: il-pulse 1.4s ease-in-out infinite;
}

/* Overlay + sheet */
.il-overlay {
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
  animation: il-fade 0.2s ease-out;
}
.il-sheet {
  width: 100%;
  max-width: 520px;
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  padding: 32px;
  border-radius: 28px;
  background: var(--ui-surface);
  box-shadow: var(--ui-shadow-pop);
  animation: il-pop 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.il-sheet-title {
  font-size: 1.625rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.15;
}
.il-alert { max-width: 340px; padding: 28px 24px 24px; text-align: center; }
.il-alert .il-sheet-title { font-size: 1.25rem; }
.il-alert-text {
  margin: 8px 0 24px;
  font-size: 0.9375rem;
  line-height: 1.45;
  color: var(--ui-text-2);
  overflow-wrap: anywhere;
}
.il-alert-actions { display: flex; flex-direction: column; gap: 8px; }
.il-alert-actions .il-btn { width: 100%; height: 44px; }

/* Form */
.il-label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--ui-text-2);
}
.il-input {
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
.il-input::placeholder { color: var(--ui-text-3); }
.il-input:focus {
  outline: none;
  border-color: var(--ui-accent);
  background: var(--ui-surface);
  box-shadow: 0 0 0 4px var(--ui-accent-soft);
}
.il-textarea {
  height: auto;
  min-height: 88px;
  padding: 12px 16px;
  line-height: 1.5;
  resize: vertical;
}

.il-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: il-spin 0.7s linear infinite;
}

/* Toast */
.il-toasts {
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
.il-toast {
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
  animation: il-toast-in 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.il-toast[data-leaving='true'] {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
  transition: opacity 0.18s, transform 0.18s;
}
.il-toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
}
.il-toast-icon[data-type='success'] { background: var(--ui-success-soft); color: var(--ui-success); }
.il-toast-icon[data-type='error'] { background: var(--ui-danger-soft); color: var(--ui-danger); }
.il-toast-icon[data-type='warning'] { background: var(--ui-warning-soft); color: var(--ui-warning); }
.il-toast-icon[data-type='info'] { background: var(--ui-accent-soft); color: var(--ui-accent); }
.il-toast-title { font-size: 15px; font-weight: 600; line-height: 1.3; }
.il-toast-desc { margin-top: 2px; font-size: 14px; line-height: 1.4; color: var(--ui-text-2); overflow-wrap: anywhere; }

@keyframes il-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes il-pop {
  from { opacity: 0; transform: translateY(8px) scale(0.96); }
  to { opacity: 1; transform: none; }
}
@keyframes il-toast-in {
  from { opacity: 0; transform: translateY(-16px) scale(0.96); }
  to { opacity: 1; transform: none; }
}
@keyframes il-spin { to { transform: rotate(360deg); } }
@keyframes il-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }

@media (prefers-reduced-motion: reduce) {
  .il-root *, .il-root *::before, .il-root *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
`

/* -------------------------------------------------------------------------- */
/*  Icons                                                                     */
/* -------------------------------------------------------------------------- */

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
  link: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
  external: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14',
  copy: 'M8 8h10a2 2 0 012 2v10a2 2 0 01-2 2H8a2 2 0 01-2-2V10a2 2 0 012-2zM16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2',
  trash:
    'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
}

const TOAST_ICON = {
  success: ICONS.check,
  error: ICONS.alert,
  warning: ICONS.alert,
  info: ICONS.info,
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

// กัน @everyone / @here / <@id> จากข้อความผู้ใช้ไม่ให้ ping คนใน Discord
const cleanForDiscord = (s = '') =>
  String(s).replace(/@(everyone|here)/gi, '@\u200b$1').replace(/<@/g, '<@\u200b')

/**
 * ส่งแจ้งเตือนผ่าน notifyDiscord (lib/discord → Edge Function discord-notify)
 * notifyDiscord คืน true/false และไม่ throw อยู่แล้ว — try/catch ไว้กันเหนียวเท่านั้น
 */
async function sendDiscord(message) {
  try {
    return (await notifyDiscord(message)) === true
  } catch (err) {
    console.error('Discord notify failed:', err?.message || err)
    return false
  }
}

// อนุญาตเฉพาะ http(s) กัน javascript: / data: ที่อาจถูกบันทึกลงฐานข้อมูล
const toSafeUrl = (value) => {
  try {
    const u = new URL(String(value || '').trim())
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null
  } catch {
    return null
  }
}

const getHost = (value) => {
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return String(value || '')
  }
}

// ความสัมพันธ์ profiles อาจคืนเป็น object หรือ array ขึ้นกับ schema
const getAuthorName = (item) => {
  const a = Array.isArray(item.author) ? item.author[0] : item.author
  return a?.first_name || null
}

// คัดลอกข้อความ (มี fallback สำหรับเบราว์เซอร์/บริบทที่ไม่มี Clipboard API)
async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* ลองวิธีสำรองด้านล่าง */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

/* -------------------------------------------------------------------------- */
/*  Toast (custom notification)                                               */
/* -------------------------------------------------------------------------- */

function useToasts() {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // push({ type: 'success' | 'error' | 'warning' | 'info', title, description, duration })
  const push = useCallback((toast) => {
    const id = ++idRef.current
    setToasts((prev) => [...prev.slice(-3), { id, type: 'info', duration: 4000, ...toast }])
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
      className="il-toast"
      data-leaving={leaving}
      role={toast.type === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => clearTimeout(timerRef.current)}
      onMouseLeave={startTimer}
    >
      <span className="il-toast-icon" data-type={toast.type}>
        <Icon d={TOAST_ICON[toast.type] || ICONS.info} size={15} strokeWidth={2.5} />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="il-toast-title">{toast.title}</p>
        {toast.description && <p className="il-toast-desc">{toast.description}</p>}
      </div>
      <button type="button" className="il-iconbtn" onClick={close} aria-label="ปิดการแจ้งเตือน">
        <Icon d={ICONS.close} size={14} />
      </button>
    </div>
  )
}

function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="il-toasts" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const emptyForm = { title: '', url: '', description: '' }

export default function InternalLinks({ theme }) {
  const { profile } = useAuth()
  const { toasts, push, dismiss } = useToasts()

  // เช็คสิทธิ์: Admin, Manager, CEO สามารถจัดการลิงก์ได้ (สิทธิ์จริงบังคับด้วย RLS)
  const canManage = ['admin', 'manager', 'ceo'].includes(String(profile?.role || '').toLowerCase())

  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState(emptyForm)

  const setField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }))

  /* ---------- data ---------- */

  const fetchLinks = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) setLoading(true)
        setLoadFailed(false)
        const { data, error } = await supabase
          .from('internal_links')
          .select(
            `
            id, title, url, description, created_at,
            author:profiles(first_name)
          `
          )
          .order('created_at', { ascending: false })

        if (error) throw error
        setLinks(data || [])
      } catch (err) {
        console.error('Error fetching internal links:', err.message)
        setLoadFailed(true)
        push({
          type: 'error',
          title: 'โหลดลิงก์ไม่สำเร็จ',
          description: 'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง',
        })
      } finally {
        setLoading(false)
      }
    },
    [push]
  )

  useEffect(() => {
    document.title = 'Internal Links | SE-CONSOLE'
    fetchLinks()
  }, [fetchLinks])

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

  const notifyWithFallback = (message, doneText) => {
    // ส่ง Discord แบบไม่บล็อก UI ถ้าล้มเหลวให้แจ้งผู้ใช้เบาๆ
    sendDiscord(message).then((ok) => {
      if (!ok) {
        push({
          type: 'warning',
          title: 'ส่งแจ้งเตือนไป Discord ไม่สำเร็จ',
          description: `${doneText}เรียบร้อยแล้ว แต่ข้อความยังไม่ถูกส่ง`,
          duration: 6000,
        })
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    const title = formData.title.trim()
    const rawUrl = formData.url.trim()
    const description = formData.description.trim()
    if (!title || !rawUrl) return

    const url = toSafeUrl(rawUrl)
    if (!url) {
      push({
        type: 'error',
        title: 'ลิงก์ไม่ถูกต้อง',
        description: 'ใช้ลิงก์ที่ขึ้นต้นด้วย http:// หรือ https://',
      })
      return
    }

    if (!profile?.id) {
      push({
        type: 'error',
        title: 'เพิ่มลิงก์ไม่สำเร็จ',
        description: 'ไม่พบข้อมูลผู้ใช้ ลองรีเฟรชหน้านี้แล้วลองอีกครั้ง',
      })
      return
    }

    try {
      setSubmitting(true)

      const { error } = await supabase.from('internal_links').insert([
        {
          title,
          url,
          description,
          author_id: profile.id,
        },
      ])

      if (error) throw error

      const message =
        `🔗 **เพิ่มลิงก์ภายในใหม่**\n` +
        `📌 **หัวข้อ:** ${cleanForDiscord(title)}\n` +
        `📝 **รายละเอียด:** ${cleanForDiscord(description) || '-'}\n` +
        `🌐 **ลิงก์:** ${url}`

      setShowForm(false)
      setFormData(emptyForm)
      fetchLinks({ silent: true })
      push({ type: 'success', title: 'เพิ่มลิงก์แล้ว', description: title })
      notifyWithFallback(message, 'เพิ่มลิงก์')
    } catch (err) {
      console.error('Submit Error:', err.message)
      push({
        type: 'error',
        title: 'เพิ่มลิงก์ไม่สำเร็จ',
        description: 'ตรวจสอบข้อมูลและสิทธิ์การใช้งาน แล้วลองอีกครั้ง',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return
    const { id, title } = deleteTarget

    try {
      setDeleting(true)
      const { data, error } = await supabase.from('internal_links').delete().eq('id', id).select('id')

      if (error) throw error
      // RLS บล็อกการลบจะไม่ error แต่ได้ 0 แถว
      if (!data || data.length === 0) throw new Error('ไม่พบลิงก์ หรือไม่มีสิทธิ์ลบ')

      setLinks((prev) => prev.filter((l) => l.id !== id))
      setDeleteTarget(null)
      push({ type: 'success', title: 'ลบลิงก์แล้ว', description: title })
      notifyWithFallback(`🗑️ **ลบลิงก์ภายใน:** "${cleanForDiscord(title)}" ถูกลบออกจากระบบ`, 'ลบลิงก์')
    } catch (err) {
      console.error('Delete Error:', err.message)
      setDeleteTarget(null)
      push({
        type: 'error',
        title: 'ลบลิงก์ไม่สำเร็จ',
        description: 'ตรวจสอบสิทธิ์การใช้งานและการเชื่อมต่อ แล้วลองอีกครั้ง',
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleCopy = async (href, host) => {
    const ok = await copyText(href)
    if (ok) {
      push({ type: 'success', title: 'คัดลอกลิงก์แล้ว', description: host, duration: 2500 })
    } else {
      push({
        type: 'error',
        title: 'คัดลอกลิงก์ไม่สำเร็จ',
        description: 'เบราว์เซอร์ไม่อนุญาตให้คัดลอก ลองเปิดลิงก์แล้วคัดลอกจากแถบที่อยู่',
      })
    }
  }

  /* ---------- render ---------- */

  return (
    <div className="il-root pb-12" data-theme={theme}>
      <style>{styles}</style>

      {/* Header */}
      <header className="mb-12 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="il-title">Internal Links</h1>
          <p className="il-subtitle">รวบรวมลิงก์สำคัญที่ใช้บ่อยภายในองค์กร/สาขา</p>
        </div>
        {canManage && (
          <button type="button" className="il-btn il-btn-primary" onClick={() => setShowForm(true)}>
            <Icon d={ICONS.plus} size={16} strokeWidth={2.5} />
            เพิ่มลิงก์
          </button>
        )}
      </header>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="il-skeleton" />
          ))}
        </div>
      ) : loadFailed && links.length === 0 ? (
        <div className="il-empty">
          <h2>โหลดลิงก์ไม่สำเร็จ</h2>
          <p>ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง</p>
          <button type="button" className="il-btn il-btn-primary" onClick={() => fetchLinks()}>
            โหลดลิงก์ใหม่
          </button>
        </div>
      ) : links.length === 0 ? (
        <div className="il-empty">
          <h2>ยังไม่มีลิงก์</h2>
          {canManage ? (
            <>
              <p>เริ่มต้นด้วยการเพิ่มลิงก์แรกให้ทุกคนในสาขา</p>
              <button type="button" className="il-btn il-btn-primary" onClick={() => setShowForm(true)}>
                เพิ่มลิงก์
              </button>
            </>
          ) : (
            <p>เมื่อผู้ดูแลเพิ่มลิงก์ จะแสดงที่นี่</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {links.map((item) => {
            const href = toSafeUrl(item.url)
            const host = getHost(item.url)
            const author = getAuthorName(item)

            return (
              <article key={item.id} className="il-card">
                <div className="flex items-start justify-between gap-3">
                  <span className="il-tile">
                    <Icon d={ICONS.link} size={22} />
                  </span>
                  {canManage && (
                    <button
                      type="button"
                      className="il-iconbtn il-iconbtn-danger"
                      onClick={() => setDeleteTarget(item)}
                      aria-label={`ลบลิงก์ ${item.title}`}
                      title="ลบลิงก์"
                    >
                      <Icon d={ICONS.trash} size={18} />
                    </button>
                  )}
                </div>

                <h3 className="il-card-title">{item.title}</h3>
                <p className="il-card-host">{host}</p>
                <p className="il-card-desc">{item.description || 'ไม่มีคำอธิบาย'}</p>
                {author && <p className="il-card-meta">เพิ่มโดย {author}</p>}

                <div className="il-card-foot">
                  {href ? (
                    <>
                      <a
                        className="il-btn il-btn-soft il-grow"
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        เปิดลิงก์
                        <Icon d={ICONS.external} size={16} />
                      </a>
                      <button
                        type="button"
                        className="il-btn il-btn-secondary il-btn-square"
                        onClick={() => handleCopy(href, host)}
                        aria-label={`คัดลอกลิงก์ ${item.title}`}
                        title="คัดลอกลิงก์"
                      >
                        <Icon d={ICONS.copy} size={18} />
                      </button>
                    </>
                  ) : (
                    <span className="il-btn il-btn-secondary il-grow il-disabled" aria-disabled="true">
                      ลิงก์ไม่ถูกต้อง
                    </span>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div
          className="il-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !submitting) setShowForm(false)
          }}
        >
          <div className="il-sheet" role="dialog" aria-modal="true" aria-labelledby="il-form-title">
            <div className="mb-6 flex items-start justify-between gap-4">
              <h2 id="il-form-title" className="il-sheet-title">
                เพิ่มลิงก์
              </h2>
              <button
                type="button"
                className="il-iconbtn"
                onClick={() => setShowForm(false)}
                disabled={submitting}
                aria-label="ปิด"
              >
                <Icon d={ICONS.close} size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="il-title" className="il-label">ชื่อลิงก์</label>
                <input
                  id="il-title"
                  type="text"
                  className="il-input"
                  placeholder="เช่น ระบบบริการการศึกษา"
                  value={formData.title}
                  onChange={(e) => setField('title', e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label htmlFor="il-url" className="il-label">URL</label>
                <input
                  id="il-url"
                  type="url"
                  inputMode="url"
                  className="il-input"
                  placeholder="https://"
                  value={formData.url}
                  onChange={(e) => setField('url', e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="il-desc" className="il-label">คำอธิบายสั้นๆ (ถ้ามี)</label>
                <textarea
                  id="il-desc"
                  rows={3}
                  className="il-input il-textarea"
                  placeholder="เช่น สำหรับดูเกรดและลงทะเบียนเรียน"
                  value={formData.description}
                  onChange={(e) => setField('description', e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  className="il-btn il-btn-lg il-btn-secondary"
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                >
                  ยกเลิก
                </button>
                <button type="submit" className="il-btn il-btn-lg il-btn-primary" disabled={submitting}>
                  {submitting && <span className="il-spinner" aria-hidden="true" />}
                  {submitting ? 'กำลังเพิ่มลิงก์...' : 'เพิ่มลิงก์'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          className="il-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeleteTarget(null)
          }}
        >
          <div
            className="il-sheet il-alert"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="il-del-title"
            aria-describedby="il-del-desc"
          >
            <h2 id="il-del-title" className="il-sheet-title">
              ลบลิงก์นี้?
            </h2>
            <p id="il-del-desc" className="il-alert-text">
              ลิงก์ "{deleteTarget.title}" จะถูกลบถาวร และทุกคนจะไม่เห็นลิงก์นี้อีก
            </p>
            <div className="il-alert-actions">
              <button type="button" className="il-btn il-btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting && <span className="il-spinner" aria-hidden="true" />}
                {deleting ? 'กำลังลบลิงก์...' : 'ลบลิงก์'}
              </button>
              <button
                type="button"
                className="il-btn il-btn-secondary"
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