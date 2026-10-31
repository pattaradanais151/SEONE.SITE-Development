import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                                */
/* ------------------------------------------------------------------ */

const THEME_KEY = 'se-theme'
const LANG_KEY = 'se-lang'
const TH_TZ = 'Asia/Bangkok'
const NOTIF_LIMIT = 30

// ชื่อที่แสดงใน Footer (Copyright © ปี ชื่อ) — แก้ตรงนี้ที่เดียว
const COPYRIGHT_HOLDER = 'SEONE.SITE'

// เวลา/วันที่ประเทศไทย — fix timezone เป็น Asia/Bangkok ไม่ขึ้นกับเครื่องผู้ใช้
const TIME_FMT = new Intl.DateTimeFormat('th-TH', {
  timeZone: TH_TZ,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})
const DATE_FMT = {
  th: new Intl.DateTimeFormat('th-TH', {
    timeZone: TH_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
  en: new Intl.DateTimeFormat('en-US', {
    timeZone: TH_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
}
const LOCALE = { th: 'th-TH', en: 'en-US' }

// ปี ค.ศ. ปัจจุบัน (เวลาไทย) สำหรับ Footer
const getCurrentYear = () =>
  new Intl.DateTimeFormat('en-US', { timeZone: TH_TZ, year: 'numeric' }).format(new Date())

/* ---------- i18n (Sidebar + Header + Footer) ---------- */
const I18N = {
  th: {
    clockLabel: 'วันและเวลาประเทศไทย',
    ipTitleReady: 'Public IP — คลิกเพื่อคัดลอก',
    ipTitle: 'Public IP',
    ipLoading: 'กำลังตรวจสอบ...',
    ipError: 'ตรวจสอบไม่ได้ · ลองใหม่',
    ipCopied: 'คัดลอกแล้ว',
    themeLabel: 'โหมดมืด (Beta)',
    themeTipTitle: 'โหมดมืด (Beta)',
    themeTipBody: 'อยู่ในช่วงทดสอบ บางหน้าอาจยังแสดงผลสีไม่สมบูรณ์',
    languageLabel: 'ภาษา',
    mainMenu: 'เมนูหลัก',
    workspace: 'พื้นที่ทำงาน',
    collapse: 'ย่อแถบเมนู',
    expand: 'ขยายแถบเมนู',
    profileImageAlt: 'รูปโปรไฟล์',
    userFallback: 'ผู้ใช้',
    myProfile: 'โปรไฟล์ของฉัน',
    logout: 'ออกจากระบบ',
    footer: {
      tagline: 'ระบบจัดการ SEWORK',
      rights: 'สงวนลิขสิทธิ์',
      madeIn: 'พัฒนาในประเทศไทย',
    },
    notif: {
      title: 'การแจ้งเตือน',
      bell: (n) => (n > 0 ? `การแจ้งเตือน (ยังไม่ได้อ่าน ${n} รายการ)` : 'การแจ้งเตือน'),
      markAll: 'อ่านทั้งหมดแล้ว',
      clearAll: 'ลบทั้งหมด',
      clearConfirm: 'ยืนยันลบทั้งหมด?',
      remove: 'ลบการแจ้งเตือนนี้',
      empty: 'ยังไม่มีการแจ้งเตือน',
      emptyHint: 'เมื่อมีความเคลื่อนไหวใหม่ ระบบจะแจ้งที่นี่',
      loadError: 'อยู่ระหว่างการปรับปรุง',
      retry: 'ลองใหม่',
    },
    nav: {
      home: 'หน้าหลัก',
      academic: 'วิชาการ',
      community: 'ชุมชน',
      admin: 'การดูแลระบบ',
      announcements: 'ประกาศ',
      assignments: 'งานที่มอบหมาย',
      subjects: 'รายวิชา',
      schedules: 'ตารางเรียน',
      sheetData: 'ข้อมูลชีต',
      semesters: 'ภาคเรียน',
      submissionLinks: 'ลิงก์ส่งงาน',
      resourceCenter: 'ศูนย์ทรัพยากร',
      contacts: 'รายชื่อติดต่อ',
      internalLinks: 'ลิงก์ภายใน',
      submissionTracking: 'ติดตามการส่งงาน',
      leaderboard: 'อันดับคะแนน',
      usersManagement: 'จัดการผู้ใช้',
    },
  },
  en: {
    clockLabel: 'Thailand date and time',
    ipTitleReady: 'Public IP — click to copy',
    ipTitle: 'Public IP',
    ipLoading: 'Checking...',
    ipError: 'Unavailable · Retry',
    ipCopied: 'Copied',
    themeLabel: 'Dark mode (Beta)',
    themeTipTitle: 'Dark Mode (Beta)',
    themeTipBody: 'Currently in testing. Some pages may not display colors correctly yet.',
    languageLabel: 'Language',
    mainMenu: 'Main menu',
    workspace: 'Workspace',
    collapse: 'Collapse sidebar',
    expand: 'Expand sidebar',
    profileImageAlt: 'Profile',
    userFallback: 'User',
    myProfile: 'My Profile',
    logout: 'Log Out',
    footer: {
      tagline: 'SEWORK Management System',
      rights: 'All rights reserved.',
      madeIn: 'Made in Thailand',
    },
    notif: {
      title: 'Notifications',
      bell: (n) => (n > 0 ? `Notifications (${n} unread)` : 'Notifications'),
      markAll: 'Mark all as read',
      clearAll: 'Clear all',
      clearConfirm: 'Clear everything?',
      remove: 'Delete this notification',
      empty: 'No notifications yet',
      emptyHint: "We'll let you know here when something new happens.",
      loadError: "Currently under improvement",
      retry: 'Retry',
    },
    nav: {
      home: 'Home',
      academic: 'Academic',
      community: 'Community',
      admin: 'Administration',
      announcements: 'Announcements',
      assignments: 'Assignments',
      subjects: 'Subjects',
      schedules: 'Schedules',
      sheetData: 'Sheet Data',
      semesters: 'Semesters',
      submissionLinks: 'Submission Links',
      resourceCenter: 'Resource Center',
      contacts: 'Contacts',
      internalLinks: 'Internal Links',
      submissionTracking: 'Submission Tracking',
      leaderboard: 'Leaderboard',
      usersManagement: 'Users Management',
    },
  },
}

const ICONS = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  academic:
    'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  community:
    'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  admin:
    'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  bell: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  logout:
    'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  chevronDown: 'M19 9l-7 7-7-7',
  collapse: 'M11 19l-7-7 7-7m8 14l-7-7 7-7',
  sun: 'M16 12a4 4 0 11-8 0 4 4 0 018 0zM12 3v2M12 19v2M5.64 5.64l1.41 1.41M16.95 16.95l1.41 1.41M3 12h2M19 12h2M5.64 18.36l1.41-1.41M16.95 7.05l1.41-1.41',
  moon: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
  globe:
    'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3 12h18M12 3a13.5 13.5 0 013.5 9A13.5 13.5 0 0112 21a13.5 13.5 0 01-3.5-9A13.5 13.5 0 0112 3z',
  check: 'M5 13l4 4L19 7',
  trash:
    'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
}

// สีพื้นหลังของไอคอนเมนูหลัก (สไตล์ iOS Settings) — ใช้ได้ทั้ง Light / Dark
const NAV_TONE = {
  home: 'bg-blue-500',
  academic: 'bg-orange-500',
  community: 'bg-emerald-500',
  admin: 'bg-violet-500',
}

const ring = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-se-primary/30'

function Icon({ d, className = 'h-5 w-5', strokeWidth = 1.75 }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}

// ไอคอนเมนูหลักแบบกล่องมุมมน มีสีประจำกลุ่ม
function NavIcon({ d, tone }) {
  return (
    <span
      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[8px] text-white shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.28),0_1px_2px_rgba(0,0,0,0.2)] ${tone}`}
    >
      <Icon d={d} className="h-[17px] w-[17px]" strokeWidth={2} />
    </span>
  )
}

// "5 นาทีที่แล้ว" / "5 minutes ago" — เกิน 7 วันแสดงเป็นวันที่
function timeAgo(iso, lang) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const rtf = new Intl.RelativeTimeFormat(LOCALE[lang], { numeric: 'auto' })
  const diff = (date.getTime() - Date.now()) / 1000
  const abs = Math.abs(diff)
  if (abs < 60) return rtf.format(0, 'second')
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 604800) return rtf.format(Math.round(diff / 86400), 'day')
  return new Intl.DateTimeFormat(LOCALE[lang], { timeZone: TH_TZ, dateStyle: 'medium' }).format(date)
}

/* ------------------------------------------------------------------ */
/*  Clock — วันที่/เวลาประเทศไทย (แยก component เพื่อไม่ให้ layout re-render ทุกวินาที) */
/* ------------------------------------------------------------------ */

function Clock({ lang, t }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex min-w-0 items-center gap-3" aria-label={t.clockLabel}>
      <time
        dateTime={now.toISOString()}
        className="flex items-baseline gap-1.5 text-[15px] font-semibold tabular-nums text-se-text-main"
      >
        {TIME_FMT.format(now)}
        <span className="text-[11px] font-medium text-se-text-muted">GMT+7</span>
      </time>
      <span className="hidden h-4 w-px bg-se-border md:block" />
      <span className="hidden truncate text-[13px] text-se-text-muted md:block">{DATE_FMT[lang].format(now)}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  PublicIp — ดึง Public IP (คลิกเพื่อคัดลอก / ถ้าโหลดไม่ได้คลิกเพื่อลองใหม่)   */
/* ------------------------------------------------------------------ */

function PublicIp({ t }) {
  const [ip, setIp] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [attempt, setAttempt] = useState(0)
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef()

  useEffect(() => {
    const controller = new AbortController()

    fetch('https://api.ipify.org?format=json', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('IP lookup failed')
        return res.json()
      })
      .then((data) => {
        setIp(data.ip)
        setStatus('ready')
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setStatus('error')
      })

    return () => controller.abort()
  }, [attempt])

  useEffect(() => () => clearTimeout(copyTimer.current), [])

  const handleClick = async () => {
    if (status === 'error') {
      setStatus('loading')
      setAttempt((a) => a + 1)
      return
    }
    if (status !== 'ready') return
    try {
      await navigator.clipboard.writeText(ip)
      setCopied(true)
      clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard ไม่พร้อมใช้งาน — ข้าม */
    }
  }

  const label = status === 'loading' ? t.ipLoading : status === 'error' ? t.ipError : copied ? t.ipCopied : ip

  return (
    <button
      type="button"
      onClick={handleClick}
      title={status === 'ready' ? t.ipTitleReady : t.ipTitle}
      className={`hidden h-8 max-w-[240px] items-center gap-2 rounded-full bg-se-border/40 px-3 text-[13px] transition-colors hover:bg-se-border/60 lg:flex ${ring}`}
    >
      <Icon d={ICONS.globe} className="h-4 w-4 shrink-0 text-se-text-muted" />
      <span className="shrink-0 text-se-text-muted">IP</span>
      <span
        className={`truncate font-medium tabular-nums ${
          status === 'loading' ? 'animate-pulse text-se-text-muted' : copied ? 'text-se-success' : 'text-se-text-main'
        }`}
      >
        {label}
      </span>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  NotificationBell — การแจ้งเตือนจริงจาก Supabase (ตาราง notifications) */
/*  - โหลด 30 รายการล่าสุดของผู้ใช้ + อัปเดตแบบ Realtime                  */
/*  - แสดงจำนวนที่ยังไม่ได้อ่าน, คลิกเพื่ออ่าน/ไปยังลิงก์, อ่านทั้งหมด       */
/*  - ลบทีละรายการ (ปุ่มถังขยะ) / ลบทั้งหมด (กดยืนยัน 2 ขั้น)              */
/* ------------------------------------------------------------------ */

function NotificationBell({ userId, lang, t }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [confirmClear, setConfirmClear] = useState(false)
  const wrapRef = useRef(null)
  const alive = useRef(true)
  const clearTimer = useRef()
  const n = t.notif

  const unread = useMemo(() => items.filter((x) => !x.is_read).length, [items])

  const load = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, body, link, is_read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(NOTIF_LIMIT)
    if (!alive.current) return
    if (error) {
      console.error('Notifications load error:', error.message)
      setStatus('error')
      return
    }
    setItems(data || [])
    setStatus('ready')
  }, [userId])

  // โหลดครั้งแรก + subscribe Realtime
  useEffect(() => {
    alive.current = true
    if (!userId) {
      setItems([])
      setStatus('ready')
      return undefined
    }
    setStatus('loading')
    load()

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          setItems((prev) => {
            if (payload.eventType === 'INSERT') {
              if (prev.some((x) => x.id === payload.new.id)) return prev
              return [payload.new, ...prev].slice(0, NOTIF_LIMIT)
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map((x) => (x.id === payload.new.id ? { ...x, ...payload.new } : x))
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter((x) => x.id !== payload.old.id)
            }
            return prev
          })
        }
      )
      .subscribe()

    return () => {
      alive.current = false
      supabase.removeChannel(channel)
    }
  }, [userId, load])

  // ปิดเมื่อคลิกที่อื่น หรือกด Esc
  useEffect(() => {
    if (!open) return undefined
    const onMouseDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // ปิด dropdown แล้วยกเลิกสถานะ "ยืนยันลบทั้งหมด"
  useEffect(() => {
    if (!open) {
      clearTimeout(clearTimer.current)
      setConfirmClear(false)
    }
  }, [open])

  useEffect(() => () => clearTimeout(clearTimer.current), [])

  const markRead = async (id) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, is_read: true } : x)))
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    if (error) {
      console.error('Mark read error:', error.message)
      load()
    }
  }

  const markAllRead = async () => {
    if (!userId || unread === 0) return
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })))
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    if (error) {
      console.error('Mark all read error:', error.message)
      load()
    }
  }

  // ลบทีละรายการ — ลบจากหน้าจอทันที ถ้าฐานข้อมูลลบไม่สำเร็จจะโหลดใหม่
  const removeOne = async (id) => {
    setItems((prev) => prev.filter((x) => x.id !== id))
    const { error } = await supabase.from('notifications').delete().eq('id', id)
    if (error) {
      console.error('Delete notification error:', error.message)
      load()
    }
  }

  // ลบทั้งหมดของผู้ใช้ — กดครั้งแรกเพื่อยืนยัน (3 วินาที) กดครั้งที่สองเพื่อลบจริง
  const clearAll = async () => {
    if (!userId || items.length === 0) return
    if (!confirmClear) {
      setConfirmClear(true)
      clearTimeout(clearTimer.current)
      clearTimer.current = setTimeout(() => setConfirmClear(false), 3000)
      return
    }
    clearTimeout(clearTimer.current)
    setConfirmClear(false)
    setItems([])
    const { error } = await supabase.from('notifications').delete().eq('user_id', userId)
    if (error) {
      console.error('Clear notifications error:', error.message)
      load()
    }
  }

  const openItem = (item) => {
    if (!item.is_read) markRead(item.id)
    setOpen(false)
    if (!item.link) return
    if (/^https?:\/\//i.test(item.link)) window.open(item.link, '_blank', 'noopener,noreferrer')
    else navigate(item.link)
  }

  return (
    // มือถือ: ให้ dropdown อ้างอิงความกว้าง header ทั้งแถบ / เดสก์ท็อป: อ้างอิงปุ่มกระดิ่ง
    <div className="sm:relative" ref={wrapRef}>
      <button
        type="button"
        aria-label={n.bell(unread)}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-se-border/40 hover:text-se-text-main ${ring} ${
          open ? 'bg-se-border/40 text-se-text-main' : 'text-se-text-muted'
        }`}
      >
        <Icon d={ICONS.bell} className="h-[22px] w-[22px]" />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-se-danger px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-se-background">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <div
        role="dialog"
        aria-label={n.title}
        aria-hidden={!open}
        className={`absolute inset-x-4 top-full z-40 mt-2 origin-top-right overflow-hidden rounded-2xl border border-se-border/60 bg-se-surface/90 shadow-[0_12px_40px_rgba(0,0,0,0.16)] backdrop-blur-xl transition-all duration-200 motion-reduce:transition-none sm:inset-x-auto sm:right-0 sm:w-[380px] ${
          open ? 'visible scale-100 opacity-100' : 'invisible scale-95 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-se-border/60 px-4 py-3">
          <p className="text-[15px] font-semibold">{n.title}</p>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={markAllRead}
              disabled={unread === 0}
              tabIndex={open ? 0 : -1}
              className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-[12px] font-medium text-se-primary transition-colors hover:bg-se-primary/10 disabled:cursor-default disabled:text-se-text-muted disabled:opacity-60 disabled:hover:bg-transparent ${ring}`}
            >
              <Icon d={ICONS.check} strokeWidth={2.2} className="h-3.5 w-3.5" />
              {n.markAll}
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={items.length === 0}
              tabIndex={open ? 0 : -1}
              className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-[12px] font-medium transition-colors disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent ${ring} ${
                confirmClear
                  ? 'bg-se-danger/10 text-se-danger'
                  : 'text-se-text-muted hover:bg-se-danger/10 hover:text-se-danger'
              }`}
            >
              <Icon d={ICONS.trash} strokeWidth={2} className="h-3.5 w-3.5" />
              {confirmClear ? n.clearConfirm : n.clearAll}
            </button>
          </div>
        </div>

        <div className="custom-scrollbar max-h-[min(420px,70vh)] overflow-y-auto p-1.5">
          {status === 'loading' ? (
            <ul className="space-y-2 p-2" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-se-border/60" />
                  <span className="flex-1 space-y-2">
                    <span className="block h-3 w-3/5 animate-pulse rounded bg-se-border/50" />
                    <span className="block h-3 w-4/5 animate-pulse rounded bg-se-border/40" />
                  </span>
                </li>
              ))}
            </ul>
          ) : status === 'error' ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[13px] text-se-danger">{n.loadError}</p>
              <button
                type="button"
                tabIndex={open ? 0 : -1}
                onClick={() => {
                  setStatus('loading')
                  load()
                }}
                className={`mt-3 rounded-full bg-se-border/40 px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-se-border/60 ${ring}`}
              >
                {n.retry}
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-10 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-se-border/40 text-se-text-muted">
                <Icon d={ICONS.bell} className="h-5 w-5" />
              </span>
              <p className="mt-3 text-[14px] font-semibold">{n.empty}</p>
              <p className="mt-1 text-[12px] text-se-text-muted">{n.emptyHint}</p>
            </div>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.id} className="group relative">
                  <button
                    type="button"
                    tabIndex={open ? 0 : -1}
                    onClick={() => openItem(item)}
                    className={`flex w-full gap-3 rounded-xl py-2.5 pl-3 pr-11 text-left transition-colors hover:bg-se-border/30 ${ring}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${item.is_read ? 'bg-transparent' : 'bg-se-primary'}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-[13px] ${
                          item.is_read ? 'font-medium text-se-text-main/80' : 'font-semibold text-se-text-main'
                        }`}
                      >
                        {item.title}
                      </span>
                      {item.body && (
                        <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-se-text-muted">
                          {item.body}
                        </span>
                      )}
                      <span className="mt-1 block text-[11px] text-se-text-muted/80">
                        {timeAgo(item.created_at, lang)}
                      </span>
                    </span>
                  </button>

                  {/* ปุ่มลบ: เดสก์ท็อปแสดงตอน hover/โฟกัส — มือถือแสดงตลอด */}
                  <button
                    type="button"
                    aria-label={n.remove}
                    title={n.remove}
                    tabIndex={open ? 0 : -1}
                    onClick={() => removeOne(item.id)}
                    className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-se-text-muted transition hover:bg-se-danger/10 hover:text-se-danger focus-visible:opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100 ${ring}`}
                  >
                    <Icon d={ICONS.trash} strokeWidth={2} className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  LanguageSwitch — สลับภาษา TH / EN                                  */
/* ------------------------------------------------------------------ */

function LanguageSwitch({ lang, setLang, label }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex h-8 items-center rounded-full bg-se-border/40 p-0.5 text-[12px] font-semibold"
    >
      {['th', 'en'].map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
          className={`h-7 min-w-[34px] rounded-full px-2.5 transition-colors ${
            lang === code
              ? 'bg-se-surface text-se-text-main shadow-[0_1px_3px_rgba(0,0,0,0.18)]'
              : 'text-se-text-muted hover:text-se-text-main'
          } ${ring}`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  ThemeToggle — สลับ Light / Dark (Beta)                              */
/* ------------------------------------------------------------------ */

function ThemeToggle({ theme, setTheme, t }) {
  const isDark = theme === 'dark'

  return (
    <div className="group relative flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={t.themeLabel}
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors duration-300 motion-reduce:transition-none ${ring} ${
          isDark ? 'bg-se-primary' : 'bg-se-border'
        }`}
      >
        {/* ปุ่มกลมเลื่อนซ้าย-ขวา แสดงไอคอนตามโหมดปัจจุบัน */}
        <span
          className={`absolute left-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform duration-300 ease-out motion-reduce:transition-none ${
            isDark ? 'translate-x-5' : 'translate-x-0'
          }`}
        >
          <Icon
            d={isDark ? ICONS.moon : ICONS.sun}
            strokeWidth={2}
            className={`h-3.5 w-3.5 ${isDark ? 'text-se-primary' : 'text-orange-500'}`}
          />
        </span>
      </button>

      <span className="hidden rounded-full bg-orange-500/15 px-2 py-0.5 text-[11px] font-semibold text-orange-600 sm:inline">
        Beta
      </span>

      {/* Tooltip */}
      <div className="pointer-events-none absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-se-border/60 bg-se-surface/90 p-3 text-xs leading-relaxed text-se-text-muted opacity-0 shadow-[0_12px_40px_rgba(0,0,0,0.16)] backdrop-blur-xl transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100">
        <p className="mb-0.5 font-semibold text-se-text-main">{t.themeTipTitle}</p>
        {t.themeTipBody}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  ConsoleFooter — Copyright (อยู่ท้ายพื้นที่เนื้อหา)                    */
/* ------------------------------------------------------------------ */

function ConsoleFooter({ t }) {
  const year = getCurrentYear()

  return (
    <footer className="mt-8 shrink-0 border-t border-se-border/60 bg-se-surface/50 px-4 py-6 md:px-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            className="h-8 w-8 flex-shrink-0 rounded-[9px] object-contain"
          />
          <div className="leading-tight">
            <p className="text-[13px] font-semibold tracking-tight">SE-CONSOLE</p>
            <p className="mt-0.5 text-[12px] text-se-text-muted">{t.footer.tagline}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 text-[12px] leading-relaxed text-se-text-muted sm:items-end sm:text-right">
          <p>
            Copyright © {year} <span className="font-medium text-se-text-main">{COPYRIGHT_HOLDER}</span>. {t.footer.rights}
          </p>
          <p className="inline-flex items-center gap-1.5 sm:justify-end">
            <span className="h-1.5 w-1.5 rounded-full bg-se-success" aria-hidden="true" />
            {t.footer.madeIn}
          </p>
        </div>
      </div>
    </footer>
  )
}

/* ------------------------------------------------------------------ */
/*  ConsoleLayout                                                      */
/* ------------------------------------------------------------------ */

export default function ConsoleLayout() {
  const { user, profile, setSession, setProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState({})
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'th'
    } catch {
      return 'th'
    }
  })

  const t = I18N[lang]
  const profileMenuRef = useRef(null)
  const userId = user?.id || profile?.id || null

  const isCeoOrManager = ['ceo', 'manager'].includes(profile?.role)

  // Theme (Beta): สลับ class "dark" ที่ <html> — สีทั้งหมดอ้างอิง token จึงเปลี่ยนตามอัตโนมัติ
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  // ภาษา: จำค่าไว้ + ตั้ง <html lang> ให้ถูกต้อง (มีผลกับการตัดคำ/ฟอนต์)
  useEffect(() => {
    const root = document.documentElement
    const prev = root.lang
    root.lang = lang
    try {
      localStorage.setItem(LANG_KEY, lang)
    } catch {
      /* ignore */
    }
    return () => {
      root.lang = prev
    }
  }, [lang])

  // ออกจาก Console แล้วคืนค่า (Dark Mode ยังเป็น Beta เฉพาะในหน้า Console)
  useEffect(
    () => () => {
      document.documentElement.classList.remove('dark')
      document.documentElement.style.colorScheme = ''
    },
    []
  )

  // ปิด Profile Dropdown เมื่อคลิกที่อื่น หรือกด Esc
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsProfileOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    navigate('/sework/login')
  }

  const isActive = (path) => location.pathname.includes(path)

  // จัดกลุ่มเมนู Navigation — ใช้ id เป็น key (ไม่เปลี่ยนตามภาษา)
  const navGroups = [
    { id: 'home', title: t.nav.home, icon: ICONS.home, path: '/dashboard' },
    {
      id: 'academic',
      title: t.nav.academic,
      icon: ICONS.academic,
      children: [
        { id: 'announcements', title: t.nav.announcements, path: '/announcements' },
        { id: 'assignments', title: t.nav.assignments, path: '/assignments' },
        { id: 'subjects', title: t.nav.subjects, path: '/subjects' },
        { id: 'schedules', title: t.nav.schedules, path: '/schedules' },
        { id: 'sheet-data', title: t.nav.sheetData, path: '/sheet-data' },
        { id: 'semesters', title: t.nav.semesters, path: '/semesters' },
        { id: 'submission-links', title: t.nav.submissionLinks, path: '/submission-links' },
        { id: 'resource-center', title: t.nav.resourceCenter, path: '/resource-center' },
      ],
    },
    {
      id: 'community',
      title: t.nav.community,
      icon: ICONS.community,
      children: [
        { id: 'contacts', title: t.nav.contacts, path: '/contacts' },
        { id: 'internal-links', title: t.nav.internalLinks, path: '/internal-links' },
      ],
    },
    ...(isCeoOrManager
      ? [
          {
            id: 'admin',
            title: t.nav.admin,
            icon: ICONS.admin,
            children: [
              { id: 'submission-tracking', title: t.nav.submissionTracking, path: '/submission-tracking' },
              { id: 'leaderboard', title: t.nav.leaderboard, path: '/leaderboard' },
              { id: 'users-management', title: t.nav.usersManagement, path: '/users-management' },
            ],
          },
        ]
      : []),
  ]

  // เปิด Accordion อัตโนมัติถ้าเมนูย่อยกำลัง Active
  useEffect(() => {
    setExpandedGroups((prev) => {
      const next = { ...prev }
      navGroups.forEach((group) => {
        if (group.children && group.children.some((child) => isActive(child.path))) {
          next[group.id] = true
        }
      })
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, isCeoOrManager])

  const toggleGroup = (id) => {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const displayName = profile?.first_name
    ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name.charAt(0)}.` : ''}`
    : t.userFallback

  return (
    <div className="flex h-screen overflow-hidden bg-se-background font-sans text-se-text-main antialiased">
      {/* 1. Sidebar */}
      <aside
        className={`${
          isCollapsed ? 'w-[72px]' : 'w-[264px]'
        } z-20 flex flex-shrink-0 flex-col border-r border-se-border/60 bg-se-surface/80 backdrop-blur-xl backdrop-saturate-150 transition-all duration-300 ease-in-out motion-reduce:transition-none`}
      >
        {/* Logo Section */}
        <div className="flex h-14 flex-shrink-0 items-center border-b border-se-border/60 px-[18px]">
          <div className="flex w-full items-center gap-3 overflow-hidden">
            <img
              src="/logo.png"
              alt="SE-CONSOLE"
              draggable={false}
              className="h-9 w-9 flex-shrink-0 rounded-[10px] object-contain"
            />
            {!isCollapsed && (
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[16px] font-semibold tracking-tight">SE-CONSOLE</p>
                <p className="mt-0.5 truncate text-[11px] text-se-text-muted">{t.workspace}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="custom-scrollbar flex-1 overflow-y-auto px-3 py-4" aria-label={t.mainMenu}>
          <div className="space-y-1.5">
            {navGroups.map((group) => {
              const tone = NAV_TONE[group.id]

              // เมนูเดี่ยว (ไม่มีลูก)
              if (!group.children) {
                const active = isActive(group.path)
                return (
                  <Link
                    key={group.id}
                    to={`/sework/se-console${group.path}`}
                    title={isCollapsed ? group.title : undefined}
                    aria-label={isCollapsed ? group.title : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={`flex h-11 items-center gap-3 rounded-xl px-2.5 text-[14px] transition-colors ${
                      isCollapsed ? 'justify-center' : ''
                    } ${
                      active
                        ? 'bg-se-primary/10 font-semibold text-se-primary'
                        : 'text-se-text-main/80 hover:bg-se-border/30'
                    } ${ring}`}
                  >
                    <NavIcon d={group.icon} tone={tone} />
                    {!isCollapsed && <span className="whitespace-nowrap">{group.title}</span>}
                  </Link>
                )
              }

              // เมนูแบบมีลูก (Accordion)
              const isGroupExpanded = !isCollapsed && !!expandedGroups[group.id]
              const hasActiveChild = group.children.some((child) => isActive(child.path))

              return (
                <div key={group.id} className="flex flex-col">
                  <button
                    type="button"
                    aria-expanded={isGroupExpanded}
                    title={isCollapsed ? group.title : undefined}
                    aria-label={isCollapsed ? group.title : undefined}
                    onClick={() => {
                      if (isCollapsed) setIsCollapsed(false)
                      toggleGroup(group.id)
                    }}
                    className={`flex h-11 w-full items-center rounded-xl px-2.5 text-[14px] transition-colors ${
                      isCollapsed ? 'justify-center' : 'justify-between'
                    } ${
                      hasActiveChild && !isGroupExpanded
                        ? 'bg-se-primary/10 text-se-primary'
                        : 'text-se-text-main/80 hover:bg-se-border/30'
                    } ${ring}`}
                  >
                    <span className="flex items-center gap-3">
                      <NavIcon d={group.icon} tone={tone} />
                      {!isCollapsed && (
                        <span
                          className={`whitespace-nowrap font-medium ${hasActiveChild ? 'text-se-primary' : ''}`}
                        >
                          {group.title}
                        </span>
                      )}
                    </span>
                    {!isCollapsed && (
                      <Icon
                        d={ICONS.chevronDown}
                        strokeWidth={2}
                        className={`h-4 w-4 text-se-text-muted transition-transform duration-200 ${
                          isGroupExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </button>

                  {/* Sub-menu items */}
                  {!isCollapsed && (
                    <div
                      className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                        isGroupExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="ml-[24px] mt-1 space-y-0.5 border-l border-se-border/70 pb-1 pl-2">
                          {group.children.map((child) => {
                            const childActive = isActive(child.path)
                            return (
                              <Link
                                key={child.id}
                                to={`/sework/se-console${child.path}`}
                                tabIndex={isGroupExpanded ? 0 : -1}
                                aria-current={childActive ? 'page' : undefined}
                                className={`group/child flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] transition-colors ${
                                  childActive
                                    ? 'bg-se-primary/10 font-semibold text-se-primary'
                                    : 'text-se-text-muted hover:bg-se-border/30 hover:text-se-text-main'
                                } ${ring}`}
                              >
                                <span
                                  aria-hidden="true"
                                  className={`h-1.5 w-1.5 flex-shrink-0 rounded-full transition-colors ${
                                    childActive
                                      ? 'bg-se-primary'
                                      : 'bg-se-border group-hover/child:bg-se-text-muted'
                                  }`}
                                />
                                <span className="truncate">{child.title}</span>
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </nav>

        {/* Sidebar Footer (Collapse Toggle) */}
        <div className="border-t border-se-border/60 p-3">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? t.expand : t.collapse}
            title={isCollapsed ? t.expand : undefined}
            className={`flex h-10 w-full items-center justify-center rounded-xl text-se-text-muted transition-colors hover:bg-se-border/30 hover:text-se-text-main ${ring}`}
          >
            <Icon
              d={ICONS.collapse}
              className={`h-5 w-5 transition-transform duration-300 motion-reduce:transition-none ${
                isCollapsed ? 'rotate-180' : ''
              }`}
            />
            {!isCollapsed && <span className="ml-3 whitespace-nowrap text-sm font-medium">{t.collapse}</span>}
          </button>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Navigation — โปร่งแสง + blur ให้เนื้อหาเลื่อนลอดด้านใต้ได้แบบ apple.com */}
        <header className="absolute inset-x-0 top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-se-border/60 bg-se-background/70 px-4 backdrop-blur-xl backdrop-saturate-150 md:px-8">
          {/* ซ้าย: วันที่/เวลาประเทศไทย */}
          <Clock lang={lang} t={t} />

          {/* ขวา: IP / ภาษา / แจ้งเตือน / โหมดสี / โปรไฟล์ */}
          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
            <PublicIp t={t} />

            <LanguageSwitch lang={lang} setLang={setLang} label={t.languageLabel} />

            <NotificationBell userId={userId} lang={lang} t={t} />

            <ThemeToggle theme={theme} setTheme={setTheme} t={t} />

            <div className="mx-0.5 hidden h-5 w-px bg-se-border sm:block"></div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={isProfileOpen}
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className={`flex items-center gap-2.5 rounded-full bg-se-surface/80 py-1 pl-1 pr-3 ring-1 ring-se-border/70 transition-colors hover:bg-se-surface ${ring}`}
              >
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-se-primary/10 text-sm font-semibold text-se-primary">
                  {profile?.profile_image_url ? (
                    <img src={profile.profile_image_url} alt={t.profileImageAlt} className="h-full w-full object-cover" />
                  ) : (
                    (profile?.first_name || profile?.email || '?').charAt(0).toUpperCase()
                  )}
                </div>
                <span className="hidden text-sm font-semibold leading-tight sm:block">{displayName}</span>
                <Icon
                  d={ICONS.chevronDown}
                  strokeWidth={2}
                  className={`h-4 w-4 text-se-text-muted transition-transform duration-200 ${
                    isProfileOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              <div
                role="menu"
                aria-hidden={!isProfileOpen}
                className={`absolute right-0 top-full mt-2 w-64 origin-top-right rounded-2xl border border-se-border/60 bg-se-surface/90 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.16)] backdrop-blur-xl transition-all duration-200 motion-reduce:transition-none ${
                  isProfileOpen ? 'visible scale-100 opacity-100' : 'invisible scale-95 opacity-0'
                }`}
              >
                <div className="mb-1.5 border-b border-se-border/60 px-3 pb-3 pt-2">
                  <p className="text-sm font-semibold">
                    {profile?.first_name || t.userFallback} {profile?.last_name || ''}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-se-text-muted">{profile?.email}</p>
                  <span className="mt-2 inline-flex items-center rounded-full bg-se-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase text-se-primary">
                    {profile?.role || 'student'}
                  </span>
                </div>

                <Link
                  to="/sework/se-console/profile"
                  role="menuitem"
                  tabIndex={isProfileOpen ? 0 : -1}
                  onClick={() => setIsProfileOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-se-border/30 ${ring}`}
                >
                  <Icon d={ICONS.user} className="h-4 w-4 text-se-text-muted" />
                  {t.myProfile}
                </Link>

                <button
                  type="button"
                  role="menuitem"
                  tabIndex={isProfileOpen ? 0 : -1}
                  onClick={handleLogout}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-se-danger transition-colors hover:bg-se-danger/10 ${ring}`}
                >
                  <Icon d={ICONS.logout} className="h-4 w-4" />
                  {t.logout}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content — เว้นด้านบนเท่าความสูง header (h-14) แล้วตามด้วย Footer */}
        <main className="custom-scrollbar flex h-full flex-col overflow-y-auto pt-14">
          <div className="min-w-0 flex-1 p-4 md:p-8">
            {/* ส่งภาษา/ธีมให้หน้าลูกใช้ผ่าน useOutletContext() */}
            <Outlet context={{ lang, theme }} />
          </div>

          <ConsoleFooter t={t} />
        </main>
      </div>

      {/* Global Style: Scrollbar + ค่าสีของ Dark Mode (Beta) */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: color-mix(in srgb, var(--color-se-text-muted) 30%, transparent);
          border-radius: 20px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: color-mix(in srgb, var(--color-se-text-muted) 50%, transparent);
        }

        /* Dark Mode (Beta) — override design tokens */
        :root.dark {
          --color-se-background: #000000;
          --color-se-surface: #1c1c1e;
          --color-se-border: #38383a;
          --color-se-primary: #0a84ff;
          --color-se-primary-hover: #409cff;
          --color-se-text-main: #f5f5f7;
          --color-se-text-muted: #98989d;
          --color-se-danger: #ff453a;
          --color-se-success: #30d158;
        }
      `}</style>
    </div>
  )
}