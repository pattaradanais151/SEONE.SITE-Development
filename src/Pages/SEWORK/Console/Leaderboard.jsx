import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { notifyDiscord } from '../../../lib/discord'

/* =====================================================================
 * Config
 * ===================================================================== */
const SEC_OPTIONS = [
  { value: 'SEC 1', label: 'SEC 1', hint: 'ปกติ' },
  { value: 'SEC 2', label: 'SEC 2', hint: 'เทียบโอน' },
]
const SEMESTERS = [1, 2, 3]
const YEAR_OFFSETS = [0, 1, 2] // ปีปัจจุบัน และย้อนหลัง 2 ปี

const TOAST_MS = 3500
const DISCORD_TOP_N = 10 // จำนวนอันดับที่ส่งไป Discord
const DISCORD_COOLDOWN_MS = 30_000 // กันกดส่งซ้ำรัว ๆ จนห้อง Discord รก

// ใครเห็นปุ่ม "ส่งไป Discord": ตอนนี้ทุกคนที่เข้าหน้านี้ได้
// อยากจำกัด เช่น เฉพาะ CEO:
//   return profile?.role === 'ceo'
// eslint-disable-next-line no-unused-vars
const canShareToDiscord = (profile) => true

const currentBuddhistYear = () => new Date().getFullYear() + 543

/* =====================================================================
 * Helpers
 * ===================================================================== */
const fullName = (p) => [p?.first_name, p?.last_name].filter(Boolean).join(' ') || 'ไม่ระบุชื่อ'
const initialOf = (p) => (p?.first_name || p?.nickname || '?').trim().charAt(0).toUpperCase() || '?'
const formatXp = (n) => Number(n || 0).toLocaleString('th-TH')

// กัน @everyone / @here / <@id> จากข้อความผู้ใช้ไม่ให้ ping คนใน Discord
const cleanForDiscord = (s = '') =>
  String(s).replace(/@(everyone|here)/gi, '@\u200b$1').replace(/<@/g, '<@\u200b')

const truncate = (s = '', n = 1900) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' }
const discordRankLabel = (rank) => MEDALS[rank] || `**#${rank}**`

const buildDiscordMessage = ({ rows, sec, year, semester, sender, total }) => {
  const lines = rows.map(
    (r) =>
      `${discordRankLabel(r.rank)} ${cleanForDiscord(fullName(r))}` +
      `${r.nickname ? ` (@${cleanForDiscord(r.nickname)})` : ''} — **${formatXp(r.totalScore)} XP**`
  )
  return truncate(
    `🏆 **อัปเดต Leaderboard: ${sec}**\n` +
      `📌 **ปีการศึกษา ${year} เทอม ${semester}**\n\n` +
      `${lines.join('\n')}\n\n` +
      `👥 **ผู้มีคะแนนทั้งหมด:** ${total} คน\n` +
      `👤 **ส่งโดย:** ${cleanForDiscord(sender || 'System')}`
  )
}

/* =====================================================================
 * Icons
 * ===================================================================== */
const Icon = ({ children, className = 'h-4 w-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
)
const SendIcon = () => <Icon><path d="M21 3L10 14M21 3l-7 18-4-7-7-4 18-7z" /></Icon>
const RefreshIcon = ({ spinning }) => (
  <Icon className={`h-[18px] w-[18px] ${spinning ? 'lb-spin' : ''}`}>
    <path d="M20 12a8 8 0 10-2.34 5.66M20 4v5h-5" />
  </Icon>
)
const ChevronIcon = () => <Icon className="h-3.5 w-3.5"><path d="M6 9l6 6 6-6" /></Icon>
const TrophyIcon = () => (
  <Icon className="h-7 w-7">
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3" />
  </Icon>
)

/* =====================================================================
 * Small components
 * ===================================================================== */
function Avatar({ person, size = 40 }) {
  const [failed, setFailed] = useState(false)
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) }

  if (person.profile_image_url && !failed) {
    return (
      <img
        src={person.profile_image_url}
        alt=""
        className="lb-avatar"
        style={style}
        onError={() => setFailed(true)}
      />
    )
  }
  return (
    <div className="lb-avatar lb-avatar-fallback" style={style} aria-hidden>
      {initialOf(person)}
    </div>
  )
}

function Select({ id, label, value, onChange, children }) {
  return (
    <div className="lb-select-wrap">
      <select id={id} aria-label={label} className="lb-select" value={value} onChange={onChange}>
        {children}
      </select>
      <span className="lb-select-icon">
        <ChevronIcon />
      </span>
    </div>
  )
}

/* =====================================================================
 * Page
 * ===================================================================== */
export default function Leaderboard() {
  const { profile } = useAuth()
  const isCeo = profile?.role === 'ceo'

  // Filters
  const [academicYear, setAcademicYear] = useState(currentBuddhistYear())
  const [semester, setSemester] = useState(1)
  const [secChoice, setSecChoice] = useState(profile?.sec || 'SEC 1')

  // CEO เลือก SEC ได้เอง / คนอื่นถูกล็อกไว้ที่ SEC ของตัวเอง
  const sec = isCeo ? secChoice : profile?.sec || secChoice

  // Data
  const [leaderboardData, setLeaderboardData] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  // Discord
  const [shareOpen, setShareOpen] = useState(false)
  const [sharing, setSharing] = useState(false)

  // Toast
  const [toast, setToast] = useState(null)

  const requestId = useRef(0)
  const lastSentAt = useRef(0)
  const toastTimer = useRef(null)
  const confirmBtnRef = useRef(null)

  /* ---------- Toast ---------- */
  const showToast = useCallback((type, message) => {
    clearTimeout(toastTimer.current)
    setToast({ type, message })
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  /* ---------- Fetch ---------- */
  const fetchLeaderboard = useCallback(async () => {
    const id = ++requestId.current // กันผลลัพธ์เก่าทับของใหม่เมื่อเปลี่ยนตัวกรองเร็ว ๆ

    try {
      setLoading(true)
      setLoadError(false)

      // 1. ดึงรายชื่อนักศึกษาใน SEC + งานทั้งหมดของ SEC/เทอม/ปี นี้ พร้อมกัน
      const [studentsRes, assignmentsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, first_name, last_name, nickname, profile_image_url')
          .eq('sec', sec),
        supabase
          .from('assignments')
          .select('id')
          .eq('academic_year', academicYear)
          .eq('semester', semester)
          .eq('sec', sec),
      ])

      if (studentsRes.error) throw studentsRes.error
      if (assignmentsRes.error) throw assignmentsRes.error

      const students = studentsRes.data || []
      const assignmentIds = (assignmentsRes.data || []).map((a) => a.id)

      // 2. ถ้ามีงาน ให้ดึงคะแนนที่ Approved มารวม
      let submissions = []
      if (students.length > 0 && assignmentIds.length > 0) {
        const { data, error } = await supabase
          .from('submission_tracking')
          .select('student_id, score')
          .in('assignment_id', assignmentIds)
          .eq('status', 'Approved') // นับเฉพาะ Approved
        if (error) throw error
        submissions = data || []
      }

      // 3. รวมคะแนนของแต่ละคน
      const scoreMap = {}
      submissions.forEach((s) => {
        scoreMap[s.student_id] = (scoreMap[s.student_id] || 0) + (Number(s.score) || 0)
      })

      // 4. เรียงคะแนนมากไปน้อย (คะแนนเท่ากันเรียงตามชื่อให้ลำดับนิ่ง)
      const sorted = students
        .map((st) => ({ ...st, totalScore: scoreMap[st.id] || 0 }))
        .sort(
          (a, b) =>
            b.totalScore - a.totalScore || fullName(a).localeCompare(fullName(b), 'th')
        )

      // 5. กำหนดอันดับ (คะแนนเท่ากันได้อันดับเดียวกัน)
      let currentRank = 1
      let currentScore = sorted.length > 0 ? sorted[0].totalScore : 0
      const ranked = sorted.map((item, index) => {
        if (item.totalScore < currentScore) {
          currentRank = index + 1
          currentScore = item.totalScore
        }
        return { ...item, rank: currentRank }
      })

      if (id !== requestId.current) return
      setLeaderboardData(ranked)
    } catch (err) {
      if (id !== requestId.current) return
      console.error('Error fetching leaderboard:', err.message)
      setLoadError(true)
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [academicYear, semester, sec])

  useEffect(() => {
    document.title = 'Leaderboard | SE-CONSOLE'
  }, [])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  /* ---------- Modal behaviour (ESC / scroll lock / focus) ---------- */
  useEffect(() => {
    if (!shareOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape' && !sharing) setShareOpen(false)
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    confirmBtnRef.current?.focus()
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [shareOpen, sharing])

  /* ---------- Derived ---------- */
  const scored = useMemo(() => leaderboardData.filter((s) => s.totalScore > 0), [leaderboardData])
  const podium = scored.slice(0, 3)
  const rest = leaderboardData.slice(podium.length)
  const maxScore = leaderboardData[0]?.totalScore || 0
  const totalXp = useMemo(
    () => leaderboardData.reduce((sum, s) => sum + s.totalScore, 0),
    [leaderboardData]
  )
  const discordRows = scored.slice(0, DISCORD_TOP_N)
  const canShare = canShareToDiscord(profile) && !loading && !loadError && discordRows.length > 0

  const years = YEAR_OFFSETS.map((o) => currentBuddhistYear() - o)
  if (!years.includes(academicYear)) years.push(academicYear)

  /* ---------- Discord ---------- */
  const openShare = () => {
    if (!canShare) return
    setShareOpen(true)
  }

  const handleShare = async () => {
    if (sharing) return

    const wait = DISCORD_COOLDOWN_MS - (Date.now() - lastSentAt.current)
    if (wait > 0) {
      setShareOpen(false)
      showToast('info', `เพิ่งส่งไปเมื่อสักครู่ กรุณารออีก ${Math.ceil(wait / 1000)} วินาที`)
      return
    }

    try {
      setSharing(true)
      const ok = await notifyDiscord(
        buildDiscordMessage({
          rows: discordRows,
          sec,
          year: academicYear,
          semester,
          sender: profile?.first_name,
          total: scored.length,
        })
      )

      if (ok) {
        lastSentAt.current = Date.now()
        showToast('success', 'ส่งอันดับไปยัง Discord แล้ว')
      } else {
        showToast('error', 'ส่งไปยัง Discord ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
      }
    } catch (err) {
      console.error('Discord notify failed:', err?.message || err)
      showToast('error', 'ส่งไปยัง Discord ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setSharing(false)
      setShareOpen(false)
    }
  }

  /* =====================================================================
   * Render
   * ===================================================================== */
  return (
    <div className="se-lb relative mx-auto w-full max-w-[1100px] pb-12">
      {/*
        Design tokens — ผูกกับธีมเดิมของโปรเจกต์ (--color-se-*)
        เวอร์ชัน Dark Mode: ทำเพียง override ตัวแปรในบล็อก :root[data-theme='dark'] / .dark ด้านล่าง
        สีพื้นผิวย่อยทั้งหมดคำนวณด้วย color-mix จากสีตัวอักษร จึงปรับตามธีมเองอัตโนมัติ
      */}
      <style>{`
        .se-lb {
          --lb-bg: var(--color-se-background, #f5f5f7);
          --lb-card: var(--color-se-surface, #ffffff);
          --lb-border: var(--color-se-border, rgba(0,0,0,0.12));
          --lb-text: var(--color-se-text-main, #1d1d1f);
          --lb-muted: var(--color-se-text-muted, #6e6e73);
          --lb-primary: var(--color-se-primary, #0071e3);
          --lb-primary-hover: var(--color-se-primary-hover, #0077ed);

          --lb-subtle: color-mix(in srgb, var(--lb-text) 6%, transparent);
          --lb-subtle-hover: color-mix(in srgb, var(--lb-text) 11%, transparent);
          --lb-primary-soft: color-mix(in srgb, var(--lb-primary) 14%, transparent);

          --lb-danger: #d70015;
          --lb-danger-solid: #ff3b30;
          --lb-success-dot: #34c759;

          /* เหรียญอันดับ 1-3 */
          --lb-gold-a: #ffe07a;   --lb-gold-b: #f0a500;   --lb-gold-soft: rgba(255,196,0,0.16);
          --lb-silver-a: #eceef2; --lb-silver-b: #a4aab5; --lb-silver-soft: rgba(142,150,165,0.18);
          --lb-bronze-a: #f5bb86; --lb-bronze-b: #c4733a; --lb-bronze-soft: rgba(205,127,50,0.17);

          --lb-overlay: rgba(0,0,0,0.38);
          --lb-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05);
          --lb-shadow-lg: 0 24px 80px rgba(0,0,0,0.20);
          color: var(--lb-text);
        }
        :root[data-theme='dark'] .se-lb,
        .dark .se-lb {
          color-scheme: dark;
          --lb-danger: #ff6961;
          --lb-danger-solid: #ff453a;
          --lb-success-dot: #30d158;
          --lb-gold-soft: rgba(255,204,0,0.20);
          --lb-silver-soft: rgba(190,196,210,0.18);
          --lb-bronze-soft: rgba(230,150,80,0.20);
          --lb-overlay: rgba(0,0,0,0.6);
          --lb-shadow: 0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.25);
          --lb-shadow-lg: 0 24px 80px rgba(0,0,0,0.6);
        }

        @keyframes lb-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lb-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes lb-pop  { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: none; } }
        @keyframes lb-pulse { 50% { opacity: .5; } }
        @keyframes lb-spin { to { transform: rotate(360deg); } }
        .lb-rise { animation: lb-rise .6s cubic-bezier(.28,.11,.32,1) both; }
        .lb-spin { animation: lb-spin .9s linear infinite; }

        .lb-muted { color: var(--lb-muted); }

        .lb-card {
          background: var(--lb-card);
          border: 1px solid var(--lb-border);
          border-radius: 24px;
          box-shadow: var(--lb-shadow);
        }

        /* ---------- Filters ---------- */
        .lb-select-wrap { position: relative; display: inline-flex; align-items: center; }
        .lb-select {
          appearance: none; -webkit-appearance: none; height: 40px; padding: 0 38px 0 16px;
          border: 1px solid var(--lb-border); border-radius: 999px;
          background: var(--lb-card); color: var(--lb-text);
          font-size: 14px; font-weight: 500; cursor: pointer; outline: none;
          transition: border-color .2s, box-shadow .2s;
        }
        .lb-select:hover { border-color: color-mix(in srgb, var(--lb-text) 28%, var(--lb-border)); }
        .lb-select:focus-visible { border-color: var(--lb-primary); box-shadow: 0 0 0 4px var(--lb-primary-soft); }
        .lb-select-icon { position: absolute; right: 14px; pointer-events: none; color: var(--lb-muted); display: flex; }

        .lb-seg { display: inline-flex; padding: 3px; border-radius: 999px; background: var(--lb-subtle); }
        .lb-seg button {
          height: 32px; padding: 0 14px; border: 0; border-radius: 999px; background: transparent;
          font-size: 13px; font-weight: 500; color: var(--lb-muted); cursor: pointer; transition: all .2s; white-space: nowrap;
        }
        .lb-seg button[aria-pressed='true'] { background: var(--lb-card); color: var(--lb-text); box-shadow: 0 1px 3px rgba(0,0,0,0.14); }
        .lb-seg button:focus-visible { outline: 2px solid var(--lb-primary); outline-offset: 2px; }

        /* ---------- Buttons / chips ---------- */
        .lb-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          height: 40px; padding: 0 20px; border: 0; border-radius: 999px;
          font-size: 14px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background .2s, opacity .2s, transform .1s;
        }
        .lb-btn:active:not(:disabled) { transform: scale(.98); }
        .lb-btn:disabled { opacity: .5; cursor: not-allowed; }
        .lb-btn-primary { background: var(--lb-primary); color: #fff; }
        .lb-btn-primary:hover:not(:disabled) { background: var(--lb-primary-hover); }
        .lb-btn-ghost { background: var(--lb-subtle); color: var(--lb-text); }
        .lb-btn-ghost:hover:not(:disabled) { background: var(--lb-subtle-hover); }
        .lb-btn:focus-visible, .lb-icon-btn:focus-visible, .lb-link:focus-visible { outline: 2px solid var(--lb-primary); outline-offset: 2px; }

        .lb-icon-btn {
          display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
          width: 40px; height: 40px; border: 0; border-radius: 999px; background: var(--lb-subtle);
          color: var(--lb-text); cursor: pointer; transition: background .2s;
        }
        .lb-icon-btn:hover:not(:disabled) { background: var(--lb-subtle-hover); }
        .lb-icon-btn:disabled { opacity: .5; cursor: not-allowed; }

        .lb-chip {
          display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px;
          font-size: 12px; font-weight: 500; background: var(--lb-subtle); color: var(--lb-muted);
        }
        .lb-chip-primary { background: var(--lb-primary-soft); color: var(--lb-primary); }

        .lb-link { background: none; border: 0; padding: 0; font-size: 14px; color: var(--lb-primary); cursor: pointer; }
        .lb-link:hover { text-decoration: underline; text-underline-offset: 4px; }

        /* ---------- Avatar ---------- */
        .lb-avatar { flex-shrink: 0; border-radius: 999px; object-fit: cover; }
        .lb-avatar-fallback {
          display: flex; align-items: center; justify-content: center; font-weight: 600;
          background: var(--lb-primary-soft); color: var(--lb-primary);
        }

        /* ---------- Medal ---------- */
        .lb-medal-1 { --medal-a: var(--lb-gold-a);   --medal-b: var(--lb-gold-b);   --medal-soft: var(--lb-gold-soft); }
        .lb-medal-2 { --medal-a: var(--lb-silver-a); --medal-b: var(--lb-silver-b); --medal-soft: var(--lb-silver-soft); }
        .lb-medal-3 { --medal-a: var(--lb-bronze-a); --medal-b: var(--lb-bronze-b); --medal-soft: var(--lb-bronze-soft); }
        .lb-medal {
          display: inline-flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 999px;
          background: linear-gradient(145deg, var(--medal-a), var(--medal-b));
          color: #fff; font-size: 15px; font-weight: 700; text-shadow: 0 1px 1px rgba(0,0,0,0.25);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 2px 6px rgba(0,0,0,0.18);
        }

        /* ---------- Podium ---------- */
        .lb-podium-card {
          position: relative; overflow: hidden; text-align: center;
          padding: 28px 20px 24px;
        }
        .lb-podium-card::before {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(120% 70% at 50% 0%, var(--medal-soft), transparent 72%);
        }
        .lb-podium-card > * { position: relative; }
        .lb-podium-first { border-color: color-mix(in srgb, var(--medal-b) 45%, var(--lb-border)); }
        .lb-podium-avatar { border-radius: 999px; box-shadow: 0 0 0 3px var(--lb-card), 0 0 0 5px var(--medal-b); }
        .lb-podium-xp { font-size: 32px; font-weight: 600; letter-spacing: -0.03em; line-height: 1.1; font-variant-numeric: tabular-nums; }

        /* ---------- Rows ---------- */
        .lb-row {
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          padding: 14px 20px; border-top: 1px solid var(--lb-border);
          transition: background .2s;
        }
        .lb-row:first-child { border-top: 0; }
        .lb-row:hover { background: var(--lb-subtle); }
        .lb-row-me { background: color-mix(in srgb, var(--lb-primary) 7%, transparent); }
        .lb-row-me:hover { background: color-mix(in srgb, var(--lb-primary) 11%, transparent); }
        .lb-rank { width: 32px; flex-shrink: 0; text-align: center; font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--lb-muted); }

        .lb-bar { height: 4px; border-radius: 999px; background: var(--lb-subtle); overflow: hidden; }
        .lb-bar > span { display: block; height: 100%; border-radius: 999px; background: var(--lb-primary); transition: width .6s cubic-bezier(.28,.11,.32,1); }

        /* ---------- Modal / toast ---------- */
        .lb-backdrop {
          position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center;
          padding: 16px; background: var(--lb-overlay); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          animation: lb-fade .25s both;
        }
        .lb-modal {
          width: 100%; max-height: calc(100vh - 32px); overflow-y: auto;
          background: var(--lb-card); border: 1px solid var(--lb-border); border-radius: 28px;
          box-shadow: var(--lb-shadow-lg); animation: lb-pop .35s cubic-bezier(.28,.11,.32,1) both;
        }
        .lb-toast {
          position: fixed; left: 50%; bottom: 24px; z-index: 60; transform: translateX(-50%);
          display: flex; align-items: center; gap: 10px; padding: 12px 20px; border-radius: 999px;
          background: var(--lb-text); color: var(--lb-card); font-size: 14px; font-weight: 500;
          box-shadow: var(--lb-shadow-lg); animation: lb-pop .35s cubic-bezier(.28,.11,.32,1) both;
          max-width: calc(100vw - 32px);
        }

        .lb-skeleton { background: var(--lb-subtle); border-radius: 10px; animation: lb-pulse 1.6s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .lb-rise, .lb-backdrop, .lb-modal, .lb-toast { animation: none; }
          .lb-bar > span { transition: none; }
          .lb-spin { animation-duration: 2.4s; }
        }
      `}</style>

      {/* ===== Header ===== */}
      <div className="lb-rise mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[32px] font-semibold leading-[1.15] tracking-[-0.03em] md:text-[40px]">Leaderboard</h1>
          <p className="lb-muted mt-1 text-[16px]">กระดานผู้นำและคะแนนสะสมจากการส่งงาน</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            className="lb-icon-btn"
            aria-label="รีเฟรชอันดับ"
            title="รีเฟรชอันดับ"
            onClick={fetchLeaderboard}
            disabled={loading}
          >
            <RefreshIcon spinning={loading} />
          </button>
          {canShareToDiscord(profile) && (
            <button type="button" className="lb-btn lb-btn-primary" onClick={openShare} disabled={!canShare}>
              <SendIcon /> ส่งอันดับไป Discord
            </button>
          )}
        </div>
      </div>

      {/* ===== Filters ===== */}
      <div className="lb-rise mb-6 flex flex-wrap items-center gap-3" style={{ animationDelay: '60ms' }}>
        <Select id="lb-year" label="ปีการศึกษา" value={academicYear} onChange={(e) => setAcademicYear(Number(e.target.value))}>
          {years.map((y) => (
            <option key={y} value={y}>ปีการศึกษา {y}</option>
          ))}
        </Select>

        <div className="lb-seg" role="group" aria-label="เลือกเทอม">
          {SEMESTERS.map((s) => (
            <button key={s} type="button" aria-pressed={semester === s} onClick={() => setSemester(s)}>
              เทอม {s}
            </button>
          ))}
        </div>

        {isCeo ? (
          <div className="lb-seg" role="group" aria-label="เลือก SEC">
            {SEC_OPTIONS.map((o) => (
              <button key={o.value} type="button" aria-pressed={sec === o.value} onClick={() => setSecChoice(o.value)}>
                {o.label} <span style={{ opacity: 0.7 }}>({o.hint})</span>
              </button>
            ))}
          </div>
        ) : (
          <span className="lb-chip lb-chip-primary">{sec}</span>
        )}
      </div>

      {/* ===== Content ===== */}
      {loading ? (
        <div className="space-y-4" aria-busy="true">
          <div className="flex flex-col gap-4 md:flex-row">
            {[0, 1, 2].map((i) => (
              <div key={i} className="lb-card flex-1 p-7">
                <div className="lb-skeleton mx-auto h-[72px] w-[72px] !rounded-full" />
                <div className="lb-skeleton mx-auto mt-5 h-4 w-1/2" />
                <div className="lb-skeleton mx-auto mt-3 h-7 w-1/3" />
              </div>
            ))}
          </div>
          <div className="lb-card p-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="lb-skeleton mb-3 h-12 w-full last:mb-0" />
            ))}
          </div>
        </div>
      ) : loadError ? (
        <div className="lb-card px-8 py-14 text-center">
          <h3 className="text-[20px] font-semibold tracking-[-0.02em]">โหลดอันดับไม่สำเร็จ</h3>
          <p className="lb-muted mt-2 text-[15px]">เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง</p>
          <button type="button" className="lb-btn lb-btn-primary mt-6" onClick={fetchLeaderboard}>
            ลองใหม่อีกครั้ง
          </button>
        </div>
      ) : leaderboardData.length === 0 ? (
        <div className="lb-card flex flex-col items-center px-8 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'var(--lb-primary-soft)', color: 'var(--lb-primary)' }}>
            <TrophyIcon />
          </div>
          <h3 className="mt-5 text-[20px] font-semibold tracking-[-0.02em]">ยังไม่มีนักศึกษาใน {sec}</h3>
          <p className="lb-muted mt-2 text-[15px]">เมื่อมีนักศึกษาและคะแนนในระบบ อันดับจะแสดงที่นี่</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="lb-rise grid grid-cols-3 gap-3" style={{ animationDelay: '100ms' }}>
            {[
              { label: 'นักศึกษา', value: formatXp(leaderboardData.length), unit: 'คน' },
              { label: 'คะแนนรวม', value: formatXp(totalXp), unit: 'XP' },
              { label: 'คะแนนสูงสุด', value: formatXp(maxScore), unit: 'XP' },
            ].map((s) => (
              <div key={s.label} className="lb-card px-4 py-4 md:px-6 md:py-5" style={{ borderRadius: 20 }}>
                <p className="lb-muted text-[13px]">{s.label}</p>
                <p className="mt-1 text-[22px] font-semibold leading-none tracking-[-0.03em] tabular-nums md:text-[28px]">
                  {s.value} <span className="lb-muted text-[13px] font-medium tracking-normal">{s.unit}</span>
                </p>
              </div>
            ))}
          </div>

          {/* Podium */}
          {podium.length > 0 && (
            <ol className="lb-rise flex flex-col gap-4 md:flex-row md:items-end md:justify-center" style={{ animationDelay: '160ms' }}>
              {podium.map((s, i) => {
                const isMe = s.id === profile?.id
                const first = i === 0
                const order = ['md:order-2', 'md:order-1', 'md:order-3'][i]
                return (
                  <li
                    key={s.id}
                    className={`lb-card lb-podium-card lb-medal-${s.rank} ${first ? 'lb-podium-first md:pb-12 md:pt-9' : ''} ${order} md:w-1/3 md:max-w-[340px]`}
                  >
                    <div className="mb-4 flex justify-center">
                      <span className="lb-medal" aria-label={`อันดับ ${s.rank}`}>{s.rank}</span>
                    </div>
                    <div className="mb-4 flex justify-center">
                      <div className="lb-podium-avatar">
                        <Avatar person={s} size={first ? 88 : 72} />
                      </div>
                    </div>
                    <h3 className="text-[17px] font-semibold leading-[1.3] tracking-[-0.02em] [overflow-wrap:anywhere]">
                      {fullName(s)}
                    </h3>
                    <p className="lb-muted mt-0.5 text-[13px]">@{s.nickname || 'student'}</p>
                    {isMe && <span className="lb-chip lb-chip-primary mt-2">คุณ</span>}
                    <p className="lb-podium-xp mt-4">
                      {formatXp(s.totalScore)} <span className="lb-muted text-[14px] font-medium tracking-normal">XP</span>
                    </p>
                  </li>
                )
              })}
            </ol>
          )}

          {/* No-score hint */}
          {scored.length === 0 && (
            <div className="lb-card px-8 py-10 text-center">
              <h3 className="text-[18px] font-semibold tracking-[-0.02em]">ยังไม่มีคะแนนในเทอมนี้</h3>
              <p className="lb-muted mt-1.5 text-[15px]">คะแนนจะถูกนับเมื่องานที่ส่งได้รับสถานะ Approved</p>
            </div>
          )}

          {/* Rest of the list */}
          {rest.length > 0 && (
            <ol className="lb-card overflow-hidden" style={{ animation: 'lb-rise .6s cubic-bezier(.28,.11,.32,1) 220ms both' }}>
              {rest.map((s) => {
                const isMe = s.id === profile?.id
                const pct = maxScore > 0 ? Math.max((s.totalScore / maxScore) * 100, s.totalScore > 0 ? 2 : 0) : 0
                return (
                  <li key={s.id} className={`lb-row ${isMe ? 'lb-row-me' : ''}`}>
                    <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
                      <span className="lb-rank">{s.rank}</span>
                      <Avatar person={s} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[15px] font-semibold tracking-[-0.01em] [overflow-wrap:anywhere]">{fullName(s)}</h3>
                          {isMe && <span className="lb-chip lb-chip-primary">คุณ</span>}
                        </div>
                        <p className="lb-muted text-[13px]">@{s.nickname || 'student'}</p>
                        {pct > 0 && (
                          <div className="lb-bar mt-2 max-w-[260px]" aria-hidden>
                            <span style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="flex-shrink-0 text-[17px] font-semibold tracking-[-0.02em] tabular-nums">
                      {formatXp(s.totalScore)} <span className="lb-muted text-[12px] font-medium tracking-normal">XP</span>
                    </p>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      )}

      {/* ===== Discord confirm modal ===== */}
      {shareOpen && (
        <div
          className="lb-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !sharing) setShareOpen(false)
          }}
        >
          <div className="lb-modal max-w-[480px] p-7 md:p-8" role="dialog" aria-modal="true" aria-labelledby="lb-share-title">
            <h2 id="lb-share-title" className="text-[24px] font-semibold tracking-[-0.025em]">
              ส่งอันดับไป Discord
            </h2>
            <p className="lb-muted mt-1 text-[14px] leading-[1.6]">
              {sec} · ปีการศึกษา {academicYear} เทอม {semester}
              <br />
              ส่ง {discordRows.length} อันดับแรกที่มีคะแนน ไปยังห้องแจ้งเตือน
            </p>

            <ol className="mt-5 max-h-[280px] overflow-y-auto rounded-2xl" style={{ background: 'var(--lb-subtle)' }}>
              {discordRows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[14px]">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="lb-muted w-6 flex-shrink-0 text-center tabular-nums">{MEDALS[r.rank] || r.rank}</span>
                    <span className="truncate font-medium">{fullName(r)}</span>
                  </span>
                  <span className="flex-shrink-0 font-semibold tabular-nums">{formatXp(r.totalScore)} XP</span>
                </li>
              ))}
            </ol>

            <div className="mt-7 flex gap-3">
              <button type="button" className="lb-btn lb-btn-ghost flex-1" onClick={() => setShareOpen(false)} disabled={sharing}>
                ยกเลิก
              </button>
              <button ref={confirmBtnRef} type="button" className="lb-btn lb-btn-primary flex-1" onClick={handleShare} disabled={sharing}>
                {sharing ? 'กำลังส่ง...' : 'ส่งไป Discord'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Toast ===== */}
      {toast && (
        <div className="lb-toast" role="status" aria-live="polite">
          <span
            className="h-2 w-2 flex-shrink-0 rounded-full"
            style={{
              background:
                toast.type === 'error'
                  ? 'var(--lb-danger-solid)'
                  : toast.type === 'info'
                    ? 'var(--lb-primary)'
                    : 'var(--lb-success-dot)',
            }}
          />
          {toast.message}
        </div>
      )}
    </div>
  )
}