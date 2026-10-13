import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { supabase } from '../../../lib/supabase'

/* ---------- Helpers ---------- */
const PALETTE = ['#0071e3', '#5e5ce6', '#34c759', '#ff9f0a', '#ff375f', '#64d2ff', '#8e8e93']

const countBy = (list, fn) => {
  const map = new Map()
  list.forEach((x) => {
    const k = fn(x)
    map.set(k, (map.get(k) || 0) + 1)
  })
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
}

const greeting = (h) => {
  if (h < 12) return 'สวัสดีตอนเช้า'
  if (h < 17) return 'สวัสดีตอนบ่าย'
  if (h < 20) return 'สวัสดีตอนเย็น'
  return 'สวัสดีตอนค่ำ'
}

const donutGradient = (items, total) => {
  if (!total) return 'conic-gradient(#e5e5ea 0 100%)'
  let acc = 0
  const parts = items.map((it, i) => {
    const start = (acc / total) * 100
    acc += it.value
    const end = (acc / total) * 100
    return `${PALETTE[i % PALETTE.length]} ${start}% ${end}%`
  })
  return `conic-gradient(${parts.join(',')})`
}

function useCountUp(target, duration = 900) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (typeof target !== 'number') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setV(target)
      return
    }
    let raf
    let start
    const tick = (t) => {
      if (start === undefined) start = t
      const p = Math.min((t - start) / duration, 1)
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return v
}

/* ---------- Small components ---------- */
const cardCls =
  'rounded-[24px] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.06]'

function Avatar({ src, name, size = 64, className = '' }) {
  const [failed, setFailed] = useState(false)
  const initial = (name || '?').trim().charAt(0).toUpperCase()
  return (
    <div
      style={{ width: size, height: size }}
      className={`flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#e8f1ff] to-[#f0ecff] font-semibold text-[#0071e3] ring-1 ring-black/[0.06] ${className}`}
    >
      {src && !failed ? (
        <img src={src} alt={name} draggable={false} onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <span style={{ fontSize: size * 0.4 }}>{initial}</span>
      )}
    </div>
  )
}

function Badge({ children, tone = 'blue' }) {
  const tones = {
    blue: 'bg-[#0071e3]/10 text-[#0071e3]',
    gray: 'bg-black/[0.05] text-[#6e6e73]',
    green: 'bg-[#34c759]/15 text-[#248a3d]',
    orange: 'bg-[#ff9f0a]/15 text-[#b25f00]',
  }
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.05em] ${tones[tone]}`}>
      {children}
    </span>
  )
}

function StatCard({ label, value, hint, icon, gradient, delay = 0 }) {
  const animated = useCountUp(typeof value === 'number' ? value : undefined)
  return (
    <div className={`se-rise ${cardCls}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-medium text-[#6e6e73]">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-[11px] bg-gradient-to-br ${gradient} shadow-[0_4px_12px_rgba(0,0,0,0.12)]`}>
          <svg className="h-[18px] w-[18px] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {icon}
          </svg>
        </div>
      </div>
      <div className="mt-4 text-[40px] font-semibold leading-none tracking-[-0.03em] tabular-nums">
        {value === undefined ? (
          <span className="inline-block h-10 w-16 animate-pulse rounded-lg bg-black/[0.06]" />
        ) : value === null ? (
          <span className="text-[#c7c7cc]">–</span>
        ) : (
          animated
        )}
      </div>
      <p className="mt-2 text-[12px] text-[#86868b]">{hint}</p>
    </div>
  )
}

function BarList({ items, emptyText }) {
  if (!items.length) return <p className="py-6 text-center text-[14px] text-[#86868b]">{emptyText}</p>
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <ul className="space-y-4">
      {items.map((it, i) => (
        <li key={it.label}>
          <div className="mb-1.5 flex items-baseline justify-between text-[14px]">
            <span className="font-medium">{it.label}</span>
            <span className="tabular-nums text-[#6e6e73]">{it.value} คน</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-black/[0.06]">
            <div
              className="h-full rounded-full transition-[width] duration-1000 ease-[cubic-bezier(.28,.11,.32,1)]"
              style={{
                width: `${(it.value / max) * 100}%`,
                background: `linear-gradient(90deg, ${PALETTE[i % PALETTE.length]}, ${PALETTE[i % PALETTE.length]}cc)`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

function InfoRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-[14px]">
      <span className="text-[#6e6e73]">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  )
}

/* ---------- Page ---------- */
export default function Dashboard() {
  const { user, profile } = useAuth()

  const [members, setMembers] = useState(null) // null = กำลังโหลด
  const [dbStatus, setDbStatus] = useState('checking') // checking | connected | error
  const [latency, setLatency] = useState(null)
  const [now, setNow] = useState(() => new Date())
  const alive = useRef(true)

  useEffect(() => {
    document.title = 'Dashboard | SE-CONSOLE'
  }, [])

  // นาฬิกา (อัปเดตทุก 30 วินาที)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [])

  const load = useCallback(async () => {
    setDbStatus('checking')
    const t0 = performance.now()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, nickname, role, sec, year_level, profile_image_url, github_account')
    const ms = Math.round(performance.now() - t0)
    if (!alive.current) return

    if (error) {
      console.error('Dashboard load error:', error.message)
      setMembers([])
      setLatency(null)
      setDbStatus('error')
      return
    }
    setMembers(data || [])
    setLatency(ms)
    setDbStatus('connected')
  }, [])

  useEffect(() => {
    alive.current = true
    load()
    return () => {
      alive.current = false
    }
  }, [load])

  /* ----- Derived data ----- */
  const stats = useMemo(() => {
    if (!members) return null
    const total = members.length
    const mySec = profile?.sec ? members.filter((m) => m.sec === profile.sec).length : null
    const sameYear = profile?.year_level
      ? members.filter((m) => String(m.year_level) === String(profile.year_level)).length
      : null
    const github = members.filter((m) => m.github_account).length
    const bySec = countBy(members, (m) => m.sec || 'ยังไม่กำหนด').slice(0, 6)
    const byRole = countBy(members, (m) => (m.role || 'unknown').toString().toUpperCase())
    return { total, mySec, sameYear, github, bySec, byRole }
  }, [members, profile])

  const displayName = profile?.first_name || profile?.nickname || user?.email?.split('@')[0] || 'ผู้ใช้งาน'
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user?.email

  const dateText = new Intl.DateTimeFormat('th-TH', { dateStyle: 'full' }).format(now)
  const timeText = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  const lastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
    : '–'

  const dbPill = {
    checking: { dot: 'bg-[#ff9f0a]', text: 'text-[#b25f00]', label: 'กำลังตรวจสอบ...' },
    connected: { dot: 'bg-[#34c759]', text: 'text-[#248a3d]', label: 'Database Connected' },
    error: { dot: 'bg-[#ff3b30]', text: 'text-[#d70015]', label: 'Database Error' },
  }[dbStatus]

  const recentMembers = (members || []).slice(0, 8)

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <style>{`
        @keyframes se-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .se-rise { opacity: 0; animation: se-rise .7s cubic-bezier(.28,.11,.32,1) forwards; }
        @media (prefers-reduced-motion: reduce) { .se-rise { animation: none; opacity: 1; } }
      `}</style>

      {/* ===== Header ===== */}
      <div className="se-rise mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[13px] font-medium text-[#6e6e73]">
            {dateText} · {timeText} น.
          </p>
          <h1 className="mt-1 text-[32px] font-semibold leading-[1.2] tracking-[-0.03em] md:text-[44px]">
            {greeting(now.getHours())},{' '}
            <span className="bg-gradient-to-r from-[#0071e3] to-[#5e5ce6] bg-clip-text text-transparent">{displayName}</span>
          </h1>
          <p className="mt-1 text-[16px] text-[#6e6e73]">ยินดีต้อนรับเข้าสู่ระบบจัดการ SEWORK</p>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={dbStatus === 'checking'}
          className="group inline-flex items-center gap-2.5 self-start rounded-full bg-white px-4 py-2 text-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.06] transition hover:ring-black/[0.15] disabled:opacity-70 md:self-auto"
          title="ตรวจสอบการเชื่อมต่ออีกครั้ง"
        >
          <span className="relative flex h-2.5 w-2.5">
            {dbStatus === 'connected' && (
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${dbPill.dot}`} />
            )}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dbPill.dot}`} />
          </span>
          <span className={`font-medium ${dbPill.text}`}>{dbPill.label}</span>
          {latency !== null && dbStatus === 'connected' && <span className="text-[#86868b]">{latency} ms</span>}
          <svg
            className={`h-3.5 w-3.5 text-[#86868b] ${dbStatus === 'checking' ? 'animate-spin' : 'transition-transform group-hover:rotate-90'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 11-3-6.7M21 4v5h-5" />
          </svg>
        </button>
      </div>

      {/* ===== Profile + System ===== */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Profile hero */}
        <section className={`se-rise relative overflow-hidden lg:col-span-2 ${cardCls} p-7 md:p-8`} style={{ animationDelay: '60ms' }}>
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full opacity-60 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(0,113,227,0.22), rgba(94,92,230,0.12) 60%, transparent 70%)' }}
          />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
            <Avatar src={profile?.profile_image_url} name={displayName} size={88} className="shadow-[0_10px_30px_rgba(0,0,0,0.12)]" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-[26px] font-semibold tracking-[-0.025em]">{fullName}</h2>
                {profile?.role && <Badge>{profile.role}</Badge>}
              </div>
              <p className="mt-0.5 truncate text-[15px] text-[#6e6e73]">{user?.email}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="gray">{profile?.sec || 'SEC ยังไม่กำหนด'}</Badge>
                <Badge tone="gray">ชั้นปี {profile?.year_level || '-'}</Badge>
                {profile?.github_account && (
                  <Badge tone="gray">GitHub เชื่อมแล้ว</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="relative mt-7 grid grid-cols-1 gap-x-8 divide-y divide-black/[0.06] border-t border-black/[0.06] sm:grid-cols-2 sm:divide-y-0">
            <InfoRow label="อีเมล">{user?.email || '–'}</InfoRow>
            <InfoRow label="ระดับสิทธิ์">
              <span className="uppercase text-[#0071e3]">{profile?.role || '–'}</span>
            </InfoRow>
            <InfoRow label="แผนการเรียน">
              {profile?.sec || 'ยังไม่กำหนด'} (ชั้นปี {profile?.year_level || '-'})
            </InfoRow>
            <InfoRow label="เข้าสู่ระบบล่าสุด">{lastSignIn}</InfoRow>
          </div>
        </section>

        {/* System status */}
        <section className={`se-rise ${cardCls}`} style={{ animationDelay: '120ms' }}>
          <h2 className="text-[17px] font-semibold tracking-[-0.01em]">สถานะระบบ</h2>
          <ul className="mt-3 divide-y divide-black/[0.06]">
            <li className="flex items-center justify-between py-3 text-[14px]">
              <span className="text-[#6e6e73]">ฐานข้อมูล</span>
              <span className={`font-medium ${dbPill.text}`}>
                {dbStatus === 'connected' ? 'ออนไลน์' : dbStatus === 'error' ? 'ขัดข้อง' : 'กำลังตรวจสอบ'}
              </span>
            </li>
            <li className="flex items-center justify-between py-3 text-[14px]">
              <span className="text-[#6e6e73]">ความหน่วง</span>
              <span className="font-medium tabular-nums">{latency !== null ? `${latency} ms` : '–'}</span>
            </li>
            <li className="flex items-center justify-between py-3 text-[14px]">
              <span className="text-[#6e6e73]">Authentication</span>
              <span className="font-medium text-[#248a3d]">{user ? 'Active' : '–'}</span>
            </li>
            <li className="flex items-center justify-between py-3 text-[14px]">
              <span className="text-[#6e6e73]">Environment</span>
              <span className="font-medium uppercase">{import.meta.env.MODE}</span>
            </li>
          </ul>
          {dbStatus === 'error' && (
            <p className="mt-3 rounded-xl bg-[#ff3b30]/10 px-3 py-2 text-[12px] leading-[1.5] text-[#d70015]">
              โหลดข้อมูลสมาชิกไม่สำเร็จ ตรวจสอบสิทธิ์ (RLS) ของตาราง profiles แล้วกดตรวจสอบอีกครั้ง
            </p>
          )}
        </section>
      </div>

      {/* ===== Stat cards ===== */}
      <div className="mt-5 grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatCard
          label="สมาชิกทั้งหมด"
          value={stats ? stats.total : undefined}
          hint="จำนวนโปรไฟล์ในระบบ"
          gradient="from-[#5ab0ff] to-[#0071e3]"
          delay={160}
          icon={<path d="M17 20h5v-2a4 4 0 00-5.356-3.772M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a4 4 0 015.356-3.772M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />}
        />
        <StatCard
          label={`ใน ${profile?.sec || 'SEC'} ของคุณ`}
          value={stats ? stats.mySec : undefined}
          hint="สมาชิกที่อยู่แผนการเรียนเดียวกัน"
          gradient="from-[#c4a6ff] to-[#7c3aed]"
          delay={210}
          icon={<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />}
        />
        <StatCard
          label={`ชั้นปี ${profile?.year_level || '-'}`}
          value={stats ? stats.sameYear : undefined}
          hint="สมาชิกที่อยู่ชั้นปีเดียวกัน"
          gradient="from-[#ffb86b] to-[#ff9500]"
          delay={260}
          icon={<path d="M12 14l9-5-9-5-9 5 9 5zm0 0v7m-6-8.5V17a6 6 0 0012 0v-4.5" />}
        />
        <StatCard
          label="เชื่อม GitHub แล้ว"
          value={stats ? stats.github : undefined}
          hint="สมาชิกที่ผูกบัญชี GitHub"
          gradient="from-[#6bea9f] to-[#1fb45a]"
          delay={310}
          icon={<path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />}
        />
      </div>

      {/* ===== Charts ===== */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className={`se-rise lg:col-span-2 ${cardCls}`} style={{ animationDelay: '360ms' }}>
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="text-[17px] font-semibold tracking-[-0.01em]">สมาชิกแยกตามแผนการเรียน</h2>
            <span className="text-[12px] text-[#86868b]">SEC</span>
          </div>
          {stats ? (
            <BarList items={stats.bySec} emptyText="ยังไม่มีข้อมูลสมาชิก" />
          ) : (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-6 animate-pulse rounded-full bg-black/[0.06]" />
              ))}
            </div>
          )}
        </section>

        <section className={`se-rise ${cardCls}`} style={{ animationDelay: '410ms' }}>
          <h2 className="mb-5 text-[17px] font-semibold tracking-[-0.01em]">สัดส่วนตามระดับสิทธิ์</h2>
          {stats ? (
            <div className="flex flex-col items-center gap-5">
              <div
                className="relative h-40 w-40 rounded-full"
                style={{ background: donutGradient(stats.byRole, stats.total) }}
                role="img"
                aria-label="สัดส่วนสมาชิกตามระดับสิทธิ์"
              >
                <div className="absolute inset-[22px] flex flex-col items-center justify-center rounded-full bg-white">
                  <span className="text-[30px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{stats.total}</span>
                  <span className="mt-1 text-[11px] text-[#86868b]">สมาชิก</span>
                </div>
              </div>
              <ul className="w-full space-y-2">
                {stats.byRole.slice(0, 6).map((r, i) => (
                  <li key={r.label} className="flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                      <span className="font-medium">{r.label}</span>
                    </span>
                    <span className="tabular-nums text-[#6e6e73]">{r.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mx-auto h-40 w-40 animate-pulse rounded-full bg-black/[0.06]" />
          )}
        </section>
      </div>

      {/* ===== Members + Shortcuts ===== */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className={`se-rise lg:col-span-2 ${cardCls}`} style={{ animationDelay: '460ms' }}>
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="text-[17px] font-semibold tracking-[-0.01em]">สมาชิกในระบบ</h2>
            <Link to="/talents" className="text-[14px] text-[#0066cc] underline-offset-4 hover:underline">
              ดูทั้งหมด <span aria-hidden>›</span>
            </Link>
          </div>

          {!members ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-black/[0.06]" />
              ))}
            </div>
          ) : recentMembers.length === 0 ? (
            <p className="py-8 text-center text-[14px] text-[#86868b]">ยังไม่มีข้อมูลสมาชิก</p>
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {recentMembers.map((m) => {
                  const name = m.nickname || m.first_name || 'No Name'
                  return (
                    <li key={m.id} className="flex flex-col items-center rounded-2xl bg-[#f5f5f7] px-3 py-4 text-center">
                      <Avatar src={m.profile_image_url} name={name} size={44} />
                      <p className="mt-2 w-full truncate text-[13px] font-medium">{name}</p>
                      <p className="w-full truncate text-[11px] uppercase text-[#86868b]">{m.role || 'member'}</p>
                    </li>
                  )
                })}
              </ul>
              {members.length > recentMembers.length && (
                <p className="mt-4 text-center text-[13px] text-[#86868b]">
                  และอีก {members.length - recentMembers.length} คน
                </p>
              )}
            </>
          )}
        </section>

        <section className={`se-rise ${cardCls}`} style={{ animationDelay: '510ms' }}>
          <h2 className="mb-4 text-[17px] font-semibold tracking-[-0.01em]">ทางลัด</h2>
          <ul className="space-y-2">
            {[
              { to: '/talents', title: 'Talents', sub: 'ดูโปรไฟล์สมาชิกทั้งหมด', gradient: 'from-[#c4a6ff] to-[#7c3aed]' },
              { to: '/support', title: 'Support', sub: 'ติดต่อทีมงานผ่านแบบฟอร์ม', gradient: 'from-[#5ab0ff] to-[#0071e3]' },
              { to: '/', title: 'SE-ONE Portal', sub: 'กลับไปหน้าเลือกแอปพลิเคชัน', gradient: 'from-[#6bea9f] to-[#1fb45a]' },
            ].map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="group flex items-center gap-3 rounded-2xl bg-[#f5f5f7] p-3 transition hover:bg-[#ececf0]"
                >
                  <span className={`h-10 w-10 flex-shrink-0 rounded-[12px] bg-gradient-to-br ${l.gradient}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold">{l.title}</span>
                    <span className="block truncate text-[12px] text-[#6e6e73]">{l.sub}</span>
                  </span>
                  <span aria-hidden className="text-[#86868b] transition-transform group-hover:translate-x-0.5">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
          </div>
  )
}