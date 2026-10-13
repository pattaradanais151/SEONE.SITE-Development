import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Global, css } from '@emotion/react'
import Navbar from './Navbar'
import Logo from './Logo'

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Noto Sans Thai", "Sarabun", Arial, sans-serif'

// สไตล์ global ผ่าน Emotion (แทนแท็ก <style> เดิม)
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
  }
  @media (prefers-reduced-motion: reduce) {
    html {
      scroll-behavior: auto;
    }
  }
`

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

      <Navbar />

      <main className="flex flex-grow flex-col">
        <Outlet />
      </main>

      {/* Apple-style Footer */}
      <footer className="mt-auto bg-[#f5f5f7] text-[12px] leading-[1.6] text-[#6e6e73]">
        <div className="mx-auto max-w-[1024px] px-5">
          <div className="flex flex-col gap-3 border-b border-black/[0.12] py-5">
            <Link to="/" aria-label="SE-ONE หน้าแรก" className="w-fit">
              <Logo size={24} />
            </Link>
            <p>
              SE-ONE แพลตฟอร์มศูนย์รวมสำหรับนักศึกษาวิศวกรรมซอฟต์แวร์ RMUTL 69 รุ่นที่ 4
              ผสานระบบจัดการเรียนการสอน จัดเก็บไฟล์ และพื้นที่ฝึกเขียนโปรแกรมไว้ในที่เดียว
            </p>
          </div>

          <div className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1">
              <p>
                &copy; {new Date().getFullYear()} InfiniteStack Corp. — SE-ONE.SITE Project Development.
              </p>
              <p>Developed by Pattaradanai Saiwongkham.</p>
            </div>
            <ul className="flex items-center gap-5">
              {[
                { to: '/legal-center', label: 'Legal' },
                { to: '/about', label: 'About' },
                { to: '/support', label: 'Support' },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="transition-colors hover:text-[#1d1d1f] hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </footer>
    </div>
  )
}