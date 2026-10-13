import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

/* ---------- Config ---------- */
// คอลัมน์ใน Supabase ที่เก็บ "สายงาน" (FULLSTACK / UI/UX / DATABASE ...) ที่แสดงเป็นป้ายมุมขวาบน
const ROLE_FIELD = 'role'

// กำหนดป้ายตายตัวรายบุคคล (key = GitHub username ตัวพิมพ์เล็ก)
const ROLE_OVERRIDES = {
  pattaradanais151: 'FULLSTACK DEVELOPER',
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
    <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-gradient-to-br from-[#e8f1ff] to-[#f0ecff] text-[28px] font-semibold text-[#0071e3] ring-1 ring-black/[0.06]">
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
  )
}

function Stat({ label, value }) {
  return (
    <div className="flex flex-col items-center gap-1 px-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#86868b]">{label}</span>
      <span className="text-[17px] font-semibold tabular-nums">
        {value === undefined ? <span className="inline-block h-4 w-6 animate-pulse rounded bg-black/[0.08]" /> : value ?? '–'}
      </span>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-[28px] bg-white p-6 ring-1 ring-black/[0.04]">
      <div className="flex justify-between">
        <div className="h-20 w-20 animate-pulse rounded-[20px] bg-black/[0.06]" />
        <div className="h-5 w-16 animate-pulse rounded-full bg-black/[0.06]" />
      </div>
      <div className="mt-5 h-5 w-2/3 animate-pulse rounded bg-black/[0.06]" />
      <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-black/[0.06]" />
      <div className="mt-4 h-4 w-full animate-pulse rounded bg-black/[0.06]" />
      <div className="mt-6 h-12 w-full animate-pulse rounded-full bg-black/[0.06]" />
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
    <div className="w-full flex-grow bg-[#f5f5f7]">
      <style>{`
        @keyframes se-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        .se-rise { opacity: 0; animation: se-rise .8s cubic-bezier(.28,.11,.32,1) forwards; }
        @media (prefers-reduced-motion: reduce) { .se-rise { animation: none; opacity: 1; } }
      `}</style>

      {/* Hero */}
      <section className="bg-[#fbfbfd]">
        <div className="mx-auto max-w-[1024px] px-5 pb-14 pt-20 text-center md:pb-20 md:pt-28">
          <p className="se-rise mb-4 text-[17px] font-semibold text-[#6e6e73] md:text-[21px]">Talents</p>
          <h1
            className="se-rise text-[44px] font-semibold leading-[1.08] tracking-[-0.04em] sm:text-[64px] md:text-[80px]"
            style={{ animationDelay: '80ms' }}
          >
            Our{' '}
            <span className="bg-gradient-to-r from-[#0071e3] to-[#5e5ce6] bg-clip-text text-transparent">Talents</span>
          </h1>
          <p
            className="se-rise mx-auto mt-5 max-w-[640px] text-[19px] font-medium leading-[1.5] tracking-[-0.01em] text-[#6e6e73] md:text-[24px]"
            style={{ animationDelay: '160ms' }}
          >
            ทำความรู้จักกับสมาชิกวิศวกรรมซอฟต์แวร์ RMUTL 69 รุ่นที่ 4
          </p>

          {/* Search */}
          <div className="se-rise mx-auto mt-9 max-w-[420px]" style={{ animationDelay: '240ms' }}>
            <label className="relative block">
              <span className="sr-only">ค้นหาสมาชิก</span>
              <svg
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#86868b]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาชื่อ, GitHub หรือสายงาน"
                className="h-11 w-full rounded-full bg-[#f5f5f7] pl-11 pr-4 text-[15px] outline-none ring-1 ring-black/[0.06] transition focus:bg-white focus:ring-2 focus:ring-[#0071e3]"
              />
            </label>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-5 py-12 md:py-16">
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
          <div className="mx-auto max-w-[520px] rounded-[28px] bg-white px-8 py-14 text-center ring-1 ring-black/[0.04]">
            <h3 className="text-[21px] font-semibold tracking-[-0.02em]">โหลดข้อมูลไม่สำเร็จ</h3>
            <p className="mt-2 text-[15px] text-[#6e6e73]">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-6 rounded-full bg-[#0071e3] px-6 py-2.5 text-[15px] text-white transition-colors hover:bg-[#0077ed]"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && talents.length === 0 && (
          <div className="mx-auto max-w-[520px] rounded-[28px] bg-white px-8 py-14 text-center ring-1 ring-black/[0.04]">
            <h3 className="text-[21px] font-semibold tracking-[-0.02em]">ยังไม่มีข้อมูลสมาชิก</h3>
            <p className="mt-2 text-[15px] text-[#6e6e73]">ข้อมูลโปรไฟล์จะปรากฏที่นี่เมื่อมีผู้สมัครสมาชิกเข้าสู่ระบบ</p>
          </div>
        )}

        {/* No search result */}
        {!loading && !error && talents.length > 0 && visible.length === 0 && (
          <p className="py-16 text-center text-[17px] text-[#6e6e73]">ไม่พบสมาชิกที่ตรงกับ “{query}”</p>
        )}

        {/* Grid */}
        {!loading && !error && visible.length > 0 && (
          <>
            <p className="mb-5 text-[13px] font-medium text-[#6e6e73]">{visible.length} สมาชิก</p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((c, i) => (
                <article
                  key={c.id}
                  className="se-rise flex flex-col rounded-[28px] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(0,0,0,0.10)]"
                  style={{ animationDelay: `${Math.min(i, 11) * 45}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <Avatar src={c.avatar} fallback={c.initial} alt={`${c.name} profile`} />
                    {c.tag && (
                      <span className="whitespace-nowrap rounded-full bg-[#0071e3]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#0071e3]">
                        {c.tag}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-5 truncate text-[20px] font-semibold tracking-[-0.02em]">{c.name}</h3>
                  {c.username && (
                    <p className="mt-0.5 truncate font-mono text-[11px] text-[#86868b]">@{c.username}</p>
                  )}

                  <p className="mt-3 line-clamp-2 min-h-[44px] text-[14px] leading-[1.55] text-[#6e6e73]">{c.bio}</p>

                  <div className="mt-5 grid grid-cols-3 divide-x divide-black/[0.06] border-t border-black/[0.06] pt-4">
                    <Stat label="Repos" value={c.stats === undefined ? undefined : c.stats?.repos} />
                    <Stat label="Followers" value={c.stats === undefined ? undefined : c.stats?.followers} />
                    <Stat label="Following" value={c.stats === undefined ? undefined : c.stats?.following} />
                  </div>

                  {c.hasGithub ? (
                    <a
                      href={`https://github.com/${c.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1d1d1f] text-[14px] font-medium text-white transition-colors hover:bg-black"
                    >
                      <GithubIcon />
                      ดูผลงานบน GitHub
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="mt-5 inline-flex h-11 w-full cursor-not-allowed items-center justify-center rounded-full bg-[#f5f5f7] text-[14px] font-medium text-[#86868b]"
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