import { useEffect, useState } from 'react'
import { Link, NavLink as RouterNavLink, useLocation } from 'react-router-dom'
import styled from '@emotion/styled'

const LOGO_SRC = '/logo.png'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/talents', label: 'Talents' },
  { to: '/about', label: 'About' },
  { to: '/support', label: 'Support' },
]

/* ---------- Styled ---------- */

// ลิงก์เมนู (Desktop) — แคปซูลโปร่งแสงตอน hover และเมื่ออยู่ที่หน้านั้น
const NavItem = styled(RouterNavLink)`
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 14px;
  border-radius: 9999px;
  font-size: 13px;
  letter-spacing: -0.01em;
  color: rgba(29, 29, 31, 0.7);
  text-decoration: none;
  transition:
    color 0.2s ease,
    background-color 0.2s ease;

  &:hover {
    color: #1d1d1f;
    background: rgba(0, 0, 0, 0.05);
  }
  &.active {
    color: #1d1d1f;
    background: rgba(0, 0, 0, 0.07);
  }
  &:focus-visible {
    outline: 2px solid #0071e3;
    outline-offset: 2px;
  }
`

// ลิงก์เมนู (Mobile) — ตัวใหญ่แบบ Apple
const MobileItem = styled(RouterNavLink)`
  display: block;
  padding: 10px 0;
  font-size: 32px;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.035em;
  color: rgba(29, 29, 31, 0.5);
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover,
  &.active {
    color: #1d1d1f;
  }
  &:focus-visible {
    outline: 2px solid #0071e3;
    outline-offset: 4px;
    border-radius: 8px;
  }
`

// ปุ่ม Log in
const LoginButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  height: 30px;
  border-radius: 9999px;
  background: #0071e3;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 500;
  color: #fff;
  text-decoration: none;
  transition:
    background-color 0.2s ease,
    transform 0.15s ease;

  &:hover {
    background: #0077ed;
  }
  &:active {
    transform: scale(0.96);
  }
  &:focus-visible {
    outline: 2px solid #0071e3;
    outline-offset: 2px;
  }
`

/* ---------- Component ---------- */
export default function Navbar() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const close = () => setOpen(false)

  // ปิดเมนูเมื่อเปลี่ยนหน้า
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // เงา/ความทึบของแถบเมนูเมื่อเลื่อนหน้า
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ล็อกการเลื่อนหน้าและรองรับปุ่ม Esc ตอนเมนูมือถือเปิด
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <header className="sticky top-0 z-50 w-full">
      <nav
        aria-label="เมนูหลัก"
        className={`border-b backdrop-blur-xl backdrop-saturate-[180%] transition-colors duration-300 ${
          scrolled || open
            ? 'border-black/[0.08] bg-[rgba(251,251,253,0.82)]'
            : 'border-transparent bg-[rgba(251,251,253,0.6)]'
        }`}
      >
        <div className="mx-auto grid h-12 max-w-[1024px] grid-cols-[1fr_auto] items-center px-5 md:grid-cols-[1fr_auto_1fr]">
          {/* Brand */}
          <Link
            to="/"
            onClick={close}
            aria-label="SE-ONE หน้าแรก"
            className="flex w-fit items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-4"
          >
            <img
              src={LOGO_SRC}
              alt=""
              width={26}
              height={26}
              draggable={false}
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
              className="h-[26px] w-[26px] rounded-[7px] object-contain"
            />
            <span className="text-[17px] font-semibold tracking-[-0.03em] text-[#1d1d1f]">SE-ONE</span>
          </Link>

          {/* Desktop links */}
          <ul className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <li key={l.to}>
                <NavItem to={l.to} end={l.end}>
                  {l.label}
                </NavItem>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-end gap-2">
            <LoginButton to="/portal" onClick={close}>
              Log in
            </LoginButton>

            {/* Mobile toggle */}
            <button
              type="button"
              aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#1d1d1f] transition-colors hover:bg-black/[0.05] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] md:hidden"
            >
              <span className="relative block h-3 w-[18px]">
                <span
                  className={`absolute left-0 h-[1.5px] w-full rounded bg-current transition-all duration-300 ${
                    open ? 'top-[5px] rotate-45' : 'top-0'
                  }`}
                />
                <span
                  className={`absolute left-0 h-[1.5px] w-full rounded bg-current transition-all duration-300 ${
                    open ? 'top-[5px] -rotate-45' : 'top-[10px]'
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile sheet (อยู่นอก <nav> เพราะ backdrop-filter ทำให้ fixed อิงกับ nav แทนหน้าจอ) */}
      <div
        id="mobile-menu"
        aria-hidden={!open}
        className={`fixed inset-x-0 bottom-0 top-[49px] z-40 flex flex-col bg-[rgba(251,251,253,0.94)] px-6 pb-8 pt-6 backdrop-blur-2xl backdrop-saturate-[180%] transition-[opacity,visibility] duration-300 md:hidden ${
          open ? 'visible opacity-100' : 'pointer-events-none invisible opacity-0'
        }`}
      >
        <ul>
          {links.map((l, i) => (
            <li
              key={l.to}
              style={{ transitionDelay: open ? `${80 + i * 50}ms` : '0ms' }}
              className={`transition-all duration-500 ease-[cubic-bezier(.28,.11,.32,1)] ${
                open ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
              }`}
            >
              <MobileItem to={l.to} end={l.end} onClick={close} tabIndex={open ? 0 : -1}>
                {l.label}
              </MobileItem>
            </li>
          ))}
        </ul>

        <div
          style={{ transitionDelay: open ? '320ms' : '0ms' }}
          className={`mt-auto transition-all duration-500 ease-[cubic-bezier(.28,.11,.32,1)] ${
            open ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
          }`}
        >
          <Link
            to="/portal"
            onClick={close}
            tabIndex={open ? 0 : -1}
            className="flex h-[52px] w-full items-center justify-center rounded-full bg-[#0071e3] text-[17px] font-medium text-white transition hover:bg-[#0077ed] active:scale-[0.98]"
          >
            Log in
          </Link>
          <p className="mt-4 text-center text-[12px] text-[#86868b]">SE-ONE · RMUTL 69 รุ่นที่ 4</p>
        </div>
      </div>
    </header>
  )
}