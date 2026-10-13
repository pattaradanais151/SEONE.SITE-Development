import { useEffect } from 'react'
import { Link } from 'react-router-dom'

const modules = [
  {
    name: 'Talents',
    desc: 'ระบบแนะนำสมาชิก',
    to: '/talents',
    gradient: 'from-[#c4a6ff] to-[#7c3aed]',
    icon: (
      <path d="M17 20h5v-2a4 4 0 00-5.356-3.772M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a4 4 0 015.356-3.772M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    ),
  },
  {
    name: 'SEWORK',
    desc: 'จัดการการเรียนการสอน',
    to: '/sework/landing',
    gradient: 'from-[#5ab0ff] to-[#0071e3]',
    icon: (
      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    ),
  },
  {
    name: 'CLOUDFILES',
    desc: 'จัดเก็บและแบ่งปันไฟล์',
    to: '/cloudfiles/landing',
    gradient: 'from-[#ff9f7a] to-[#ff5a36]',
    icon: <path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />,
  },
  {
    name: 'CODING',
    desc: 'พื้นที่ฝึกเขียนโปรแกรม',
    to: '/coding/landing',
    gradient: 'from-[#6bea9f] to-[#1fb45a]',
    icon: <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />,
  },
]

export default function About() {
  useEffect(() => {
    document.title = 'About | SE-ONE'
  }, [])

  return (
    <div className="w-full flex-grow bg-[#f5f5f7]">
      <style>{`
        @keyframes se-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        .se-rise { opacity: 0; animation: se-rise .85s cubic-bezier(.28,.11,.32,1) forwards; }
        @media (prefers-reduced-motion: reduce) { .se-rise { animation: none; opacity: 1; } }
      `}</style>

      {/* Hero */}
      <section className="bg-[#fbfbfd]">
        <div className="mx-auto max-w-[1024px] px-5 pb-16 pt-20 text-center md:pb-24 md:pt-28">
          <p className="se-rise mb-4 text-[17px] font-semibold text-[#6e6e73] md:text-[21px]">About</p>
          <h1
            className="se-rise text-[44px] font-semibold leading-[1.08] tracking-[-0.04em] sm:text-[64px] md:text-[80px]"
            style={{ animationDelay: '80ms' }}
          >
            About the{' '}
            <span className="bg-gradient-to-r from-[#0071e3] to-[#5e5ce6] bg-clip-text text-transparent">Project</span>
          </h1>
          <p
            className="se-rise mx-auto mt-5 max-w-[640px] text-[19px] font-medium leading-[1.5] tracking-[-0.01em] text-[#6e6e73] md:text-[24px]"
            style={{ animationDelay: '160ms' }}
          >
            จุดเริ่มต้นและผู้พัฒนาผู้อยู่เบื้องหลังแพลตฟอร์ม SE-ONE.SITE
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1024px] space-y-5 px-5 py-12 md:py-20">
        {/* Purpose */}
        <section
          className="se-rise rounded-[28px] bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] md:p-14"
          style={{ animationDelay: '220ms' }}
        >
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0071e3]">Purpose</p>
          <h2 className="mt-2 text-[28px] font-semibold leading-[1.25] tracking-[-0.025em] md:text-[40px]">
            แพลตฟอร์มเดียว สำหรับทุกการเรียนรู้.
          </h2>
          <p className="mt-6 text-[17px] leading-[1.75] text-[#6e6e73] md:text-[19px]">
            SE-ONE.SITE Project Development ถูกสร้างขึ้นเพื่อเป็นแพลตฟอร์มศูนย์รวมสำหรับนักศึกษาวิชาวิศวกรรมซอฟต์แวร์
            มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา (RMUTL) รุ่นที่ 69 Generation 4
            โดยผสานรวมระบบแนะนำสมาชิก จัดการการเรียนการสอน (SEWORK) จัดเก็บและแบ่งปันไฟล์ (CLOUDFILES)
            และพื้นที่ฝึกเขียนโปรแกรม (CODING) เข้าไว้ด้วยกัน
            เพื่อยกระดับประสบการณ์การเรียนรู้และการทำงานร่วมกันอย่างมีประสิทธิภาพ
          </p>
        </section>

        {/* Modules */}
        <section className="grid grid-cols-2 gap-5 md:grid-cols-4">
          {modules.map((m, i) => (
            <Link
              key={m.name}
              to={m.to}
              className="se-rise group flex flex-col rounded-[24px] bg-white p-6 ring-1 ring-black/[0.04] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(0,0,0,0.10)]"
              style={{ animationDelay: `${300 + i * 70}ms` }}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-[14px] bg-gradient-to-br ${m.gradient} shadow-[0_6px_16px_rgba(0,0,0,0.12)]`}>
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  {m.icon}
                </svg>
              </div>
              <p className="mt-5 text-[17px] font-semibold tracking-[-0.01em]">{m.name}</p>
              <p className="mt-1 text-[14px] leading-[1.5] text-[#6e6e73]">{m.desc}</p>
              <span className="mt-4 text-[14px] text-[#0066cc] group-hover:underline underline-offset-4">
                เปิดดู <span aria-hidden>›</span>
              </span>
            </Link>
          ))}
        </section>

        {/* Developer */}
        <section
          className="se-rise rounded-[28px] bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] md:p-14"
          style={{ animationDelay: '600ms' }}
        >
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0071e3]">Developer &amp; Organization</p>
          <h2 className="mt-2 text-[28px] font-semibold leading-[1.25] tracking-[-0.025em] md:text-[40px]">
            ผู้อยู่เบื้องหลัง.
          </h2>

          <div className="mt-8 flex flex-col items-start gap-6 md:flex-row md:items-center">
            <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0071e3] to-[#7c3aed] text-[32px] font-semibold text-white shadow-[0_12px_30px_rgba(94,92,230,0.35)]">
              IS
            </div>
            <div>
              <h3 className="text-[24px] font-semibold tracking-[-0.02em]">Cr.Pattaradanai Saiwongkham</h3>
              <p className="mt-1 text-[17px] font-medium">InfiniteStack Corp.</p>
              <p className="mt-1 text-[15px] text-[#6e6e73]">Full-Stack Developer</p>
              <p className="text-[15px] text-[#6e6e73]">
                Student Software Engineering RMUTL 69 Generation 4, SEC 2
              </p>
              <a
                href="https://github.com/pattaradanais151"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-[15px] text-[#0066cc] underline-offset-4 hover:underline"
              >
                GitHub <span aria-hidden>›</span>
              </a>
            </div>
          </div>
        </section>

        <p className="pt-4 text-center text-[15px] text-[#6e6e73]">
          มีคำถามหรือข้อเสนอแนะ?{' '}
          <Link to="/support" className="text-[#0066cc] underline-offset-4 hover:underline">
            ติดต่อทีมงาน <span aria-hidden>›</span>
          </Link>
        </p>
      </div>
    </div>
  )
}