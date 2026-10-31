import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Global, css, keyframes } from '@emotion/react'
import styled from '@emotion/styled'
import Navbar from './Navbar'

const LOGO_SRC = '/logo.png'

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Noto Sans Thai", "Sarabun", Arial, sans-serif'

const pageIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

// สไตล์ global ผ่าน Emotion
const globalStyles = css`
  /* ปิดการคลุมดำด้วย CSS (เว้นช่องกรอกข้อมูล) */
  html.se-protected body,
  html.se-protected body *:not(input):not(textarea):not(select):not([contenteditable='true']):not([data-allow-copy]) {
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }
  html.se-protected img {
    -webkit-user-drag: none;
    user-drag: none;
  }
  html {
    -webkit-tap-highlight-color: transparent;
    scroll-behavior: smooth;
    scroll-padding-top: 64px; /* เผื่อความสูง Navbar เวลากดลิงก์ #anchor */
    text-rendering: optimizeLegibility;
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

// เฟดเนื้อหาเบา ๆ ทุกครั้งที่เปลี่ยนหน้า
const PageMain = styled.main`
  animation: ${pageIn} 0.5s cubic-bezier(0.28, 0.11, 0.32, 1) both;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const footerGroups = [
  {
    title: 'แพลตฟอร์ม',
    links: [
      { to: '/talents', label: 'Talents' },
      { to: '/sework/landing', label: 'SEWORK' },
      { to: '/cloudfiles/landing', label: 'CLOUDFILES' },
      { to: '/coding/landing', label: 'CODING' },
    ],
  },
  {
    title: 'โครงการ',
    links: [
      { to: '/about', label: 'About' },
      { to: '/support', label: 'Support' },
      { to: '/legal-center', label: 'Legal' },
    ],
  },
]

const footerLink =
  'rounded transition-colors hover:text-[#1d1d1f] hover:underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]'

export default function MainLayout() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 })
  }, [pathname])

  return (
    <div
      className="flex min-h-screen flex-col bg-white text-[#1d1d1f] antialiased"
      style={{ fontFamily: FONT_STACK }}
    >
      <Global styles={globalStyles} />

      {/* Skip link สำหรับคีย์บอร์ดและ screen reader */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-[#0071e3] focus:px-4 focus:py-2 focus:text-[14px] focus:text-white focus:outline-none"
      >
        ข้ามไปยังเนื้อหา
      </a>

      <Navbar />

      <PageMain id="main" tabIndex={-1} key={pathname} className="flex flex-grow flex-col focus:outline-none">
        <Outlet />
      </PageMain>

      {/* ---------- Footer ---------- */}
      <footer className="mt-auto bg-[#f5f5f7] text-[12px] leading-[1.6] text-[#6e6e73]">
        <div className="mx-auto max-w-[1024px] px-5">
          <div className="grid gap-10 border-b border-black/[0.1] py-12 md:grid-cols-[1.6fr_1fr_1fr] md:gap-12">
            {/* Brand */}
            <div>
              <Link
                to="/"
                aria-label="SE-ONE หน้าแรก"
                className="inline-flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f5f5f7]"
              >
                <img
                  src={LOGO_SRC}
                  alt=""
                  width={28}
                  height={28}
                  draggable={false}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                  className="h-7 w-7 rounded-[8px] object-contain"
                />
                <span className="text-[19px] font-semibold tracking-[-0.03em] text-[#1d1d1f]">SE-ONE</span>
              </Link>
              <p className="mt-4 max-w-[380px] text-[13px] leading-[1.7]">
                แพลตฟอร์มศูนย์รวมสำหรับนักศึกษาวิศวกรรมซอฟต์แวร์ RMUTL 69 รุ่นที่ 4
                ผสานระบบจัดการเรียนการสอน จัดเก็บไฟล์ และพื้นที่ฝึกเขียนโปรแกรมไว้ในที่เดียว
              </p>
            </div>

            {/* Link groups */}
            {footerGroups.map((g) => (
              <nav key={g.title} aria-label={g.title}>
                <h2 className="text-[12px] font-semibold text-[#1d1d1f]">{g.title}</h2>
                <ul className="mt-3 space-y-2.5">
                  {g.links.map((l) => (
                    <li key={l.to}>
                      <Link to={l.to} className={footerLink}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col gap-1 py-5 md:flex-row md:items-center md:justify-between">
            <p>&copy; {new Date().getFullYear()} InfiniteStack Corp. — SE-ONE.SITE Project Development.</p>
            <p>Developed by Pattaradanai Saiwongkham.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}