import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'

/* -------------------------------------------------------------------------- */
/*  Design tokens + styles                                                    */
/*  Dark mode: ใส่ data-theme="dark" ที่ <html> หรือส่ง prop theme            */
/* -------------------------------------------------------------------------- */

const styles = `
.ct-root {
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
  --ui-success-soft: rgba(36, 138, 61, 0.12);
  --ui-warning: #b25000;
  --ui-warning-soft: rgba(178, 80, 0, 0.12);
  --ui-purple: #8944ab;
  --ui-purple-soft: rgba(137, 68, 171, 0.12);

  --ui-fb: #1877f2;
  --ui-ig: #e1306c;

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

[data-theme='dark'] .ct-root,
.ct-root[data-theme='dark'] {
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
  --ui-success-soft: rgba(48, 209, 88, 0.16);
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

.ct-root :focus-visible {
  outline: 2px solid var(--ui-accent);
  outline-offset: 2px;
}

/* Header */
.ct-title {
  font-size: clamp(2rem, 4.5vw, 3rem);
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.08;
}
.ct-subtitle {
  margin-top: 8px;
  font-size: 1.0625rem;
  line-height: 1.4;
  color: var(--ui-text-2);
}
.ct-count {
  margin: 20px 0 16px;
  font-size: 0.9375rem;
  color: var(--ui-text-3);
}

/* Search + filter */
.ct-search { position: relative; flex: 1; min-width: 0; }
.ct-search-icon {
  position: absolute;
  top: 50%;
  left: 14px;
  transform: translateY(-50%);
  color: var(--ui-text-3);
  pointer-events: none;
}
.ct-search-input {
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
.ct-search-input::placeholder { color: var(--ui-text-3); }
.ct-search-input:focus {
  outline: none;
  border-color: var(--ui-accent);
  background: var(--ui-surface);
  box-shadow: 0 0 0 4px var(--ui-accent-soft);
}
.ct-search-clear {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
}

.ct-seg {
  display: flex;
  height: 44px;
  padding: 3px;
  border-radius: 12px;
  background: var(--ui-field);
}
.ct-seg-item {
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
.ct-seg-item[aria-checked='true'] {
  background: var(--ui-seg-thumb);
  color: var(--ui-text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

/* Buttons */
.ct-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  padding: 0 22px;
  border: 0;
  border-radius: 980px;
  font: inherit;
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.12s;
}
.ct-btn:active { transform: scale(0.97); }
.ct-btn-primary { background: var(--ui-accent-solid); color: #fff; }
.ct-btn-primary:hover { background: var(--ui-accent-solid-hover); }
.ct-btn-secondary { background: var(--ui-surface-2); color: var(--ui-text); }
.ct-btn-secondary:hover { background: var(--ui-surface-3); }

.ct-iconbtn {
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
.ct-iconbtn:hover { background: var(--ui-surface-3); color: var(--ui-text); }

/* Chips */
.ct-chip {
  padding: 4px 10px;
  border-radius: 980px;
  background: var(--ui-surface-2);
  color: var(--ui-text-2);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}
.ct-chip[data-tone='accent'] { background: var(--ui-accent-soft); color: var(--ui-accent); }
.ct-chip[data-tone='purple'] { background: var(--ui-purple-soft); color: var(--ui-purple); }
.ct-chip[data-tone='warning'] { background: var(--ui-warning-soft); color: var(--ui-warning); }

/* Card */
.ct-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 20px 20px;
  border-radius: 28px;
  background: var(--ui-surface);
  box-shadow: var(--ui-shadow-card);
  text-align: center;
  cursor: pointer;
}
.ct-card-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 0;
  border: 0;
  border-radius: 16px;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.ct-name {
  width: 100%;
  margin-top: 16px;
  padding: 0 8px;
  font-size: 1.1875rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ct-nick { margin-top: 2px; font-size: 0.9375rem; color: var(--ui-text-3); }
.ct-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin-top: 14px; }
.ct-card-foot {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  margin-top: 20px;
  cursor: default;
}

.ct-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 50%;
  background: var(--ui-accent-soft);
  color: var(--ui-accent);
  font-weight: 600;
}
.ct-avatar img { width: 100%; height: 100%; object-fit: cover; }

.ct-phone {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 44px;
  border-radius: 980px;
  background: var(--ui-surface-2);
  color: var(--ui-text);
  font-size: 15px;
  font-weight: 500;
  transition: background-color 0.2s;
}
a.ct-phone:hover { background: var(--ui-surface-3); }
a.ct-phone svg { color: var(--ui-accent); }
.ct-phone[aria-disabled='true'] { color: var(--ui-text-3); font-weight: 400; }

.ct-socials { display: flex; justify-content: center; gap: 12px; }
.ct-social {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--ui-surface-2);
  transition: background-color 0.2s;
}
a.ct-social:hover { background: var(--ui-surface-3); }
.ct-social[aria-disabled='true'] { color: var(--ui-text-3); opacity: 0.4; }

/* Empty + skeleton */
.ct-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 72px 24px;
  border-radius: 28px;
  background: var(--ui-surface);
  text-align: center;
}
.ct-empty h2 { font-size: 1.5rem; font-weight: 600; letter-spacing: -0.015em; }
.ct-empty p { margin: 8px 0 24px; color: var(--ui-text-2); }
.ct-skeleton {
  height: 320px;
  border-radius: 28px;
  background: var(--ui-surface);
  animation: ct-pulse 1.4s ease-in-out infinite;
}

/* Overlay + sheet */
.ct-overlay {
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
  animation: ct-fade 0.2s ease-out;
}
.ct-sheet {
  position: relative;
  width: 100%;
  max-width: 480px;
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  padding: 40px 20px 24px;
  border-radius: 28px;
  background: var(--ui-surface);
  box-shadow: var(--ui-shadow-pop);
  text-align: center;
  animation: ct-pop 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.ct-sheet-close { position: absolute; top: 16px; right: 16px; background: var(--ui-surface-2); }
.ct-sheet-name {
  margin-top: 16px;
  font-size: 1.625rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

/* Inset grouped list (iOS Settings style) */
.ct-list {
  margin-top: 24px;
  border-radius: 16px;
  background: var(--ui-surface-2);
  overflow: hidden;
  text-align: left;
}
.ct-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 10px 8px 10px 16px;
}
.ct-row + .ct-row::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  left: 16px;
  height: 1px;
  background: var(--ui-line);
}
.ct-row-label { width: 104px; flex-shrink: 0; font-size: 14px; color: var(--ui-text-2); }
.ct-row-value { flex: 1; min-width: 0; font-size: 15px; overflow-wrap: anywhere; }
.ct-row-value[data-empty='true'] { color: var(--ui-text-3); }
.ct-row-spacer { width: 32px; flex-shrink: 0; }
.ct-sheet-actions { display: flex; justify-content: center; margin-top: 20px; }

/* Toast */
.ct-toasts {
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
.ct-toast {
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
  animation: ct-toast-in 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.ct-toast[data-leaving='true'] {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
  transition: opacity 0.18s, transform 0.18s;
}
.ct-toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
}
.ct-toast-icon[data-type='success'] { background: var(--ui-success-soft); color: var(--ui-success); }
.ct-toast-icon[data-type='error'] { background: var(--ui-danger-soft); color: var(--ui-danger); }
.ct-toast-icon[data-type='warning'] { background: var(--ui-warning-soft); color: var(--ui-warning); }
.ct-toast-icon[data-type='info'] { background: var(--ui-accent-soft); color: var(--ui-accent); }
.ct-toast-title { font-size: 15px; font-weight: 600; line-height: 1.3; }
.ct-toast-desc { margin-top: 2px; font-size: 14px; line-height: 1.4; color: var(--ui-text-2); overflow-wrap: anywhere; }

@keyframes ct-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes ct-pop {
  from { opacity: 0; transform: translateY(8px) scale(0.96); }
  to { opacity: 1; transform: none; }
}
@keyframes ct-toast-in {
  from { opacity: 0; transform: translateY(-16px) scale(0.96); }
  to { opacity: 1; transform: none; }
}
@keyframes ct-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }

@media (prefers-reduced-motion: reduce) {
  .ct-root *, .ct-root *::before, .ct-root *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
`

/* -------------------------------------------------------------------------- */
/*  Icons                                                                     */
/* -------------------------------------------------------------------------- */

// ไอคอนเส้น (stroke)
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

// ไอคอนทึบ (fill) สำหรับโลโก้โซเชียล
function FillIcon({ d, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
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
  copy: 'M8 8h10a2 2 0 012 2v10a2 2 0 01-2 2H8a2 2 0 01-2-2V10a2 2 0 012-2zM16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2',
  edit: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',
}

const BRAND_PATHS = {
  phone:
    'M20 15.5c-1.25 0-2.45-.2-3.57-.57a1.02 1.02 0 00-1.02.24l-2.2 2.2a15.045 15.045 0 01-6.59-6.59l2.2-2.21a.96.96 0 00.25-1A11.36 11.36 0 018.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1zM19 12h2a9 9 0 00-9-9v2c3.87 0 7 3.13 7 7zm-4 0h2c0-2.76-2.24-5-5-5v2c1.66 0 3 1.34 3 3z',
  facebook:
    'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  instagram:
    'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
  github:
    'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z',
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

// รับได้ทั้งลิงก์เต็ม (https://...) หรือแค่ username (@name / name)
const buildUrl = (value, baseUrl) => {
  if (!value) return null
  const v = value.trim()
  if (!v) return null
  if (/^https?:\/\//i.test(v)) return v
  return `${baseUrl}${v.replace(/^@/, '')}`
}

const SOCIALS = [
  { key: 'facebook', label: 'Facebook', baseUrl: 'https://facebook.com/', path: BRAND_PATHS.facebook, color: 'var(--ui-fb)' },
  { key: 'instagram', label: 'Instagram', baseUrl: 'https://instagram.com/', path: BRAND_PATHS.instagram, color: 'var(--ui-ig)' },
  { key: 'github_account', label: 'GitHub', baseUrl: 'https://github.com/', path: BRAND_PATHS.github, color: 'var(--ui-text)' },
]

const SEC_FILTERS = [
  { value: 'All', label: 'ทั้งหมด' },
  { value: 'SEC 1', label: 'SEC 1 ปกติ' },
  { value: 'SEC 2', label: 'SEC 2 เทียบโอน' },
]

const ROLES = {
  ceo: { label: 'Super Admin', tone: 'warning' },
  manager: { label: 'Manager', tone: 'purple' },
  admin: { label: 'Admin', tone: 'accent' },
  default: { label: 'Student', tone: 'neutral' },
}

const getRole = (role) => ROLES[String(role || '').toLowerCase()] || ROLES.default

const fullName = (c) => `${c.first_name || 'ไม่ระบุชื่อ'} ${c.last_name || ''}`.trim()

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
    setToasts((prev) => [...prev.slice(-3), { id, type: 'info', duration: 3500, ...toast }])
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
      className="ct-toast"
      data-leaving={leaving}
      role={toast.type === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => clearTimeout(timerRef.current)}
      onMouseLeave={startTimer}
    >
      <span className="ct-toast-icon" data-type={toast.type}>
        <Icon d={TOAST_ICON[toast.type] || ICONS.info} size={15} strokeWidth={2.5} />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="ct-toast-title">{toast.title}</p>
        {toast.description && <p className="ct-toast-desc">{toast.description}</p>}
      </div>
      <button type="button" className="ct-iconbtn" onClick={close} aria-label="ปิดการแจ้งเตือน">
        <Icon d={ICONS.close} size={14} />
      </button>
    </div>
  )
}

function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="ct-toasts" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Small components                                                          */
/* -------------------------------------------------------------------------- */

function Avatar({ contact, size }) {
  const [failed, setFailed] = useState(false)
  const showImage = contact.profile_image_url && !failed

  return (
    <div
      className="ct-avatar"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {showImage ? (
        <img
          src={contact.profile_image_url}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        (contact.first_name || '?').charAt(0)
      )}
    </div>
  )
}

function Segmented({ label, value, options, onChange }) {
  return (
    <div role="radiogroup" aria-label={label} className="ct-seg">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className="ct-seg-item"
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ปุ่ม social: มีลิงก์ = กดได้, ไม่มีลิงก์ = จาง กดไม่ได้
function SocialButton({ href, label, path, color }) {
  if (!href) {
    return (
      <span className="ct-social" aria-disabled="true" title={`ไม่มี ${label}`}>
        <FillIcon d={path} />
      </span>
    )
  }

  return (
    <a
      className="ct-social"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      aria-label={label}
      style={{ color }}
    >
      <FillIcon d={path} />
    </a>
  )
}

function InfoRow({ label, value, onCopy }) {
  const has = Boolean(value && String(value).trim())

  return (
    <div className="ct-row">
      <span className="ct-row-label">{label}</span>
      <span className="ct-row-value" data-empty={!has}>
        {has ? value : 'ไม่ได้ระบุ'}
      </span>
      {has ? (
        <button
          type="button"
          className="ct-iconbtn"
          onClick={() => onCopy(label, value)}
          aria-label={`คัดลอก${label}`}
          title="คัดลอก"
        >
          <Icon d={ICONS.copy} size={16} />
        </button>
      ) : (
        <span className="ct-row-spacer" />
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function Contacts({ theme }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { toasts, push, dismiss } = useToasts()

  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [secFilter, setSecFilter] = useState('All')
  const [selectedContact, setSelectedContact] = useState(null)

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true)
      setLoadFailed(false)
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, first_name, last_name, nickname, sec, year_level, tel, facebook, instagram, github_account, profile_image_url, role, email'
        )
        .order('sec', { ascending: true })
        .order('first_name', { ascending: true })

      if (error) throw error
      setContacts(data || [])
    } catch (err) {
      console.error('Error fetching contacts:', err.message)
      setLoadFailed(true)
      push({
        type: 'error',
        title: 'โหลดรายชื่อไม่สำเร็จ',
        description: 'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง',
      })
    } finally {
      setLoading(false)
    }
  }, [push])

  useEffect(() => {
    document.title = 'Contacts | SE-CONSOLE'
    fetchContacts()
  }, [fetchContacts])

  // ปิดโปรไฟล์ด้วย Esc + ล็อกการเลื่อนหน้าพื้นหลัง
  useEffect(() => {
    if (!selectedContact) return

    const onKeyDown = (e) => e.key === 'Escape' && setSelectedContact(null)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [selectedContact])

  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return contacts.filter((c) => {
      const matchSearch =
        (c.first_name || '').toLowerCase().includes(q) ||
        (c.last_name || '').toLowerCase().includes(q) ||
        (c.nickname || '').toLowerCase().includes(q)
      const matchSec = secFilter === 'All' || c.sec === secFilter
      return matchSearch && matchSec
    })
  }, [contacts, searchQuery, secFilter])

  const handleCopy = async (label, value) => {
    const ok = await copyText(String(value))
    if (ok) {
      push({ type: 'success', title: `คัดลอก${label}แล้ว`, description: String(value), duration: 2500 })
    } else {
      push({
        type: 'error',
        title: `คัดลอก${label}ไม่สำเร็จ`,
        description: 'เบราว์เซอร์ไม่อนุญาตให้คัดลอก ลองเลือกข้อความแล้วคัดลอกเอง',
      })
    }
  }

  const resetFilters = () => {
    setSearchQuery('')
    setSecFilter('All')
  }

  const selectedRole = selectedContact ? getRole(selectedContact.role) : null
  const hasFilters = searchQuery.trim() !== '' || secFilter !== 'All'

  return (
    <div className="ct-root pb-12" data-theme={theme}>
      <style>{styles}</style>

      {/* Header */}
      <header className="mb-10">
        <h1 className="ct-title">Contacts</h1>
        <p className="ct-subtitle">สมุดรายชื่อและช่องทางการติดต่อของเพื่อนร่วมรุ่น</p>
      </header>

      {/* Search + filter */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="ct-search">
          <span className="ct-search-icon">
            <Icon d={ICONS.search} size={18} />
          </span>
          <input
            type="text"
            className="ct-search-input"
            placeholder="ค้นหาชื่อจริง นามสกุล หรือชื่อเล่น"
            aria-label="ค้นหารายชื่อ"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="ct-iconbtn ct-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="ล้างคำค้นหา"
            >
              <Icon d={ICONS.close} size={14} />
            </button>
          )}
        </div>
        <Segmented label="กลุ่มเรียน" value={secFilter} options={SEC_FILTERS} onChange={setSecFilter} />
      </div>

      {/* Contacts */}
      {loading ? (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="ct-skeleton" />
          ))}
        </div>
      ) : loadFailed && contacts.length === 0 ? (
        <div className="ct-empty mt-8">
          <h2>โหลดรายชื่อไม่สำเร็จ</h2>
          <p>ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง</p>
          <button type="button" className="ct-btn ct-btn-primary" onClick={fetchContacts}>
            โหลดรายชื่อใหม่
          </button>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="ct-empty mt-8">
          <h2>ไม่พบรายชื่อ</h2>
          <p>{hasFilters ? 'ลองค้นหาด้วยชื่ออื่น หรือเปลี่ยนกลุ่มเรียน' : 'ยังไม่มีรายชื่อในระบบ'}</p>
          {hasFilters && (
            <button type="button" className="ct-btn ct-btn-secondary" onClick={resetFilters}>
              ล้างการค้นหา
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="ct-count" aria-live="polite">
            พบ {filteredContacts.length} คน
          </p>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredContacts.map((contact) => {
              const role = getRole(contact.role)
              const telHref = contact.tel ? `tel:${contact.tel}` : null

              return (
                <article key={contact.id} className="ct-card" onClick={() => setSelectedContact(contact)}>
                  <button
                    type="button"
                    className="ct-card-main"
                    aria-haspopup="dialog"
                    aria-label={`ดูโปรไฟล์ ${fullName(contact)}`}
                  >
                    <Avatar contact={contact} size={88} />
                    <h3 className="ct-name">{fullName(contact)}</h3>
                    <p className="ct-nick">@{contact.nickname || 'student'}</p>
                    <div className="ct-chips">
                      <span className="ct-chip">{contact.sec || 'ไม่มีกลุ่ม'}</span>
                      {contact.year_level && <span className="ct-chip">ปี {contact.year_level}</span>}
                      <span className="ct-chip" data-tone={role.tone}>
                        {role.label}
                      </span>
                    </div>
                  </button>

                  <div className="ct-card-foot" onClick={(e) => e.stopPropagation()}>
                    {telHref ? (
                      <a className="ct-phone" href={telHref}>
                        <FillIcon d={BRAND_PATHS.phone} size={16} />
                        {contact.tel}
                      </a>
                    ) : (
                      <div className="ct-phone" aria-disabled="true">
                        <FillIcon d={BRAND_PATHS.phone} size={16} />
                        ไม่มีเบอร์โทร
                      </div>
                    )}

                    <div className="ct-socials">
                      {SOCIALS.map(({ key, label, baseUrl, path, color }) => (
                        <SocialButton
                          key={key}
                          label={label}
                          path={path}
                          color={color}
                          href={buildUrl(contact[key], baseUrl)}
                        />
                      ))}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </>
      )}

      {/* Profile sheet */}
      {selectedContact && (
        <div
          className="ct-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedContact(null)
          }}
        >
          <div className="ct-sheet" role="dialog" aria-modal="true" aria-labelledby="ct-sheet-name">
            <button
              type="button"
              className="ct-iconbtn ct-sheet-close"
              onClick={() => setSelectedContact(null)}
              aria-label="ปิด"
              autoFocus
            >
              <Icon d={ICONS.close} size={16} />
            </button>

            <div className="flex justify-center">
              <Avatar contact={selectedContact} size={96} />
            </div>

            <h2 id="ct-sheet-name" className="ct-sheet-name">
              {fullName(selectedContact)}
            </h2>
            <p className="ct-nick">@{selectedContact.nickname || 'student'}</p>

            <div className="ct-chips">
              <span className="ct-chip">{selectedContact.sec || 'ไม่มีกลุ่ม'}</span>
              {selectedContact.year_level && <span className="ct-chip">ปี {selectedContact.year_level}</span>}
              <span className="ct-chip" data-tone={selectedRole.tone}>
                {selectedRole.label}
              </span>
            </div>

            <div className="ct-list">
              <InfoRow label="เบอร์โทรศัพท์" value={selectedContact.tel} onCopy={handleCopy} />
              <InfoRow label="Instagram" value={selectedContact.instagram} onCopy={handleCopy} />
              <InfoRow label="Facebook" value={selectedContact.facebook} onCopy={handleCopy} />
              <InfoRow label="GitHub" value={selectedContact.github_account} onCopy={handleCopy} />
              <InfoRow label="อีเมล" value={selectedContact.email} onCopy={handleCopy} />
            </div>

            {profile?.id === selectedContact.id && (
              <div className="ct-sheet-actions">
                <button
                  type="button"
                  className="ct-btn ct-btn-primary"
                  onClick={() => navigate('/sework/se-console/profile')}
                >
                  <Icon d={ICONS.edit} size={16} />
                  แก้ไขข้อมูล
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}