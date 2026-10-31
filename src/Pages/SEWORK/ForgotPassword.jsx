import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
// โดเมนอีเมลที่รองรับ (ถ้าผู้ใช้พิมพ์แค่ username ระบบจะส่งลิงก์ไปทุกโดเมน
// แต่มีเฉพาะบัญชีที่มีอยู่จริงเท่านั้นที่จะได้รับอีเมล)
const EMAIL_DOMAINS = ['live.rmutl.ac.th', 'rmutl.ac.th', 'seone.site']

// ⚠️ หน้าปลายทางหลังกดลิงก์ในอีเมล — ถ้าโปรเจกต์มี route ของหน้า NewPassword
// (เช่น '/sework/new-password') ให้เปลี่ยนค่านี้เป็น route นั้น
const RESET_REDIRECT_PATH = '/sework/login'

// Supabase จำกัดการขออีเมลรีเซ็ตซ้ำต่อบัญชีที่ ~60 วินาที
const RESEND_SECONDS = 60

/** แปลง input ของผู้ใช้เป็นรายการอีเมลที่จะส่งลิงก์ไป */
function buildCandidates(raw) {
  const id = raw.trim().toLowerCase().replace(/@+$/, '')
  if (!id) return []
  if (id.includes('@')) return [id]
  return EMAIL_DOMAINS.map((d) => `${id}@${d}`)
}

const isRateLimited = (err) =>
  err?.status === 429 ||
  err?.code === 'over_email_send_rate_limit' ||
  err?.code === 'over_request_rate_limit'

async function sendResetLinks(raw) {
  const redirectTo = `${window.location.origin}${RESET_REDIRECT_PATH}`
  const results = await Promise.all(
    buildCandidates(raw).map((email) => supabase.auth.resetPasswordForEmail(email, { redirectTo })),
  )
  const errors = results.map((r) => r.error).filter(Boolean)

  // Supabase ไม่บอกว่าอีเมลมีในระบบหรือไม่ (กัน enumeration) จึงถือว่าสำเร็จ
  // ยกเว้นเจอ rate limit หรือทุกคำขอล้มเหลว
  const rateLimited = errors.find(isRateLimited)
  if (rateLimited) throw rateLimited
  if (errors.length === results.length) throw errors[0]
}

function getFriendlyError(err) {
  const msg = err?.message || ''
  if (isRateLimited(err)) {
    return 'ขอลิงก์ได้ครั้งละหนึ่งครั้งต่อนาที กรุณารอสักครู่แล้วลองใหม่อีกครั้ง'
  }
  if (err?.name === 'AuthRetryableFetchError' || /failed to fetch|network/i.test(msg)) {
    return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่'
  }
  return 'ส่งลิงก์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
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

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('')
  const [submittedId, setSubmittedId] = useState('')
  const [notice, setNotice] = useState(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [mounted, setMounted] = useState(false)

  const identifierRef = useRef(null)

  const notify = (type, message) => setNotice({ id: Date.now(), type, message })
  const closeNotice = useCallback(() => setNotice(null), [])

  useEffect(() => {
    document.title = 'Forgot Password | SEWORK'
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // นับถอยหลังปุ่ม "ส่งอีกครั้ง"
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const requestLink = async (idValue, { resend = false } = {}) => {
    try {
      setLoading(true)
      setNotice(null)

      await sendResetLinks(idValue)

      setSubmittedId(idValue)
      setSent(true)
      setCooldown(RESEND_SECONDS)
      if (resend) notify('success', 'ส่งลิงก์อีกครั้งแล้ว')
    } catch (err) {
      console.error('Reset Password Error:', err?.message)
      notify('error', getFriendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = (e) => {
    e.preventDefault()
    if (loading) return

    // อ่านจาก DOM โดยตรง เผื่อ Chrome autofill ยังไม่ได้ trigger onChange
    const idValue = (identifierRef.current?.value ?? identifier).trim()
    if (!idValue) {
      notify('error', 'กรุณากรอกอีเมลหรือชื่อผู้ใช้')
      identifierRef.current?.focus()
      return
    }
    requestLink(idValue)
  }

  const handleResend = () => {
    if (loading || cooldown > 0) return
    requestLink(submittedId, { resend: true })
  }

  const handleChangeAccount = () => {
    setSent(false)
    setCooldown(0)
    setNotice(null)
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
            {sent ? (
              <div className="mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-se-primary/10 text-se-primary">
                <svg className="h-9 w-9" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2.5" />
                  <path d="M3.5 7.5l8.5 6 8.5-6" />
                </svg>
              </div>
            ) : (
              <Link
                to="/sework/landing"
                aria-label="กลับสู่หน้าหลัก SE-Work"
                className="mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-[20px] bg-black shadow-sm transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-se-primary/30 motion-reduce:transition-none motion-reduce:hover:scale-100"
              >
                <img src="/logo.png" alt="" className="h-11 w-11 object-contain" />
              </Link>
            )}

            <h1 className="text-[30px] font-semibold leading-tight tracking-tight text-se-text-main">
              {sent ? 'Check your email' : 'Reset Password'}
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-se-text-muted">
              {sent ? (
                <>
                  หากบัญชี <span className="break-all font-medium text-se-text-main">{submittedId}</span>{' '}
                  อยู่ในระบบ เราได้ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านให้แล้ว (โปรดตรวจสอบในกล่องข้อความขยะด้วย)
                </>
              ) : (
                'กรอกอีเมลหรือชื่อผู้ใช้ของคุณเพื่อรับลิงก์รีเซ็ตรหัสผ่าน'
              )}
            </p>
          </header>

          {sent ? (
            <div>
              <button
                type="button"
                onClick={handleResend}
                disabled={loading || cooldown > 0}
                className="flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-se-surface text-[17px] font-medium text-se-primary ring-1 ring-se-border transition-colors hover:bg-se-border/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-se-primary/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-se-surface"
              >
                {loading && <Spinner />}
                {loading
                  ? 'Sending link...'
                  : cooldown > 0
                    ? `ส่งอีกครั้งได้ใน ${cooldown} วินาที`
                    : 'Resend Link'}
              </button>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={handleChangeAccount}
                  className={`${linkClass} text-se-primary hover:underline`}
                >
                  ใช้อีเมลหรือชื่อผู้ใช้อื่น
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleReset} noValidate>
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
                    aria-describedby="reset-hint"
                    placeholder=" "
                    className={fieldClass}
                  />
                  <label htmlFor="identifier" className="sw-label text-se-text-muted">
                    Email or Username
                  </label>
                </div>
              </div>

              <p
                id="reset-hint"
                aria-live="polite"
                className="mt-3 min-h-[2.5rem] px-1 text-[13px] leading-snug text-se-text-muted"
              >
                {hasBareUsername
                  ? 'ระบบจะส่งลิงก์ไปยังบัญชีที่มีอยู่จริงใน @live.rmutl.ac.th, @rmutl.ac.th หรือ @seone.site'
                  : 'พิมพ์เฉพาะชื่อผู้ใช้ได้เลย ไม่ต้องใส่ @live.rmutl.ac.th, @rmutl.ac.th หรือ @seone.site'}
              </p>

              <button
                type="submit"
                disabled={loading}
                className="mt-3 flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-se-primary text-[17px] font-medium text-white transition-all hover:bg-se-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-se-primary/30 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                {loading && <Spinner />}
                {loading ? 'Sending link...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/sework/login"
            className={`${linkClass} text-se-text-muted transition-colors hover:text-se-text-main`}
          >
            &larr; กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </main>
    </div>
  )
}