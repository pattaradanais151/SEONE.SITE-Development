import { useEffect, useState, useRef } from 'react'
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                                */
/* ------------------------------------------------------------------ */

const THEME_KEY = 'se-theme'
const TH_TZ = 'Asia/Bangkok'

// เวลา/วันที่ประเทศไทย (พ.ศ.) — fix timezone เป็น Asia/Bangkok ไม่ขึ้นกับเครื่องผู้ใช้
const TIME_FMT = new Intl.DateTimeFormat('th-TH', {
  timeZone: TH_TZ,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})
const DATE_FMT = new Intl.DateTimeFormat('th-TH', {
  timeZone: TH_TZ,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

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

/* ------------------------------------------------------------------ */
/*  ThaiClock — วันที่/เวลาประเทศไทย (แยก component เพื่อไม่ให้ layout re-render ทุกวินาที) */
/* ------------------------------------------------------------------ */

function ThaiClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex min-w-0 items-center gap-3" aria-label="วันและเวลาประเทศไทย">
      <time
        dateTime={now.toISOString()}
        className="flex items-baseline gap-1.5 text-[15px] font-semibold tabular-nums text-se-text-main"
      >
        {TIME_FMT.format(now)}
        <span className="text-[11px] font-medium text-se-text-muted">GMT+7</span>
      </time>
      <span className="hidden h-4 w-px bg-se-border md:block" />
      <span className="hidden truncate text-[13px] text-se-text-muted md:block">{DATE_FMT.format(now)}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  PublicIp — ดึง Public IP (คลิกเพื่อคัดลอก / ถ้าโหลดไม่ได้คลิกเพื่อลองใหม่)   */
/* ------------------------------------------------------------------ */

function PublicIp() {
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

  const label =
    status === 'loading' ? 'กำลังตรวจสอบ...' : status === 'error' ? 'ตรวจสอบไม่ได้ · ลองใหม่' : copied ? 'คัดลอกแล้ว' : ip

  return (
    <button
      type="button"
      onClick={handleClick}
      title={status === 'ready' ? 'Public IP — คลิกเพื่อคัดลอก' : 'Public IP'}
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
/*  ThemeToggle — สลับ Light / Dark (Beta)                              */
/* ------------------------------------------------------------------ */

function ThemeToggle({ theme, setTheme }) {
  const isDark = theme === 'dark'

  return (
    <div className="group relative flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label="Dark mode (Beta)"
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
        <p className="mb-0.5 font-semibold text-se-text-main">Dark Mode (Beta)</p>
        อยู่ในช่วงทดสอบ บางหน้าอาจยังแสดงผลสีไม่สมบูรณ์
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  ConsoleLayout                                                      */
/* ------------------------------------------------------------------ */

export default function ConsoleLayout() {
  const { profile, setSession, setProfile } = useAuth()
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

  const profileMenuRef = useRef(null)

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

  // ออกจาก Console แล้วคืนค่า (Dark Mode ยังเป็น Beta เฉพาะในหน้า Console)
  useEffect(
    () => () => {
      document.documentElement.classList.remove('dark')
      document.documentElement.style.colorScheme = ''
    },
    []
  )

  // ปิด Dropdown เมื่อคลิกที่อื่น หรือกด Esc
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

  // จัดกลุ่มเมนู Navigation
  const navGroups = [
    { title: 'Home', icon: ICONS.home, path: '/dashboard' },
    {
      title: 'Academic',
      icon: ICONS.academic,
      children: [
        { title: 'Announcements', path: '/announcements' },
        { title: 'Assignments', path: '/assignments' },
        { title: 'Subjects', path: '/subjects' },
        { title: 'Schedules', path: '/schedules' },
        { title: 'Sheet Data', path: '/sheet-data' },
        { title: 'Semesters', path: '/semesters' },
        { title: 'Submission Links', path: '/submission-links' },
        { title: 'Resource Center', path: '/resource-center' },
      ],
    },
    {
      title: 'Community',
      icon: ICONS.community,
      children: [
        { title: 'Contacts', path: '/contacts' },
        { title: 'Internal Links', path: '/internal-links' },
      ],
    },
    ...(isCeoOrManager
      ? [
          {
            title: 'Administration',
            icon: ICONS.admin,
            children: [
              { title: 'Submission Tracking', path: '/submission-tracking' },
              { title: 'Leaderboard', path: '/leaderboard' },
              { title: 'Users Management', path: '/users-management' },
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
          next[group.title] = true
        }
      })
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, isCeoOrManager])

  const toggleGroup = (title) => {
    setExpandedGroups((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  const displayName = profile?.first_name
    ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name.charAt(0)}.` : ''}`
    : 'User'

  return (
    <div className="flex h-screen overflow-hidden bg-se-background font-sans text-se-text-main antialiased">
      {/* 1. Sidebar */}
      <aside
        className={`${
          isCollapsed ? 'w-[72px]' : 'w-[264px]'
        } z-20 flex flex-shrink-0 flex-col border-r border-se-border/60 bg-se-surface transition-all duration-300 ease-in-out motion-reduce:transition-none`}
      >
        {/* Logo Section */}
        <div className="flex h-14 flex-shrink-0 items-center border-b border-se-border/60 px-[18px]">
          <div className="flex w-full items-center gap-3 overflow-hidden">
            <img
              src="/logo.png"
              alt="SE-CONSOLE"
              className="h-9 w-9 flex-shrink-0 rounded-[10px] bg-black object-contain p-1.5"
            />
            {!isCollapsed && (
              <span className="whitespace-nowrap text-[17px] font-semibold tracking-tight">SE-CONSOLE</span>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="custom-scrollbar flex-1 overflow-y-auto px-3 py-4" aria-label="เมนูหลัก">
          <div className="space-y-1">
            {navGroups.map((group) => {
              // เมนูเดี่ยว (ไม่มีลูก)
              if (!group.children) {
                const active = isActive(group.path)
                return (
                  <Link
                    key={group.title}
                    to={`/sework/se-console${group.path}`}
                    title={isCollapsed ? group.title : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={`flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] transition-colors ${
                      isCollapsed ? 'justify-center' : ''
                    } ${
                      active
                        ? 'bg-se-primary/10 font-semibold text-se-primary'
                        : 'text-se-text-main/80 hover:bg-se-border/30'
                    } ${ring}`}
                  >
                    <Icon d={group.icon} className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && <span className="whitespace-nowrap">{group.title}</span>}
                  </Link>
                )
              }

              // เมนูแบบมีลูก (Accordion)
              const isGroupExpanded = !isCollapsed && !!expandedGroups[group.title]
              const hasActiveChild = group.children.some((child) => isActive(child.path))

              return (
                <div key={group.title} className="flex flex-col">
                  <button
                    type="button"
                    aria-expanded={isGroupExpanded}
                    title={isCollapsed ? group.title : undefined}
                    onClick={() => {
                      if (isCollapsed) setIsCollapsed(false)
                      toggleGroup(group.title)
                    }}
                    className={`flex h-10 w-full items-center rounded-lg px-3 text-[14px] transition-colors ${
                      isCollapsed ? 'justify-center' : 'justify-between'
                    } ${
                      hasActiveChild && !isGroupExpanded
                        ? 'bg-se-primary/10 text-se-primary'
                        : 'text-se-text-main/80 hover:bg-se-border/30'
                    } ${ring}`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon
                        d={group.icon}
                        className={`h-5 w-5 flex-shrink-0 ${hasActiveChild ? 'text-se-primary' : ''}`}
                      />
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
                        <div className="ml-[22px] mt-1 space-y-0.5 border-l border-se-border/70 pb-1 pl-3">
                          {group.children.map((child) => {
                            const childActive = isActive(child.path)
                            return (
                              <Link
                                key={child.path}
                                to={`/sework/se-console${child.path}`}
                                tabIndex={isGroupExpanded ? 0 : -1}
                                aria-current={childActive ? 'page' : undefined}
                                className={`block rounded-lg px-3 py-2 text-[14px] transition-colors ${
                                  childActive
                                    ? 'bg-se-primary/10 font-semibold text-se-primary'
                                    : 'text-se-text-muted hover:bg-se-border/30 hover:text-se-text-main'
                                } ${ring}`}
                              >
                                {child.title}
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
            aria-label={isCollapsed ? 'ขยายแถบเมนู' : 'ย่อแถบเมนู'}
            className={`flex h-10 w-full items-center justify-center rounded-lg text-se-text-muted transition-colors hover:bg-se-border/30 hover:text-se-text-main ${ring}`}
          >
            <Icon
              d={ICONS.collapse}
              className={`h-5 w-5 transition-transform duration-300 motion-reduce:transition-none ${
                isCollapsed ? 'rotate-180' : ''
              }`}
            />
            {!isCollapsed && <span className="ml-3 text-sm font-medium">ย่อแถบเมนู</span>}
          </button>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Navigation — โปร่งแสง + blur ให้เนื้อหาเลื่อนลอดด้านใต้ได้แบบ apple.com */}
        <header className="absolute inset-x-0 top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-se-border/60 bg-se-background/70 px-4 backdrop-blur-xl backdrop-saturate-150 md:px-8">
          {/* ซ้าย: วันที่/เวลาประเทศไทย */}
          <ThaiClock />

          {/* ขวา: IP / แจ้งเตือน / โหมดสี / โปรไฟล์ */}
          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
            <PublicIp />

            {/* Notification Bell */}
            <button
              type="button"
              aria-label="การแจ้งเตือน"
              className={`relative flex h-9 w-9 items-center justify-center rounded-full text-se-text-muted transition-colors hover:bg-se-border/40 hover:text-se-text-main ${ring}`}
            >
              <Icon d={ICONS.bell} className="h-[22px] w-[22px]" />
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-se-background bg-se-danger"></span>
            </button>

            <ThemeToggle theme={theme} setTheme={setTheme} />

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
                    <img src={profile.profile_image_url} alt="Profile" className="h-full w-full object-cover" />
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
                    {profile?.first_name || 'User'} {profile?.last_name || ''}
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
                  My Profile
                </Link>

                <button
                  type="button"
                  role="menuitem"
                  tabIndex={isProfileOpen ? 0 : -1}
                  onClick={handleLogout}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-se-danger transition-colors hover:bg-se-danger/10 ${ring}`}
                >
                  <Icon d={ICONS.logout} className="h-4 w-4" />
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content — เว้นด้านบนเท่าความสูง header (h-14) */}
        <main className="custom-scrollbar h-full overflow-y-auto pt-14">
          <div className="p-4 md:p-8">
            <Outlet />
          </div>
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