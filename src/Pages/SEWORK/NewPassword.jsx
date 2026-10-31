import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const MIN_LENGTH = 6 // ตรงกับค่าเริ่มต้นของ Supabase (ปรับได้ตามที่ตั้งใน Dashboard)
const REDIRECT_DELAY_MS = 3000

const isSessionError = (err) =>
  err?.code === 'session_not_found' ||
  err?.name === 'AuthSessionMissingError' ||
  err?.status === 401

function getFriendlyError(err) {
  const msg = err?.message || ''
  if (err?.code === 'same_password') {
    return 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม'
  }
  if (err?.code === 'weak_password') {
    return 'รหัสผ่านนี้คาดเดาง่ายเกินไป กรุณาใช้รหัสผ่านที่ซับซ้อนขึ้น'
  }
  if (err?.name === 'AuthRetryableFetchError' || /failed to fetch|network/i.test(msg)) {
    return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่'
  }
  return 'เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
}

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
/*  Floating-label field styles (ชุดเดียวกับหน้า Login)                   */
/* ------------------------------------------------------------------ */
const FIELD_CSS = `
.sw-label {
  position: absolute;
  left: 1rem;
  top: 9px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  pointer-events: none;
  transition: top .18s ease, font-size .18s ease;
}
.sw-field:placeholder-shown:not(:focus) + .sw-label {
  top: 21px;
  font-size: 17px;
  font-weight: 400;
}
.sw-field:-webkit-autofill + .sw-label {
  top: 9px !important;
  font-size: 12px !important;
  font-weight: 500 !important;
}
.sw-field:-webkit-autofill,
.sw-field:-webkit-autofill:hover,
.sw-field:-webkit-autofill:focus {
  transition: background-color 600000s 0s, color 600000s 0s;
}
.sw-field:autofill,
.sw-field:autofill:hover,
.sw-field:autofill:focus {
  transition: background-color 600000s 0s, color 600000s 0s;
}
@media (prefers-reduced-motion: reduce) {
  .sw-label { transition: none; }
}
`

const fieldClass =
  'sw-field block h-[60px] w-full bg-transparent px-4 pb-1.5 pt-6 text-[17px] text-se-text-main placeholder:text-transparent focus:outline-none'

const linkClass =
  'rounded text-sm font-medium focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-se-primary/30'

const primaryButtonClass =
  'flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-se-primary text-[17px] font-medium text-white transition-all hover:bg-se-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-se-primary/30 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100'

function Spinner({ className = 'h-5 w-5' }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/** วงกลมไอคอนสถานะ (ใช้ในหน้าผลลัพธ์: หมดอายุ / สำเร็จ) */
function StatusIcon({ tone, children }) {
  return (
    <div className={`mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full ${tone}`}>
      <svg className="h-9 w-9" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </div>
  )
}

/** เงื่อนไขรหัสผ่านแบบ checklist */
function Rule({ ok, children }) {
  return (
    <li className={`flex items-center gap-2 transition-colors ${ok ? 'text-se-success' : 'text-se-text-muted'}`}>
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" className={ok ? '' : 'opacity-50'} />
        {ok && <path d="M8 12.5l2.5 2.5L16 9.5" />}
      </svg>
      <span>{children}</span>
      <span className="sr-only">{ok ? '(ผ่านเงื่อนไข)' : '(ยังไม่ผ่านเงื่อนไข)'}</span>
    </li>
  )
}

/* ------------------------------------------------------------------ */

export default function NewPassword() {
  const navigate = useNavigate()

  // checking → ตรวจ session จากลิงก์ | ready → กรอกรหัสผ่านได้ | invalid → ลิงก์หมดอายุ | done → สำเร็จ
  const [status, setStatus] = useState('checking')
  const [accountEmail, setAccountEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  const passwordRef = useRef(null)
  const confirmRef = useRef(null)
  const finishing = useRef(false)

  const notify = (type, message) => setNotice({ id: Date.now(), type, message })
  const closeNotice = useCallback(() => setNotice(null), [])

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // ตรวจสอบว่าผู้ใช้มี Session จากลิงก์ Recovery ที่กดมาจากอีเมลหรือไม่
  useEffect(() => {
    document.title = 'New Password | SEWORK'
    let active = true

    const applySession = (session) => {
      if (!active || !session) return
      setAccountEmail(session.user?.email ?? '')
      setStatus((s) => (s === 'checking' || s === 'invalid' ? 'ready' : s))
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      if (session) applySession(session)
      else setStatus((s) => (s === 'checking' ? 'invalid' : s))
    })

    // เผื่อ session เข้ามาทีหลัง (เช่น PKCE exchange เสร็จช้า)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => applySession(session))

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  // ล้างเซสชัน Recovery แล้วพากลับไปหน้า Login
  const finish = useCallback(async () => {
    if (finishing.current) return
    finishing.current = true
    try {
      await supabase.auth.signOut()
    } catch {
      /* ignore */
    }
    navigate('/sework/login', { replace: true })
  }, [navigate])

  // สำเร็จแล้วรอสักครู่ก่อนพากลับ (กดปุ่มเพื่อไปทันทีก็ได้)
  useEffect(() => {
    if (status !== 'done') return
    const t = setTimeout(finish, REDIRECT_DELAY_MS)
    return () => clearTimeout(t)
  }, [status, finish])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return

    // อ่านจาก DOM โดยตรง เผื่อ password manager กรอกให้โดยไม่ trigger onChange
    const pw = passwordRef.current?.value ?? password
    const confirm = confirmRef.current?.value ?? confirmPassword

    if (pw.length < MIN_LENGTH) {
      notify('error', `รหัสผ่านต้องมีความยาวอย่างน้อย ${MIN_LENGTH} ตัวอักษร`)
      passwordRef.current?.focus()
      return
    }
    if (pw !== confirm) {
      notify('error', 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน')
      confirmRef.current?.focus()
      return
    }

    try {
      setLoading(true)
      setNotice(null)

      // อัปเดตรหัสผ่านใหม่ผ่าน Supabase
      const { error } = await supabase.auth.updateUser({ password: pw })
      if (error) throw error

      setStatus('done')
    } catch (err) {
      console.error('Update password error:', err?.message)
      if (isSessionError(err)) {
        setStatus('invalid')
      } else {
        notify('error', getFriendlyError(err))
      }
    } finally {
      setLoading(false)
    }
  }

  const lengthOk = password.length >= MIN_LENGTH
  const matchOk = confirmPassword.length > 0 && password === confirmPassword

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-se-background px-5 py-12 antialiased">
      <style>{FIELD_CSS}</style>

      {notice && (
        <Notification key={notice.id} type={notice.type} message={notice.message} onClose={closeNotice} />
      )}

      <main
        className={`w-full max-w-[420px] transition-all duration-500 ease-out motion-reduce:transition-none ${
          mounted ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >
        <div className="rounded-[28px] bg-se-surface px-6 pb-8 pt-10 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_48px_rgba(0,0,0,0.07)] sm:px-10">
          {/* ---------- กำลังตรวจสอบลิงก์ ---------- */}
          {status === 'checking' && (
            <div
              role="status"
              className="flex min-h-[240px] flex-col items-center justify-center gap-4 text-se-text-muted"
            >
              <Spinner className="h-7 w-7" />
              <p className="text-[15px]">กำลังตรวจสอบลิงก์...</p>
            </div>
          )}

          {/* ---------- ลิงก์ไม่ถูกต้อง / หมดอายุ ---------- */}
          {status === 'invalid' && (
            <>
              <header className="mb-8 text-center">
                <StatusIcon tone="bg-se-danger/10 text-se-danger">
                  <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
                  <path d="M12 9v4M12 17h.01" />
                </StatusIcon>
                <h1 className="text-[30px] font-semibold leading-tight tracking-tight text-se-text-main">
                  Link expired
                </h1>
                <p className="mt-2 text-[15px] leading-relaxed text-se-text-muted">
                  ลิงก์รีเซ็ตรหัสผ่านนี้หมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่อีกครั้ง
                </p>
              </header>

              <Link to="/sework/forgot-password" className={primaryButtonClass}>
                Request New Link
              </Link>
            </>
          )}

          {/* ---------- กรอกรหัสผ่านใหม่ ---------- */}
          {status === 'ready' && (
            <>
              <header className="mb-8 text-center">
                <Link
                  to="/sework/landing"
                  aria-label="กลับสู่หน้าหลัก SE-Work"
                  className="mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-[20px] bg-black shadow-sm transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-se-primary/30 motion-reduce:transition-none motion-reduce:hover:scale-100"
                >
                  <img src="/logo.png" alt="" className="h-11 w-11 object-contain" />
                </Link>
                <h1 className="text-[30px] font-semibold leading-tight tracking-tight text-se-text-main">
                  Create New Password
                </h1>
                <p className="mt-2 text-[15px] leading-relaxed text-se-text-muted">
                  {accountEmail ? (
                    <>
                      ตั้งรหัสผ่านใหม่สำหรับ{' '}
                      <span className="break-all font-medium text-se-text-main">{accountEmail}</span>
                    </>
                  ) : (
                    'กรุณาระบุรหัสผ่านใหม่ที่คุณต้องการใช้งาน'
                  )}
                </p>
              </header>

              <form onSubmit={handleSubmit} noValidate>
                {/* ช่วยให้ password manager จับคู่รหัสผ่านใหม่กับบัญชีได้ถูกต้อง */}
                {accountEmail && (
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    value={accountEmail}
                    readOnly
                    tabIndex={-1}
                    aria-hidden="true"
                    className="sr-only"
                  />
                )}

                <div className="overflow-hidden rounded-2xl border border-se-border bg-se-surface transition focus-within:border-se-primary focus-within:ring-4 focus-within:ring-se-primary/20">
                  <div className="relative">
                    <input
                      ref={passwordRef}
                      id="new-password"
                      name="new-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-describedby="password-rules"
                      placeholder=" "
                      className={`${fieldClass} pr-14`}
                    />
                    <label htmlFor="new-password" className="sw-label text-se-text-muted">
                      New Password
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                      aria-pressed={showPassword}
                      className="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-se-text-muted transition-colors hover:bg-se-border/40 hover:text-se-text-main focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-se-primary/30"
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                          <path d="M1 1l22 22" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>

                  <div className="relative border-t border-se-border">
                    <input
                      ref={confirmRef}
                      id="confirm-password"
                      name="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      aria-describedby="password-rules"
                      placeholder=" "
                      className={fieldClass}
                    />
                    <label htmlFor="confirm-password" className="sw-label text-se-text-muted">
                      Confirm Password
                    </label>
                  </div>
                </div>

                <ul
                  id="password-rules"
                  aria-live="polite"
                  className="mt-3 min-h-[2.5rem] space-y-1.5 px-1 text-[13px] leading-snug"
                >
                  <Rule ok={lengthOk}>อย่างน้อย {MIN_LENGTH} ตัวอักษร</Rule>
                  <Rule ok={matchOk}>รหัสผ่านทั้งสองช่องตรงกัน</Rule>
                </ul>

                <button type="submit" disabled={loading} className={`mt-3 ${primaryButtonClass}`}>
                  {loading && <Spinner />}
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </>
          )}

          {/* ---------- เปลี่ยนรหัสผ่านสำเร็จ ---------- */}
          {status === 'done' && (
            <>
              <header className="mb-8 text-center" role="status">
                <StatusIcon tone="bg-se-success/15 text-se-success">
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM8 12.5l2.5 2.5L16 9.5" />
                </StatusIcon>
                <h1 className="text-[30px] font-semibold leading-tight tracking-tight text-se-text-main">
                  Password updated
                </h1>
                <p className="mt-2 text-[15px] leading-relaxed text-se-text-muted">
                  ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว กำลังพากลับไปหน้าเข้าสู่ระบบ...
                </p>
              </header>

              <button type="button" onClick={finish} className={primaryButtonClass}>
                Continue to Sign In
              </button>
            </>
          )}
        </div>

        {status !== 'done' && (
          <div className="mt-6 text-center">
            <Link
              to="/sework/login"
              className={`${linkClass} text-se-text-muted transition-colors hover:text-se-text-main`}
            >
              &larr; กลับไปหน้าเข้าสู่ระบบ
            </Link>
          </div>
        )}

        <p className="mt-10 text-center text-[11px] font-medium text-se-text-muted">
          SE-ONE Project Development. All rights reserved.
        </p>
      </main>
    </div>
  )
}