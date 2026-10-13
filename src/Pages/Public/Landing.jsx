import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ThemeProvider, Global, css, keyframes } from '@emotion/react'
import styled from '@emotion/styled'

/* ================= Icons ================= */
const svgProps = {
  fill: 'none',
  stroke: 'currentColor',
  viewBox: '0 0 24 24',
  strokeWidth: '1.6',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}
const mk = (d) => ({ className }) => (
  <svg className={className} {...svgProps} aria-hidden="true">
    <path d={d} />
  </svg>
)
const BookIcon = mk('M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253')
const CloudIcon = mk('M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z')
const CodeIcon = mk('M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4')
const ShieldIcon = mk('M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6l8-3zM9 12l2 2 4-4')
const BoltIcon = mk('M13 2L4 14h7l-1 8 9-12h-7l1-8z')
const HeartIcon = mk('M20.8 5.6a5.2 5.2 0 00-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 00-7.4 7.4L12 21.8l8.8-8.8a5.2 5.2 0 000-7.4z')
const CheckIcon = mk('M5 12.5l4.5 4.5L19 7.5')
const LockIcon = mk('M6 11V8a6 6 0 1112 0v3M5 11h14v10H5V11z')


const LOGO_SRC = '/logo.png'

const theme = {
  colors: { blue: '#0071e3', indigo: '#5e5ce6', violet: '#bf5af2', ink: '#1d1d1f', gray: '#6e6e73' },
  ease: 'cubic-bezier(.28,.11,.32,1)',
}

const floatY = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
`
const shimmer = keyframes`
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
`
const drift = keyframes`
  0% { transform: translate3d(-6%, -4%, 0) scale(1); }
  50% { transform: translate3d(6%, 5%, 0) scale(1.12); }
  100% { transform: translate3d(-6%, -4%, 0) scale(1); }
`
const noMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const globalStyles = css`
  html {
    scroll-behavior: smooth;
  }
  @media (prefers-reduced-motion: reduce) {
    html {
      scroll-behavior: auto;
    }
  }
  ::selection {
    background: rgba(0, 113, 227, 0.22);
  }
`

// ข้อความไล่สีที่เปล่งประกายช้า ๆ
const GradientText = styled.span`
  background-image: linear-gradient(
    90deg,
    ${(p) => p.theme.colors.blue},
    ${(p) => p.theme.colors.indigo},
    ${(p) => p.theme.colors.violet},
    ${(p) => p.theme.colors.blue}
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  animation: ${shimmer} 9s linear infinite;
  ${noMotion}
`

// แสงออโรราด้านหลัง Hero
const Aurora = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 56%;
    height: 60%;
    border-radius: 50%;
    filter: blur(90px);
    opacity: 0.55;
    animation: ${drift} 20s ease-in-out infinite;
    ${noMotion}
  }
  &::before {
    top: -12%;
    left: -8%;
    background: radial-gradient(circle, rgba(0, 113, 227, 0.35), transparent 70%);
  }
  &::after {
    top: 8%;
    right: -10%;
    background: radial-gradient(circle, rgba(191, 90, 242, 0.28), transparent 70%);
    animation-duration: 26s;
    animation-direction: reverse;
  }
`

// Navigation แบบกระจกฝ้า
const GlassHeader = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  background: rgba(251, 251, 253, 0.72);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
`
const NavInner = styled.nav`
  max-width: 1024px;
  height: 52px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`
const NavBrand = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: ${(p) => p.theme.colors.ink};
  &:focus-visible {
    outline: 2px solid ${(p) => p.theme.colors.blue};
    outline-offset: 4px;
    border-radius: 6px;
  }
`
const NavLinks = styled.ul`
  display: none;
  align-items: center;
  gap: 28px;
  margin: 0;
  padding: 0;
  list-style: none;
  @media (min-width: 768px) {
    display: flex;
  }
`
const NavLink = styled(Link)`
  font-size: 13px;
  color: ${(p) => p.theme.colors.ink};
  opacity: 0.8;
  transition: opacity 0.25s ${(p) => p.theme.ease};
  &:hover {
    opacity: 1;
  }
  &:focus-visible {
    outline: 2px solid ${(p) => p.theme.colors.blue};
    outline-offset: 4px;
    border-radius: 4px;
  }
`
const NavCta = styled(Link)`
  padding: 5px 14px;
  border-radius: 999px;
  font-size: 13px;
  color: #fff;
  background: ${(p) => p.theme.colors.blue};
  transition: background 0.25s ${(p) => p.theme.ease};
  &:hover {
    background: #0077ed;
  }
  &:focus-visible {
    outline: 2px solid ${(p) => p.theme.colors.blue};
    outline-offset: 3px;
  }
`

// Logo (พร้อม fallback ถ้าหาไฟล์ logo.png ไม่เจอ)
const LogoImg = styled.img`
  width: ${(p) => p.$size}px;
  height: ${(p) => p.$size}px;
  object-fit: contain;
  border-radius: ${(p) => Math.round(p.$size * 0.26)}px;
  ${(p) =>
    p.$float &&
    css`
      filter: drop-shadow(0 18px 30px rgba(0, 113, 227, 0.28));
      animation: ${floatY} 6s ease-in-out infinite;
      ${noMotion}
    `}
`
const LogoFallback = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${(p) => p.$size}px;
  height: ${(p) => p.$size}px;
  border-radius: ${(p) => Math.round(p.$size * 0.26)}px;
  font-size: ${(p) => Math.round(p.$size * 0.38)}px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #fff;
  background: linear-gradient(135deg, ${(p) => p.theme.colors.blue}, ${(p) => p.theme.colors.indigo});
  ${(p) =>
    p.$float &&
    css`
      animation: ${floatY} 6s ease-in-out infinite;
      ${noMotion}
    `}
`

function BrandLogo({ size = 28, float = false, alt = '' }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <LogoFallback $size={size} $float={float} role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}>
        SE
      </LogoFallback>
    )
  }
  return <LogoImg src={LOGO_SRC} alt={alt} $size={size} $float={float} onError={() => setFailed(true)} />
}

/* ================= Data ================= */
const apps = [
  {
    id: 'sework',
    name: 'SEWORK',
    accent: 'text-[#0071e3]',
    gradient: 'from-[#5ab0ff] to-[#0071e3]',
    glow: 'shadow-[0_20px_50px_rgba(0,113,227,0.35)]',
    Icon: BookIcon,
    feeling: 'สบายใจทุกครั้งที่กดส่ง',
    headline: 'เรียน ส่งงาน\nและแข่งขันในที่เดียว.',
    description:
      'ดูวิชาเรียนและตารางเรียนของวันนี้ ส่งงานก่อนเดดไลน์ แล้วเห็นสถานะทันที พร้อมกระดานผู้นำ (Leaderboard) แบบเรียลไทม์ที่ทำให้ทุกความพยายามมีความหมาย',
    chips: ['วิชาเรียน', 'ส่งงาน', 'ตารางเรียน', 'Leaderboard'],
    to: '/sework/landing',
  },
  {
    id: 'cloudfiles',
    name: 'CLOUDFILES',
    accent: 'text-[#bf4800]',
    gradient: 'from-[#ff9f7a] to-[#ff5a36]',
    glow: 'shadow-[0_20px_50px_rgba(255,90,54,0.35)]',
    Icon: CloudIcon,
    feeling: 'ไฟล์ของคุณ อยู่ตรงนั้นเสมอ',
    headline: 'เก็บและแบ่งปันไฟล์\nอย่างปลอดภัย.',
    description:
      'พื้นที่จัดเก็บเอกสารที่คุณไว้ใจได้ กำหนดสิทธิ์ว่าใครเปิดดูหรือแก้ไขได้ และล็อกโฟลเดอร์ด้วยรหัสผ่านก่อนแบ่งปันให้เพื่อนร่วมทีม',
    chips: ['แบ่งปันไฟล์', 'จัดการสิทธิ์', 'รหัสผ่านโฟลเดอร์'],
    to: '/cloudfiles/landing',
  },
  {
    id: 'coding',
    name: 'CODING',
    accent: 'text-[#248a3d]',
    gradient: 'from-[#6bea9f] to-[#1fb45a]',
    glow: 'shadow-[0_20px_50px_rgba(31,180,90,0.35)]',
    Icon: CodeIcon,
    feeling: 'ไอเดียแรก ลองได้ทันที',
    headline: 'ลงมือเขียนโค้ด\nได้ทันที.',
    description:
      'Sandbox สำหรับฝึกเขียนโปรแกรมผ่านเบราว์เซอร์ รองรับหลากหลายภาษา ไม่ต้องติดตั้งอะไรให้ยุ่งยาก พร้อมระบบจัดการ Resource ให้ทุกคนได้ใช้อย่างเป็นธรรม',
    chips: ['หลายภาษา', 'Sandbox', 'จัดการ Resource'],
    to: '/coding/landing',
  },
]

const moments = [
  {
    before: 'ตีสอง และเดดไลน์เหลืออีกชั่วโมงเดียว',
    after: 'SEWORK เตือนก่อนหมดเวลา และยืนยันทันทีที่คุณส่งสำเร็จ',
    Icon: BookIcon,
  },
  {
    before: 'ไฟล์สำคัญหายไป ก่อนวันพรีเซนต์แค่คืนเดียว',
    after: 'CLOUDFILES เก็บทุกไฟล์ไว้ในที่เดียว พร้อมสิทธิ์และรหัสผ่านที่คุณกำหนดเอง',
    Icon: CloudIcon,
  },
  {
    before: 'ไอเดียกำลังมา แต่เครื่องยังไม่พร้อมรัน',
    after: 'CODING เปิดเบราว์เซอร์แล้วเขียน รัน และเรียนรู้ได้ในไม่กี่วินาที',
    Icon: CodeIcon,
  },
]

const dayStory = [
  { time: '08:30', title: 'เริ่มวันอย่างมีทิศทาง', text: 'เปิดตารางเรียนและวิชาของวันนี้ ไม่ต้องไล่หาจากหลายที่ เห็นครบในหน้าเดียว' },
  { time: '12:15', title: 'เหลืออีก 3 ชั่วโมง ก็ยังทัน', text: 'ส่งงานเสร็จก่อนมื้อกลางวัน เห็นสถานะ "ส่งแล้ว" ทันที แล้วกินข้าวได้อย่างสบายใจ' },
  { time: '16:40', title: 'ทีมพร้อมหน้าพร้อมไฟล์', text: 'แบ่งปันโฟลเดอร์ให้เพื่อนด้วยรหัสผ่าน ทุกคนเปิดเจอไฟล์ล่าสุดชุดเดียวกัน' },
  { time: '21:50', title: 'บรรทัดสุดท้ายก่อนนอน', text: 'รันโค้ดผ่านเบราว์เซอร์ แก้บั๊กสุดท้ายให้ผ่าน แล้วเห็นอันดับของตัวเองขยับขึ้นบน Leaderboard' },
]

const principles = [
  { Icon: BoltIcon, title: 'ง่ายจนลืมว่ากำลังใช้งาน', text: 'ทุกอย่างอยู่ใกล้มือ เพื่อให้คุณใช้พลังไปกับการเรียนรู้ ไม่ใช่การหาว่าต้องกดตรงไหน' },
  { Icon: ShieldIcon, title: 'ปลอดภัยเหมือนมีกุญแจของตัวเอง', text: 'สิทธิ์การเข้าถึงและรหัสผ่านโฟลเดอร์อยู่ในมือคุณ คุณเลือกเองว่าจะแบ่งปันให้ใคร' },
  { Icon: HeartIcon, title: 'ออกแบบด้วยความเข้าใจ', text: 'สร้างจากชีวิตจริงของนักศึกษาวิศวกรรมซอฟต์แวร์ ทั้งคืนเดดไลน์ งานกลุ่ม และความภูมิใจเมื่อโค้ดรันผ่าน' },
]

const faqs = [
  { q: 'SE-ONE คืออะไร', a: 'SE-ONE คือแพลตฟอร์มศูนย์รวมสำหรับนักศึกษาวิศวกรรมซอฟต์แวร์ RMUTL 69 รุ่นที่ 4 ที่รวมระบบจัดการเรียนการสอน (SEWORK) การจัดเก็บไฟล์ (CLOUDFILES) และพื้นที่ฝึกเขียนโปรแกรม (CODING) ไว้ในที่เดียว' },
  { q: 'ต้องใช้บัญชีแยกสำหรับแต่ละโมดูลไหม', a: 'เข้าสู่ระบบครั้งเดียวผ่านหน้าเข้าสู่ระบบของ SEWORK เพื่อใช้งานโมดูลต่าง ๆ ของ SE-ONE ได้อย่างต่อเนื่อง' },
  { q: 'ไฟล์ที่แบ่งปันปลอดภัยแค่ไหน', a: 'CLOUDFILES มีระบบจัดการสิทธิ์และรหัสผ่านโฟลเดอร์ ให้คุณกำหนดได้ว่าใครเข้าถึงไฟล์ไหนได้บ้าง ก่อนแบ่งปันทุกครั้ง' },
  { q: 'ติดปัญหาระหว่างใช้งาน ติดต่อใครได้บ้าง', a: 'ไปที่หน้าความช่วยเหลือ แล้วแจ้งปัญหาที่พบ ทีมงานยินดีดูแลทุกคำถามเพื่อให้คุณกลับมาโฟกัสกับสิ่งที่สำคัญได้เร็วที่สุด' },
]

/* ================= Hooks ================= */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = (e) => setReduced(e.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])
  return reduced
}

function useScrollProgress(ref) {
  const [p, setP] = useState(0)
  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight || 1
      const v = (vh * 0.85 - r.top) / (vh * 0.45 + r.height * 0.6)
      setP(Math.min(1, Math.max(0, v)))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [ref])
  return p
}

function useTypewriter(text, { start = 900, speed = 55 } = {}) {
  const reduced = usePrefersReducedMotion()
  const [n, setN] = useState(0)
  useEffect(() => {
    if (reduced) {
      setN(text.length)
      return
    }
    let i = 0
    let timer
    const tick = () => {
      i += 1
      setN(i)
      if (i < text.length) timer = setTimeout(tick, speed)
    }
    timer = setTimeout(tick, start)
    return () => clearTimeout(timer)
  }, [text, start, speed, reduced])
  return text.slice(0, n)
}

/* ================= Reveal ================= */
function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.12 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-[900ms] ease-[cubic-bezier(.28,.11,.32,1)] motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  )
}

/* ================= Scroll-lit statement ================= */
function ScrollWords({ text, className = '' }) {
  const ref = useRef(null)
  const progress = useScrollProgress(ref)
  const reduced = usePrefersReducedMotion()

  const words = useMemo(() => {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const seg = new Intl.Segmenter('th', { granularity: 'word' })
      return Array.from(seg.segment(text), (s) => s.segment)
    }
    return text.split(/(\s+)/)
  }, [text])

  const total = words.length
  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => {
        const lit = reduced || i / total < progress
        return (
          <span key={i} className={`transition-colors duration-500 ${lit ? 'text-[#1d1d1f]' : 'text-[#d2d2d7]'}`}>
            {w}
          </span>
        )
      })}
    </p>
  )
}

/* ================= Hero product mock ================= */
function HeroMock() {
  const code = useTypewriter('print("สวัสดี SE-ONE")', { start: 1200, speed: 70 })
  const [done, setDone] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 600)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="relative isolate mx-auto mt-16 max-w-[880px] md:mt-24">
      <div
        aria-hidden
        className="absolute -inset-x-8 -bottom-10 -top-10 -z-10 opacity-70 blur-3xl"
        style={{
          background:
            'radial-gradient(55% 55% at 28% 30%, rgba(0,113,227,0.28), transparent), radial-gradient(50% 50% at 75% 70%, rgba(94,92,230,0.24), transparent), radial-gradient(40% 40% at 50% 100%, rgba(255,90,54,0.16), transparent)',
        }}
      />

      <div className="overflow-hidden rounded-[24px] bg-white text-left shadow-[0_30px_80px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.06]">
        <div className="flex h-11 items-center gap-2 border-b border-black/[0.06] bg-[#fbfbfd] px-5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <div className="mx-auto flex h-6 w-44 items-center justify-center rounded-md bg-black/[0.05] text-[11px] font-medium text-[#6e6e73] md:w-64">
            se-one.site
          </div>
          <span className="w-[52px]" />
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3 md:p-8">
          {/* SEWORK */}
          <div className="rounded-2xl bg-[#f5f5f7] p-4">
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${apps[0].gradient}`}>
                <BookIcon className="h-4 w-4 text-white" />
              </div>
              <p className="text-[13px] font-semibold tracking-[-0.01em]">SEWORK</p>
            </div>
            <div className="mt-4 rounded-xl bg-white p-3 ring-1 ring-black/[0.05]">
              <p className="text-[12px] font-semibold">งานสัปดาห์ที่ 6</p>
              <p className="mt-0.5 text-[11px] text-[#6e6e73]">ส่งก่อนกำหนด 3 ชั่วโมง</p>
              <span
                className={`mt-2 inline-flex items-center gap-1 rounded-full bg-[#e8f7ee] px-2 py-0.5 text-[11px] font-medium text-[#248a3d] transition-all duration-700 ${
                  done ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
                }`}
              >
                <CheckIcon className="h-3 w-3" /> ส่งแล้ว
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {[78, 64, 52].map((w, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-3 text-[10px] font-semibold text-[#86868b]">{i + 1}</span>
                  <div className="h-2 rounded-full bg-[#0071e3]/25" style={{ width: `${w}%` }} />
                </div>
              ))}
            </div>
          </div>

          {/* CLOUDFILES */}
          <div className="rounded-2xl bg-[#f5f5f7] p-4">
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${apps[1].gradient}`}>
                <CloudIcon className="h-4 w-4 text-white" />
              </div>
              <p className="text-[13px] font-semibold tracking-[-0.01em]">CLOUDFILES</p>
            </div>
            <div className="mt-4 space-y-2">
              {['รายงานกลุ่ม.pdf', 'สไลด์พรีเซนต์.pptx'].map((f) => (
                <div key={f} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-black/[0.05]">
                  <span className="h-6 w-6 rounded-md bg-[#ff5a36]/15" />
                  <span className="truncate text-[11px] font-medium">{f}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-black/[0.05]">
                <LockIcon className="h-4 w-4 text-[#bf4800]" />
                <span className="text-[11px] font-medium text-[#6e6e73]">โฟลเดอร์ทีม · ล็อกอยู่</span>
              </div>
            </div>
          </div>

          {/* CODING */}
          <div className="rounded-2xl bg-[#1d1d1f] p-4 text-white">
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${apps[2].gradient}`}>
                <CodeIcon className="h-4 w-4 text-white" />
              </div>
              <p className="text-[13px] font-semibold tracking-[-0.01em]">CODING</p>
            </div>
            <div className="mt-4 rounded-xl bg-black/50 p-3 font-mono text-[11px] leading-[1.7]">
              <p className="text-[#86868b]"># บรรทัดแรกของคุณ</p>
              <p aria-label="ตัวอย่างโค้ด" className="min-h-[1.7em] break-all text-[#6bea9f]">
                {code}
                <span className="ml-0.5 inline-block h-3 w-[2px] translate-y-0.5 animate-pulse bg-white" />
              </p>
            </div>
            <p className="mt-3 text-[11px] text-[#86868b]">รันสำเร็จ · 0.4 วินาที</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================= Feature tile ================= */
function Tile({ app, className = '', delay = 0 }) {
  const { Icon } = app
  return (
    <Reveal delay={delay} className={className}>
      <article className="group relative flex h-full min-h-[480px] flex-col items-center overflow-hidden rounded-[28px] bg-[#f5f5f7] px-8 pt-12 text-center transition-colors duration-500 hover:bg-[#f0f0f3]">
        <p className={`text-[14px] font-semibold tracking-[0.04em] ${app.accent}`}>{app.name}</p>

        <h3 className="mt-2 whitespace-pre-line text-[28px] font-semibold leading-[1.25] tracking-[-0.02em] md:text-[34px]">
          {app.headline}
        </h3>

        <p className={`mt-3 text-[15px] font-medium ${app.accent}`}>{app.feeling}</p>

        <p className="mt-3 max-w-[480px] text-[16px] leading-[1.65] text-[#6e6e73]">{app.description}</p>

        <ul className="mt-5 flex flex-wrap justify-center gap-2" aria-label={`ฟีเจอร์ของ ${app.name}`}>
          {app.chips.map((c) => (
            <li key={c} className="rounded-full bg-white px-3 py-1 text-[13px] text-[#1d1d1f] ring-1 ring-black/[0.06]">
              {c}
            </li>
          ))}
        </ul>

        <Link
          to={app.to}
          className="mt-6 inline-flex items-center gap-1 text-[17px] text-[#0066cc] underline-offset-4 after:absolute after:inset-0 after:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0071e3] group-hover:underline"
        >
          ดูรายละเอียดเพิ่มเติม
          <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">›</span>
        </Link>

        <div className="mt-auto pt-10">
          <div
            className={`flex h-[120px] w-[120px] translate-y-8 items-center justify-center rounded-[34px] bg-gradient-to-br ${app.gradient} ${app.glow} transition-transform duration-700 ease-[cubic-bezier(.28,.11,.32,1)] group-hover:translate-y-2`}
          >
            <Icon className="h-14 w-14 text-white" />
          </div>
        </div>
      </article>
    </Reveal>
  )
}

/* ================= FAQ item ================= */
function FaqItem({ q, a }) {
  return (
    <details className="group border-b border-black/[0.1] py-5 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left text-[19px] font-semibold tracking-[-0.01em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0071e3] md:text-[21px]">
        {q}
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f5f5f7] text-[18px] text-[#6e6e73] transition-transform duration-300 group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <p className="mt-3 max-w-[760px] text-[17px] leading-[1.7] text-[#6e6e73]">{a}</p>
    </details>
  )
}

/* ================= Page ================= */
export default function Landing() {
  useEffect(() => {
    document.title = 'SE-ONE | The Ultimate Engineering Platform'
    let icon = document.querySelector("link[rel~='icon']")
    if (!icon) {
      icon = document.createElement('link')
      icon.rel = 'icon'
      document.head.appendChild(icon)
    }
    icon.href = LOGO_SRC
  }, [])

  return (
    <ThemeProvider theme={theme}>
    <Global styles={globalStyles} />
    <div className="flex w-full flex-col items-center text-[#1d1d1f]">
      {/* ---------- Hero ---------- */}
      <section className="relative w-full overflow-hidden bg-[#fbfbfd]">
        <Aurora aria-hidden />
        <div className="relative z-10 mx-auto max-w-[1024px] px-5 pb-20 pt-16 text-center md:pb-32 md:pt-24">
          <Reveal>
            <div className="mb-6 flex justify-center">
              <BrandLogo size={88} float alt="โลโก้ SE-ONE" />
            </div>
          </Reveal>

          <Reveal>
            <p className="mb-4 text-[17px] font-semibold text-[#6e6e73] md:text-[21px]">
              SE-ONE · สำหรับนักศึกษา SE RMUTL 69 รุ่นที่ 4
            </p>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="text-[44px] font-semibold leading-[1.1] tracking-[-0.04em] sm:text-[64px] md:text-[88px]">
              ทุกความฝัน
              <br />
              <GradientText>เริ่มจากบรรทัดแรก.</GradientText>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mx-auto mt-6 max-w-[720px] text-[19px] font-medium leading-[1.6] tracking-[-0.01em] text-[#6e6e73] md:text-[24px]">
              เรียน ส่งงาน เก็บไฟล์ และเขียนโค้ด ครบในที่เดียว
              เพื่อให้คุณมีสมาธิกับสิ่งสำคัญที่สุด คือการเติบโตเป็นวิศวกรซอฟต์แวร์ที่คุณอยากเป็น
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
              <Link
                to="/sework/landing"
                className="rounded-full bg-[#0071e3] px-[22px] py-3 text-[17px] font-normal text-white transition-colors hover:bg-[#0077ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0071e3]"
              >
                เริ่มต้นกับ SEWORK
              </Link>
              <Link
                to="/about"
                className="group inline-flex items-center gap-1 text-[17px] text-[#0066cc] underline-offset-4 hover:underline"
              >
                เรื่องราวของโครงการ
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">›</span>
              </Link>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <HeroMock />
          </Reveal>
        </div>
      </section>

      {/* ---------- Statement (scroll-lit) ---------- */}
      <section className="w-full bg-white">
        <div className="mx-auto max-w-[900px] px-5 py-28 text-center md:py-44">
          <ScrollWords
            text="คืนก่อนส่งงาน ไม่ควรเป็นคืนที่น่ากลัว ไฟล์ของคุณควรอยู่ตรงนั้นเสมอ และไอเดียดี ๆ ควรได้ลองรันทันทีที่คิดออก เพราะทุกวิศวกรซอฟต์แวร์เก่ง ๆ ล้วนเริ่มจากบรรทัดแรกที่กล้าเขียน"
            className="text-[28px] font-semibold leading-[1.45] tracking-[-0.025em] sm:text-[40px] md:text-[52px]"
          />
        </div>
      </section>

      {/* ---------- Empathy ---------- */}
      <section className="w-full bg-black text-white">
        <div className="mx-auto max-w-[1024px] px-5 py-24 md:py-36">
          <Reveal>
            <div className="mx-auto max-w-[760px] text-center">
              <h2 className="text-[34px] font-semibold leading-[1.2] tracking-[-0.03em] md:text-[56px]">
                เราเข้าใจความรู้สึกนั้น.
              </h2>
              <p className="mt-4 text-[17px] leading-[1.65] text-[#a1a1a6] md:text-[21px]">
                ทุกคนเคยผ่านช่วงเวลาที่หัวใจเต้นแรง SE-ONE จึงถูกสร้างมาเพื่อให้ช่วงเวลาเหล่านั้นผ่านไปได้ง่ายขึ้น
              </p>
            </div>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-5 md:mt-20 md:grid-cols-3">
            {moments.map((m, i) => (
              <Reveal key={m.before} delay={i * 100}>
                <div className="flex h-full flex-col rounded-[24px] bg-[#1d1d1f] p-7 md:p-8">
                  <m.Icon className="h-7 w-7 text-[#86868b]" />
                  <p className="mt-6 text-[19px] font-semibold leading-[1.4] tracking-[-0.01em] text-[#a1a1a6]">
                    {m.before}
                  </p>
                  <div className="my-5 h-px w-full bg-white/10" />
                  <p className="mt-auto text-[19px] font-semibold leading-[1.5] tracking-[-0.01em] text-white">
                    {m.after}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Core Modules ---------- */}
      <section className="w-full bg-white py-24 md:py-32">
        <div className="mx-auto max-w-[1024px] px-5">
          <Reveal>
            <div className="mb-12 text-center md:mb-16">
              <h2 className="text-[34px] font-semibold tracking-[-0.03em] md:text-[56px]">Core Modules</h2>
              <p className="mx-auto mt-3 max-w-[640px] text-[17px] leading-[1.6] text-[#6e6e73] md:text-[21px]">
                สามระบบหลักที่ออกแบบมาเพื่อสนับสนุนการเรียนรู้ และช่วยให้ศักยภาพของคุณเติบโตทุกวัน
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Tile app={apps[0]} className="md:col-span-2" />
            <Tile app={apps[1]} delay={80} />
            <Tile app={apps[2]} delay={160} />
          </div>
        </div>
      </section>

      {/* ---------- A day with SE-ONE ---------- */}
      <section className="w-full bg-[#f5f5f7]">
        <div className="mx-auto max-w-[1024px] px-5 py-24 md:py-36">
          <Reveal>
            <div className="mx-auto max-w-[760px] text-center">
              <h2 className="text-[34px] font-semibold leading-[1.2] tracking-[-0.03em] md:text-[56px]">
                หนึ่งวัน ที่ไม่ต้องรีบร้อน.
              </h2>
              <p className="mt-4 text-[17px] leading-[1.65] text-[#6e6e73] md:text-[21px]">
                ลองนึกภาพวันธรรมดาของนักศึกษาคนหนึ่ง ที่ทุกอย่างลื่นไหลไปตามจังหวะของมัน
              </p>
            </div>
          </Reveal>

          <ol className="relative mx-auto mt-14 max-w-[760px] md:mt-20">
            <span aria-hidden className="absolute bottom-3 left-[11px] top-3 w-px bg-black/[0.12] md:left-[91px]" />
            {dayStory.map((d, i) => (
              <li key={d.time} className="relative pb-12 last:pb-0">
                <Reveal delay={i * 60}>
                  <div className="flex gap-5 md:gap-8">
                    <time className="hidden w-[64px] shrink-0 pt-0.5 text-right text-[17px] font-semibold tabular-nums text-[#6e6e73] md:block">
                      {d.time}
                    </time>
                    <span
                      aria-hidden
                      className="relative z-10 mt-1.5 h-[23px] w-[23px] shrink-0 rounded-full border-[6px] border-[#f5f5f7] bg-[#0071e3] ring-1 ring-[#0071e3]/30"
                    />
                    <div>
                      <p className="text-[15px] font-semibold tabular-nums text-[#0071e3] md:hidden">{d.time}</p>
                      <h3 className="text-[22px] font-semibold leading-[1.3] tracking-[-0.02em] md:text-[28px]">{d.title}</h3>
                      <p className="mt-2 text-[17px] leading-[1.7] text-[#6e6e73]">{d.text}</p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Principles ---------- */}
      <section className="w-full bg-white">
        <div className="mx-auto max-w-[1024px] px-5 py-24 md:py-36">
          <Reveal>
            <h2 className="mx-auto max-w-[760px] text-center text-[34px] font-semibold leading-[1.2] tracking-[-0.03em] md:text-[56px]">
              สร้างด้วยความใส่ใจ
              <br className="hidden sm:block" /> ในทุกรายละเอียด.
            </h2>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-10 md:mt-20 md:grid-cols-3 md:gap-12">
            {principles.map((p, i) => (
              <Reveal key={p.title} delay={i * 100}>
                <div className="text-center md:text-left">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5f5f7] md:mx-0">
                    <p.Icon className="h-7 w-7 text-[#0071e3]" />
                  </div>
                  <h3 className="mt-5 text-[21px] font-semibold leading-[1.35] tracking-[-0.02em]">{p.title}</h3>
                  <p className="mt-2 text-[17px] leading-[1.7] text-[#6e6e73]">{p.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="w-full bg-white pb-24 md:pb-36">
        <div className="mx-auto max-w-[860px] px-5">
          <Reveal>
            <h2 className="mb-6 text-[30px] font-semibold tracking-[-0.03em] md:text-[44px]">คำถามที่พบบ่อย</h2>
            <div className="border-t border-black/[0.1]">
              {faqs.map((f) => (
                <FaqItem key={f.q} {...f} />
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Closing CTA ---------- */}
      <section className="w-full overflow-hidden bg-[#f5f5f7]">
        <div className="relative isolate mx-auto max-w-[1024px] px-5 py-28 text-center md:py-40">
          <div
            aria-hidden
            className="absolute inset-x-0 top-1/2 -z-10 mx-auto h-[360px] max-w-[720px] -translate-y-1/2 opacity-60 blur-3xl"
            style={{
              background:
                'radial-gradient(50% 50% at 35% 50%, rgba(0,113,227,0.22), transparent), radial-gradient(50% 50% at 70% 50%, rgba(94,92,230,0.2), transparent)',
            }}
          />
          <Reveal>
            <h2 className="text-[38px] font-semibold leading-[1.15] tracking-[-0.035em] md:text-[64px]">
              การเดินทางของคุณ
              <br />
              เริ่มตรงนี้.
            </h2>
            <p className="mx-auto mt-5 max-w-[600px] text-[17px] leading-[1.7] text-[#6e6e73] md:text-[21px]">
              อีกไม่กี่ปี คุณจะมองย้อนกลับมายังวันนี้ แล้วยิ้มให้กับวันที่ตัดสินใจก้าวเข้ามา
              เข้าสู่ระบบเพื่อใช้งานทุกโมดูลของ SE-ONE
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
              <Link
                to="/sework/login"
                className="rounded-full bg-[#0071e3] px-[22px] py-3 text-[17px] text-white transition-colors hover:bg-[#0077ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0071e3]"
              >
                เข้าสู่ระบบ
              </Link>
              <Link
                to="/support"
                className="group inline-flex items-center gap-1 text-[17px] text-[#0066cc] underline-offset-4 hover:underline"
              >
                ต้องการความช่วยเหลือ
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">›</span>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
    </ThemeProvider>
  )
}