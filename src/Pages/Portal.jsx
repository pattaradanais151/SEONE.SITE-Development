import { useEffect } from 'react'
import { Link } from 'react-router-dom'

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Noto Sans Thai", "Sarabun", Arial, sans-serif'

const apps = [
  {
    id: 'sework',
    eyebrow: 'การศึกษา',
    title: 'SE-CONSOLE',
    description:
      'ระบบบริหารจัดการการศึกษาและส่งงานสำหรับนักศึกษาวิศวกรรมซอฟต์แวร์',
    path: '/sework/landing',
    gradient: 'from-[#4facfe] to-[#0071e3]',
    icon: (
      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    id: 'coding',
    eyebrow: 'นักพัฒนา',
    title: 'CODING STUDIO',
    description:
      'แพลตฟอร์มสำหรับฝึกเขียนโค้ด ทำโจทย์อัลกอริทึม และแชร์โค้ดร่วมกัน',
    path: '/coding/landing',
    gradient: 'from-[#5ee7a0] to-[#1fb45a]',
    icon: (
      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  {
    id: 'cloudfiles',
    eyebrow: 'จัดเก็บไฟล์',
    title: 'CLOUDFILES',
    description:
      'พื้นที่จัดเก็บไฟล์ส่วนตัวบนคลาวด์ ซิงค์และแชร์เอกสารได้อย่างปลอดภัย',
    path: '/cloudfiles/login',
    gradient: 'from-[#ff8a9b] to-[#ff2d55]',
    icon: (
      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
  },
]

export default function Portal() {
  useEffect(() => {
    document.title = 'SE-ONE | Ecosystem Portal'
  }, [])

  return (
    <div
      className="w-full flex-grow bg-[#fbfbfd] text-[#1d1d1f] antialiased"
      style={{ fontFamily: FONT_STACK }}
    >
      {/* keyframes สำหรับ fade-up (เคารพ reduced-motion) */}
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

      <main className="mx-auto w-full max-w-[1120px] px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        {/* Hero */}
        <section className="flex flex-col items-center text-center">
          <div
            className="se-fade-up w-[72px] h-[72px] rounded-[20px] bg-white flex items-center justify-center shadow-[0_2px_16px_rgba(0,0,0,0.08)] ring-1 ring-black/5 mb-8"
            style={{ animationDelay: '0ms' }}
          >
            <img src="/logo.png" alt="SE-ONE Logo" className="w-10 h-10 object-contain" />
          </div>

          <p
            className="se-fade-up text-[15px] md:text-[17px] font-semibold text-[#6e6e73] mb-3"
            style={{ animationDelay: '80ms' }}
          >
            SE-ONE Ecosystem
          </p>

          <h1
            className="se-fade-up text-[44px] leading-[1.05] md:text-[80px] font-semibold tracking-[-0.035em]"
            style={{ animationDelay: '140ms' }}
          >
            Welcome to{' '}
            <span className="bg-gradient-to-r from-[#0071e3] to-[#5e5ce6] bg-clip-text text-transparent">
              SE-ONE
            </span>
          </h1>

          <p
            className="se-fade-up mt-5 md:mt-6 max-w-[640px] text-[19px] md:text-[24px] leading-[1.4] font-medium text-[#6e6e73] tracking-[-0.01em]"
            style={{ animationDelay: '220ms' }}
          >
            เลือกแอปพลิเคชันที่คุณต้องการเข้าใช้งานจาก Ecosystem ของเรา
          </p>
        </section>

        {/* Cards */}
        <section className="mt-16 md:mt-24 grid grid-cols-1 md:grid-cols-3 gap-5">
          {apps.map((app, i) => (
            <Link
              key={app.id}
              to={app.path}
              className="se-fade-up group relative flex flex-col min-h-[320px] rounded-[28px] bg-[#f5f5f7] p-8 transition-all duration-500 ease-[cubic-bezier(.28,.11,.32,1)] hover:bg-white hover:-translate-y-1 hover:shadow-[0_12px_48px_rgba(0,0,0,0.10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0071e3]"
              style={{ animationDelay: `${300 + i * 90}ms` }}
            >
              <div
                className={`w-14 h-14 rounded-[16px] bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-[0_6px_16px_rgba(0,0,0,0.12)]`}
              >
                {app.icon}
              </div>

              <p className="mt-8 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">
                {app.eyebrow}
              </p>
              <h2 className="mt-1 text-[26px] leading-tight font-semibold tracking-[-0.02em]">
                {app.title}
              </h2>
              <p className="mt-3 text-[15px] leading-[1.55] text-[#6e6e73]">
                {app.description}
              </p>

              <span className="mt-auto pt-8 inline-flex items-center gap-1 text-[15px] font-medium text-[#0066cc] group-hover:underline underline-offset-4">
                เข้าใช้งาน
                <svg
                  className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          ))}
        </section>

        {/* Powered by */}
        <p className="mt-16 text-center text-[12px] font-medium tracking-[0.12em] uppercase text-[#86868b]">
          Powered by SE-ONE Ecosystem
        </p>
      </main>
    </div>
  )
}