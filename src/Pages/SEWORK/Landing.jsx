import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

/*
  Landing — Apple.com style (rewritten)
  - ใช้เฉพาะ design tokens (--color-se-*) จึงรองรับ Light/Dark โดยไม่ต้องแก้ไฟล์นี้
  - ข้อมูลฟีเจอร์ทั้งหมดอ้างอิงจากระบบจริง (รายวิชา, ตารางเรียน, ติดตามงาน, XP ฯลฯ)
*/

/* ------------------------------ Data ------------------------------ */

const ICONS = {
  book: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
  check: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM8 12.5l2.5 2.5L16 9.5',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3',
  users: 'M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M13 7a4 4 0 11-8 0 4 4 0 018 0zM21 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  bell: 'M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  moon: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4',
  arrow: 'M9 5l7 7-7 7',
  plus: 'M12 5v14M5 12h14',
  tick: 'M5 13l4 4L19 7',
}

const STATS = [
  { value: 2, label: 'กลุ่มเรียน', note: 'SEC 1 ปกติ และ SEC 2 เทียบโอน' },
  { value: 3, label: 'ภาคเรียนต่อปี', note: 'แยกรายวิชาและงานตามเทอม' },
  { value: 300, label: 'XP ต่อหนึ่งงาน', note: 'เมื่องานผ่านการตรวจแล้ว' },
  { value: 4, label: 'บทบาทผู้ใช้', note: 'Student, Admin, Manager, Super Admin' },
]

const BENTO = [
  {
    icon: 'book',
    title: 'Academic Core',
    text: 'รวมรายวิชา ตารางเรียน และข้อมูลชีตของแต่ละเทอมไว้ในที่เดียว ค้นหาง่าย ไม่ต้องไล่หาในแชท',
    span: 'md:col-span-2',
    chips: ['รายวิชา', 'ตารางเรียน', 'ข้อมูลชีต', 'ภาคเรียน', 'ศูนย์ทรัพยากร'],
  },
  { icon: 'bell', title: 'ประกาศ', text: 'ข่าวสำคัญถึงทุกคน อ่านครบในหน้าเดียว', span: '' },
  { icon: 'bell', title: 'Discord แจ้งเตือน', text: 'เพิ่มรายวิชา ตารางเรียน หรือตรวจงาน ข้อความเข้า Discord ทันที', span: '' },
  { icon: 'moon', title: 'สว่าง · มืด · TH · EN', text: 'สลับธีมและภาษาได้ในคลิกเดียว', span: '' },
  { icon: 'users', title: 'Community', text: 'สมุดรายชื่อเพื่อนร่วมรุ่นพร้อมเบอร์โทร Facebook Instagram และ GitHub', span: '' },
  {
    icon: 'shield',
    title: 'สิทธิ์ตามบทบาท',
    text: 'นักศึกษา ผู้ดูแล และ Super Admin เห็นและทำได้ต่างกัน ข้อมูลปลอดภัยโดยดีไซน์',
    span: 'md:col-span-3',
  },
]

const ROLES = [
  {
    label: 'นักศึกษา',
    title: 'เห็นทุกอย่างที่ต้องรู้',
    points: [
      'ดูประกาศ งานที่มอบหมาย และตารางเรียนของกลุ่มตัวเอง',
      'ติดตามคะแนนและอันดับบนกระดานผู้นำ',
      'เปิดลิงก์ส่งงานและทรัพยากรได้ในคลิกเดียว',
    ],
  },
  {
    label: 'Admin / Manager',
    title: 'จัดการได้โดยไม่ต้องวุ่นวาย',
    points: [
      'เพิ่มและลบรายวิชา ตารางเรียน และลิงก์ภายใน',
      'เช็คชื่อการส่งงานของทั้งห้อง บันทึกอัตโนมัติทุกคลิก',
      'ทุกการเปลี่ยนแปลงแจ้งเข้า Discord ให้ทีมรู้ทันที',
    ],
  },
  {
    label: 'Super Admin',
    title: 'ควบคุมทั้งระบบ',
    points: [
      'สลับดูข้อมูลได้ทั้ง SEC 1 และ SEC 2',
      'จัดการผู้ใช้และระดับสิทธิ์ทั้งหมด',
      'ดูภาพรวมสมาชิกและสถานะระบบจากหน้าหลัก',
    ],
  },
]

const STEPS = [
  { title: 'เข้าสู่ระบบ', text: 'ล็อกอินด้วยบัญชีของคุณ ระบบจะแสดงข้อมูลตามกลุ่มเรียนที่คุณอยู่' },
  { title: 'เลือกเทอม', text: 'เลือกปีการศึกษาและภาคเรียน เพื่อดูรายวิชาและงานของเทอมนั้น' },
  { title: 'ติดตามและส่งงาน', text: 'ดูความคืบหน้า เปิดลิงก์ส่งงาน และสะสม XP ไปพร้อมกับเพื่อน' },
]

const FAQS = [
  {
    q: 'SEC 1 กับ SEC 2 ต่างกันอย่างไร?',
    a: 'SEC 1 คือกลุ่มเรียนปกติ ส่วน SEC 2 คือกลุ่มเทียบโอน ระบบแยกรายวิชา ตารางเรียน และงานของแต่ละกลุ่มให้อัตโนมัติ',
  },
  {
    q: 'XP ได้มาจากอะไร?',
    a: 'เมื่อผู้ตรวจอนุมัติงานที่คุณส่ง คุณจะได้ 300 XP ต่อหนึ่งงาน และคะแนนจะไปแสดงบนกระดานผู้นำ',
  },
  {
    q: 'มีการแจ้งเตือนไหม?',
    a: 'มี ทุกครั้งที่ผู้ดูแลเพิ่มรายวิชา ตารางเรียน ลิงก์ หรืออัปเดตการตรวจงาน ระบบจะส่งข้อความเข้า Discord ของสาขา',
  },
  {
    q: 'ใช้โหมดมืดหรือภาษาอังกฤษได้ไหม?',
    a: 'ได้ ที่แถบด้านบนมีปุ่มสลับธีมสว่าง/มืด และสลับภาษาไทย/อังกฤษได้ทันที',
  },
]

const FOOTER = [
  { title: 'สำรวจ', links: [['ภาพรวม', 'top'], ['ฟีเจอร์', 'features'], ['บทบาท', 'roles']] },
  { title: 'เริ่มต้น', links: [['ขั้นตอนการใช้งาน', 'how'], ['คำถามที่พบบ่อย', 'faq']] },
]

const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-se-primary/30'
const tile = 'rounded-[28px] bg-se-surface'

/* ----------------------------- Helpers ----------------------------- */

const prefersReduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const goTo = (id) => (e) => {
  e.preventDefault()
  document.getElementById(id)?.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth' })
}

function useInView() {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true)
          io.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return [ref, seen]
}

function Reveal({ children, delay = 0, className = '' }) {
  const [ref, seen] = useInView()
  const state = seen
    ? 'translate-y-0 opacity-100'
    : 'translate-y-8 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100'

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${state} ${className}`}
    >
      {children}
    </div>
  )
}

function CountUp({ to }) {
  const [ref, seen] = useInView()
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!seen) return
    if (prefersReduced()) {
      setValue(to)
      return
    }
    let raf
    let start
    const tick = (t) => {
      if (start === undefined) start = t
      const p = Math.min((t - start) / 1200, 1)
      setValue(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seen, to])

  return <span ref={ref}>{value}</span>
}

function Icon({ name, className = 'h-6 w-6', stroke = 1.75 }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  )
}

function IconBadge({ name }) {
  return (
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-se-primary/10 text-se-primary">
      <Icon name={name} />
    </span>
  )
}

function Bar({ percent, tone = 'bg-se-primary' }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-se-border/60">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${percent}%` }} />
    </div>
  )
}

function Heading({ eyebrow, title, text }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow && <p className="mb-3 text-lg font-semibold text-se-primary">{eyebrow}</p>}
      <h2 className="text-4xl font-semibold leading-[1.15] tracking-tight md:text-6xl">{title}</h2>
      {text && <p className="mt-5 text-xl leading-relaxed text-se-text-muted md:text-2xl">{text}</p>}
    </div>
  )
}

/* ------------------------------ Mockups ------------------------------ */

function HeroMock() {
  const nav = ['หน้าหลัก', 'วิชาการ', 'ชุมชน', 'การดูแลระบบ']
  const rows = [
    ['SWE101', 'Programming Fundamentals', 100],
    ['SWE204', 'Database Systems', 75],
    ['SWE310', 'Software Testing', 40],
  ]

  return (
    <div className="relative mx-auto mt-16 max-w-5xl text-left md:mt-20" aria-hidden="true">
      <div className="absolute inset-x-12 -top-8 h-72 rounded-full bg-se-primary/25 blur-3xl" />
      <div className="relative overflow-hidden rounded-[28px] border border-se-border/70 bg-se-surface shadow-[0_40px_90px_-30px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-2 border-b border-se-border/60 px-5 py-3.5">
          {['bg-se-danger', 'bg-se-text-muted/50', 'bg-se-success'].map((c) => (
            <span key={c} className={`h-3 w-3 rounded-full ${c}`} />
          ))}
          <span className="mx-auto rounded-full bg-se-background px-4 py-1 text-xs text-se-text-muted">
            ภาพประกอบหน้าจอระบบ
          </span>
        </div>

        <div className="grid md:grid-cols-[190px_1fr]">
          <div className="hidden space-y-1 border-r border-se-border/60 p-4 md:block">
            {nav.map((n, i) => (
              <div
                key={n}
                className={`rounded-xl px-3 py-2 text-sm font-medium ${
                  i === 0 ? 'bg-se-primary/10 text-se-primary' : 'text-se-text-muted'
                }`}
              >
                {n}
              </div>
            ))}
          </div>

          <div className="p-5 md:p-8">
            <p className="text-sm text-se-text-muted">สวัสดีตอนเช้า</p>
            <p className="text-2xl font-semibold tracking-tight md:text-3xl">ความคืบหน้าของเทอมนี้</p>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {[['รายวิชา', '6'], ['งานที่ส่งแล้ว', '18'], ['XP สะสม', '5,400']].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-se-background p-4">
                  <p className="text-xs text-se-text-muted">{k}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums md:text-3xl">{v}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-4 rounded-2xl bg-se-background p-5">
              {rows.map(([code, name, pct]) => (
                <div key={code}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>
                      <b className="mr-2 text-se-primary">{code}</b>
                      {name}
                    </span>
                    <span className="tabular-nums text-se-text-muted">{pct}%</span>
                  </div>
                  <Bar percent={pct} tone={pct === 100 ? 'bg-se-success' : 'bg-se-primary'} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TrackingMock() {
  const students = [['ฟ้า', true], ['ไผ่', true], ['มะนาว', false], ['ต้นกล้า', true]]

  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="rounded-2xl bg-se-background p-5">
        <div className="mb-3 flex justify-between text-sm text-se-text-muted">
          <span>ส่งแล้ว 3 จาก 4 คน</span>
          <b className="text-se-primary">75%</b>
        </div>
        <Bar percent={75} />
      </div>
      {students.map(([name, done]) => (
        <div
          key={name}
          className={`flex items-center gap-4 rounded-2xl p-4 ${done ? 'bg-se-success/15' : 'bg-se-background'}`}
        >
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
              done ? 'border-se-success bg-se-success text-white' : 'border-se-text-muted/60 text-transparent'
            }`}
          >
            <Icon name="tick" className="h-4 w-4" stroke={3} />
          </span>
          <span className="font-semibold">{name}</span>
        </div>
      ))}
    </div>
  )
}

function LeaderMock() {
  const board = [['ไผ่', 6300], ['ฟ้า', 5400], ['ต้นกล้า', 4500], ['มะนาว', 3000]]

  return (
    <div className="space-y-3" aria-hidden="true">
      {board.map(([name, xp], i) => (
        <div key={name} className="flex items-center gap-4 rounded-2xl bg-se-background p-4">
          <span className="w-6 text-center text-lg font-semibold text-se-text-muted">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex justify-between text-sm">
              <b>{name}</b>
              <span className="tabular-nums text-se-text-muted">{xp.toLocaleString()} XP</span>
            </div>
            <Bar percent={(xp / 6300) * 100} />
          </div>
        </div>
      ))}
    </div>
  )
}

function Showcase({ eyebrow, title, text, flip = false, children }) {
  return (
    <Reveal className={`${tile} grid items-center gap-10 p-8 md:grid-cols-2 md:gap-14 md:p-14`}>
      <div className={flip ? 'md:order-2' : ''}>
        <p className="mb-3 text-lg font-semibold text-se-primary">{eyebrow}</p>
        <h3 className="text-3xl font-semibold leading-tight tracking-tight md:text-5xl">{title}</h3>
        <p className="mt-5 text-xl leading-relaxed text-se-text-muted">{text}</p>
      </div>
      <div className={flip ? 'md:order-1' : ''}>{children}</div>
    </Reveal>
  )
}

/* ------------------------------- Page ------------------------------- */

export default function LandingPage() {
  const [role, setRole] = useState(0)
  const current = ROLES[role]

  useEffect(() => {
    document.title = 'SE-CONSOLE | ระบบบริหารจัดการการศึกษา'
  }, [])

  return (
    <div
      id="top"
      className="min-h-screen overflow-x-clip bg-se-background text-se-text-main antialiased selection:bg-se-primary/20"
    >
      {/* Global Nav */}
      <nav className="sticky top-0 z-50 border-b border-se-border/60 bg-se-background/75 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-6">
          <Link to="/sework/landing" className={`flex items-center gap-2.5 rounded-lg ${focusRing}`}>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black">
              <img src="/logo.png" alt="" className="h-5 w-5 object-contain" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">SE-CONSOLE</span>
          </Link>

          <div className="hidden items-center gap-7 text-[13px] text-se-text-muted md:flex">
            {[['ฟีเจอร์', 'features'], ['บทบาท', 'roles'], ['ขั้นตอน', 'how'], ['คำถาม', 'faq']].map(([label, id]) => (
              <a key={id} href={`#${id}`} onClick={goTo(id)} className="transition-colors hover:text-se-text-main">
                {label}
              </a>
            ))}
          </div>

          <Link
          to="/"
              className={`rounded-lg text-sm text-se-text-muted transition-colors hover:text-se-text-main ${focusRing}`}>
                 กลับสู่ SE-ONE Portal
        </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="mx-auto max-w-5xl px-6 pb-24 pt-20 text-center md:pt-28">
        <Reveal>
          <p className="mb-5 text-lg font-semibold text-se-text-muted md:text-xl">SEWORK Platform</p>
          <h1 className="text-5xl font-semibold leading-[1.12] tracking-tight md:text-8xl md:leading-[1.08]">
            ทุกวิชา ทุกงาน
            <br />
            <span className="bg-gradient-to-r from-se-primary to-se-success bg-clip-text text-transparent">
              เรียบง่ายในที่เดียว
            </span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-xl leading-relaxed text-se-text-muted md:text-2xl">
            ศูนย์กลางของนักศึกษาวิศวกรรมซอฟต์แวร์ รวมรายวิชา ตารางเรียน งานที่มอบหมาย
            และการติดตามความคืบหน้าไว้ในแพลตฟอร์มเดียว
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
            <Link
              to="/sework/login"
              className={`rounded-full bg-se-primary px-8 py-3 text-[17px] font-medium text-white transition-colors hover:bg-se-primary-hover ${focusRing}`}
            >
              เข้าสู่ระบบ
            </Link>
            <a
              href="#features"
              onClick={goTo('features')}
              className={`group inline-flex items-center gap-1 rounded-full text-[17px] font-medium text-se-primary ${focusRing}`}
            >
              <span className="group-hover:underline">ดูฟีเจอร์ทั้งหมด</span>
              <Icon name="arrow" className="h-4 w-4" stroke={2.5} />
            </a>
          </div>
        </Reveal>

        <Reveal delay={150}>
          <HeroMock />
        </Reveal>
      </header>

      {/* Stats */}
      <section className="mx-auto max-w-5xl px-6 pb-28">
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 80} className={`${tile} p-6 md:p-7`}>
              <p className="text-5xl font-semibold tracking-tight tabular-nums md:text-6xl">
                <CountUp to={s.value} />
              </p>
              <p className="mt-3 text-lg font-semibold">{s.label}</p>
              <p className="mt-1 text-sm leading-snug text-se-text-muted">{s.note}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Bento features */}
      <section id="features" className="mx-auto max-w-5xl scroll-mt-16 px-6 pb-28">
        <Heading
          eyebrow="ฟีเจอร์"
          title="ทุกอย่างที่การเรียน ต้องมี"
          text="ออกแบบมาเพื่อลดความซับซ้อน ให้คุณโฟกัสกับสิ่งที่สำคัญจริง ๆ"
        />

        <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-3">
          {BENTO.map((b, i) => (
            <Reveal
              key={b.title}
              delay={(i % 3) * 80}
              className={`${tile} flex min-h-[260px] flex-col justify-between p-8 md:p-9 ${b.span}`}
            >
              <IconBadge name={b.icon} />
              <div className="mt-10">
                <h3 className="text-2xl font-semibold tracking-tight">{b.title}</h3>
                <p className="mt-2 text-[17px] leading-relaxed text-se-text-muted">{b.text}</p>
                {b.chips && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {b.chips.map((c) => (
                      <span key={c} className="rounded-full bg-se-background px-3 py-1 text-sm text-se-text-muted">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Showcases */}
      <section className="mx-auto max-w-5xl space-y-5 px-6 pb-28">
        <Showcase
          eyebrow="Submission Tracking"
          title="งานทุกชิ้น เห็นสถานะทุกคน"
          text="ผู้ตรวจแตะชื่อเพื่อเช็คการส่งงาน ระบบบันทึกให้ทันทีและคำนวณความคืบหน้าของทั้งห้องแบบเรียลไทม์"
        >
          <TrackingMock />
        </Showcase>
        <Showcase
          flip
          eyebrow="Leaderboard"
          title="เรียนให้สนุก ด้วยระบบ XP"
          text="ทุกงานที่ผ่านการตรวจได้ 300 XP สะสมแต้ม ไต่อันดับ และสร้างแรงจูงใจให้ทั้งห้องส่งงานตรงเวลา"
        >
          <LeaderMock />
        </Showcase>
      </section>

      {/* Roles */}
      <section id="roles" className="mx-auto max-w-4xl scroll-mt-16 px-6 pb-28">
        <Heading eyebrow="บทบาท" title="ทุกคน เห็นในสิ่งที่ควรเห็น" />

        <div className="mt-12 flex justify-center">
          <div role="tablist" aria-label="บทบาทผู้ใช้" className="flex flex-wrap justify-center gap-1 rounded-full bg-se-surface p-1.5">
            {ROLES.map((r, i) => (
              <button
                key={r.label}
                type="button"
                role="tab"
                aria-selected={role === i}
                onClick={() => setRole(i)}
                className={`rounded-full px-5 py-2 text-[15px] font-medium transition-colors ${focusRing} ${
                  role === i ? 'bg-se-primary text-white' : 'text-se-text-muted hover:text-se-text-main'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div key={role} role="tabpanel" className={`${tile} mt-8 p-8 md:p-12`}>
          <h3 className="text-3xl font-semibold tracking-tight md:text-4xl">{current.title}</h3>
          <ul className="mt-8 space-y-5">
            {current.points.map((p) => (
              <li key={p} className="flex items-start gap-4 text-xl leading-relaxed">
                <span className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-se-primary/10 text-se-primary">
                  <Icon name="tick" className="h-4 w-4" stroke={3} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-5xl scroll-mt-16 px-6 pb-28">
        <Heading eyebrow="ขั้นตอน" title="เริ่มใช้งานใน 3 ขั้นตอน" />

        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 100} className={`${tile} p-8`}>
              <span className="text-6xl font-semibold tracking-tight text-se-primary/30">{i + 1}</span>
              <h3 className="mt-6 text-2xl font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-[17px] leading-relaxed text-se-text-muted">{s.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-16 px-6 pb-28">
        <Heading title="คำถามที่พบบ่อย" />

        <div className="mt-12 border-t border-se-border/60">
          {FAQS.map((f) => (
            <details key={f.q} className="group border-b border-se-border/60 py-6">
              <summary
                className={`flex cursor-pointer list-none items-center justify-between gap-6 rounded-lg text-xl font-semibold [&::-webkit-details-marker]:hidden ${focusRing}`}
              >
                {f.q}
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-se-surface text-se-text-muted transition-transform duration-300 group-open:rotate-45">
                  <Icon name="plus" className="h-4 w-4" stroke={2.5} />
                </span>
              </summary>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-se-text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-5xl px-6 pb-28">
        <Reveal className="rounded-[36px] bg-se-text-main px-8 py-20 text-center text-se-background md:px-16 md:py-28">
          <h2 className="text-4xl font-semibold leading-[1.15] tracking-tight md:text-6xl">
            พร้อมจัดระเบียบ
            <br />
            การเรียนของคุณแล้วหรือยัง
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-xl opacity-70">
            เข้าสู่ระบบเพื่อดูรายวิชา งาน และคะแนนของคุณได้ทันที
          </p>
          <Link
            to="/sework/login"
            className={`mt-10 inline-block rounded-full bg-se-primary px-9 py-3.5 text-[17px] font-medium text-white transition-colors hover:bg-se-primary-hover ${focusRing}`}
          >
            เข้าสู่ระบบ
          </Link>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-se-border/60">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="grid gap-10 text-sm md:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <p className="text-[15px] font-semibold">SE-CONSOLE</p>
              <p className="mt-2 max-w-xs leading-relaxed text-se-text-muted">
                ระบบบริหารจัดการการศึกษาสำหรับนักศึกษาวิศวกรรมซอฟต์แวร์
              </p>
            </div>
            {FOOTER.map((col) => (
              <div key={col.title}>
                <p className="font-semibold">{col.title}</p>
                <ul className="mt-3 space-y-2 text-se-text-muted">
                  {col.links.map(([label, id]) => (
                    <li key={id}>
                      <a href={`#${id}`} onClick={goTo(id)} className="transition-colors hover:text-se-text-main">
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 border-t border-se-border/60 pt-6 text-xs text-se-text-muted">
            © {new Date().getFullYear()} Software Engineering Console. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}