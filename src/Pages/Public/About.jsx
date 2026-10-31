import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const modules = [
  {
    name: 'Talents',
    tag: 'ระบบแนะนำสมาชิก',
    desc: 'รู้จักเพื่อนร่วมรุ่น ทักษะ และความสามารถของแต่ละคน เพื่อจับคู่ทำงานได้ตรงจุด',
    to: '/talents',
    gradient: 'from-[#b794ff] via-[#8b5cf6] to-[#6d28d9]',
    icon: (
      <path d="M17 20h5v-2a4 4 0 00-5.356-3.772M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a4 4 0 015.356-3.772M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    ),
  },
  {
    name: 'SEWORK',
    tag: 'จัดการการเรียนการสอน',
    desc: 'ส่งงาน ติดตามงาน และจัดการรายวิชาไว้ในที่เดียว ไม่ตกหล่นทุกกำหนดส่ง',
    to: '/sework/landing',
    gradient: 'from-[#5ab0ff] via-[#2b8cf0] to-[#0058c4]',
    icon: (
      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    ),
  },
  {
    name: 'CLOUDFILES',
    tag: 'จัดเก็บและแบ่งปันไฟล์',
    desc: 'เก็บเอกสารและงานของรุ่น แชร์ให้เพื่อนได้ทันที เปิดได้จากทุกที่',
    to: '/cloudfiles/landing',
    gradient: 'from-[#ffb08f] via-[#ff7a4d] to-[#ee4b22]',
    icon: <path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />,
  },
  {
    name: 'CODING',
    tag: 'พื้นที่ฝึกเขียนโปรแกรม',
    desc: 'เขียน รัน และทดลองโค้ดได้ในเบราว์เซอร์ ฝึกฝนทักษะได้ทุกเวลา',
    to: '/coding/landing',
    gradient: 'from-[#7bf0ad] via-[#2fc96d] to-[#119447]',
    icon: <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />,
  },
]

const stats = [
  { value: '4', label: 'โมดูลในแพลตฟอร์มเดียว' },
  { value: '69/4', label: 'รุ่นที่ 69 Generation 4' },
  { value: 'RMUTL', label: 'ม.เทคโนโลยีราชมงคลล้านนา' },
]

/* ------------------------------------------------------------------ */
/*  Reveal on scroll                                                   */
/* ------------------------------------------------------------------ */
function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || !('IntersectionObserver' in window)) {
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
      className={`transition-all duration-[900ms] ease-[cubic-bezier(.28,.11,.32,1)] ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function About() {
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    document.title = 'About | SE-ONE'
  }, [])

  return (
    <div className="w-full flex-grow bg-[#fbfbfd] text-[#1d1d1f]">
      <style>{`
        @keyframes se-float { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(0,-24px,0) scale(1.06); } }
        @keyframes se-hero { from { opacity: 0; transform: translateY(22px); filter: blur(6px); } to { opacity: 1; transform: none; filter: blur(0); } }
        .se-float { animation: se-float 14s ease-in-out infinite; }
        .se-hero { opacity: 0; animation: se-hero 1s cubic-bezier(.28,.11,.32,1) forwards; }
        @media (prefers-reduced-motion: reduce) { .se-float { animation: none; } .se-hero { animation: none; opacity: 1; } }
      `}</style>

      {/* ============================ HERO ============================ */}
      <section className="relative overflow-hidden">
        {/* soft light blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="se-float absolute -left-24 top-10 h-[340px] w-[340px] rounded-full bg-[#7dbdff]/40 blur-[90px]" />
          <div className="se-float absolute -right-20 top-24 h-[380px] w-[380px] rounded-full bg-[#c4a6ff]/40 blur-[100px]" style={{ animationDelay: '-5s' }} />
          <div className="se-float absolute bottom-0 left-1/2 h-[280px] w-[420px] -translate-x-1/2 rounded-full bg-[#ffc2a8]/30 blur-[100px]" style={{ animationDelay: '-9s' }} />
        </div>

        <div className="relative mx-auto max-w-[1024px] px-5 pb-24 pt-24 text-center md:pb-36 md:pt-36">
          <p className="se-hero text-[17px] font-semibold text-[#6e6e73] md:text-[21px]">About Us</p>
          <h1
            className="se-hero mt-3 text-[48px] font-semibold leading-[1.05] tracking-[-0.045em] sm:text-[72px] md:text-[96px]"
            style={{ animationDelay: '100ms' }}
          >
            รวมทุกอย่าง
            <br />
            <span className="bg-gradient-to-r from-[#0071e3] via-[#5e5ce6] to-[#bf5af2] bg-clip-text text-transparent">
              ไว้ที่เดียว.
            </span>
          </h1>
          <p
            className="se-hero mx-auto mt-6 max-w-[640px] text-[19px] font-medium leading-[1.5] tracking-[-0.01em] text-[#6e6e73] md:text-[24px]"
            style={{ animationDelay: '220ms' }}
          >
            จุดเริ่มต้นและผู้พัฒนาเบื้องหลังแพลตฟอร์ม
            <br className="hidden sm:block" />
            สำหรับนักศึกษาวิศวกรรมซอฟต์แวร์ RMUTL
          </p>
          <div className="se-hero mt-9 flex flex-wrap items-center justify-center gap-4" style={{ animationDelay: '340ms' }}>
            <a
              href="#modules"
              className="rounded-full bg-[#0071e3] px-6 py-3 text-[17px] text-white transition hover:bg-[#0077ed] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/40"
            >
              ดูโมดูลทั้งหมด
            </a>
            <a
              href="#developer"
              className="rounded-full px-4 py-3 text-[17px] text-[#0066cc] transition hover:underline underline-offset-4 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/40"
            >
              รู้จักผู้พัฒนา <span aria-hidden>›</span>
            </a>
          </div>
        </div>
      </section>

      {/* ============================ PURPOSE ============================ */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1024px] px-5 py-24 md:py-36">
          <Reveal>
            <h2 className="mx-auto max-w-[820px] text-center text-[34px] font-semibold leading-[1.15] tracking-[-0.035em] md:text-[56px]">
              แพลตฟอร์มเดียว
              <br />
              สำหรับทุกการเรียนรู้.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="mx-auto mt-8 max-w-[760px] text-center text-[18px] leading-[1.8] text-[#6e6e73] md:text-[21px]">
              SE-ONE.SITE Project Development ถูกสร้างขึ้นเพื่อเป็นแพลตฟอร์มศูนย์รวมสำหรับนักศึกษาวิชาวิศวกรรมซอฟต์แวร์
              มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา (RMUTL) รุ่นที่ 69 Generation 4
              โดยผสานรวมระบบแนะนำสมาชิก จัดการการเรียนการสอน จัดเก็บและแบ่งปันไฟล์
              และพื้นที่ฝึกเขียนโปรแกรมเข้าไว้ด้วยกัน
              เพื่อยกระดับประสบการณ์การเรียนรู้และการทำงานร่วมกันอย่างมีประสิทธิภาพ
            </p>
          </Reveal>

          <Reveal delay={200}>
            <dl className="mt-16 grid grid-cols-1 gap-8 border-t border-black/[0.08] pt-12 text-center sm:grid-cols-3">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="bg-gradient-to-b from-[#1d1d1f] to-[#6e6e73] bg-clip-text text-[44px] font-semibold leading-none tracking-[-0.04em] text-transparent md:text-[56px]">
                    {s.value}
                  </dt>
                  <dd className="mt-3 text-[15px] text-[#6e6e73]">{s.label}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* ============================ MODULES ============================ */}
      <section id="modules" className="scroll-mt-16 bg-[#f5f5f7]">
        <div className="mx-auto max-w-[1024px] px-5 py-24 md:py-32">
          <Reveal>
            <h2 className="text-center text-[34px] font-semibold leading-[1.15] tracking-[-0.035em] md:text-[56px]">
              สี่โมดูล. หนึ่งบัญชี.
            </h2>
            <p className="mx-auto mt-4 max-w-[560px] text-center text-[19px] leading-[1.5] text-[#6e6e73] md:text-[21px]">
              เลือกเปิดใช้งานแต่ละส่วนได้ทันที
            </p>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2">
            {modules.map((m, i) => (
              <Reveal key={m.name} delay={i * 90}>
                <Link
                  to={m.to}
                  className={`group relative flex min-h-[320px] flex-col justify-end overflow-hidden rounded-[32px] bg-gradient-to-br ${m.gradient} p-8 text-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)] transition-transform duration-700 ease-[cubic-bezier(.28,.11,.32,1)] hover:scale-[1.015] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/50 md:min-h-[380px] md:p-10`}
                >
                  {/* oversized icon watermark */}
                  <svg
                    aria-hidden
                    className="absolute -right-8 -top-8 h-[260px] w-[260px] text-white/20 transition-transform duration-700 group-hover:rotate-6 group-hover:scale-110"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="0.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {m.icon}
                  </svg>
                  {/* glass icon tile */}
                  <div className="absolute left-8 top-8 flex h-14 w-14 items-center justify-center rounded-[18px] bg-white/20 ring-1 ring-white/40 backdrop-blur-md md:left-10 md:top-10">
                    <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      {m.icon}
                    </svg>
                  </div>

                  <p className="relative text-[15px] font-medium text-white/85">{m.tag}</p>
                  <h3 className="relative mt-1 text-[32px] font-semibold tracking-[-0.03em] md:text-[40px]">{m.name}</h3>
                  <p className="relative mt-3 max-w-[380px] text-[16px] leading-[1.6] text-white/90">{m.desc}</p>
                  <span className="relative mt-6 inline-flex w-fit items-center rounded-full bg-white px-5 py-2 text-[15px] font-medium text-[#1d1d1f] transition group-hover:bg-white/90">
                    เปิดดู <span aria-hidden className="ml-1">›</span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ DEVELOPER ============================ */}
      <section id="developer" className="relative scroll-mt-16 overflow-hidden bg-black text-[#f5f5f7]">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-1/4 h-[420px] w-[420px] rounded-full bg-[#0071e3]/30 blur-[120px]" />
          <div className="absolute -right-24 bottom-0 h-[380px] w-[380px] rounded-full bg-[#7c3aed]/30 blur-[120px]" />
        </div>

        <div className="relative mx-auto grid max-w-[1024px] items-center gap-14 px-5 py-24 md:grid-cols-[minmax(0,420px)_1fr] md:gap-16 md:py-36">
          {/* Photo */}
          <Reveal>
            <div className="relative mx-auto w-full max-w-[380px] md:max-w-none">
              <div aria-hidden className="absolute -inset-4 rounded-[44px] bg-gradient-to-br from-[#0071e3] to-[#bf5af2] opacity-50 blur-2xl" />
              <div className="relative aspect-[4/5] overflow-hidden rounded-[36px] bg-gradient-to-br from-[#0071e3] to-[#7c3aed] ring-1 ring-white/20 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
                {imgFailed ? (
                  <div className="flex h-full w-full items-center justify-center text-[96px] font-semibold tracking-[-0.04em] text-white">IS</div>
                ) : (
                  <img
                    src="/Developer.JPEG"
                    alt="Pattaradanai Saiwongkham"
                    className="h-full w-full object-cover object-top"
                    loading="lazy"
                    onError={() => setImgFailed(true)}
                  />
                )}
              </div>
            </div>
          </Reveal>

          {/* Info */}
          <Reveal delay={150}>
            <div>
              <p className="text-[17px] font-semibold text-[#86868b]">ผู้อยู่เบื้องหลัง</p>
              <h2 className="mt-2 text-[36px] font-semibold leading-[1.1] tracking-[-0.035em] md:text-[56px]">
                Pattaradanai
                <br />
                Saiwongkham
              </h2>
              <p className="mt-4 text-[21px] font-medium tracking-[-0.01em] text-white">InfiniteStack Corp.</p>
              <p className="mt-1 text-[17px] leading-[1.6] text-[#a1a1a6]">
                Full-Stack Developer
                <br />
                Student Software Engineering RMUTL 69 Generation 4, SEC 2
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {['Full-Stack', 'RMUTL 69/4', 'SEC 2'].map((c) => (
                  <span key={c} className="rounded-full bg-white/10 px-4 py-1.5 text-[14px] text-[#d2d2d7] ring-1 ring-white/10 backdrop-blur">
                    {c}
                  </span>
                ))}
              </div>

              <a
                href="https://github.com/pattaradanais151"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-9 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[17px] font-medium text-[#1d1d1f] transition hover:bg-[#e8e8ed] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 015.78 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0023.5 12C23.5 5.65 18.35.5 12 .5z" />
                </svg>
                GitHub
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================ CONTACT ============================ */}
      <section className="bg-[#fbfbfd]">
        <Reveal>
          <div className="mx-auto max-w-[1024px] px-5 py-20 text-center md:py-28">
            <h2 className="text-[28px] font-semibold leading-[1.2] tracking-[-0.03em] md:text-[40px]">มีคำถามหรือข้อเสนอแนะ?</h2>
            <p className="mt-3 text-[17px] text-[#6e6e73] md:text-[19px]">ทีมงานพร้อมรับฟังทุกความคิดเห็นเพื่อพัฒนาแพลตฟอร์มให้ดียิ่งขึ้น</p>
            <Link
              to="/support"
              className="mt-8 inline-flex items-center rounded-full bg-[#0071e3] px-6 py-3 text-[17px] text-white transition hover:bg-[#0077ed] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/40"
            >
              ติดต่อทีมงาน <span aria-hidden className="ml-1">›</span>
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  )
}