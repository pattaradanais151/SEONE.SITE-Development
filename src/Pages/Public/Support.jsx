import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const MAX_MESSAGE = 1500
const COOLDOWN_MS = 60 * 1000
const COOLDOWN_KEY = 'se-support-last'

const initialValues = {
  firstName: '',
  lastName: '',
  nickname: '',
  email: '',
  subject: '',
  message: '',
  website: '', // honeypot: ผู้ใช้จริงมองไม่เห็นและไม่กรอก บอทมักกรอก
}

function validate(v) {
  const e = {}
  if (!v.firstName.trim()) e.firstName = 'กรุณากรอกชื่อ'
  if (!v.lastName.trim()) e.lastName = 'กรุณากรอกนามสกุล'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = 'รูปแบบอีเมลไม่ถูกต้อง'
  if (v.subject.trim().length < 3) e.subject = 'กรุณากรอกหัวข้ออย่างน้อย 3 ตัวอักษร'
  if (v.message.trim().length < 10) e.message = 'กรุณาอธิบายรายละเอียดอย่างน้อย 10 ตัวอักษร'
  return e
}

const inputBase =
  'w-full rounded-[14px] bg-white px-4 text-[17px] text-[#1d1d1f] placeholder:text-[#a1a1a6] outline-none ring-1 transition focus:ring-2 disabled:opacity-60'

function Field({ label, required, error, children, hint }) {
  return (
    <div>
      <label className="mb-1.5 flex items-baseline justify-between text-[13px] font-medium text-[#1d1d1f]">
        <span>
          {label}
          {required && <span className="ml-0.5 text-[#ff3b30]">*</span>}
        </span>
        {hint && <span className="font-normal text-[#86868b]">{hint}</span>}
      </label>
      {children}
      {error && <p className="mt-1.5 text-[13px] text-[#ff3b30]">{error}</p>}
    </div>
  )
}

export default function Support() {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | sending | success | error
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    document.title = 'Support | SE-ONE'
  }, [])

  const set = (name) => (e) => {
    setValues((v) => ({ ...v, [name]: e.target.value }))
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }))
  }

  const ringClass = (name) =>
    errors[name] ? 'ring-[#ff3b30] focus:ring-[#ff3b30]' : 'ring-black/[0.12] focus:ring-[#0071e3]'

  const onSubmit = async (e) => {
    e.preventDefault()
    if (status === 'sending') return

    // honeypot: ถ้ามีค่า ให้ทำเป็นสำเร็จเงียบ ๆ โดยไม่ส่งจริง
    if (values.website) {
      setStatus('success')
      return
    }

    const v = validate(values)
    setErrors(v)
    if (Object.keys(v).length > 0) return

    // กันกดส่งรัวฝั่งผู้ใช้ (ฝั่งเซิร์ฟเวอร์มี rate limit อีกชั้น)
    try {
      const last = Number(localStorage.getItem(COOLDOWN_KEY) || 0)
      if (Date.now() - last < COOLDOWN_MS) {
        setErrorMsg('คุณเพิ่งส่งข้อความไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง')
        setStatus('error')
        return
      }
    } catch {
      /* ignore */
    }

    setStatus('sending')
    setErrorMsg('')

    const { error } = await supabase.functions.invoke('support-discord', {
      body: {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        nickname: values.nickname.trim(),
        email: values.email.trim(),
        subject: values.subject.trim(),
        message: values.message.trim(),
        website: values.website,
      },
    })

    if (error) {
      const code = error?.context?.status
      setErrorMsg(
        code === 429
          ? 'ส่งข้อความถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง'
          : 'ส่งข้อความไม่สำเร็จ กรุณาลองใหม่อีกครั้งในภายหลัง'
      )
      setStatus('error')
      return
    }

    try {
      localStorage.setItem(COOLDOWN_KEY, String(Date.now()))
    } catch {
      /* ignore */
    }
    setStatus('success')
  }

  const reset = () => {
    setValues(initialValues)
    setErrors({})
    setErrorMsg('')
    setStatus('idle')
  }

  return (
    <div className="w-full flex-grow bg-[#f5f5f7]">
      <style>{`
        @keyframes se-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        .se-rise { opacity: 0; animation: se-rise .85s cubic-bezier(.28,.11,.32,1) forwards; }
        @media (prefers-reduced-motion: reduce) { .se-rise { animation: none; opacity: 1; } }
      `}</style>

      {/* Hero */}
      <section className="bg-[#fbfbfd]">
        <div className="mx-auto max-w-[1024px] px-5 pb-14 pt-20 text-center md:pb-20 md:pt-28">
          <p className="se-rise mb-4 text-[17px] font-semibold text-[#6e6e73] md:text-[21px]">Support</p>
          <h1
            className="se-rise text-[44px] font-semibold leading-[1.08] tracking-[-0.04em] sm:text-[64px] md:text-[80px]"
            style={{ animationDelay: '80ms' }}
          >
            ติดต่อ{' '}
            <span className="bg-gradient-to-r from-[#0071e3] to-[#5e5ce6] bg-clip-text text-transparent">ทีมงาน</span>
          </h1>
          <p
            className="se-rise mx-auto mt-5 max-w-[640px] text-[19px] font-medium leading-[1.55] tracking-[-0.01em] text-[#6e6e73] md:text-[24px]"
            style={{ animationDelay: '160ms' }}
          >
            พบปัญหาหรือมีข้อเสนอแนะ? กรอกแบบฟอร์มด้านล่าง เราจะตอบกลับไปทางอีเมลของคุณ
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[680px] px-5 py-12 md:py-16">
        <div
          className="se-rise rounded-[28px] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] sm:p-10"
          style={{ animationDelay: '220ms' }}
        >
          {status === 'success' ? (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#34c759]/15">
                <svg className="h-8 w-8 text-[#248a3d]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-6 text-[28px] font-semibold tracking-[-0.025em]">ส่งข้อความเรียบร้อยแล้ว</h2>
              <p className="mx-auto mt-3 max-w-[420px] text-[17px] leading-[1.6] text-[#6e6e73]">
                ขอบคุณที่ติดต่อเรา ทีมงานจะตอบกลับไปที่{' '}
                <span className="font-medium text-[#1d1d1f]">{values.email || 'อีเมลของคุณ'}</span>
              </p>
              <button
                type="button"
                onClick={reset}
                className="mt-8 text-[17px] text-[#0066cc] underline-offset-4 hover:underline"
              >
                ส่งข้อความอีกครั้ง <span aria-hidden>›</span>
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="ชื่อ" required error={errors.firstName}>
                  <input
                    id="firstName"
                    type="text"
                    autoComplete="given-name"
                    value={values.firstName}
                    onChange={set('firstName')}
                    maxLength={60}
                    disabled={status === 'sending'}
                    className={`${inputBase} h-12 ${ringClass('firstName')}`}
                  />
                </Field>
                <Field label="นามสกุล" required error={errors.lastName}>
                  <input
                    id="lastName"
                    type="text"
                    autoComplete="family-name"
                    value={values.lastName}
                    onChange={set('lastName')}
                    maxLength={60}
                    disabled={status === 'sending'}
                    className={`${inputBase} h-12 ${ringClass('lastName')}`}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="ชื่อเล่น" hint="ไม่บังคับ" error={errors.nickname}>
                  <input
                    id="nickname"
                    type="text"
                    autoComplete="nickname"
                    value={values.nickname}
                    onChange={set('nickname')}
                    maxLength={40}
                    disabled={status === 'sending'}
                    className={`${inputBase} h-12 ${ringClass('nickname')}`}
                  />
                </Field>
                <Field label="อีเมลสำหรับตอบกลับ" required error={errors.email}>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={values.email}
                    onChange={set('email')}
                    maxLength={120}
                    placeholder="name@example.com"
                    disabled={status === 'sending'}
                    className={`${inputBase} h-12 ${ringClass('email')}`}
                  />
                </Field>
              </div>

              <Field label="หัวข้อ" required error={errors.subject}>
                <input
                  id="subject"
                  type="text"
                  value={values.subject}
                  onChange={set('subject')}
                  maxLength={120}
                  placeholder="เช่น ปัญหาการเข้าสู่ระบบ"
                  disabled={status === 'sending'}
                  className={`${inputBase} h-12 ${ringClass('subject')}`}
                />
              </Field>

              <Field
                label="รายละเอียด"
                required
                error={errors.message}
                hint={`${values.message.length}/${MAX_MESSAGE}`}
              >
                <textarea
                  id="message"
                  rows={6}
                  value={values.message}
                  onChange={set('message')}
                  maxLength={MAX_MESSAGE}
                  placeholder="อธิบายปัญหาหรือสิ่งที่ต้องการให้เราช่วยเหลือ"
                  disabled={status === 'sending'}
                  className={`${inputBase} resize-y py-3 leading-[1.6] ${ringClass('message')}`}
                />
              </Field>

              {/* Honeypot — ซ่อนจากผู้ใช้จริง */}
              <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
                <label>
                  Website
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={values.website}
                    onChange={set('website')}
                  />
                </label>
              </div>

              {status === 'error' && (
                <div role="alert" className="rounded-[14px] bg-[#ff3b30]/10 px-4 py-3 text-[14px] text-[#d70015]">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0071e3] text-[17px] text-white transition-colors hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status === 'sending' ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    กำลังส่ง...
                  </>
                ) : (
                  'ส่งข้อความ'
                )}
              </button>

              <p className="text-center text-[12px] leading-[1.6] text-[#86868b]">
                ข้อมูลของคุณจะถูกใช้เพื่อการตอบกลับเรื่องนี้เท่านั้น
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}