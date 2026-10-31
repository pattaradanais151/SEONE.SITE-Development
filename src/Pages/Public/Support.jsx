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
  'w-full rounded-[14px] bg-[#f5f5f7] px-4 text-[17px] text-[#1d1d1f] placeholder:text-[#a1a1a6] outline-none ring-1 transition duration-200 hover:bg-[#f0f0f3] focus:bg-white focus:ring-2 disabled:opacity-60'

function Field({ id, label, required, error, children, hint }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 flex items-baseline justify-between text-[14px] font-medium text-[#1d1d1f]">
        <span>
          {label}
          {required && <span className="ml-0.5 text-[#ff3b30]">*</span>}
        </span>
        {hint && <span className="text-[13px] font-normal text-[#86868b]">{hint}</span>}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-[13px] text-[#d70015]">
          <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M18 10A8 8 0 112 10a8 8 0 0116 0zm-8-4a.9.9 0 00-.9.99l.3 4a.6.6 0 001.2 0l.3-4A.9.9 0 0010 6zm0 8.2a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}

const perks = [
  {
    title: 'ตอบกลับทางอีเมล',
    desc: 'เราจะส่งคำตอบไปที่อีเมลที่คุณกรอกไว้',
    icon: <path d="M3 8l9 6 9-6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />,
    tint: 'from-[#5ab0ff] to-[#0071e3]',
  },
  {
    title: 'ข้อมูลปลอดภัย',
    desc: 'ใช้เพื่อการตอบกลับเรื่องนี้เท่านั้น',
    icon: <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3zm-3 9l2 2 4-4" />,
    tint: 'from-[#6bea9f] to-[#1fb45a]',
  },
  {
    title: 'บอกให้ละเอียด',
    desc: 'ยิ่งอธิบายชัด ยิ่งช่วยได้เร็วขึ้น',
    icon: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />,
    tint: 'from-[#c4a6ff] to-[#7c3aed]',
  },
]

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
    errors[name] ? 'ring-[#ff3b30] focus:ring-[#ff3b30]' : 'ring-black/[0.08] focus:ring-[#0071e3]'

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

  const sending = status === 'sending'

  return (
    <div className="w-full flex-grow bg-[#f5f5f7] text-[#1d1d1f]">
      <style>{`
        @keyframes se-hero { from { opacity: 0; transform: translateY(22px); filter: blur(6px); } to { opacity: 1; transform: none; filter: blur(0); } }
        @keyframes se-float { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(0,-24px,0) scale(1.06); } }
        @keyframes se-pop { 0% { transform: scale(.6); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); } }
        @keyframes se-draw { to { stroke-dashoffset: 0; } }
        .se-hero { opacity: 0; animation: se-hero 1s cubic-bezier(.28,.11,.32,1) forwards; }
        .se-float { animation: se-float 14s ease-in-out infinite; }
        .se-pop { animation: se-pop .6s cubic-bezier(.28,.11,.32,1) forwards; }
        .se-check { stroke-dasharray: 26; stroke-dashoffset: 26; animation: se-draw .5s .3s ease-out forwards; }
        @media (prefers-reduced-motion: reduce) {
          .se-hero { animation: none; opacity: 1; }
          .se-float, .se-pop { animation: none; }
          .se-check { animation: none; stroke-dashoffset: 0; }
        }
      `}</style>

      {/* ============================ HERO ============================ */}
      <section className="relative overflow-hidden bg-[#fbfbfd]">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="se-float absolute -left-24 top-0 h-[320px] w-[320px] rounded-full bg-[#7dbdff]/40 blur-[90px]" />
          <div className="se-float absolute -right-20 top-16 h-[340px] w-[340px] rounded-full bg-[#c4a6ff]/40 blur-[100px]" style={{ animationDelay: '-6s' }} />
        </div>

        <div className="relative mx-auto max-w-[1024px] px-5 pb-16 pt-20 text-center md:pb-24 md:pt-32">
          <p className="se-hero text-[17px] font-semibold text-[#6e6e73] md:text-[21px]">Support</p>
          <h1
            className="se-hero mt-3 text-[48px] font-semibold leading-[1.05] tracking-[-0.045em] sm:text-[72px] md:text-[88px]"
            style={{ animationDelay: '100ms' }}
          >
            ติดต่อ
            <span className="bg-gradient-to-r from-[#0071e3] via-[#5e5ce6] to-[#bf5af2] bg-clip-text text-transparent">ทีมงาน.</span>
          </h1>
          <p
            className="se-hero mx-auto mt-6 max-w-[620px] text-[19px] font-medium leading-[1.55] tracking-[-0.01em] text-[#6e6e73] md:text-[24px]"
            style={{ animationDelay: '220ms' }}
          >
            พบปัญหาหรือมีข้อเสนอแนะ? กรอกแบบฟอร์มด้านล่าง เราจะตอบกลับไปทางอีเมลของคุณ
          </p>
        </div>
      </section>

      {/* ============================ CONTENT ============================ */}
      <div className="mx-auto grid max-w-[1024px] items-start gap-6 px-5 pb-20 pt-4 md:grid-cols-[300px_1fr] md:pb-32 md:pt-10">
        {/* Side info */}
        <aside className="se-hero order-2 space-y-3 md:sticky md:top-24 md:order-1" style={{ animationDelay: '300ms' }}>
          {perks.map((p) => (
            <div key={p.title} className="flex items-start gap-4 rounded-[22px] bg-white p-5 ring-1 ring-black/[0.04]">
              <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-br ${p.tint} shadow-[0_6px_16px_rgba(0,0,0,0.12)]`}>
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  {p.icon}
                </svg>
              </div>
              <div>
                <p className="text-[16px] font-semibold tracking-[-0.01em]">{p.title}</p>
                <p className="mt-0.5 text-[14px] leading-[1.5] text-[#6e6e73]">{p.desc}</p>
              </div>
            </div>
          ))}
        </aside>

        {/* Form card */}
        <div
          className="se-hero order-1 rounded-[32px] bg-white p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)] ring-1 ring-black/[0.04] sm:p-10 md:order-2"
          style={{ animationDelay: '260ms' }}
        >
          {status === 'success' ? (
            <div className="py-10 text-center" role="status">
              <div className="se-pop mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#6bea9f] to-[#1fb45a] shadow-[0_14px_34px_rgba(31,180,90,0.35)]">
                <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path className="se-check" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-7 text-[30px] font-semibold tracking-[-0.03em] md:text-[36px]">ส่งข้อความเรียบร้อยแล้ว</h2>
              <p className="mx-auto mt-3 max-w-[420px] text-[17px] leading-[1.6] text-[#6e6e73]">
                ขอบคุณที่ติดต่อเรา ทีมงานจะตอบกลับไปที่{' '}
                <span className="font-medium text-[#1d1d1f]">{values.email || 'อีเมลของคุณ'}</span>
              </p>
              <button
                type="button"
                onClick={reset}
                className="mt-8 rounded-full px-4 py-2 text-[17px] text-[#0066cc] underline-offset-4 hover:underline focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/30"
              >
                ส่งข้อความอีกครั้ง <span aria-hidden>›</span>
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="space-y-5">
              <div>
                <h2 className="text-[26px] font-semibold tracking-[-0.03em] md:text-[32px]">ส่งข้อความถึงเรา</h2>
                <p className="mt-1 text-[15px] text-[#6e6e73]">ช่องที่มีเครื่องหมาย <span className="text-[#ff3b30]">*</span> จำเป็นต้องกรอก</p>
              </div>

              <div className="grid grid-cols-1 gap-5 pt-2 sm:grid-cols-2">
                <Field id="firstName" label="ชื่อ" required error={errors.firstName}>
                  <input
                    id="firstName"
                    type="text"
                    autoComplete="given-name"
                    value={values.firstName}
                    onChange={set('firstName')}
                    maxLength={60}
                    disabled={sending}
                    className={`${inputBase} h-12 ${ringClass('firstName')}`}
                  />
                </Field>
                <Field id="lastName" label="นามสกุล" required error={errors.lastName}>
                  <input
                    id="lastName"
                    type="text"
                    autoComplete="family-name"
                    value={values.lastName}
                    onChange={set('lastName')}
                    maxLength={60}
                    disabled={sending}
                    className={`${inputBase} h-12 ${ringClass('lastName')}`}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field id="nickname" label="ชื่อเล่น" hint="ไม่บังคับ" error={errors.nickname}>
                  <input
                    id="nickname"
                    type="text"
                    autoComplete="nickname"
                    value={values.nickname}
                    onChange={set('nickname')}
                    maxLength={40}
                    disabled={sending}
                    className={`${inputBase} h-12 ${ringClass('nickname')}`}
                  />
                </Field>
                <Field id="email" label="อีเมลสำหรับตอบกลับ" required error={errors.email}>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={values.email}
                    onChange={set('email')}
                    maxLength={120}
                    placeholder="name@example.com"
                    disabled={sending}
                    className={`${inputBase} h-12 ${ringClass('email')}`}
                  />
                </Field>
              </div>

              <Field id="subject" label="หัวข้อ" required error={errors.subject}>
                <input
                  id="subject"
                  type="text"
                  value={values.subject}
                  onChange={set('subject')}
                  maxLength={120}
                  placeholder="เช่น ปัญหาการเข้าสู่ระบบ"
                  disabled={sending}
                  className={`${inputBase} h-12 ${ringClass('subject')}`}
                />
              </Field>

              <Field
                id="message"
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
                  disabled={sending}
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
                <div role="alert" className="flex items-start gap-3 rounded-[16px] bg-[#ff3b30]/10 px-4 py-3.5 text-[15px] leading-[1.5] text-[#d70015]">
                  <svg className="mt-0.5 h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path fillRule="evenodd" d="M18 10A8 8 0 112 10a8 8 0 0116 0zm-8-4a.9.9 0 00-.9.99l.3 4a.6.6 0 001.2 0l.3-4A.9.9 0 0010 6zm0 8.2a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={sending}
                className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#0071e3] text-[17px] font-medium text-white shadow-[0_10px_24px_-10px_rgba(0,113,227,0.7)] transition duration-200 hover:bg-[#0077ed] active:scale-[0.99] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/40 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {sending ? (
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