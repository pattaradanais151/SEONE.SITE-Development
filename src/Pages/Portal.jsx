import { useEffect } from 'react'
import { Link } from 'react-router-dom'

/* ------------------------------------------------------------------ */
/*  Icons (stroke icons, viewBox 24)                                   */
/* ------------------------------------------------------------------ */
const ICONS = {
  book: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  code: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
  cloud: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
  chevron: 'M9 5l7 7-7 7',
  arrowDown: 'M19 14l-7 7m0 0l-7-7m7 7V3',
  clipboard: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  bell: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  terminal: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  device: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
  folder: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',
  file: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
}

function Icon({ path, className = 'h-6 w-6', strokeWidth = 1.8 }) {
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
      <path d={path} />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const APPS = [
  {
    id: 'sework',
    category: 'การศึกษา',
    title: 'SE-CONSOLE',
    description: 'ระบบบริหารจัดการการศึกษาและส่งงานสำหรับนักศึกษาวิศวกรรมซอฟต์แวร์',
    path: '/sework/landing',
    gradient: 'from-[#4facfe] to-[#0071e3]',
    icon: ICONS.book,
  },
  {
    id: 'coding',
    category: 'นักพัฒนา',
    title: 'CODING STUDIO',
    description: 'แพลตฟอร์มสำหรับฝึกเขียนโค้ด ทำโจทย์อัลกอริทึม และแชร์โค้ดร่วมกัน',
    path: '/coding/landing',
    gradient: 'from-[#5ee7a0] to-[#1fb45a]',
    icon: ICONS.code,
  },
  {
    id: 'cloudfiles',
    category: 'จัดเก็บไฟล์',
    title: 'CLOUDFILES',
    description: 'พื้นที่จัดเก็บไฟล์ส่วนตัวบนคลาวด์ ซิงค์และแชร์เอกสารได้อย่างปลอดภัย',
    path: '/cloudfiles/landing',
    gradient: 'from-[#ff8a9b] to-[#ff2d55]',
    icon: ICONS.cloud,
  },
]

const FEATURES = [
  {
    icon: ICONS.clipboard,
    title: 'ส่งงานและติดตามผล',
    description: 'ดูสถานะการส่งงาน ประกาศ ตารางเรียน และอันดับคะแนนของทั้งห้องได้ในที่เดียว',
  },
  {
    icon: ICONS.bell,
    title: 'แจ้งเตือนผ่าน Discord',
    description: 'ประกาศ รวมถึงงานที่เพิ่มหรือถูกลบ จะถูกส่งเข้าเซิร์ฟเวอร์ Discord ของห้องอัตโนมัติ',
  },
  {
    icon: ICONS.terminal,
    title: 'เขียนโค้ดบนเบราว์เซอร์',
    description: 'รองรับ Python (WebAssembly), React, TypeScript และ HTML/JS พร้อมพรีวิวแบบสด',
  },
  {
    icon: ICONS.lock,
    title: 'โฟลเดอร์ที่ปลอดภัย',
    description: 'ตั้งรหัสผ่านป้องกันโฟลเดอร์ และแชร์ไฟล์ให้เพื่อนได้โดยไม่ต้องกังวลเรื่องความเป็นส่วนตัว',
  },
  {
    icon: ICONS.users,
    title: 'โปรไฟล์นักพัฒนา',
    description: 'รวมสมาชิก SE Gen 4 พร้อม role tags และสถิติ GitHub แบบเรียลไทม์',
  },
  {
    icon: ICONS.device,
    title: 'ติดตั้งเป็นแอป',
    description: 'รองรับ PWA ติดตั้งบนมือถือหรือคอมพิวเตอร์ได้ และอัปเดตเวอร์ชันใหม่ให้อัตโนมัติ',
  },
]

const ASSIGNMENTS = [
  { name: 'ออกแบบฐานข้อมูล ER Diagram', subject: 'Database Systems', status: 'ส่งแล้ว', tone: 'bg-se-success/15 text-se-success' },
  { name: 'แบบฝึกหัด Linked List', subject: 'Data Structures', status: 'ส่งแล้ว', tone: 'bg-se-success/15 text-se-success' },
  { name: 'รายงานความคืบหน้าโครงงาน', subject: 'Software Project', status: 'ใกล้กำหนด', tone: 'bg-se-primary/10 text-se-primary' },
  { name: 'Lab 06 — REST API', subject: 'Web Development', status: 'ยังไม่ส่ง', tone: 'bg-se-danger/10 text-se-danger' },
]

const TECH_STACK = ['React 18', 'Vite', 'Tailwind CSS v4', 'Emotion', 'Cloudflare']

/* ------------------------------------------------------------------ */
/*  ภาพตัวอย่างหน้าจอในการ์ด (ตกแต่งอย่างเดียว ซ่อนจาก screen reader)         */
/* ------------------------------------------------------------------ */
const mockCardClass = 'rounded-2xl bg-se-surface shadow-[0_2px_16px_rgba(0,0,0,0.06)] ring-1 ring-se-border'

function ConsolePreview() {
  return (
    <div className={`flex h-full flex-col p-5 ${mockCardClass}`}>
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold text-se-text-main">งานของฉัน</p>
        <p className="text-[13px] text-se-text-muted">ส่งแล้ว 2 จาก 4</p>
      </div>

      <ul className="mt-4 divide-y divide-se-border">
        {ASSIGNMENTS.map((item) => (
          <li key={item.name} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium text-se-text-main">{item.name}</p>
              <p className="mt-0.5 text-[12px] text-se-text-muted">{item.subject}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium ${item.tone}`}>
              {item.status}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-5">
        <div className="h-1.5 overflow-hidden rounded-full bg-se-border/60">
          <div className="h-full w-1/2 rounded-full bg-se-primary" />
        </div>
      </div>
    </div>
  )
}

function CodePreview() {
  return (
    <div className="overflow-hidden rounded-2xl bg-[#1d1d1f] shadow-[0_2px_16px_rgba(0,0,0,0.14)]">
      <div className="flex items-center gap-1.5 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-[12px] text-white/50">main.py</span>
      </div>
      <div className="px-4 pb-4 font-mono text-[13px] leading-6 text-white/90">
        <div>
          <span className="text-[#ff7ab2]">def</span> <span className="text-[#5dd8ff]">greet</span>(name):
        </div>
        <div className="pl-6">
          <span className="text-[#ff7ab2]">return</span> <span className="text-[#fc9867]">"สวัสดี "</span> + name
        </div>
        <div className="mt-2">
          print(greet(<span className="text-[#fc9867]">"SE-ONE"</span>))
        </div>
        <div className="mt-3 border-t border-white/10 pt-3 text-[#5ee7a0]">› สวัสดี SE-ONE</div>
      </div>
    </div>
  )
}

function FilesPreview() {
  return (
    <div className={`p-4 ${mockCardClass}`}>
      <ul className="space-y-1">
        <li className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Icon path={ICONS.folder} className="h-5 w-5 text-se-primary" />
          <span className="flex-1 truncate text-[14px] font-medium text-se-text-main">เอกสารเรียน</span>
          <Icon path={ICONS.lock} className="h-4 w-4 text-se-text-muted" />
        </li>
        <li className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Icon path={ICONS.file} className="h-5 w-5 text-se-text-muted" />
          <span className="flex-1 truncate text-[14px] font-medium text-se-text-main">สไลด์สัปดาห์ที่ 5.pdf</span>
          <span className="text-[12px] text-se-text-muted">2.4 MB</span>
        </li>
      </ul>
      <div className="mt-3 rounded-xl bg-se-background px-3 py-2.5">
        <div className="flex items-center justify-between text-[12px] text-se-text-muted">
          <span>กำลังอัปโหลด…</span>
          <span>72%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-se-border/60">
          <div className="h-full w-[72%] rounded-full bg-se-primary" />
        </div>
      </div>
    </div>
  )
}

const PREVIEWS = {
  sework: ConsolePreview,
  coding: CodePreview,
  cloudfiles: FilesPreview,
}

/* ------------------------------------------------------------------ */
/*  AppTile — การ์ดแอปแต่ละตัว (คลิกได้ทั้งใบ)                             */
/* ------------------------------------------------------------------ */
function AppTile({ app, index, className = '' }) {
  const Preview = PREVIEWS[app.id]

  return (
    <Link
      to={app.path}
      className={`se-fade-up group relative flex flex-col rounded-[28px] bg-se-background p-7 ring-1 ring-transparent transition-all duration-500 ease-[cubic-bezier(.28,.11,.32,1)] hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(0,0,0,0.10)] hover:ring-se-border focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-se-primary/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-8 ${className}`}
      style={{ animationDelay: `${300 + index * 90}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${app.gradient} text-white shadow-[0_6px_16px_rgba(0,0,0,0.12)]`}
        >
          <Icon path={app.icon} className="h-7 w-7" />
        </span>
        <span className="rounded-full bg-se-surface px-3 py-1 text-[13px] font-medium text-se-text-muted ring-1 ring-se-border">
          {app.category}
        </span>
      </div>

      <h3 className="mt-7 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-se-text-main">
        {app.title}
      </h3>
      <p className="mt-2 max-w-[460px] text-[16px] leading-relaxed text-se-text-muted">{app.description}</p>

      <div aria-hidden="true" className="mt-7 flex-1">
        <Preview />
      </div>

      <span className="mt-7 inline-flex items-center gap-1 text-[15px] font-medium text-se-primary underline-offset-4 group-hover:underline">
        เข้าใช้งาน
        <Icon
          path={ICONS.chevron}
          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
          strokeWidth={2.5}
        />
      </span>
    </Link>
  )
}

/* ------------------------------------------------------------------ */

export default function Portal() {
  useEffect(() => {
    document.title = 'SE-ONE | Ecosystem Portal'
  }, [])

  return (
    <div className="w-full flex-grow bg-se-surface text-se-text-main antialiased">
      {/* keyframes สำหรับ fade-up ตอนโหลดหน้า (เคารพ reduced-motion) */}
      <style>{`
        @keyframes se-fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .se-fade-up { opacity: 0; animation: se-fade-up .8s cubic-bezier(.28,.11,.32,1) forwards; }
        @media (prefers-reduced-motion: reduce) {
          .se-fade-up { animation: none; opacity: 1; }
        }
      `}</style>

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[560px]"
          style={{
            backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(0,113,227,0.10), transparent 65%)',
          }}
        />

        <div className="relative mx-auto flex w-full max-w-[1120px] flex-col items-center px-6 pb-20 pt-20 text-center md:pb-28 md:pt-28">
          <div
            className="se-fade-up mb-8 flex h-[72px] w-[72px] items-center justify-center rounded-[20px] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.08)] ring-1 ring-black/5"
            style={{ animationDelay: '0ms' }}
          >
            <img src="/logo.png" alt="SE-ONE Logo" className="h-10 w-10 object-contain" />
          </div>

          <h1
            className="se-fade-up text-[44px] font-semibold leading-[1.05] tracking-[-0.035em] md:text-[76px]"
            style={{ animationDelay: '80ms' }}
          >
            Welcome to SE-ONE
          </h1>

          <p
            className="se-fade-up mt-5 max-w-[640px] text-[19px] font-medium leading-[1.5] tracking-[-0.01em] text-se-text-muted md:mt-6 md:text-[24px]"
            style={{ animationDelay: '160ms' }}
          >
            เลือกแอปพลิเคชันที่คุณต้องการเข้าใช้งานจาก Ecosystem ของเรา
          </p>

          <div
            className="se-fade-up mt-9 flex flex-col items-center gap-4 sm:flex-row sm:gap-6"
            style={{ animationDelay: '240ms' }}
          >
            <a
              href="#apps"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-se-primary px-7 text-[17px] font-medium text-white transition-colors hover:bg-se-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-se-primary/30"
            >
              เลือกแอปพลิเคชัน
              <Icon path={ICONS.arrowDown} className="h-4 w-4" strokeWidth={2.5} />
            </a>
            <Link
              to="/talents"
              className="inline-flex items-center gap-1 rounded text-[17px] font-medium text-se-primary hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-se-primary/30"
            >
              ดูสมาชิก SE Gen 4
              <Icon path={ICONS.chevron} className="h-4 w-4" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Apps (bento) ---------- */}
      <section
        id="apps"
        aria-label="แอปพลิเคชันใน SE-ONE"
        className="mx-auto w-full max-w-[1120px] scroll-mt-24 px-6"
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <AppTile app={APPS[0]} index={0} className="md:row-span-2" />
          <AppTile app={APPS[1]} index={1} />
          <AppTile app={APPS[2]} index={2} />
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section className="mx-auto w-full max-w-[1120px] px-6 pb-4 pt-24 md:pt-32">
        <div className="mx-auto max-w-[640px] text-center">
          <h2 className="text-[32px] font-semibold leading-tight tracking-[-0.025em] md:text-[44px]">
            ครบในที่เดียว
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-se-text-muted md:text-[19px]">
            เครื่องมือสำหรับการเรียน ส่งงาน เขียนโค้ด และจัดเก็บไฟล์ ในแพลตฟอร์มเดียว
          </p>
        </div>

        <ul className="mt-14 grid grid-cols-1 gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <li key={feature.title}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-se-primary/10 text-se-primary">
                <Icon path={feature.icon} className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-[19px] font-semibold leading-snug tracking-[-0.01em]">
                {feature.title}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-se-text-muted">{feature.description}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- Talents + Tech stack ---------- */}
      <section className="mx-auto w-full max-w-[1120px] px-6 pb-24 pt-20 md:pb-32 md:pt-28">
        <div className="relative overflow-hidden rounded-[32px] bg-[#1d1d1f] px-8 py-14 text-center text-white md:px-16 md:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-32 mx-auto h-72 max-w-lg rounded-full bg-[#0071e3]/40 blur-3xl"
          />

          <div className="relative">
            <h2 className="text-[30px] font-semibold leading-tight tracking-[-0.025em] md:text-[44px]">
              พบกับนักพัฒนา SE Generation 4
            </h2>
            <p className="mx-auto mt-4 max-w-[520px] text-[17px] leading-relaxed text-white/70 md:text-[19px]">
              สำรวจโปรไฟล์สมาชิกทุกคนพร้อมสถิติ GitHub และบทบาทที่ถนัด
            </p>
            <Link
              to="/talents"
              className="mt-8 inline-flex h-12 items-center rounded-full bg-white px-7 text-[17px] font-medium text-[#1d1d1f] transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
            >
              ดูรายชื่อสมาชิก
            </Link>

            <div className="mt-12 border-t border-white/10 pt-8 md:mt-14">
              <p className="text-[13px] text-white/50">สร้างด้วย</p>
              <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-[15px] font-medium text-white/80">
                {TECH_STACK.map((tech) => (
                  <li key={tech}>{tech}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}