import { useEffect } from 'react'
import { Link } from 'react-router-dom'

/*
  Landing — Apple.com style
  สีทั้งหมดอ้างอิงจาก design tokens (--color-se-*) ไม่ hardcode สี
  เมื่อทำ Dark Mode แค่ override ค่าตัวแปรเหล่านี้ได้เลย ไม่ต้องแก้ไฟล์นี้
*/

const features = [
  {
    title: 'Academic Core',
    description: 'จัดการรายวิชา ตารางเรียน และเอกสารประกอบการเรียนได้อย่างเป็นระบบในที่เดียว',
    icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
  },
  {
    title: 'Submission Tracking',
    description: 'ติดตามสถานะการส่งงาน เช็คชื่อ และตรวจสอบความคืบหน้าของตัวเองแบบเรียลไทม์',
    icon: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM8 12.5l2.5 2.5L16 9.5',
  },
  {
    title: 'Leaderboard',
    description: 'กระดานผู้นำพร้อมระบบ XP (Gamification) เพิ่มแรงจูงใจในการเรียนและการส่งงาน',
    icon: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3',
  },
  {
    title: 'Community',
    description: 'สมุดรายชื่อเพื่อนร่วมรุ่นพร้อมช่องทางการติดต่อ รวบรวมไว้ให้ง่ายต่อการทำงานกลุ่ม',
    icon: 'M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M13 7a4 4 0 11-8 0 4 4 0 018 0zM21 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  },
]

const focusRing =
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-se-primary/30'

export default function LandingPage() {
  useEffect(() => {
    document.title = 'SE-CONSOLE | ระบบบริหารจัดการการศึกษา'
  }, [])

  return (
    <div className="min-h-screen bg-se-background text-se-text-main antialiased selection:bg-se-primary/20">
      {/* Global Nav — โปร่งแสง + blur แบบ apple.com */}
      <nav className="sticky top-0 z-50 border-b border-se-border/60 bg-se-background/75 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-6">
          <Link to="/sework/landing" className={`flex items-center gap-2.5 rounded-lg ${focusRing}`}>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black">
              <img src="/logo.png" alt="" className="h-5 w-5 object-contain" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">SE-CONSOLE</span>
          </Link>

          <Link
            to="/sework/login"
            className={`rounded-full bg-se-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-se-primary-hover ${focusRing}`}
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="mx-auto max-w-4xl px-6 pb-28 pt-24 text-center md:pt-32">
        <p className="mb-5 text-lg font-semibold text-se-text-muted md:text-xl">SEWORK Platform V.1</p>

        <h1 className="text-5xl font-semibold leading-[1.2] tracking-tight md:text-7xl md:leading-[1.15]">
          บริหารจัดการการศึกษา
          <br className="hidden md:block" />
          อย่างเหนือระดับ
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-se-text-muted md:text-2xl md:leading-relaxed">
          ศูนย์กลางสำหรับนักศึกษาวิศวกรรมซอฟต์แวร์ รวมรายวิชา งานที่มอบหมาย
          และสมุดรายชื่อเพื่อนไว้ในที่เดียว
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
          <Link
            to="/sework/login"
            className={`rounded-full bg-se-primary px-7 py-3 text-[17px] font-medium text-white transition-colors hover:bg-se-primary-hover ${focusRing}`}
          >
            เข้าสู่ระบบ
          </Link>

          <a
            href="#features"
            className={`group inline-flex items-center gap-1 rounded-full text-[17px] font-medium text-se-primary ${focusRing}`}
          >
            <span className="group-hover:underline">ดูฟีเจอร์ทั้งหมด</span>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </main>

      {/* Features — tile ขนาดใหญ่แบบ apple.com */}
      <section id="features" className="mx-auto max-w-5xl scroll-mt-16 px-6 pb-28">
        <div className="mb-14 text-center">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            ฟีเจอร์ที่ตอบโจทย์ทุกการใช้งาน
          </h2>
          <p className="mt-4 text-xl text-se-text-muted">
            ออกแบบมาเพื่อลดความซับซ้อน และเพิ่มประสิทธิภาพในการเรียน
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="flex min-h-[300px] flex-col justify-between rounded-[28px] bg-se-surface p-8 md:p-10"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-se-primary/10 text-se-primary">
                <svg
                  className="h-7 w-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={feature.icon} />
                </svg>
              </div>

              <div>
                <h3 className="text-2xl font-semibold tracking-tight">{feature.title}</h3>
                <p className="mt-2 text-[17px] leading-relaxed text-se-text-muted">{feature.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-se-border/60">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-se-text-muted md:flex-row">
          <span className="font-semibold">SE-CONSOLE</span>
          <p>© {new Date().getFullYear()} Software Engineering Console. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}