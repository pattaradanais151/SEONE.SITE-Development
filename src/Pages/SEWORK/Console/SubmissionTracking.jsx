import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { notifyDiscord } from '../../../lib/discord'

/* -------------------------------------------------------------------------- */
/*  Design tokens + styles                                                    */
/*  Dark mode: ตามคลาส .dark ที่ <html> (ปุ่มสลับธีมของแอป)                   */
/*  หรือใส่ data-theme="dark" / ส่ง prop theme ก็ได้                          */
/* -------------------------------------------------------------------------- */

const styles = `
.st-root {
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
  --ui-success: #248a3d;
  --ui-success-soft: rgba(36, 138, 61, 0.1);
  --ui-success-bar: #34c759;
  --ui-warning: #b25000;
  --ui-warning-soft: rgba(178, 80, 0, 0.12);
  --ui-purple: #8944ab;
  --ui-purple-soft: rgba(137, 68, 171, 0.12);

  --ui-glass: rgba(255, 255, 255, 0.78);
  --ui-overlay: rgba(0, 0, 0, 0.32);
  --ui-field: rgba(118, 118, 128, 0.12);
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

.dark .st-root,
.st-root.dark,
[data-theme='dark'] .st-root,
.st-root[data-theme='dark'] {
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
  --ui-success: #30d158;
  --ui-success-soft: rgba(48, 209, 88, 0.14);
  --ui-success-bar: #30d158;
  --ui-warning: #ff9f0a;
  --ui-warning-soft: rgba(255, 159, 10, 0.16);
  --ui-purple: #bf5af2;
  --ui-purple-soft: rgba(191, 90, 242, 0.18);

  --ui-glass: rgba(44, 44, 46, 0.78);
  --ui-overlay: rgba(0, 0, 0, 0.6);
  --ui-field: rgba(118, 118, 128, 0.24);
  --ui-seg-thumb: #636366;
  --ui-shadow-card: none;
  --ui-shadow-pop: 0 20px 60px rgba(0, 0, 0, 0.6);

  color-scheme: dark;
}

.st-root :focus-visible {
  outline: 2px solid var(--ui-accent);
  outline-offset: 2px;
}

/* Header */
.st-title {
  font-size: clamp(2rem, 4.5vw, 3rem);
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.1;
}
.st-subtitle {
  margin-top: 8px;
  font-size: 1.0625rem;
  line-height: 1.4;
  color: var(--ui-text-2);
}
.st-stat {
  min-width: 128px;
  padding: 14px 22px;
  border-radius: 20px;
  background: var(--ui-surface);
  box-shadow: var(--ui-shadow-card);
}
.st-stat-label { font-size: 13px; color: var(--ui-text-2); }
.st-stat-value {
  margin-top: 2px;
  font-size: 1.75rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

/* Filters */
.st-select-wrap { position: relative; display: inline-flex; }
.st-select {
  height: 44px;
  padding: 0 40px 0 16px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: var(--ui-field);
  color: var(--ui-text);
  font: inherit;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.st-select:focus {
  outline: none;
  border-color: var(--ui-accent);
  box-shadow: 0 0 0 4px var(--ui-accent-soft);
}
.st-select-chevron {
  position: absolute;
  top: 50%;
  right: 14px;
  transform: translateY(-50%);
  color: var(--ui-text-3);
  pointer-events: none;
}

.st-seg {
  display: flex;
  height: 44px;
  padding: 3px;
  border-radius: 12px;
  background: var(--ui-field);
}
.st-seg-item {
  flex: 1 1 auto;
  padding: 0 14px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--ui-text-2);
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s, box-shadow 0.2s;
}
.st-seg-item[aria-checked='true'] {
  background: var(--ui-seg-thumb);
  color: var(--ui-text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.st-search { position: relative; flex: 1 1 240px; min-width: 0; max-width: 360px; margin-left: auto; }
.st-search-icon {
  position: absolute;
  top: 50%;
  left: 14px;
  transform: translateY(-50%);
  color: var(--ui-text-3);
  pointer-events: none;
}
.st-search-input {
  width: 100%;
  height: 44px;
  padding: 0 44px 0 42px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: var(--ui-field);
  color: var(--ui-text);
  font: inherit;
  font-size: 16px;
  transition: border-color 0.15s, box-shadow 0.15s, background-color 0.15s;
}
.st-search-input::placeholder { color: var(--ui-text-3); }
.st-search-input:focus {
  outline: none;
  border-color: var(--ui-accent);
  background: var(--ui-surface);
  box-shadow: 0 0 0 4px var(--ui-accent-soft);
}
.st-search-clear { position: absolute; top: 50%; right: 8px; transform: translateY(-50%); }

/* Buttons */
.st-btn {
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
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s, transform 0.12s;
}
.st-btn:active:not(:disabled) { transform: scale(0.97); }
.st-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.st-btn-lg { height: 44px; padding: 0 28px; }
.st-btn-primary { background: var(--ui-accent-solid); color: #fff; }
.st-btn-primary:hover:not(:disabled) { background: var(--ui-accent-solid-hover); }
.st-btn-soft { background: var(--ui-accent-soft); color: var(--ui-accent); }
.st-btn-soft:hover:not(:disabled) { background: var(--ui-accent-soft); filter: brightness(0.96); }
.st-btn-secondary { background: var(--ui-surface-2); color: var(--ui-text); }
.st-btn-secondary:hover:not(:disabled) { background: var(--ui-surface-3); }

.st-iconbtn {
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
.st-iconbtn:hover { background: var(--ui-surface-2); color: var(--ui-text); }

/* Chips */
.st-chip {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 980px;
  background: var(--ui-surface-2);
  color: var(--ui-text-2);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}
.st-chip[data-tone='accent'] { background: var(--ui-accent-soft); color: var(--ui-accent); }
.st-chip[data-tone='purple'] { background: var(--ui-purple-soft); color: var(--ui-purple); }
.st-chip[data-tone='warning'] { background: var(--ui-warning-soft); color: var(--ui-warning); }
.st-code {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 8px;
  background: var(--ui-accent-soft);
  color: var(--ui-accent);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

/* Assignment list */
.st-panel {
  margin-top: 20px;
  border-radius: 28px;
  background: var(--ui-surface);
  box-shadow: var(--ui-shadow-card);
  overflow: hidden;
}
.st-row {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(160px, 220px) auto;
  align-items: center;
  gap: 16px 28px;
  padding: 20px 28px;
}
.st-row + .st-row::before {
  content: '';
  position: absolute;
  top: 0;
  right: 28px;
  left: 28px;
  height: 1px;
  background: var(--ui-line);
}
.st-task {
  margin-top: 8px;
  font-size: 1.0625rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.35;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.st-progress-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--ui-text-2);
}
.st-progress-pct { font-weight: 600; color: var(--ui-accent); font-variant-numeric: tabular-nums; }
.st-progress-pct[data-done='true'] { color: var(--ui-success); }
.st-bar { height: 6px; border-radius: 980px; background: var(--ui-field); overflow: hidden; }
.st-bar-fill {
  height: 100%;
  border-radius: 980px;
  background: var(--ui-accent-solid);
  transition: width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.st-bar-fill[data-done='true'] { background: var(--ui-success-bar); }

@media (max-width: 767px) {
  .st-row { grid-template-columns: minmax(0, 1fr) auto; padding: 18px 20px; gap: 14px 16px; }
  .st-row + .st-row::before { right: 20px; left: 20px; }
  .st-row-main { grid-column: 1; grid-row: 1; }
  .st-row-action { grid-column: 2; grid-row: 1; }
  .st-progress { grid-column: 1 / -1; grid-row: 2; }
}

/* Empty + skeleton */
.st-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 20px;
  padding: 72px 24px;
  border-radius: 28px;
  background: var(--ui-surface);
  text-align: center;
}
.st-empty h2 { font-size: 1.5rem; font-weight: 600; letter-spacing: -0.015em; }
.st-empty p { margin: 8px 0 24px; color: var(--ui-text-2); }
.st-empty p:last-child { margin-bottom: 0; }
.st-skeleton-row {
  height: 84px;
  margin: 0 28px;
  border-radius: 14px;
  background: var(--ui-surface-2);
  animation: st-pulse 1.4s ease-in-out infinite;
}
.st-skeleton-wrap { display: grid; gap: 12px; padding: 20px 0; }

/* Overlay + sheet */
.st-overlay {
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
  animation: st-fade 0.2s ease-out;
}
.st-sheet {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 960px;
  max-height: calc(100dvh - 32px);
  overflow: hidden;
  border-radius: 28px;
  background: var(--ui-surface);
  box-shadow: var(--ui-shadow-pop);
  animation: st-pop 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.st-sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 28px;
  border-bottom: 1px solid var(--ui-line);
}
.st-tile {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 14px;
  background: var(--ui-accent-soft);
  color: var(--ui-accent);
}
.st-sheet-title { font-size: 1.375rem; font-weight: 600; letter-spacing: -0.02em; line-height: 1.2; }
.st-sheet-sub { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 6px; font-size: 14px; color: var(--ui-text-2); }
.st-sheet-body { flex: 1 1 auto; overflow-y: auto; padding: 20px 28px 28px; background: var(--ui-bg); }
.st-sheet-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 28px;
  border-top: 1px solid var(--ui-line);
}
.st-save-status { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--ui-text-2); }

.st-summary {
  margin-bottom: 16px;
  padding: 16px 20px;
  border-radius: 18px;
  background: var(--ui-surface);
}

/* Student tiles */
.st-student {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  border: 0;
  border-radius: 18px;
  background: var(--ui-surface);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s, transform 0.12s;
}
.st-student:active { transform: scale(0.985); }
.st-student[aria-checked='true'] { background: var(--ui-success-soft); }
.st-student[data-pending='true'] { opacity: 0.6; cursor: progress; }
.st-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border: 2px solid var(--ui-text-3);
  border-radius: 50%;
  color: transparent;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}
.st-student[aria-checked='true'] .st-check {
  border-color: var(--ui-success-bar);
  background: var(--ui-success-bar);
  color: #fff;
}
.st-student-name {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.st-student-sub { display: flex; align-items: center; gap: 8px; margin-top: 4px; min-width: 0; }
.st-student-nick { font-size: 13px; color: var(--ui-text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.st-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--ui-line);
  border-top-color: var(--ui-accent);
  border-radius: 50%;
  animation: st-spin 0.7s linear infinite;
}

/* Toast */
.st-toasts {
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
.st-toast {
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
  animation: st-toast-in 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.st-toast[data-leaving='true'] {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
  transition: opacity 0.18s, transform 0.18s;
}
.st-toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
}
.st-toast-icon[data-type='success'] { background: var(--ui-success-soft); color: var(--ui-success); }
.st-toast-icon[data-type='error'] { background: var(--ui-danger-soft); color: var(--ui-danger); }
.st-toast-icon[data-type='warning'] { background: var(--ui-warning-soft); color: var(--ui-warning); }
.st-toast-icon[data-type='info'] { background: var(--ui-accent-soft); color: var(--ui-accent); }
.st-toast-title { font-size: 15px; font-weight: 600; line-height: 1.3; }
.st-toast-desc { margin-top: 2px; font-size: 14px; line-height: 1.4; color: var(--ui-text-2); overflow-wrap: anywhere; }

@keyframes st-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes st-pop {
  from { opacity: 0; transform: translateY(8px) scale(0.96); }
  to { opacity: 1; transform: none; }
}
@keyframes st-toast-in {
  from { opacity: 0; transform: translateY(-16px) scale(0.96); }
  to { opacity: 1; transform: none; }
}
@keyframes st-spin { to { transform: rotate(360deg); } }
@keyframes st-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }

@media (max-width: 640px) {
  .st-sheet-head, .st-sheet-foot { padding-left: 20px; padding-right: 20px; }
  .st-sheet-body { padding: 16px 20px 20px; }
}

@media (prefers-reduced-motion: reduce) {
  .st-root *, .st-root *::before, .st-root *::after {
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
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 13l4 4L19 7',
  alert: 'M12 7v6M12 17v.01',
  info: 'M12 11v5M12 7.5v.01',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  chevron: 'M6 9l6 6 6-6',
  checkCircle: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
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

const ROLES = {
  ceo: { label: 'Super Admin', tone: 'warning' },
  manager: { label: 'Manager', tone: 'purple' },
  admin: { label: 'Admin', tone: 'accent' },
  default: { label: 'Student', tone: 'neutral' },
}
const getRole = (role) => ROLES[String(role || '').toLowerCase()] || ROLES.default

const SEC_OPTIONS = [
  { value: 'SEC 1', label: 'SEC 1 ปกติ' },
  { value: 'SEC 2', label: 'SEC 2 เทียบโอน' },
]
const SEMESTER_OPTIONS = [
  { value: 1, label: 'เทอม 1' },
  { value: 2, label: 'เทอม 2' },
  { value: 3, label: 'เทอม 3' },
]

const secLabel = (sec) => (sec === 'SEC 1' ? '1 (ปกติ)' : '2 (เทียบโอน)')

// subject อาจคืนเป็น object หรือ array ขึ้นกับ schema
const getSubjectCode = (task) => {
  const s = Array.isArray(task.subject) ? task.subject[0] : task.subject
  return s?.subject_code || ''
}

const toPercent = (done, total) => (total ? Math.min(100, Math.round((done / total) * 100)) : 0)

// ดึงงานที่ Approved ทั้งหมดแบบแบ่งหน้า (Supabase จำกัด 1,000 แถวต่อคำขอ)
async function fetchApprovedSubmissions(assignmentIds) {
  const PAGE = 1000
  const rows = []
  let from = 0

  for (;;) {
    const { data, error } = await supabase
      .from('submission_tracking')
      .select('assignment_id, student_id')
      .eq('status', 'Approved')
      .in('assignment_id', assignmentIds)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)

    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < PAGE) break
    from += PAGE
  }

  return rows
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
      className="st-toast"
      data-leaving={leaving}
      role={toast.type === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => clearTimeout(timerRef.current)}
      onMouseLeave={startTimer}
    >
      <span className="st-toast-icon" data-type={toast.type}>
        <Icon d={TOAST_ICON[toast.type] || ICONS.info} size={15} strokeWidth={2.5} />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="st-toast-title">{toast.title}</p>
        {toast.description && <p className="st-toast-desc">{toast.description}</p>}
      </div>
      <button type="button" className="st-iconbtn" onClick={close} aria-label="ปิดการแจ้งเตือน">
        <Icon d={ICONS.close} size={14} />
      </button>
    </div>
  )
}

function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="st-toasts" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Small components                                                          */
/* -------------------------------------------------------------------------- */

function Segmented({ label, value, options, onChange }) {
  return (
    <div role="radiogroup" aria-label={label} className="st-seg">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className="st-seg-item"
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function ProgressBar({ percent }) {
  const done = percent === 100
  return (
    <div className="st-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
      <div className="st-bar-fill" data-done={done} style={{ width: `${percent}%` }} />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function SubmissionTracking({ theme }) {
  const { profile } = useAuth()
  const isCeo = profile?.role === 'ceo'
  const { toasts, push, dismiss } = useToasts()

  // Filters
  const currentYear = new Date().getFullYear() + 543
  const [academicYear, setAcademicYear] = useState(currentYear)
  const [semester, setSemester] = useState(1)
  const [sec, setSec] = useState(profile?.sec || 'SEC 1')
  const [searchQuery, setSearchQuery] = useState('')

  // Data
  const [assignments, setAssignments] = useState([]) // { id, title, subject, approvedCount }
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  // Check sheet
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeAssignment, setActiveAssignment] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [modalLoading, setModalLoading] = useState(false)
  const [modalFailed, setModalFailed] = useState(false)
  const [pendingIds, setPendingIds] = useState(() => new Set())
  const [dirty, setDirty] = useState(false) // มีการเปลี่ยนแปลงในรอบที่เปิดอยู่หรือไม่

  const fetchReqRef = useRef(0)
  const modalReqRef = useRef(0)
  const activeIdRef = useRef(null)

  /* ---------- filters / data ---------- */

  useEffect(() => {
    document.title = 'ติดตามสถานะการส่งงาน | SE-CONSOLE'
  }, [])

  // ผู้ใช้ที่ไม่ใช่ CEO ดูได้เฉพาะ SEC ของตัวเอง
  useEffect(() => {
    if (!isCeo && profile?.sec) setSec(profile.sec)
  }, [profile?.sec, isCeo])

  const fetchData = useCallback(async () => {
    const reqId = ++fetchReqRef.current

    try {
      setLoading(true)
      setLoadFailed(false)

      const [studentsRes, assignmentsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, first_name, last_name, nickname, role')
          .eq('sec', sec)
          .order('first_name', { ascending: true }),
        supabase
          .from('assignments')
          .select('id, title, subject:subjects(subject_code)')
          .eq('academic_year', academicYear)
          .eq('semester', semester)
          .eq('sec', sec)
          .order('created_at', { ascending: false }),
      ])

      if (studentsRes.error) throw studentsRes.error
      if (assignmentsRes.error) throw assignmentsRes.error

      const studentList = studentsRes.data || []
      const taskList = assignmentsRes.data || []
      const approved = taskList.length ? await fetchApprovedSubmissions(taskList.map((t) => t.id)) : []

      if (reqId !== fetchReqRef.current) return // มีการเปลี่ยน filter ระหว่างโหลด

      // นับเฉพาะคนที่อยู่ในห้องนี้ ป้องกันความคืบหน้าเกิน 100%
      const studentIds = new Set(studentList.map((s) => s.id))
      const counts = new Map()
      approved.forEach((s) => {
        if (studentIds.has(s.student_id)) counts.set(s.assignment_id, (counts.get(s.assignment_id) || 0) + 1)
      })

      setStudents(studentList)
      setAssignments(taskList.map((t) => ({ ...t, approvedCount: counts.get(t.id) || 0 })))
    } catch (err) {
      if (reqId !== fetchReqRef.current) return
      console.error('Error fetching data:', err?.message || err)
      setLoadFailed(true)
      push({
        type: 'error',
        title: 'โหลดข้อมูลไม่สำเร็จ',
        description: 'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง',
      })
    } finally {
      if (reqId === fetchReqRef.current) setLoading(false)
    }
  }, [academicYear, semester, sec, push])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const bumpApproved = useCallback((assignmentId, delta) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === assignmentId ? { ...a, approvedCount: Math.max(0, a.approvedCount + delta) } : a
      )
    )
  }, [])

  const filteredAssignments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return assignments
    return assignments.filter(
      (a) => (a.title || '').toLowerCase().includes(q) || getSubjectCode(a).toLowerCase().includes(q)
    )
  }, [assignments, searchQuery])

  /* ---------- check sheet ---------- */

  const submissionMap = useMemo(() => new Map(submissions.map((s) => [s.student_id, s])), [submissions])

  const modalApproved = useMemo(
    () => students.filter((s) => submissionMap.get(s.id)?.status === 'Approved').length,
    [students, submissionMap]
  )

  const openCheckModal = async (assignment) => {
    const reqId = ++modalReqRef.current
    activeIdRef.current = assignment.id

    setActiveAssignment(assignment)
    setIsModalOpen(true)
    setSubmissions([])
    setPendingIds(new Set())
    setDirty(false)
    setModalFailed(false)
    setModalLoading(true)

    try {
      const { data, error } = await supabase
        .from('submission_tracking')
        .select('*')
        .eq('assignment_id', assignment.id)

      if (error) throw error
      if (reqId !== modalReqRef.current) return
      setSubmissions(data || [])
    } catch (err) {
      if (reqId !== modalReqRef.current) return
      console.error('Error fetching submissions:', err?.message || err)
      setModalFailed(true)
      push({
        type: 'error',
        title: 'โหลดสถานะการส่งงานไม่สำเร็จ',
        description: 'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง',
      })
    } finally {
      if (reqId === modalReqRef.current) setModalLoading(false)
    }
  }

  // สลับสถานะ Approved <-> Submitted ของนักศึกษา 1 คน (บันทึกอัตโนมัติ)
  const toggleSubmission = async (student) => {
    if (!activeAssignment || pendingIds.has(student.id)) return

    if (!profile?.id) {
      push({
        type: 'error',
        title: 'บันทึกไม่สำเร็จ',
        description: 'ไม่พบข้อมูลผู้ตรวจ ลองรีเฟรชหน้านี้แล้วลองอีกครั้ง',
      })
      return
    }

    const assignmentId = activeAssignment.id
    const existing = submissionMap.get(student.id)
    const newStatus = existing?.status === 'Approved' ? 'Submitted' : 'Approved'
    const newScore = newStatus === 'Approved' ? 300 : 0
    const delta = newStatus === 'Approved' ? 1 : -1
    const stillOpen = () => activeIdRef.current === assignmentId

    setPendingIds((prev) => new Set(prev).add(student.id))
    setDirty(true)

    // Optimistic update
    setSubmissions((prev) =>
      existing
        ? prev.map((s) => (s.student_id === student.id ? { ...s, status: newStatus, score: newScore } : s))
        : [...prev, { student_id: student.id, status: newStatus, score: newScore }]
    )
    bumpApproved(assignmentId, delta)

    try {
      if (existing?.id) {
        const { data, error } = await supabase
          .from('submission_tracking')
          .update({
            status: newStatus,
            score: newScore,
            reviewer_id: profile.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select('id')

        if (error) throw error
        // RLS บล็อกการแก้ไขจะไม่ error แต่ได้ 0 แถว
        if (!data || data.length === 0) throw new Error('ไม่มีสิทธิ์แก้ไขข้อมูลนี้')
      } else {
        const { data, error } = await supabase
          .from('submission_tracking')
          .insert([
            {
              assignment_id: assignmentId,
              student_id: student.id,
              status: newStatus,
              score: newScore,
              reviewer_id: profile.id,
            },
          ])
          .select()
          .single()

        if (error) throw error
        // เก็บ id จริงไว้ เพื่อให้การกดครั้งถัดไปแก้ไขแถวเดิมได้
        if (stillOpen()) {
          setSubmissions((prev) => prev.map((s) => (s.student_id === student.id ? { ...s, ...data } : s)))
        }
      }
    } catch (err) {
      console.error('Update submission error:', err?.message || err)

      // Rollback
      if (stillOpen()) {
        setSubmissions((prev) =>
          existing
            ? prev.map((s) => (s.student_id === student.id ? existing : s))
            : prev.filter((s) => s.student_id !== student.id)
        )
      }
      bumpApproved(assignmentId, -delta)

      push({
        type: 'error',
        title: 'บันทึกไม่สำเร็จ',
        description: `ไม่สามารถอัปเดตสถานะของ ${student.first_name || 'นักศึกษา'} ได้ ตรวจสอบสิทธิ์และการเชื่อมต่อ แล้วลองอีกครั้ง`,
      })
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(student.id)
        return next
      })
    }
  }

  // ปิดหน้าตรวจงาน: ถ้ามีการเปลี่ยนแปลงจึงแจ้งเตือน Discord (ครั้งเดียวต่อรอบ)
  const closeModal = useCallback(() => {
    if (!isModalOpen) return

    const assignment = activeAssignment
    const approved = modalApproved
    const total = students.length
    const changed = dirty

    modalReqRef.current++ // ยกเลิกคำขอที่ยังค้างอยู่
    activeIdRef.current = null
    setIsModalOpen(false)
    setActiveAssignment(null)
    setDirty(false)

    if (!changed || !assignment) return

    push({
      type: 'success',
      title: 'บันทึกการตรวจงานแล้ว',
      description: `${assignment.title} ส่งแล้ว ${approved} จาก ${total} คน`,
    })

    sendDiscord(
      `📋 **อัปเดตการตรวจงาน:** ${cleanForDiscord(assignment.title)} (ห้อง ${sec}) ` +
        `ตรวจสอบล่าสุดโดย ${cleanForDiscord(profile?.first_name || 'System')}\n` +
        `✅ ส่งแล้ว ${approved} จาก ${total} คน`
    ).then((ok) => {
      if (!ok) {
        push({
          type: 'warning',
          title: 'ส่งแจ้งเตือนไป Discord ไม่สำเร็จ',
          description: 'บันทึกการตรวจงานเรียบร้อยแล้ว แต่ข้อความยังไม่ถูกส่ง',
          duration: 6000,
        })
      }
    })
  }, [isModalOpen, activeAssignment, modalApproved, students.length, dirty, sec, profile?.first_name, push])

  // ล็อกการเลื่อนหน้าพื้นหลังขณะเปิด sheet
  useEffect(() => {
    if (!isModalOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isModalOpen])

  // ปิดด้วยปุ่ม Esc
  useEffect(() => {
    if (!isModalOpen) return
    const onKey = (e) => e.key === 'Escape' && closeModal()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isModalOpen, closeModal])

  /* ---------- render ---------- */

  const hasSearch = searchQuery.trim() !== ''
  const modalPercent = toPercent(modalApproved, students.length)
  const isSaving = pendingIds.size > 0

  const yearOptions = [0, 1, 2].map((offset) => currentYear - offset)

  return (
    <div className="st-root pb-12" data-theme={theme}>
      <style>{styles}</style>

      {/* Header */}
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="st-title">ติดตามสถานะการส่งงาน</h1>
          <p className="st-subtitle">ตรวจสอบและเช็คชื่อการส่งงานของ ห้อง {secLabel(sec)}</p>
        </div>

        <div className="flex gap-3">
          <div className="st-stat">
            <p className="st-stat-label">งานทั้งหมด</p>
            <p className="st-stat-value">{loading ? '-' : assignments.length}</p>
          </div>
          <div className="st-stat">
            <p className="st-stat-label">ผู้ใช้ในห้อง</p>
            <p className="st-stat-value">{loading ? '-' : students.length}</p>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="st-select-wrap">
          <select
            className="st-select"
            aria-label="ปีการศึกษา"
            value={academicYear}
            onChange={(e) => setAcademicYear(Number(e.target.value))}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                ปีการศึกษา {year}
              </option>
            ))}
          </select>
          <span className="st-select-chevron">
            <Icon d={ICONS.chevron} size={16} />
          </span>
        </div>

        <Segmented label="ภาคเรียน" value={semester} options={SEMESTER_OPTIONS} onChange={setSemester} />

        {/* เปลี่ยน SEC ได้เฉพาะ CEO */}
        {isCeo && <Segmented label="กลุ่มเรียน" value={sec} options={SEC_OPTIONS} onChange={setSec} />}

        <div className="st-search">
          <span className="st-search-icon">
            <Icon d={ICONS.search} size={18} />
          </span>
          <input
            type="text"
            className="st-search-input"
            placeholder="ค้นหาชื่องานหรือรหัสวิชา"
            aria-label="ค้นหางาน"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="st-iconbtn st-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="ล้างคำค้นหา"
            >
              <Icon d={ICONS.close} size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Assignment list */}
      {loading ? (
        <div className="st-panel" aria-busy="true">
          <div className="st-skeleton-wrap">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="st-skeleton-row" />
            ))}
          </div>
        </div>
      ) : loadFailed && assignments.length === 0 ? (
        <div className="st-empty">
          <h2>โหลดข้อมูลไม่สำเร็จ</h2>
          <p>ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง</p>
          <button type="button" className="st-btn st-btn-primary" onClick={fetchData}>
            โหลดข้อมูลใหม่
          </button>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="st-empty">
          <h2>{hasSearch ? 'ไม่พบงานที่ค้นหา' : 'ยังไม่มีงานที่มอบหมาย'}</h2>
          <p>
            {hasSearch
              ? 'ลองค้นหาด้วยชื่องานหรือรหัสวิชาอื่น'
              : 'ไม่พบงานในเทอมและกลุ่มเรียนนี้ ลองเปลี่ยนปีการศึกษา ภาคเรียน หรือกลุ่มเรียน'}
          </p>
          {hasSearch && (
            <button type="button" className="st-btn st-btn-secondary" onClick={() => setSearchQuery('')}>
              ล้างการค้นหา
            </button>
          )}
        </div>
      ) : (
        <ul className="st-panel">
          {filteredAssignments.map((task) => {
            const percent = toPercent(task.approvedCount, students.length)
            const done = percent === 100 && students.length > 0
            const code = getSubjectCode(task)

            return (
              <li key={task.id} className="st-row">
                <div className="st-row-main min-w-0">
                  {code && <span className="st-code">{code}</span>}
                  <h3 className="st-task">{task.title}</h3>
                </div>

                <div className="st-progress">
                  <div className="st-progress-top">
                    <span>
                      ส่งแล้ว {task.approvedCount} จาก {students.length} คน
                    </span>
                    <span className="st-progress-pct" data-done={done}>
                      {percent}%
                    </span>
                  </div>
                  <ProgressBar percent={percent} />
                </div>

                <div className="st-row-action">
                  <button type="button" className="st-btn st-btn-soft" onClick={() => openCheckModal(task)}>
                    <Icon d={ICONS.checkCircle} size={16} />
                    ตรวจงาน
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Check sheet */}
      {isModalOpen && (
        <div
          className="st-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div className="st-sheet" role="dialog" aria-modal="true" aria-labelledby="st-sheet-title">
            <div className="st-sheet-head">
              <div className="flex min-w-0 items-center gap-4">
                <span className="st-tile">
                  <Icon d={ICONS.checkCircle} size={24} />
                </span>
                <div className="min-w-0">
                  <h2 id="st-sheet-title" className="st-sheet-title">
                    เช็คชื่อการส่งงาน
                  </h2>
                  <div className="st-sheet-sub">
                    {getSubjectCode(activeAssignment) && (
                      <span className="st-code">{getSubjectCode(activeAssignment)}</span>
                    )}
                    <span className="min-w-0 break-words">ใบงาน: {activeAssignment?.title}</span>
                  </div>
                </div>
              </div>

              <button type="button" className="st-iconbtn" onClick={closeModal} aria-label="ปิด" autoFocus>
                <Icon d={ICONS.close} size={18} />
              </button>
            </div>

            <div className="st-sheet-body">
              {modalLoading ? (
                <p className="py-20 text-center" style={{ color: 'var(--ui-text-2)' }}>
                  กำลังโหลดรายชื่อนักศึกษา...
                </p>
              ) : modalFailed ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <h3 className="text-xl font-semibold">โหลดสถานะการส่งงานไม่สำเร็จ</h3>
                  <p className="mb-6 mt-2" style={{ color: 'var(--ui-text-2)' }}>
                    ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง
                  </p>
                  <button
                    type="button"
                    className="st-btn st-btn-primary"
                    onClick={() => openCheckModal(activeAssignment)}
                  >
                    โหลดใหม่
                  </button>
                </div>
              ) : students.length === 0 ? (
                <p className="py-20 text-center" style={{ color: 'var(--ui-text-2)' }}>
                  ยังไม่มีผู้ใช้ในห้องนี้
                </p>
              ) : (
                <>
                  <div className="st-summary">
                    <div className="st-progress-top">
                      <span>
                        ส่งแล้ว {modalApproved} จาก {students.length} คน
                      </span>
                      <span className="st-progress-pct" data-done={modalPercent === 100}>
                        {modalPercent}%
                      </span>
                    </div>
                    <ProgressBar percent={modalPercent} />
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {students.map((student) => {
                      const checked = submissionMap.get(student.id)?.status === 'Approved'
                      const pending = pendingIds.has(student.id)
                      const role = getRole(student.role)

                      return (
                        <button
                          key={student.id}
                          type="button"
                          role="checkbox"
                          aria-checked={checked}
                          aria-busy={pending}
                          data-pending={pending}
                          className="st-student"
                          onClick={() => toggleSubmission(student)}
                        >
                          <span className="st-check">
                            <Icon d={ICONS.check} size={16} strokeWidth={3} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="st-student-name block">
                              {student.first_name} {student.last_name}
                            </span>
                            <span className="st-student-sub">
                              <span className="st-student-nick">@{student.nickname || 'student'}</span>
                              <span className="st-chip" data-tone={role.tone}>
                                {role.label}
                              </span>
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="st-sheet-foot">
              <div className="st-save-status" aria-live="polite">
                {isSaving ? (
                  <>
                    <span className="st-spinner" aria-hidden="true" />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <span style={{ color: 'var(--ui-success)' }}>
                      <Icon d={ICONS.check} size={16} strokeWidth={2.5} />
                    </span>
                    บันทึกอัตโนมัติ
                  </>
                )}
              </div>
              <button type="button" className="st-btn st-btn-lg st-btn-primary" onClick={closeModal}>
                เสร็จสิ้น
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}