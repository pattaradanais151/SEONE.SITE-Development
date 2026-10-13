import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

/* ------------------------------------------------------------------ */
/*  Notification — banner ลอยด้านบนแบบ iOS (ปิดเองอัตโนมัติ)             */
/*  ใช้เฉพาะ design tokens จึงรองรับ Dark Mode ได้ทันทีเมื่อ override ตัวแปร */
/* ------------------------------------------------------------------ */
const NOTICE_STYLES = {
  error: {
    title: 'เกิดข้อผิดพลาด',
    tone: 'bg-se-danger/10 text-se-danger',
    icon: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM12 8v5M12 16h.01',
  },
  success: {
    title: 'สำเร็จ',
    tone: 'bg-se-success/15 text-se-success',
    icon: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM8 12.5l2.5 2.5L16 9.5',
  },
}

function Notification({ type = 'error', message, duration = 6000, onClose }) {
  const [visible, setVisible] = useState(false)
  const closeRef = useRef(onClose)
  const exitTimer = useRef()
  const style = NOTICE_STYLES[type]

  useEffect(() => {
    closeRef.current = onClose
  })

  const dismiss = useCallback(() => {
    setVisible(false)
    exitTimer.current = setTimeout(() => closeRef.current?.(), 300)
  }, [])

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    const timer = duration ? setTimeout(dismiss, duration) : null
    return () => {
      cancelAnimationFrame(raf)
      if (timer) clearTimeout(timer)
    }
  }, [duration, dismiss])

  useEffect(() => () => clearTimeout(exitTimer.current), [])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div
        role={type === 'error' ? 'alert' : 'status'}
        className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-se-border/60 bg-se-surface/80 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl backdrop-saturate-150 transition-all duration-300 ease-out motion-reduce:transition-none ${
          visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
        }`}
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style.tone}`}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={style.icon} />
          </svg>
        </span>

        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold text-se-text-main">{style.title}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-se-text-muted">{message}</p>
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="ปิดการแจ้งเตือน"
          className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-se-text-muted transition-colors hover:bg-se-border/40 hover:text-se-text-main focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-se-primary/30"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

const inputClass =
  'h-[52px] w-full rounded-xl border border-se-border bg-se-surface px-4 text-[17px] text-se-text-main transition placeholder:text-se-text-muted/60 focus:border-se-primary focus:outline-none focus:ring-4 focus:ring-se-primary/20'

const linkClass =
  'rounded text-sm font-medium focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-se-primary/30'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState(null)
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const { user } = useAuth()

  const notify = (type, message) => setNotice({ id: Date.now(), type, message })
  const closeNotice = useCallback(() => setNotice(null), [])

  // หากล็อกอินอยู่แล้ว ให้ Redirect ไปที่ Dashboard ทันที
  useEffect(() => {
    document.title = 'Login | SEWORK'
    if (user) {
      navigate('/sework/se-console/dashboard', { replace: true })
    }
  }, [user, navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      notify('error', 'กรุณากรอกอีเมลและรหัสผ่าน')
      return
    }

    try {
      setLoading(true)
      setNotice(null)

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      // เมื่อสำเร็จ AuthContext จะจับการเปลี่ยนแปลง Session และ useEffect ด้านบนจะทำงานเพื่อ Redirect
    } catch (err) {
      console.error('Login Error:', err.message)
      notify('error', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือไม่มีสิทธิ์เข้าถึง')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-se-background px-6 py-12 antialiased">
      {notice && (
        <Notification key={notice.id} type={notice.type} message={notice.message} onClose={closeNotice} />
      )}

      <div className="w-full max-w-[400px]">
        <div className="mb-10 text-center">
          <Link
            to="/sework/landing"
            aria-label="กลับสู่หน้าหลัก SE-Work"
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[18px] bg-black shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-se-primary/30"
          >
            <img src="/logo.png" alt="" className="h-10 w-10 object-contain" />
          </Link>
          <h1 className="text-[32px] font-semibold leading-tight tracking-tight text-se-text-main">
            Sign in to SEWORK
          </h1>
          <p className="mt-2 text-[17px] text-se-text-muted">โปรดใช้บัญชีที่ได้รับอนุญาตเพื่อเข้าสู่ระบบ</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-se-text-main" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="name@example.com"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-se-text-main" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-se-primary text-[17px] font-medium text-white transition-colors hover:bg-se-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-se-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && (
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            )}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-3">
          <Link to="/sework/forgot-password" className={`${linkClass} text-se-primary hover:underline`}>
            Forgot password?
          </Link>
          <Link
            to="/sework/landing"
            className={`${linkClass} text-se-text-muted transition-colors hover:text-se-text-main`}
          >
            &larr; กลับสู่หน้าหลัก SE-Work
          </Link>
        </div>
      </div>
    </div>
  )
}