import { useState } from 'react'
import { Link } from 'react-router-dom'
import styled from '@emotion/styled'
import Logo from './Logo'

const links = [
  { to: '/', label: 'Home' },
  { to: '/talents', label: 'Talents' },
  { to: '/about', label: 'About' },
  { to: '/support', label: 'Support' },
]

// ลิงก์เมนู (Desktop) — มีเส้นใต้ขยายออกจากกึ่งกลางตอน hover
const NavLink = styled(Link)`
  position: relative;
  display: inline-block;
  padding: 4px 0;
  font-size: 12px;
  letter-spacing: -0.01em;
  color: rgba(29, 29, 31, 0.8);
  text-decoration: none;
  transition: color 0.2s ease;

  &::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 0;
    width: 100%;
    height: 1px;
    background: currentColor;
    transform: translateX(-50%) scaleX(0);
    transition: transform 0.25s ease;
  }

  &:hover,
  &:focus-visible {
    color: #1d1d1f;
  }
  &:hover::after,
  &:focus-visible::after {
    transform: translateX(-50%) scaleX(1);
  }

  @media (prefers-reduced-motion: reduce) {
    &::after {
      transition: none;
    }
  }
`

// ปุ่ม Log in
const LoginButton = styled(Link)`
  display: inline-block;
  border-radius: 9999px;
  background: #0071e3;
  padding: 4px 14px;
  font-size: 12px;
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

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <header className="sticky top-0 z-50 w-full">
      <nav
        aria-label="เมนูหลัก"
        className="border-b border-black/[0.08] bg-[rgba(251,251,253,0.8)] backdrop-blur-xl backdrop-saturate-[180%]"
      >
        <div className="mx-auto flex h-12 max-w-[1024px] items-center justify-between px-5">
          {/* Brand */}
          <Link to="/" onClick={close} aria-label="SE-ONE หน้าแรก" className="flex items-center">
            <Logo size={26} />
          </Link>

          {/* Desktop links */}
          <ul className="hidden items-center gap-10 md:flex">
            {links.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to}>{l.label}</NavLink>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <LoginButton to="/portal" onClick={close}>
              Log in
            </LoginButton>

            {/* Mobile toggle */}
            <button
              type="button"
              aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#1d1d1f] md:hidden"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                {open ? (
                  <path d="M3 3l12 12M15 3L3 15" />
                ) : (
                  <path d="M2 6h14M2 12h14" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile panel */}
        {open && (
          <ul className="border-t border-black/[0.08] px-5 py-2 md:hidden">
            {links.map((l) => (
              <li key={l.to} className="border-b border-black/[0.06] last:border-0">
                <Link
                  to={l.to}
                  onClick={close}
                  className="block py-3 text-[17px] font-medium text-[#1d1d1f]"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </header>
  )
}