import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

/* ---------- Config ---------- */
// คอลัมน์ใน Supabase ที่เก็บ "สายงาน" (FULLSTACK / UI/UX / DATABASE ...) ที่แสดงเป็นป้ายมุมขวาบน
const ROLE_FIELD = 'role'

// กำหนดป้ายตายตัวรายบุคคล (key = GitHub username ตัวพิมพ์เล็ก)
const ROLE_OVERRIDES = {
  pattaradanais151: 'FULLSTACK',
}

const DEFAULT_BIO = 'Software Engineering Student @ RMUTL'
const GH_TTL = 60 * 60 * 1000 // cache ข้อมูล GitHub 1 ชั่วโมง กันชน rate limit

/* ---------- Helpers ---------- */
const parseGithubUser = (value) => {
  if (!value) return null
  const s = String(value).trim().replace(/^@/, '')
  const m = s.match(/github\.com\/([^/?#\s]+)/i)
  const u = (m ? m[1] : s).replace(/\/+$/, '')
  return /^[A-Za-z0-9-]+$/.test(u) ? u : null
}

async function fetchGithub(username) {
  const key = `se-gh:${username.toLowerCase()}`
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const { t, d } = JSON.parse(raw)
      if (Date.now() - t < GH_TTL) return d
    }
  } catch {
    /* ignore */
  }

  try {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) return null
    const j = await res.json()
    const d = {
      login: j.login,
      name: j.name,
      bio: j.bio,
      avatar: j.avatar_url,
      repos: j.public_repos,
      followers: j.followers,
      following: j.following,
    }
    try {
      localStorage.setItem(key, JSON.stringify({ t: Date.now(), d }))
    } catch {
      /* ignore */
    }
    return d
  } catch {
    return null
  }
}

/* ---------- Small components ---------- */
function Avatar({ src, fallback, alt }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="relative mx-auto h-[96px] w-[96px]">
      {/* gradient ring */}
      <div
        aria-hidden
        className="absolute -inset-[3px] rounded-full bg-gradient-to-br from-[#5ab0ff] via-[#8b5cf6] to-[#ff7a4d] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#e8f1ff] to-[#f0ecff] text-[34px] font-semibold text-[#0071e3] shadow-[0_10px_28px_-8px_rgba(0,0,0,0.25)] ring-4 ring-white">
        {src && !failed ? (
          <img
            src={src}
            alt={alt}
            draggable={false}
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          fallback
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-1">
      <span className="text-[19px] font-semibold tabular-nums tracking-[-0.02em]">
        {value === undefined ? <span className="inline-block h-5 w-7 animate-pulse rounded bg-black/[0.08]" /> : value ?? '–'}
      </span>
      <span className="text-[12px] text-[#86868b]">{label}</span>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-[28px] bg-white p-6 ring-1 ring-black/[0.04]">
      <div className="mx-auto h-[96px] w-[96px] animate-pulse rounded-full bg-black/[0.06]" />
      <div className="mx-auto mt-6 h-5 w-2/3 animate-pulse rounded bg-black/[0.06]" />
      <div className="mx-auto mt-2 h-3 w-1/3 animate-pulse rounded bg-black/[0.06]" />
      <div className="mx-auto mt-5 h-4 w-full animate-pulse rounded bg-black/[0.06]" />
      <div className="mt-7 h-12 w-full animate-pulse rounded-2xl bg-black/[0.06]" />
      <div className="mt-5 h-11 w-full animate-pulse rounded-full bg-black/[0.06]" />
    </div>
  )
}

const GithubIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 015.78 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0023.5 12C23.5 5.65 18.35.5 12 .5z" />
  </svg>
)

/* ---------- Page ---------- */
export default function Talents() {
  const [talents, setTalents] = useState([])
  const [gh, setGh] = useState({}) // key = username (lowercase) → data | null (ล้มเหลว) | undefined (กำลังโหลด)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    document.title = 'Talents | SE-ONE'
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        setGh({})

        const { data, error } = await supabase
          .from('profiles')
          .select(`id, first_name, last_name, nickname, github_account, profile_image_url, ${ROLE_FIELD}`)
          .order('first_name', { ascending: true })

        if (error) throw error
        if (cancelled) return

        const list = data || []
        setTalents(list)

        // ดึงข้อมูล GitHub (repos / followers / following / bio) แบบขนาน แล้วเติมเข้าการ์ดทีละใบ
        list.forEach((t) => {
          const u = parseGithubUser(t.github_account)
          if (!u) return
          fetchGithub(u).then((d) => {
            if (!cancelled) setGh((prev) => ({ ...prev, [u.toLowerCase()]: d }))
          })
        })
      } catch (err) {
        console.error('Error fetching talents:', err.message)
        if (!cancelled) setError('ไม่สามารถโหลดข้อมูลสมาชิกได้ในขณะนี้')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  // รวมข้อมูล Supabase + GitHub เป็นโมเดลสำหรับแสดงผล
  const cards = useMemo(
    () =>
      talents.map((t) => {
        const username = parseGithubUser(t.github_account)
        const key = username?.toLowerCase()
        const g = username ? gh[key] : null
        const fullName = [t.first_name, t.last_name].filter(Boolean).join(' ')
        const name = g?.name || g?.login || t.nickname || fullName || 'No Name'
        const tag = (ROLE_OVERRIDES[key] || t[ROLE_FIELD] || '').toString().toUpperCase()

        return {
          id: t.id,
          name,
          username,
          tag,
          bio: g?.bio || DEFAULT_BIO,
          avatar: t.profile_image_url || g?.avatar || (username ? `https://github.com/${username}.png` : null),
          initial: name.charAt(0).toUpperCase(),
          hasGithub: Boolean(username),
          // undefined = ยังโหลด, null = ไม่มีข้อมูล
          stats: !username ? null : g === undefined ? undefined : g,
        }
      }),
    [talents, gh]
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return cards
    return cards.filter((c) => [c.name, c.username, c.tag].filter(Boolean).join(' ').toLowerCase().includes(q))
  }, [cards, query])

  return (
    <div className="w-full flex-grow bg-[#f5f5f7] text-[#1d1d1f]">
      <style>{`
        @keyframes se-hero { from { opacity: 0; transform: translateY(22px); filter: blur(6px); } to { opacity: 1; transform: none; filter: blur(0); } }
        @keyframes se-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes se-float { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(0,-24px,0) scale(1.06); } }
        .se-hero { opacity: 0; animation: se-hero 1s cubic-bezier(.28,.11,.32,1) forwards; }
        .se-rise { opacity: 0; animation: se-rise .8s cubic-bezier(.28,.11,.32,1) forwards; }
        .se-float { animation: se-float 14s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .se-hero, .se-rise { animation: none; opacity: 1; }
          .se-float { animation: none; }
        }
      `}</style>

      {/* ============================ HERO ============================ */}
      <section className="relative overflow-hidden bg-[#fbfbfd]">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="se-float absolute -left-24 top-0 h-[320px] w-[320px] rounded-full bg-[#7dbdff]/40 blur-[90px]" />
          <div className="se-float absolute -right-20 top-16 h-[340px] w-[340px] rounded-full bg-[#c4a6ff]/40 blur-[100px]" style={{ animationDelay: '-6s' }} />
          <div className="se-float absolute bottom-0 left-1/2 h-[240px] w-[380px] -translate-x-1/2 rounded-full bg-[#ffc2a8]/30 blur-[100px]" style={{ animationDelay: '-10s' }} />
        </div>

        <div className="relative mx-auto max-w-[1024px] px-5 pb-16 pt-20 text-center md:pb-24 md:pt-32">
          <p className="se-hero text-[17px] font-semibold text-[#6e6e73] md:text-[21px]">Talents</p>
          <h1
            className="se-hero mt-3 text-[48px] font-semibold leading-[1.05] tracking-[-0.045em] sm:text-[72px] md:text-[96px]"
            style={{ animationDelay: '100ms' }}
          >
            Our{' '}
            <span className="bg-gradient-to-r from-[#0071e3] via-[#5e5ce6] to-[#bf5af2] bg-clip-text text-transparent">Talents.</span>
          </h1>
          <p
            className="se-hero mx-auto mt-6 max-w-[620px] text-[19px] font-medium leading-[1.55] tracking-[-0.01em] text-[#6e6e73] md:text-[24px]"
            style={{ animationDelay: '220ms' }}
          >
            ทำความรู้จักกับสมาชิกวิศวกรรมซอฟต์แวร์ RMUTL 69 รุ่นที่ 4
          </p>

          {/* Search */}
          <div className="se-hero mx-auto mt-10 max-w-[460px]" style={{ animationDelay: '340ms' }}>
            <label className="relative block">
              <span className="sr-only">ค้นหาสมาชิก</span>
              <svg
                className="pointer-events-none absolute left-5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#86868b]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาชื่อ, GitHub หรือสายงาน"
                className="h-[52px] w-full rounded-full bg-white/80 pl-12 pr-5 text-[17px] text-[#1d1d1f] placeholder:text-[#a1a1a6] outline-none ring-1 ring-black/[0.08] shadow-[0_10px_30px_-14px_rgba(0,0,0,0.25)] backdrop-blur-xl transition duration-200 focus:bg-white focus:ring-2 focus:ring-[#0071e3] [&::-webkit-search-cancel-button]:cursor-pointer"
              />
            </label>
          </div>
        </div>
      </section>

      {/* ============================ CONTENT ============================ */}
      <div className="mx-auto max-w-[1200px] px-5 py-12 md:py-20">
        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div role="alert" className="mx-auto max-w-[520px] rounded-[32px] bg-white px-8 py-14 text-center shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)] ring-1 ring-black/[0.04]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#ff3b30]/10">
              <svg className="h-7 w-7 text-[#d70015]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 8v5m0 3.5h.01M10.3 3.9L2.4 17.6A2 2 0 004.1 20.6h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
              </svg>
            </div>
            <h3 className="mt-6 text-[24px] font-semibold tracking-[-0.025em]">โหลดข้อมูลไม่สำเร็จ</h3>
            <p className="mt-2 text-[16px] text-[#6e6e73]">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-7 rounded-full bg-[#0071e3] px-7 py-3 text-[16px] font-medium text-white shadow-[0_10px_24px_-10px_rgba(0,113,227,0.7)] transition hover:bg-[#0077ed] active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/40"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && talents.length === 0 && (
          <div className="mx-auto max-w-[520px] rounded-[32px] bg-white px-8 py-14 text-center shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)] ring-1 ring-black/[0.04]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#c4a6ff] to-[#7c3aed] shadow-[0_8px_20px_rgba(124,58,237,0.3)]">
              <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M17 20h5v-2a4 4 0 00-5.356-3.772M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a4 4 0 015.356-3.772M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="mt-6 text-[24px] font-semibold tracking-[-0.025em]">ยังไม่มีข้อมูลสมาชิก</h3>
            <p className="mt-2 text-[16px] leading-[1.6] text-[#6e6e73]">ข้อมูลโปรไฟล์จะปรากฏที่นี่เมื่อมีผู้สมัครสมาชิกเข้าสู่ระบบ</p>
          </div>
        )}

        {/* No search result */}
        {!loading && !error && talents.length > 0 && visible.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-[24px] font-semibold tracking-[-0.025em]">ไม่พบสมาชิกที่ตรงกับ “{query}”</p>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="mt-4 rounded-full px-4 py-2 text-[17px] text-[#0066cc] underline-offset-4 hover:underline focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/30"
            >
              ล้างการค้นหา <span aria-hidden>›</span>
            </button>
          </div>
        )}

        {/* Grid */}
        {!loading && !error && visible.length > 0 && (
          <>
            <p className="mb-6 text-[15px] font-medium text-[#6e6e73]">
              <span className="font-semibold text-[#1d1d1f]">{visible.length}</span> สมาชิก
              {query.trim() && talents.length !== visible.length && <span> จากทั้งหมด {talents.length}</span>}
            </p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((c, i) => (
                <article
                  key={c.id}
                  className="se-rise group relative flex flex-col overflow-hidden rounded-[28px] bg-white p-6 pt-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] transition-all duration-700 ease-[cubic-bezier(.28,.11,.32,1)] hover:-translate-y-1.5 hover:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.25)]"
                  style={{ animationDelay: `${Math.min(i, 11) * 45}ms` }}
                >
                  {/* soft glow behind avatar */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 top-0 h-[140px] w-[220px] -translate-x-1/2 rounded-full bg-gradient-to-br from-[#7dbdff]/30 to-[#c4a6ff]/30 blur-3xl transition-opacity duration-700 group-hover:opacity-100 md:opacity-60"
                  />

                  {c.tag && (
                    <span className="absolute right-4 top-4 max-w-[60%] truncate whitespace-nowrap rounded-full bg-[#0071e3]/10 px-3 py-1 text-[11px] font-semibold text-[#0071e3]">
                      {c.tag}
                    </span>
                  )}

                  <div className="relative">
                    <Avatar src={c.avatar} fallback={c.initial} alt={`${c.name} profile`} />
                  </div>

                  <h3 className="relative mt-6 truncate text-[21px] font-semibold tracking-[-0.025em]">{c.name}</h3>
                  {c.username && <p className="relative mt-0.5 truncate text-[14px] text-[#86868b]">@{c.username}</p>}

                  <p className="relative mx-auto mt-3 line-clamp-2 min-h-[46px] max-w-[260px] text-[14px] leading-[1.6] text-[#6e6e73]">{c.bio}</p>

                  <div className="relative mt-5 grid grid-cols-3 divide-x divide-black/[0.06] rounded-[18px] bg-[#f5f5f7] py-3.5">
                    <Stat label="Repos" value={c.stats === undefined ? undefined : c.stats?.repos} />
                    <Stat label="Followers" value={c.stats === undefined ? undefined : c.stats?.followers} />
                    <Stat label="Following" value={c.stats === undefined ? undefined : c.stats?.following} />
                  </div>

                  {c.hasGithub ? (
                    <a
                      href={`https://github.com/${c.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1d1d1f] text-[15px] font-medium text-white transition duration-200 hover:bg-black active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1d1d1f]/30"
                    >
                      <GithubIcon />
                      ดูผลงานบน GitHub
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="relative mt-5 inline-flex h-11 w-full cursor-not-allowed items-center justify-center rounded-full bg-[#f5f5f7] text-[15px] font-medium text-[#86868b]"
                    >
                      ยังไม่ได้เชื่อม GitHub
                    </button>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}