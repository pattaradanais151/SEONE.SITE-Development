import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'

/*
  Coding Studio Landing — Apple.com style
  - สีหน้าเพจทั้งหมดอ้างอิงจาก design tokens (--color-se-*) รองรับ Light/Dark Mode เมื่อ override ตัวแปร
  - หน้าต่างโค้ดตัวอย่าง (mockup) ใช้ชุดสี VS Code Dark+ คงที่ทั้งสองโหมด เหมือน editor จริงที่เป็นธีมมืด
*/

const CODE_ICON = 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4'

// ภาษาที่ Workspace รองรับ
const languages = ['HTML', 'CSS', 'JavaScript', 'JSX', 'TSX', 'C', 'C++', 'C#', 'Java', 'Python']

const highlights = [
  {
    title: 'ฝึกแก้โจทย์อัลกอริทึม',
    description: 'เขียนโค้ด รับค่าอินพุต และดูผลลัพธ์ได้ในที่เดียว เหมาะกับการซ้อมโจทย์ก่อนส่งงานจริง',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    title: 'ทดสอบโค้ดแบบเรียลไทม์',
    description: 'กดรันแล้วเห็นผลทันที รองรับทั้งหน้าเว็บ (HTML, CSS, JS, React) และโปรแกรมแบบ Console',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    title: 'Workspace ส่วนตัว',
    description: 'ไฟล์ทั้งหมดถูกบันทึกอัตโนมัติ เปิดกลับมาทำต่อได้ทุกเมื่อ พร้อมหน้าตาแบบ Visual Studio Code',
    icon: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',
  },
]

// โค้ดตัวอย่างในหน้าต่าง mockup (แยกเป็น token เพื่อไม่ต้องเขียน <br /> และ escape เอง)
const kw = 'text-[#c586c0]'
const fn = 'text-[#dcdcaa]'
const str = 'text-[#ce9178]'
const cls = 'text-[#4ec9b0]'
const lit = 'text-[#569cd6]'
const plain = 'text-[#d4d4d4]'

const codeLines = [
  [[kw, 'function'], [plain, ' '], [fn, 'initWorkspace'], [plain, '(user) {']],
  [[plain, '  '], [kw, 'if'], [plain, ' (!user.isAuthenticated) {']],
  [[plain, '    '], [kw, 'return'], [plain, ' '], [lit, 'new'], [plain, ' '], [cls, 'Error'], [plain, '('], [str, "'Access Denied'"], [plain, ');']],
  [[plain, '  }']],
  [[plain, '  '], [cls, 'console'], [plain, '.'], [fn, 'log'], [plain, '('], [str, '`Welcome to CODING STUDIO, ${user.name}!`'], [plain, ');']],
  [[plain, '  '], [kw, 'return'], [plain, ' '], [lit, 'true'], [plain, ';']],
  [[plain, '}']],
]

const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-se-primary/30'

function Icon({ d, className = 'h-6 w-6', strokeWidth = 1.75 }) {
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

export default function CodingLanding() {
  const { session, profile } = useAuth()

  useEffect(() => {
    document.title = 'CODING STUDIO | SE-ONE'
  }, [])

  const workspacePath = profile?.nickname ? `/coding/workspace/${profile.nickname}` : '/coding/workspace'

  return (
    <div className="min-h-screen bg-se-background font-sans text-se-text-main antialiased selection:bg-se-primary/20">
      {/* Nav — โปร่งแสง + blur แบบ apple.com */}
      <nav className="sticky top-0 z-50 border-b border-se-border/60 bg-se-background/75 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-6">
          <Link to="/" className={`flex items-center gap-2.5 rounded-lg ${focusRing}`}>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500">
              <Icon d={CODE_ICON} className="h-4 w-4 text-white" strokeWidth={2} />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">CODING STUDIO</span>
          </Link>

          <Link
            to="/"
            className={`rounded-lg text-sm text-se-text-muted transition-colors hover:text-se-text-main ${focusRing}`}
          >
            กลับสู่ SE-ONE Portal
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="mx-auto max-w-4xl px-6 pb-16 pt-20 text-center md:pt-28">
        <p className="mb-5 font-mono text-base font-medium text-se-text-muted md:text-lg">
          &gt; console.log(&quot;Ready to code&quot;);
        </p>

        <h1 className="text-5xl font-semibold leading-[1.2] tracking-tight md:text-7xl md:leading-[1.15]">
          ยกระดับทักษะการเขียนโค้ด
          <br />
          ด้วย Workspace ส่วนตัว
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-se-text-muted md:text-2xl md:leading-relaxed">
          IDE ออนไลน์สำหรับนักศึกษาวิศวกรรมซอฟต์แวร์ ฝึกแก้โจทย์อัลกอริทึม ทดสอบโค้ดแบบเรียลไทม์
          และแชร์ผลงานของคุณ
        </p>

        <div className="mt-10 flex justify-center">
          {session ? (
            <Link
              to={workspacePath}
              className={`rounded-full bg-se-primary px-7 py-3 text-[17px] font-medium text-white transition-colors hover:bg-se-primary-hover ${focusRing}`}
            >
              เปิด Workspace
            </Link>
          ) : (
            <Link
              to="/sework/login"
              className={`rounded-full bg-se-primary px-7 py-3 text-[17px] font-medium text-white transition-colors hover:bg-se-primary-hover ${focusRing}`}
            >
              เข้าสู่ระบบด้วย SE-ONE
            </Link>
          )}
        </div>
      </main>

      {/* Code editor mockup (ตกแต่งเท่านั้น) */}
      <div className="mx-auto max-w-4xl px-6 pb-16" aria-hidden="true">
        <div className="overflow-hidden rounded-[22px] bg-[#1e1e1e] text-left font-mono text-[13px] leading-6 shadow-[0_30px_80px_rgba(0,0,0,0.25)] ring-1 ring-black/10 md:text-sm md:leading-7">
          {/* Title bar */}
          <div className="relative flex h-11 items-center bg-[#323233] px-4">
            <div className="flex gap-2">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]"></span>
              <span className="h-3 w-3 rounded-full bg-[#febc2e]"></span>
              <span className="h-3 w-3 rounded-full bg-[#28c840]"></span>
            </div>
            <span className="absolute inset-x-0 text-center font-sans text-xs text-[#9d9d9d]">main.js — Sandbox</span>
          </div>

          {/* Tab */}
          <div className="flex bg-[#252526] font-sans text-xs">
            <div className="flex items-center gap-2 border-t border-t-[#0078d4] bg-[#1e1e1e] px-4 py-2 text-[#ffffff]">
              <span className="font-semibold text-[#f1dd3f]">JS</span>
              main.js
            </div>
          </div>

          {/* Code */}
          <div className="flex overflow-x-auto px-2 py-4 md:px-4">
            <div className="select-none pr-4 text-right text-[#858585]">
              {codeLines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <pre className="m-0 flex-1">
              {codeLines.map((line, i) => (
                <div key={i} className="whitespace-pre">
                  {line.map(([color, text], j) => (
                    <span key={j} className={color}>
                      {text}
                    </span>
                  ))}
                  {i === codeLines.length - 1 && (
                    <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-[#aeafad]"></span>
                  )}
                </div>
              ))}
            </pre>
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between bg-[#007acc] px-3 py-1 font-sans text-[11px] text-white">
            <span>SE-ONE</span>
            <span>JavaScript</span>
          </div>
        </div>
      </div>

      {/* Supported languages */}
      <section className="mx-auto max-w-4xl px-6 pb-20 text-center">
        <p className="text-lg font-semibold text-se-text-muted">รองรับ {languages.length} ภาษา</p>
        <ul className="mt-5 flex flex-wrap justify-center gap-2.5">
          {languages.map((lang) => (
            <li
              key={lang}
              className="rounded-full bg-se-surface px-4 py-1.5 text-[15px] font-medium ring-1 ring-se-border/70"
            >
              {lang}
            </li>
          ))}
        </ul>
      </section>

      {/* Highlights */}
      <section className="mx-auto max-w-5xl px-6 pb-28">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {highlights.map((item) => (
            <article key={item.title} className="rounded-[28px] bg-se-surface p-8">
              <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-full bg-se-primary/10 text-se-primary">
                <Icon d={item.icon} />
              </div>
              <h3 className="text-xl font-semibold tracking-tight">{item.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-se-text-muted">{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}