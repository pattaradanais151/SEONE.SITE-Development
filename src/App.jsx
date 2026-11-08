import React, { useState, useEffect, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import useContentProtection from './components/Usecontentprotection'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './components/MainLayout'
import ConsoleLayout from './components/ConsoleLayout'

//TollFee
import TollFeeRegister from './Pages/TollFee/Register'

// Public & Portal
import Landing from './Pages/Public/Landing'
import Talents from './Pages/Public/Talents'
import About from './Pages/Public/About'
import Support from './Pages/Public/Support'
import Portal from './Pages/Portal'
import LegalCenter from './Pages/LegalCenter'

// SEWORK
import SeworkLanding from './Pages/SEWORK/Landing'
import Login from './Pages/SEWORK/Login'
import ForgotPassword from './Pages/SEWORK/ForgotPassword'
import NewPassword from './Pages/SEWORK/NewPassword'

// SEWORK Console
import Dashboard from './Pages/SEWORK/Console/Dashboard'
import Announcements from './Pages/SEWORK/Console/Announcements'
import Assignments from './Pages/SEWORK/Console/Assignments'
import Subjects from './Pages/SEWORK/Console/Subjects'
import Schedules from './Pages/SEWORK/Console/Schedules'
import SheetData from './Pages/SEWORK/Console/SheetData'
import Semesters from './Pages/SEWORK/Console/Semesters'
import SubmissionLinks from './Pages/SEWORK/Console/SubmissionLinks'
import ResourceCenter from './Pages/SEWORK/Console/ResourceCenter'
import SubmissionTracking from './Pages/SEWORK/Console/SubmissionTracking'
import Leaderboard from './Pages/SEWORK/Console/Leaderboard'
import UsersManagement from './Pages/SEWORK/Console/UsersManagement'
import Contacts from './Pages/SEWORK/Console/Contacts'
import InternalLinks from './Pages/SEWORK/Console/InternalLinks'
import Profile from './Pages/SEWORK/Console/Profile'

// CLOUDFILES
import CloudFilesLanding from './Pages/Public/CloudFiles/CloudFilesLanding'
import CloudFilesDashboard from './Pages/Public/CloudFiles/Dashboard'

// CODING STUDIO
import CodingLanding from './Pages/Public/IDE/CodingLanding'
import CodingWorkspace from './Pages/Public/IDE/CodingWorkspace'

/* ------------------------------------------------------------------ */
/*  Welcome Modal                                                      */
/* ------------------------------------------------------------------ */

const WELCOME_STORAGE_KEY = 'hideWelcomeAnnouncement'
const OLD_SITE_URL = 'https://seone.site/'
const DISCORD_URL = 'https://discord.gg/xNj9MepneR'

// อ่าน/เขียน localStorage แบบปลอดภัย (กันกรณีเบราว์เซอร์บล็อก storage)
const readWelcomeHidden = () => {
  try {
    return localStorage.getItem(WELCOME_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

const saveWelcomeHidden = () => {
  try {
    localStorage.setItem(WELCOME_STORAGE_KEY, 'true')
  } catch {
    // ignore
  }
}

const WELCOME_FEATURES = [
  {
    title: 'ลื่นไหลกว่าเดิม',
    desc: 'หน้าตาและการใช้งานใหม่ ตอบสนองไวทุกหน้า',
    path: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    title: 'ฟีเจอร์ครบครัน',
    desc: 'รวมเครื่องมือที่ใช้บ่อยไว้ในที่เดียว',
    path: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
  },
  {
    title: 'ประสิทธิภาพที่ดียิ่งขึ้น',
    desc: 'โหลดเร็วขึ้นและเสถียรกว่าระบบเดิม',
    path: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  },
]

const Icon = ({ path, className = 'h-5 w-5' }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d={path}
    />
  </svg>
)

const WelcomeModal = ({ onClose }) => {
  const [visible, setVisible] = useState(false)

  // เล่นแอนิเมชันปิดก่อนถอด component ออกจริง
  const handleClose = useCallback(() => {
    setVisible(false)
    window.setTimeout(onClose, 200)
  }, [onClose])

  useEffect(() => {
    // เล่นแอนิเมชันเปิด
    const frame = requestAnimationFrame(() => setVisible(true))

    // ล็อกการ scroll ของหน้าเว็บด้านหลัง
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // กด Esc เพื่อปิด
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleClose])

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-md transition-opacity duration-200 motion-reduce:transition-none ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        aria-describedby="welcome-desc"
        className={`relative my-auto w-full max-w-[440px] overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.65)] ring-1 ring-black/5 transition-all duration-300 ease-out motion-reduce:transition-none dark:bg-[#121214] dark:ring-white/10 ${
          visible
            ? 'translate-y-0 scale-100 opacity-100'
            : 'translate-y-3 scale-[0.97] opacity-0'
        }`}
      >
        {/* ===== Hero ===== */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0071e3] via-[#3b5bdb] to-[#7048e8] px-7 pb-8 pt-9 text-white">
          {/* แสงตกแต่ง */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-12 h-48 w-48 rounded-full bg-cyan-300/25 blur-3xl"
          />

          {/* ปุ่มปิด */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="ปิดหน้าต่าง"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <Icon path="M6 18L18 6M6 6l12 12" className="h-4 w-4" />
          </button>

          {/* ไอคอน */}
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur">
            <Icon
              path="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              className="h-7 w-7"
            />
          </div>

          <h2
            id="welcome-title"
            className="relative mt-5 text-2xl font-bold leading-snug"
          >
            ยินดีต้อนรับสู่ระบบใหม่!
          </h2>
          <p
            id="welcome-desc"
            className="relative mt-2 text-sm leading-relaxed text-white/85"
          >
            ระบบได้รับการอัปเกรดและพร้อมให้คุณใช้งานแล้ว
          </p>
        </div>

        {/* ===== Body ===== */}
        <div className="px-7 pb-7 pt-6">
          <ul className="space-y-4">
            {WELCOME_FEATURES.map((item) => (
              <li key={item.title} className="flex items-start gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0071e3]/10 text-[#0071e3] dark:bg-[#0071e3]/20 dark:text-[#4da3ff]">
                  <Icon path={item.path} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-gray-500 dark:text-[#86868b]">
                    {item.desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-[13px] text-gray-500 dark:text-[#86868b]">
            ขอให้สนุกกับการใช้งานครับ
          </p>

          {/* ปุ่มหลัก */}
          <button
            type="button"
            autoFocus
            onClick={handleClose}
            className="mt-5 w-full rounded-xl bg-[#0071e3] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-[#0062c4] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#121214]"
          >
            เริ่มต้นใช้งาน
          </button>

          {/* ลิงก์รอง */}
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <a
              href={OLD_SITE_URL}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] font-medium text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-white/5"
            >
              <Icon path="M10 19l-7-7m0 0l7-7m-7 7h18" className="h-4 w-4" />
              กลับไปเว็บไซต์เดิม
            </a>

            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/10 px-3 py-2.5 text-[13px] font-medium text-[#4752c4] transition hover:bg-[#5865F2]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2] dark:text-[#a5acff]"
            >
              <Icon
                path="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                className="h-4 w-4"
              />
              ติดต่อ Dev & Admin
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Placeholder / 404                                                  */
/* ------------------------------------------------------------------ */

const Placeholder = ({ title }) => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] p-4 text-center text-white">
    <div className="rounded-[32px] border border-[#2c2c2e] bg-[#141414] p-12 shadow-2xl">
      <h1 className="mb-3 text-3xl font-bold">{title}</h1>
      <p className="text-gray-400">
        โมดูลนี้อยู่ระหว่างการพัฒนา (Coming Soon)
      </p>
    </div>
  </div>
)

// 404 page
const NotFound = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 text-center">
    <div>
      <h1 className="mb-2 text-6xl font-black text-gray-900">404</h1>
      <p className="font-medium text-gray-500">
        ไม่พบหน้าที่คุณต้องการ
      </p>
    </div>
  </div>
)

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */

export default function App() {
  useContentProtection()

  // ดึงค่าจาก localStorage ว่าเคยปิดหน้าต่างต้อนรับไปแล้วหรือยัง
  const [showWelcome, setShowWelcome] = useState(() => !readWelcomeHidden())

  // ปิดหน้าต่างและบันทึกค่าลง localStorage
  const handleCloseWelcome = useCallback(() => {
    saveWelcomeHidden()
    setShowWelcome(false)
  }, [])

  return (
    <>
      {/* ✨ Welcome Announcement Modal */}
      {showWelcome && <WelcomeModal onClose={handleCloseWelcome} />}

      {/* 🌐 Original Router System */}
      <Routes>
        {/* Public Website */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/talents" element={<Talents />} />
          <Route path="/about" element={<About />} />
          <Route path="/support" element={<Support />} />
          <Route path="/portal" element={<Portal />} />
          <Route path="/legal-center" element={<LegalCenter />} />
        </Route>

        {/*TollFee*/}
        <Route path="/tollfee/register" element={<TollFeeRegister />} />

        {/* SEWORK - Public Routes */}
        <Route path="/sework/landing" element={<SeworkLanding />} />
        <Route path="/sework/login" element={<Login />} />
        <Route
          path="/sework/forgot-password"
          element={<ForgotPassword />}
        />
        <Route
          path="/sework/new-password"
          element={<NewPassword />}
        />

        {/* SEWORK - Protected Console Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<ConsoleLayout />}>
            <Route
              path="/sework/se-console/dashboard"
              element={<Dashboard />}
            />
            <Route
              path="/sework/se-console/announcements"
              element={<Announcements />}
            />
            <Route
              path="/sework/se-console/assignments"
              element={<Assignments />}
            />
            <Route
              path="/sework/se-console/subjects"
              element={<Subjects />}
            />
            <Route
              path="/sework/se-console/schedules"
              element={<Schedules />}
            />
            <Route
              path="/sework/se-console/sheet-data"
              element={<SheetData />}
            />
            <Route
              path="/sework/se-console/semesters"
              element={<Semesters />}
            />
            <Route
              path="/sework/se-console/submission-links"
              element={<SubmissionLinks />}
            />
            <Route
              path="/sework/se-console/resource-center"
              element={<ResourceCenter />}
            />
            <Route
              path="/sework/se-console/submission-tracking"
              element={<SubmissionTracking />}
            />
            <Route
              path="/sework/se-console/leaderboard"
              element={<Leaderboard />}
            />
            <Route
              path="/sework/se-console/users-management"
              element={<UsersManagement />}
            />
            <Route
              path="/sework/se-console/contacts"
              element={<Contacts />}
            />
            <Route
              path="/sework/se-console/internal-links"
              element={<InternalLinks />}
            />
            <Route
              path="/sework/se-console/profile"
              element={<Profile />}
            />
          </Route>
        </Route>

        {/* CLOUDFILES - Public Routes */}
        <Route
          path="/cloudfiles/login"
          element={<CloudFilesLanding />}
        />
        <Route
          path="/cloudfiles/landing"
          element={<CloudFilesLanding />}
        />

        {/* CLOUDFILES - Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/cloudfiles/dashboard"
            element={<CloudFilesDashboard />}
          />
          <Route
            path="/cloudfiles/folder/:folderId"
            element={<Placeholder title="CLOUDFILES Folder View" />}
          />
        </Route>

        {/* CODING STUDIO - Public Routes */}
        <Route
          path="/coding/login"
          element={<CodingLanding />}
        />
        <Route
          path="/coding/landing"
          element={<CodingLanding />}
        />

        {/* CODING STUDIO - Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/coding/workspace"
            element={<Placeholder title="CODING Workspace (Global)" />}
          />
          <Route
            path="/coding/workspace/:username"
            element={<CodingWorkspace />}
          />
        </Route>

        {/* 404 - Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}