import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'

/*
  CloudFiles Landing — Apple.com style
  สีทั้งหมดอ้างอิงจาก design tokens (--color-se-*) ไม่ hardcode สีพื้นหลัง/ตัวอักษร
  เมื่อทำ Light/Dark Mode แค่ override ค่าตัวแปร ไม่ต้องแก้ไฟล์นี้
*/

const CLOUD_ICON =
  'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z'
const FOLDER_FILL =
  'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z'
const DOC_ICON =
  'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z'

const highlights = [
  {
    title: 'อัปโหลดได้ทันที',
    description: 'รองรับไฟล์ขนาดสูงสุด 100 MB ต่อไฟล์ เลือกไฟล์แล้วอัปโหลดได้เลย',
    icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
  },
  {
    title: 'จัดระเบียบเป็นโฟลเดอร์',
    description: 'สร้างโฟลเดอร์ซ้อนกันเพื่อแยกงานของแต่ละวิชาและแต่ละโปรเจกต์',
    icon: 'M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  },
  {
    title: 'เข้าถึงได้จากทุกที่',
    description: 'เปิดไฟล์ของคุณผ่านเว็บบนอุปกรณ์ใดก็ได้ ไม่ต้องติดตั้งโปรแกรมเพิ่ม',
    icon: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3 12h18M12 3a13.5 13.5 0 013.5 9A13.5 13.5 0 0112 21a13.5 13.5 0 01-3.5-9A13.5 13.5 0 0112 3z',
  },
]

// ตัวอย่างไฟล์ในหน้าต่าง mockup (ใช้เพื่อประกอบภาพเท่านั้น)
const mockItems = [
  { name: 'Projects', folder: true },
  { name: 'Assignments', folder: true },
  { name: 'Photos', folder: true },
  { name: 'report.pdf' },
  { name: 'diagram.png' },
  { name: 'notes.txt' },
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

export default function CloudFilesLanding() {
  const { session, profile } = useAuth()

  useEffect(() => {
    document.title = 'CLOUDFILES | Secure Cloud Storage'
  }, [])

  return (
    <div className="min-h-screen bg-se-background font-sans text-se-text-main antialiased selection:bg-se-primary/20">
      {/* Nav — โปร่งแสง + blur แบบ apple.com */}
      <nav className="sticky top-0 z-50 border-b border-se-border/60 bg-se-background/75 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-6">
          <Link to="/" className={`flex items-center gap-2.5 rounded-lg ${focusRing}`}>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-rose-500">
              <Icon d={CLOUD_ICON} className="h-4 w-4 text-white" strokeWidth={2} />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">CLOUDFILES</span>
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
        <p className="mb-5 text-lg font-semibold text-se-text-muted md:text-xl">Secure Workspace Storage</p>

        <h1 className="text-5xl font-semibold leading-[1.2] tracking-tight md:text-7xl md:leading-[1.15]">
          พื้นที่จัดเก็บข้อมูล
          <br />
          ที่ปลอดภัยและเป็นส่วนตัว
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-se-text-muted md:text-2xl md:leading-relaxed">
          อัปโหลด จัดระเบียบ และเข้าถึงไฟล์ของคุณได้จากทุกที่ ออกแบบมาสำหรับนักพัฒนาและนักศึกษาโดยเฉพาะ
        </p>

        <div className="mt-10 flex justify-center">
          {session ? (
            <Link
              to="/cloudfiles/dashboard"
              className={`rounded-full bg-se-primary px-7 py-3 text-[17px] font-medium text-white transition-colors hover:bg-se-primary-hover ${focusRing}`}
            >
              เข้าสู่ไฟล์ของฉัน
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

        {/* User Info Preview (ถ้าล็อกอินแล้ว) */}
        {profile && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="h-8 w-8 overflow-hidden rounded-full bg-se-primary/10 ring-1 ring-se-border">
              {profile.profile_image_url ? (
                <img src={profile.profile_image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-se-primary">
                  {profile.first_name?.charAt(0)}
                </div>
              )}
            </div>
            <p className="text-[15px] text-se-text-muted">
              กำลังใช้งานในชื่อ{' '}
              <span className="font-semibold text-se-text-main">
                {profile.first_name} {profile.last_name}
              </span>
            </p>
          </div>
        )}
      </main>

      {/* Product visual — หน้าต่างแอปจำลอง (ตกแต่งเท่านั้น) */}
      <div className="mx-auto max-w-5xl px-6 pb-24" aria-hidden="true">
        <div className="relative h-72 overflow-hidden rounded-[28px] bg-se-surface shadow-[0_30px_80px_rgba(0,0,0,0.12)] ring-1 ring-se-border/60 md:h-[26rem] [mask-image:linear-gradient(to_bottom,black_65%,transparent)]">
          {/* Title bar */}
          <div className="relative flex h-12 items-center border-b border-se-border/60 px-5">
            <div className="flex gap-2">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]"></span>
              <span className="h-3 w-3 rounded-full bg-[#febc2e]"></span>
              <span className="h-3 w-3 rounded-full bg-[#28c840]"></span>
            </div>
            <span className="absolute inset-x-0 text-center text-sm font-medium text-se-text-muted">My Files</span>
          </div>

          {/* File grid */}
          <div className="grid grid-cols-3 gap-4 p-6 md:grid-cols-6 md:p-8">
            {mockItems.map((item) => (
              <div key={item.name} className="min-w-0">
                <div className="flex aspect-square items-center justify-center rounded-2xl bg-se-background">
                  {item.folder ? (
                    <svg className="h-12 w-12 text-se-primary md:h-14 md:w-14" fill="currentColor" viewBox="0 0 24 24">
                      <path d={FOLDER_FILL} />
                    </svg>
                  ) : (
                    <Icon d={DOC_ICON} className="h-10 w-10 text-se-text-muted md:h-12 md:w-12" strokeWidth={1.5} />
                  )}
                </div>
                <p className="mt-2 truncate text-center text-xs font-medium">{item.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

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