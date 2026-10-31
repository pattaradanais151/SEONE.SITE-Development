import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

/* ------------------------------------------------------------------ */
/*  Config — โดเมนอีเมลที่รองรับ (ถ้าผู้ใช้พิมพ์แค่ username ระบบจะลองทีละโดเมน) */
/* ------------------------------------------------------------------ */
const EMAIL_DOMAINS = ['live.rmutl.ac.th', 'rmutl.ac.th', 'seone.site']
const LAST_DOMAIN_KEY = 'sework:last-login-domain'

/** แปลง input ของผู้ใช้เป็นรายการอีเมลที่จะลองล็อกอิน */
function buildCandidates(raw) {
  // ตัด @ ที่ค้างท้าย เช่น "pattaradanais@" ให้ถือเป็น username
  const id = raw.trim().toLowerCase().replace(/@+$/, '')
  if (!id) return []

  // ผู้ใช้พิมพ์อีเมลเต็มมาแล้ว → ใช้ตามนั้น
  if (id.includes('@')) return [id]

  // พิมพ์แค่ username → ลองทีละโดเมน โดยเอาโดเมนที่เคยสำเร็จล่าสุดขึ้นก่อน
  let domains = EMAIL_DOMAINS
  try {
    const last = localStorage.getItem(LAST_DOMAIN_KEY)
    if (last && EMAIL_DOMAINS.includes(last)) {
      domains = [last, ...EMAIL_DOMAINS.filter((d) => d !== last)]
    }
  } catch {
    /* localStorage ใช้ไม่ได้ (private mode ฯลฯ) → ข้ามไป */
  }
  return domains.map((d) => `${id}@${d}`)
}

const isInvalidCredentials = (err) =>
  err?.code === 'invalid_credentials' || /invalid login credentials/i.test(err?.message || '')

function getFriendlyError(err) {
  const msg = err?.message || ''
  if (err?.status === 429 || err?.code === 'over_request_rate_limit') {
    return 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง'
  }
  if (err?.code === 'email_not_confirmed') {
    return 'บัญชีนี้ยังไม่ได้ยืนยันอีเมล กรุณาตรวจสอบกล่องจดหมายของคุณ'
  }
  if (err?.name === 'AuthRetryableFetchError' || /failed to fetch|network/i.test(msg)) {
    return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่'
  }
  return 'ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง หรือไม่มีสิทธิ์เข้าถึง'
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
/*  Floating-label field styles                                        */
/*  - label ลอยขึ้นเมื่อ focus / มีค่า / ถูก autofill                     */
/*  - ปิดสีฟ้าเทาของ Chrome autofill ให้กลืนกับธีม (ใช้ transition trick)   */
/*  เขียนเป็น CSS ล้วน ไม่พึ่งชื่อ token จึงใช้ได้กับทุกธีม/Dark Mode       */
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

/* ------------------------------------------------------------------ */

export default function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [capsOn, setCapsOn] = useState(false)
  const [notice, setNotice] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  const identifierRef = useRef(null)
  const passwordRef = useRef(null)

  const navigate = useNavigate()
  const { user } = useAuth()

  const notify = (type, message) => setNotice({ id: Date.now(), type, message })
  const closeNotice = useCallback(() => setNotice(null), [])

  // เอฟเฟกต์เข้าฉากครั้งเดียวตอนโหลดหน้า
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // หากล็อกอินอยู่แล้ว ให้ Redirect ไปที่ Dashboard ทันที
  useEffect(() => {
    document.title = 'Login | SEWORK'
    if (user) {
      navigate('/sework/se-console/dashboard', { replace: true })
    }
  }, [user, navigate])

  const checkCaps = (e) => setCapsOn(Boolean(e.getModifierState?.('CapsLock')))

  const handleLogin = async (e) => {
    e.preventDefault()
    if (loading) return

    // อ่านค่าจาก DOM โดยตรง เผื่อ Chrome autofill ยังไม่ได้ trigger onChange
    const idValue = (identifierRef.current?.value ?? identifier).trim()
    const pwValue = passwordRef.current?.value ?? password

    if (!idValue) {
      notify('error', 'กรุณากรอกอีเมลหรือชื่อผู้ใช้')
      identifierRef.current?.focus()
      return
    }
    if (!pwValue) {
      notify('error', 'กรุณากรอกรหัสผ่าน')
      passwordRef.current?.focus()
      return
    }

    try {
      setLoading(true)
      setNotice(null)

      const candidates = buildCandidates(idValue)
      let lastError = null

      for (const email of candidates) {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pwValue })

        if (!error) {
          // จำโดเมนที่สำเร็จไว้ ครั้งหน้าจะลองโดเมนนี้ก่อน
          try {
            localStorage.setItem(LAST_DOMAIN_KEY, email.split('@')[1])
          } catch {
            /* ignore */
          }
          // สำเร็จ: AuthContext จะจับการเปลี่ยนแปลง Session แล้ว useEffect ด้านบนจะ Redirect ให้
          return
        }

        lastError = error
        // ลองโดเมนถัดไปเฉพาะกรณี "รหัสไม่ตรง/ไม่พบบัญชี" เท่านั้น
        // ถ้าเป็น error อื่น (เน็ตหลุด, โดน rate limit ฯลฯ) หยุดทันที
        if (!isInvalidCredentials(error)) break
      }

      throw lastError
    } catch (err) {
      console.error('Login Error:', err?.message)
      notify('error', getFriendlyError(err))
      passwordRef.current?.focus()
      passwordRef.current?.select()
    } finally {
      setLoading(false)
    }
  }

  const hasBareUsername = identifier.trim() !== '' && !identifier.includes('@')

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
          <header className="mb-8 text-center">
            <Link
              to="/sework/landing"
              aria-label="กลับสู่หน้าหลัก SE-Work"
              className="mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-[20px] bg-black shadow-sm transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-se-primary/30 motion-reduce:transition-none motion-reduce:hover:scale-100"
            >
              <img src="/logo.png" alt="" className="h-11 w-11 object-contain" />
            </Link>
            <h1 className="text-[30px] font-semibold leading-tight tracking-tight text-se-text-main">
              Sign in to SEWORK
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-se-text-muted">
              ใช้บัญชีที่ได้รับอนุญาตเพื่อเข้าสู่ระบบ
            </p>
          </header>

          <form onSubmit={handleLogin} noValidate>
            {/* ช่องกรอกแบบ grouped (เหมือนหน้า Apple Account) */}
            <div className="overflow-hidden rounded-2xl border border-se-border bg-se-surface transition focus-within:border-se-primary focus-within:ring-4 focus-within:ring-se-primary/20">
              <div className="relative">
                <input
                  ref={identifierRef}
                  id="identifier"
                  name="username"
                  type="text"
                  inputMode="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  aria-describedby="login-hint"
                  placeholder=" "
                  className={fieldClass}
                />
                <label htmlFor="identifier" className="sw-label text-se-text-muted">
                  Email or Username
                </label>
              </div>

              <div className="relative border-t border-se-border">
                <input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={checkCaps}
                  onKeyUp={checkCaps}
                  onBlur={() => setCapsOn(false)}
                  placeholder=" "
                  className={`${fieldClass} pr-14`}
                />
                <label htmlFor="password" className="sw-label text-se-text-muted">
                  Password
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
            </div>

            {/* ข้อความช่วยเหลือใต้ช่องกรอก */}
            <p
              id="login-hint"
              aria-live="polite"
              className={`mt-3 min-h-[2.5rem] px-1 text-[13px] leading-snug ${
                capsOn ? 'text-se-danger' : 'text-se-text-muted'
              }`}
            >
              {capsOn
                ? 'Caps Lock เปิดอยู่ รหัสผ่านอาจพิมพ์ผิดตัวพิมพ์ใหญ่-เล็ก'
                : hasBareUsername
                  ? 'ระบบจะเติมโดเมนให้อัตโนมัติ (@live.rmutl.ac.th @rmutl.ac.th @seone.site etc.)'
                  : 'พิมพ์เฉพาะชื่อผู้ใช้ได้เลย ไม่ต้องใส่ @live.rmutl.ac.th, @rmutl.ac.th หรือ @seone.site'}
            </p>

            <button
              type="submit"
              disabled={loading}
              className="mt-3 flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-se-primary text-[17px] font-medium text-white transition-all hover:bg-se-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-se-primary/30 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100"
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

          <div className="mt-6 text-center">
            <Link to="/sework/forgot-password" className={`${linkClass} text-se-primary hover:underline`}>
              Forgot password?
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/sework/landing"
            className={`${linkClass} text-se-text-muted transition-colors hover:text-se-text-main`}
          >
            &larr; กลับสู่หน้าหลัก SE-Work
          </Link>
        </div>
      </main>
    </div>
  )
}