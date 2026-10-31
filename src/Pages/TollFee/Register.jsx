import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

/* =====================================================================
 * Config
 * ---------------------------------------------------------------------
 * หน้านี้เป็นหน้าสาธารณะ — การตรวจผู้แนะนำ, การล็อก 24 ชม., การสร้างบัญชี,
 * การอัปโหลดรูป และการแจ้ง Discord ทำที่ Edge Function "public-register" ทั้งหมด
 * (ฝั่งหน้าเว็บทำแค่ตรวจเบื้องต้นให้ผู้ใช้เห็นข้อผิดพลาดเร็วขึ้น ไม่ใช่ด่านป้องกัน)
 * ===================================================================== */
const REGISTER_FUNCTION = 'public-register'

const SECS = [
  { value: 'SEC 1', label: 'SEC 1 (ปกติ)' },
  { value: 'SEC 2', label: 'SEC 2 (เทียบโอน)' },
]
const YEAR_LEVELS = [1, 2, 3, 4]
const TOAST_MS = 4500

const MIN_PASSWORD = 6
const MAX_PASSWORD = 72
const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const MAX_REFERRER_FAILS = 2
const LOCK_HOURS = 24

// อีเมลสมัครได้เฉพาะโดเมนมหาวิทยาลัย RMUTL 2 โดเมนนี้เท่านั้น
const ALLOWED_EMAIL_DOMAINS = ['@live.rmutl.ac.th', '@rmutl.ac.th']
const EMAIL_LOCAL_REGEX = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ลงทะเบียนได้เฉพาะระดับ ADMIN เท่านั้น (Server บังคับซ้ำอีกชั้น)
const REGISTER_ROLE = 'admin'

const DEVICE_KEY = 'se_register_device'
const LOCK_STORAGE_KEY = 'se_register_lock_until'

const EMPTY_FORM = {
  referrer_email: '',
  email_local: '',
  email_domain: ALLOWED_EMAIL_DOMAINS[0],
  password: '',
  confirmPassword: '',
  first_name: '',
  last_name: '',
  nickname: '',
  tel: '',
  year_level: '1',
  sec: 'SEC 1',
  facebook: '',
  instagram: '',
  github_account: '',
}

// ลำดับช่องสำหรับโฟกัสช่องแรกที่ผิดพลาด (key ของ error → id ของ input)
const FIELD_IDS = {
  referrer: 'rg-referrer',
  email: 'rg-email',
  password: 'rg-password',
  confirmPassword: 'rg-confirm',
  first_name: 'rg-first',
  last_name: 'rg-last',
  nickname: 'rg-nick',
  facebook: 'rg-fb',
  github_account: 'rg-gh',
  file: 'rg-file',
}

/* =====================================================================
 * Helpers
 * ===================================================================== */
const buildEmail = (f) => `${f.email_local.trim().toLowerCase()}${f.email_domain}`

// localStorage อาจใช้ไม่ได้ (โหมดส่วนตัว ฯลฯ) — ห่อ try/catch เสมอ
const store = {
  get: (k) => {
    try {
      return window.localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set: (k, v) => {
    try {
      window.localStorage.setItem(k, v)
    } catch {
      /* ignore */
    }
  },
  remove: (k) => {
    try {
      window.localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  },
}

// รหัสอุปกรณ์แบบสุ่ม ใช้เป็นคีย์ล็อกอีกชั้นนอกเหนือจาก IP (Server เป็นผู้ตัดสินล็อกจริง)
let memoryDeviceId = null
const getDeviceId = () => {
  const saved = store.get(DEVICE_KEY)
  if (saved && /^[A-Za-z0-9-]{16,64}$/.test(saved)) return saved
  if (memoryDeviceId) return memoryDeviceId

  const fresh =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
  memoryDeviceId = fresh
  store.set(DEVICE_KEY, fresh)
  return fresh
}

const readLocalLock = () => {
  const v = store.get(LOCK_STORAGE_KEY)
  if (!v) return null
  const t = new Date(v).getTime()
  if (!Number.isFinite(t) || t <= Date.now()) {
    store.remove(LOCK_STORAGE_KEY)
    return null
  }
  return v
}

// เรียก Edge Function และดึงผลลัพธ์ JSON ออกมาให้ได้ทั้งกรณีสำเร็จและ error
const callRegisterFunction = async (body) => {
  const { data, error } = await supabase.functions.invoke(REGISTER_FUNCTION, { body })
  if (error) {
    let parsed = null
    try {
      parsed = await error.context?.json?.()
    } catch {
      /* ไม่ใช่ JSON */
    }
    if (parsed && typeof parsed === 'object') return parsed
    throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
  }
  return data
}

const formatRemaining = (ms) => {
  const totalMin = Math.max(0, Math.ceil(ms / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return `${h} ชั่วโมง ${m} นาที`
  return `${m} นาที`
}

const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })

/* =====================================================================
 * Page
 * ===================================================================== */
export default function Register() {
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  const [done, setDone] = useState(null) // { email, needsEmailConfirmation }

  // ล็อกการสมัคร: lockedUntil = ISO string | null
  const [lockedUntil, setLockedUntil] = useState(() => readLocalLock())
  const [now, setNow] = useState(() => Date.now())
  const [checkingLock, setCheckingLock] = useState(true)

  const toastTimer = useRef(null)
  const emailRef = useRef(null)
  const honeyRef = useRef(null)

  const isLocked = Boolean(lockedUntil) && new Date(lockedUntil).getTime() > now

  /* ---------- Toast ---------- */
  const showToast = useCallback((type, message) => {
    clearTimeout(toastTimer.current)
    setToast({ type, message })
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  useEffect(() => {
    document.title = 'สมัครสมาชิก | SE-CONSOLE'
  }, [])

  /* ---------- Lock state ---------- */
  const applyLock = useCallback((iso) => {
    if (iso) {
      store.set(LOCK_STORAGE_KEY, iso)
      setLockedUntil(iso)
    } else {
      store.remove(LOCK_STORAGE_KEY)
      setLockedUntil(null)
    }
  }, [])

  // ถามสถานะล็อกจาก Server ตอนเปิดหน้า (Server เป็นตัวตัดสิน ไม่ใช่ localStorage)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await callRegisterFunction({ action: 'status', deviceId: getDeviceId() })
        if (cancelled) return
        if (res?.success) applyLock(res.locked ? res.lockedUntil : null)
      } catch (err) {
        // ติดต่อ Server ไม่ได้ → คงสถานะจาก localStorage ไว้
        console.error('Lock status check failed:', err?.message || err)
      } finally {
        if (!cancelled) setCheckingLock(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [applyLock])

  // นับเวลาถอยหลังเฉพาะตอนถูกล็อก
  useEffect(() => {
    if (!lockedUntil) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [lockedUntil])

  // ล็อกหมดอายุ → ปลดล็อกหน้าจอ
  useEffect(() => {
    if (lockedUntil && new Date(lockedUntil).getTime() <= now) applyLock(null)
  }, [lockedUntil, now, applyLock])

  useEffect(() => {
    if (!isLocked && !checkingLock && !done) emailRef.current?.focus()
  }, [isLocked, checkingLock, done])

  /* ---------- Avatar preview ---------- */
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  /* ---------- Field handlers ---------- */
  const setField = (name) => (e) => {
    setFormData((f) => ({ ...f, [name]: e.target.value }))
    if (formErrors[name]) setFormErrors((er) => ({ ...er, [name]: undefined }))
  }

  const onReferrerChange = (e) => {
    setFormData((f) => ({ ...f, referrer_email: e.target.value.replace(/\s/g, '') }))
    if (formErrors.referrer) setFormErrors((er) => ({ ...er, referrer: undefined }))
  }

  // ช่องอีเมล: รับเฉพาะส่วนก่อน @ — ตัดตัวอักษรที่ไม่อนุญาตทิ้ง
  // ถ้าวางอีเมลเต็ม (เช่น abc@rmutl.ac.th) จะตัดส่วนหลัง @ ออก และสลับโดเมนให้ถ้าเป็น 1 ใน 2 โดเมนที่อนุญาต
  const onEmailLocalChange = (e) => {
    let value = e.target.value
    let nextDomain = null

    const at = value.indexOf('@')
    if (at !== -1) {
      const typedDomain = value.slice(at).trim().toLowerCase()
      if (ALLOWED_EMAIL_DOMAINS.includes(typedDomain)) nextDomain = typedDomain
      value = value.slice(0, at)
    }
    value = value.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase()

    setFormData((f) => ({
      ...f,
      email_local: value,
      ...(nextDomain ? { email_domain: nextDomain } : {}),
    }))
    if (formErrors.email) setFormErrors((er) => ({ ...er, email: undefined }))
  }

  const onEmailDomainChange = (e) => {
    setFormData((f) => ({ ...f, email_domain: e.target.value }))
    if (formErrors.email) setFormErrors((er) => ({ ...er, email: undefined }))
  }

  const onFileChange = (e) => {
    const picked = e.target.files?.[0] || null
    if (picked && !AVATAR_TYPES.includes(picked.type)) {
      setFile(null)
      e.target.value = ''
      return setFormErrors((er) => ({ ...er, file: 'รองรับเฉพาะรูป JPG, PNG, WEBP หรือ GIF' }))
    }
    if (picked && picked.size > MAX_AVATAR_BYTES) {
      setFile(null)
      e.target.value = ''
      return setFormErrors((er) => ({ ...er, file: 'รูปต้องมีขนาดไม่เกิน 5 MB' }))
    }
    setFile(picked)
    setFormErrors((er) => ({ ...er, file: undefined }))
  }

  /* ---------- Validation (ตรวจเบื้องต้น — Server ตรวจซ้ำทั้งหมด) ---------- */
  const validateForm = () => {
    const errs = {}

    const referrer = formData.referrer_email.trim()
    if (!referrer) errs.referrer = 'กรุณากรอกอีเมลผู้แนะนำ'
    else if (!EMAIL_REGEX.test(referrer)) errs.referrer = 'รูปแบบอีเมลผู้แนะนำไม่ถูกต้อง'

    const local = formData.email_local.trim().toLowerCase()
    if (!ALLOWED_EMAIL_DOMAINS.includes(formData.email_domain)) {
      errs.email = 'อีเมลต้องเป็น @live.rmutl.ac.th หรือ @rmutl.ac.th เท่านั้น'
    } else if (!local) {
      errs.email = 'กรุณากรอกอีเมลส่วนก่อน @'
    } else if (!EMAIL_LOCAL_REGEX.test(local) || local.includes('..')) {
      errs.email = 'ใช้ได้เฉพาะ a-z, 0-9, จุด (.), ขีดกลาง (-) และขีดล่าง (_) และต้องขึ้นต้น/ลงท้ายด้วยตัวอักษรหรือตัวเลข'
    }

    if (formData.password.length < MIN_PASSWORD) errs.password = `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD} ตัวอักษร`
    else if (formData.password.length > MAX_PASSWORD) errs.password = `รหัสผ่านต้องไม่เกิน ${MAX_PASSWORD} ตัวอักษร`
    if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'รหัสผ่านและการยืนยันไม่ตรงกัน'

    if (!formData.first_name.trim()) errs.first_name = 'กรุณากรอกชื่อจริง'
    if (!formData.last_name.trim()) errs.last_name = 'กรุณากรอกนามสกุล'
    if (!formData.nickname.trim()) errs.nickname = 'กรุณากรอกชื่อเล่น'
    if (formData.facebook.trim() && !/^https?:\/\//i.test(formData.facebook.trim())) errs.facebook = 'ต้องขึ้นต้นด้วย https://'
    if (formData.github_account.trim() && !/^https?:\/\//i.test(formData.github_account.trim())) errs.github_account = 'ต้องขึ้นต้นด้วย https://'
    if (formErrors.file) errs.file = formErrors.file
    return errs
  }

  const focusFirstError = (errs) => {
    const key = Object.keys(FIELD_IDS).find((k) => errs[k])
    if (key) document.getElementById(FIELD_IDS[key])?.focus()
  }

  /* ---------- Submit ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting || isLocked) return

    const errs = validateForm()
    setFormErrors(errs)
    if (Object.keys(errs).length > 0) return focusFirstError(errs)

    const email = buildEmail(formData)

    try {
      setSubmitting(true)

      const fd = new FormData()
      fd.append('deviceId', getDeviceId())
      fd.append('referrer_email', formData.referrer_email.trim().toLowerCase())
      fd.append('email_local', formData.email_local.trim().toLowerCase())
      fd.append('email_domain', formData.email_domain)
      fd.append('password', formData.password)
      fd.append('confirmPassword', formData.confirmPassword)
      fd.append('first_name', formData.first_name.trim())
      fd.append('last_name', formData.last_name.trim())
      fd.append('nickname', formData.nickname.trim())
      fd.append('tel', formData.tel.trim())
      fd.append('year_level', formData.year_level)
      fd.append('sec', formData.sec)
      fd.append('facebook', formData.facebook.trim())
      fd.append('instagram', formData.instagram.trim())
      fd.append('github_account', formData.github_account.trim())
      fd.append('website', honeyRef.current?.value || '') // honeypot (ช่องซ่อนสำหรับดักบอท)
      if (file) fd.append('avatar', file)

      const res = await callRegisterFunction(fd)

      if (res?.success) {
        setDone({ email, needsEmailConfirmation: Boolean(res.needsEmailConfirmation) })
        setFormData(EMPTY_FORM)
        setFile(null)
        setShowPw(false)
        applyLock(null)
        return
      }

      switch (res?.code) {
        case 'LOCKED': {
          applyLock(res.lockedUntil)
          setNow(Date.now())
          break
        }
        case 'REFERRER_NOT_FOUND': {
          const left = Number.isFinite(res.attemptsLeft) ? res.attemptsLeft : 0
          setFormErrors({
            referrer: `ไม่พบอีเมลนี้ในระบบ — เหลืออีก ${left} ครั้ง หากกรอกผิดอีกจะถูกปิดการสมัคร ${LOCK_HOURS} ชั่วโมง`,
          })
          document.getElementById(FIELD_IDS.referrer)?.focus()
          break
        }
        case 'VALIDATION':
        case 'EMAIL_EXISTS': {
          const serverErrs = res.fieldErrors || {}
          setFormErrors(serverErrs)
          focusFirstError(serverErrs)
          if (!Object.keys(serverErrs).length) showToast('error', res.error || 'ข้อมูลไม่ถูกต้อง')
          break
        }
        default:
          showToast('error', res?.error || 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
      }
    } catch (err) {
      console.error('Register Error:', err?.message || err)
      showToast('error', err?.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก')
    } finally {
      setSubmitting(false)
    }
  }

  const emailPreview = formData.email_local ? buildEmail(formData) : ''

  /* =====================================================================
   * Render
   * ===================================================================== */
  return (
    <div className="se-rg">
      <style>{`
        .se-rg {
          --rg-bg: var(--color-se-background, #f5f5f7);
          --rg-card: var(--color-se-surface, #ffffff);
          --rg-border: var(--color-se-border, rgba(0,0,0,0.12));
          --rg-text: var(--color-se-text-main, #1d1d1f);
          --rg-muted: var(--color-se-text-muted, #6e6e73);
          --rg-primary: var(--color-se-primary, #0071e3);
          --rg-primary-hover: var(--color-se-primary-hover, #0077ed);

          --rg-subtle: color-mix(in srgb, var(--rg-text) 6%, transparent);
          --rg-subtle-hover: color-mix(in srgb, var(--rg-text) 11%, transparent);
          --rg-primary-soft: color-mix(in srgb, var(--rg-primary) 14%, transparent);

          --rg-danger: #d70015;
          --rg-danger-solid: #ff3b30;
          --rg-danger-soft: rgba(255,59,48,0.12);
          --rg-success: #1f8f3a;
          --rg-success-soft: rgba(52,199,89,0.14);
          --rg-success-dot: #34c759;

          --rg-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05);
          --rg-shadow-lg: 0 24px 80px rgba(0,0,0,0.20);

          min-height: 100vh; background: var(--rg-bg); color: var(--rg-text);
          padding: 48px 16px 64px;
        }
        :root[data-theme='dark'] .se-rg,
        .dark .se-rg {
          color-scheme: dark;
          --rg-danger: #ff6961;
          --rg-danger-solid: #ff453a;
          --rg-danger-soft: rgba(255,69,58,0.18);
          --rg-success: #30d158;
          --rg-success-soft: rgba(48,209,88,0.18);
          --rg-success-dot: #30d158;
          --rg-shadow: 0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.25);
          --rg-shadow-lg: 0 24px 80px rgba(0,0,0,0.6);
        }

        @keyframes rg-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes rg-pop  { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: none; } }
        .rg-rise { animation: rg-rise .6s cubic-bezier(.28,.11,.32,1) both; }

        .rg-muted { color: var(--rg-muted); }

        .rg-card {
          background: var(--rg-card); border: 1px solid var(--rg-border);
          border-radius: 28px; box-shadow: var(--rg-shadow);
        }
        .rg-card-body { padding: 28px 32px; }
        .rg-card-foot {
          display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 12px; padding: 16px 32px;
          border-top: 1px solid var(--rg-border);
          background: color-mix(in srgb, var(--rg-text) 3%, transparent);
          border-radius: 0 0 28px 28px;
        }
        @media (max-width: 640px) {
          .se-rg { padding-top: 28px; }
          .rg-card-body { padding: 20px; }
          .rg-card-foot { padding: 14px 20px; }
        }

        .rg-section-title { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; padding-bottom: 10px; margin-bottom: 14px; border-bottom: 1px solid var(--rg-border); }

        .rg-input {
          width: 100%; height: 44px; padding: 0 14px; border-radius: 12px;
          border: 1px solid var(--rg-border); background: var(--rg-bg); color: var(--rg-text);
          font-size: 15px; outline: none; transition: border-color .2s, box-shadow .2s, background .2s;
        }
        .rg-input::placeholder { color: var(--rg-muted); opacity: .7; }
        .rg-input:focus { border-color: var(--rg-primary); background: var(--rg-card); box-shadow: 0 0 0 4px var(--rg-primary-soft); }
        .rg-input[aria-invalid='true'] { border-color: var(--rg-danger-solid); }
        .rg-input[aria-invalid='true']:focus { box-shadow: 0 0 0 4px var(--rg-danger-soft); }
        .rg-input:disabled { opacity: .7; cursor: not-allowed; }

        /* ช่องอีเมล: ช่องพิมพ์ + dropdown โดเมน ต่อกันเป็นแท่งเดียว */
        .rg-email { display: flex; align-items: stretch; }
        .rg-email .rg-input:first-child { flex: 1 1 auto; min-width: 0; border-top-right-radius: 0; border-bottom-right-radius: 0; }
        .rg-email .rg-email-domain {
          width: auto; flex: 0 0 auto; margin-left: -1px; cursor: pointer;
          border-top-left-radius: 0; border-bottom-left-radius: 0;
          background: var(--rg-subtle); font-weight: 500;
        }
        .rg-email .rg-input:focus { position: relative; z-index: 1; }
        .rg-email .rg-email-domain:focus { background: var(--rg-card); }

        .rg-label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; }
        .rg-hint { margin-top: 6px; font-size: 12.5px; color: var(--rg-muted); overflow-wrap: anywhere; }
        .rg-error { margin-top: 6px; font-size: 13px; color: var(--rg-danger); }

        .rg-notice {
          padding: 12px 16px; border-radius: 14px; font-size: 14px; line-height: 1.6;
          background: var(--rg-primary-soft); color: var(--rg-text);
        }

        .rg-file {
          width: 100%; padding: 7px 10px; border-radius: 12px; border: 1px dashed var(--rg-border);
          background: var(--rg-bg); color: var(--rg-muted); font-size: 14px; cursor: pointer; outline: none;
        }
        .rg-file::file-selector-button {
          margin-right: 12px; height: 30px; padding: 0 14px; border: 0; border-radius: 999px;
          background: var(--rg-primary); color: #fff; font-size: 13px; font-weight: 500; cursor: pointer;
        }
        .rg-file:focus-visible { border-color: var(--rg-primary); box-shadow: 0 0 0 4px var(--rg-primary-soft); }
        .rg-file[aria-invalid='true'] { border-color: var(--rg-danger-solid); }

        .rg-preview { width: 56px; height: 56px; flex-shrink: 0; border-radius: 999px; object-fit: cover; border: 1px solid var(--rg-border); }

        .rg-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          height: 40px; padding: 0 22px; border: 0; border-radius: 999px;
          font-size: 14px; font-weight: 500; cursor: pointer; white-space: nowrap; text-decoration: none;
          transition: background .2s, opacity .2s, transform .1s;
        }
        .rg-btn:active:not(:disabled) { transform: scale(.98); }
        .rg-btn:disabled { opacity: .6; cursor: not-allowed; }
        .rg-btn-primary { background: var(--rg-primary); color: #fff; }
        .rg-btn-primary:hover:not(:disabled) { background: var(--rg-primary-hover); }
        .rg-btn:focus-visible, .rg-link:focus-visible { outline: 2px solid var(--rg-primary); outline-offset: 2px; }

        .rg-link { background: none; border: 0; padding: 0; font-size: 14px; color: var(--rg-primary); cursor: pointer; text-decoration: none; }
        .rg-link:hover { text-decoration: underline; text-underline-offset: 4px; }

        .rg-status-icon {
          display: flex; align-items: center; justify-content: center; width: 64px; height: 64px;
          margin: 0 auto; border-radius: 999px;
        }

        /* ช่อง honeypot — ซ่อนจากผู้ใช้จริงและเครื่องอ่านหน้าจอ */
        .rg-honey { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; opacity: 0; }

        .rg-toast {
          position: fixed; left: 50%; bottom: 24px; z-index: 60; transform: translateX(-50%);
          display: flex; align-items: center; gap: 10px; padding: 12px 20px; border-radius: 999px;
          background: var(--rg-text); color: var(--rg-card); font-size: 14px; font-weight: 500;
          box-shadow: var(--rg-shadow-lg); animation: rg-pop .35s cubic-bezier(.28,.11,.32,1) both;
          max-width: calc(100vw - 32px);
        }

        @media (prefers-reduced-motion: reduce) {
          .rg-rise, .rg-toast { animation: none; }
        }
      `}</style>

      <div className="mx-auto w-full max-w-[860px]">
        {/* ===== Header ===== */}
        <div className="rg-rise mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[32px] font-semibold leading-[1.15] tracking-[-0.03em] md:text-[40px]">สมัครสมาชิกใหม่</h1>
            <p className="rg-muted mt-1 text-[16px]">กรอกข้อมูลเพื่อสร้างบัญชี ต้องมีสมาชิกในระบบเป็นผู้แนะนำ</p>
          </div>
          <Link to="/sework/login" className="rg-link self-start sm:self-auto">
            มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
          </Link>
        </div>

        {/* ===== สมัครสำเร็จ ===== */}
        {done ? (
          <div className="rg-card rg-rise px-8 py-14 text-center" role="status">
            <div className="rg-status-icon" style={{ background: 'var(--rg-success-soft)', color: 'var(--rg-success)' }}>
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-5 text-[24px] font-semibold tracking-[-0.025em]">สมัครสมาชิกเรียบร้อยแล้ว</h2>
            <p className="rg-muted mx-auto mt-2 max-w-[460px] text-[15px] leading-[1.7]">
              บัญชี <span className="font-medium" style={{ color: 'var(--rg-text)' }}>{done.email}</span> ถูกสร้างแล้ว
              {done.needsEmailConfirmation
                ? ' กรุณาตรวจสอบกล่องจดหมายของอีเมลมหาวิทยาลัยและกดลิงก์ยืนยัน ก่อนเข้าสู่ระบบ (หากไม่พบ ลองดูในโฟลเดอร์สแปม)'
                : ' สามารถเข้าสู่ระบบได้ทันที'}
            </p>
            <Link to="/sework/login" className="rg-btn rg-btn-primary mt-7">
              ไปหน้าเข้าสู่ระบบ
            </Link>
          </div>
        ) : isLocked ? (
          /* ===== ถูกล็อก ===== */
          <div className="rg-card rg-rise px-8 py-14 text-center" role="alert">
            <div className="rg-status-icon" style={{ background: 'var(--rg-danger-soft)', color: 'var(--rg-danger)' }}>
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 018 0v3" />
              </svg>
            </div>
            <h2 className="mt-5 text-[24px] font-semibold tracking-[-0.025em]">ปิดการสมัครสมาชิกชั่วคราว</h2>
            <p className="rg-muted mx-auto mt-2 max-w-[480px] text-[15px] leading-[1.7]">
              กรอกอีเมลผู้แนะนำผิดครบ {MAX_REFERRER_FAILS} ครั้ง ระบบจึงปิดการสมัครของอุปกรณ์/เครือข่ายนี้เป็นเวลา {LOCK_HOURS} ชั่วโมง
              เพื่อป้องกันบุคคลภายนอก
            </p>
            <p className="mt-5 text-[20px] font-semibold tabular-nums tracking-[-0.02em]">
              อีก {formatRemaining(new Date(lockedUntil).getTime() - now)}
            </p>
            <p className="rg-muted mt-1 text-[13px]">เปิดให้สมัครอีกครั้งเมื่อ {formatDateTime(lockedUntil)}</p>
            <p className="rg-muted mx-auto mt-6 max-w-[420px] text-[13px] leading-[1.7]">
              หากเป็นสมาชิกที่ถูกเชิญจริงและกรอกผิดโดยไม่ตั้งใจ ให้ติดต่อผู้แนะนำหรือผู้ดูแลระบบเพื่อขอปลดล็อก
            </p>
          </div>
        ) : (
          /* ===== ฟอร์มสมัคร ===== */
          <form onSubmit={handleSubmit} noValidate className="rg-card rg-rise" style={{ animationDelay: '60ms' }} aria-busy={submitting}>
            <div className="rg-card-body space-y-8">
              {/* --- ผู้แนะนำ --- */}
              <section>
                <h2 className="rg-section-title">ผู้แนะนำ</h2>
                <div>
                  <label className="rg-label" htmlFor="rg-referrer">อีเมลของผู้แนะนำ (สมาชิกที่อยู่ในระบบ)</label>
                  <input
                    id="rg-referrer"
                    type="email"
                    inputMode="email"
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    placeholder="เช่น name@rmutl.ac.th"
                    className="rg-input"
                    value={formData.referrer_email}
                    onChange={onReferrerChange}
                    aria-invalid={Boolean(formErrors.referrer)}
                    aria-describedby="rg-referrer-hint"
                  />
                  {formErrors.referrer && <p className="rg-error" role="alert">{formErrors.referrer}</p>}
                  <p id="rg-referrer-hint" className="rg-hint">
                    ต้องเป็นอีเมลของสมาชิกที่มีบัญชีอยู่แล้ว หากกรอกผิดครบ {MAX_REFERRER_FAILS} ครั้ง จะถูกปิดการสมัคร {LOCK_HOURS} ชั่วโมง
                  </p>
                </div>
              </section>

              {/* --- บัญชีผู้ใช้ --- */}
              <section>
                <h2 className="rg-section-title">บัญชีผู้ใช้</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="rg-label" htmlFor="rg-email">อีเมลมหาวิทยาลัย (RMUTL)</label>
                    <div className="rg-email">
                      <input
                        id="rg-email"
                        ref={emailRef}
                        type="text"
                        inputMode="email"
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="ชื่อผู้ใช้ (ส่วนก่อน @)"
                        className="rg-input"
                        value={formData.email_local}
                        onChange={onEmailLocalChange}
                        aria-invalid={Boolean(formErrors.email)}
                        aria-describedby="rg-email-hint"
                      />
                      <select
                        id="rg-email-domain"
                        aria-label="โดเมนอีเมล"
                        className="rg-input rg-email-domain"
                        value={formData.email_domain}
                        onChange={onEmailDomainChange}
                        aria-invalid={Boolean(formErrors.email)}
                      >
                        {ALLOWED_EMAIL_DOMAINS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    {formErrors.email && <p className="rg-error" role="alert">{formErrors.email}</p>}
                    <p id="rg-email-hint" className="rg-hint">
                      {emailPreview
                        ? `อีเมลที่จะใช้เข้าสู่ระบบ: ${emailPreview}`
                        : 'กรอกเฉพาะส่วนก่อน @ แล้วเลือกโดเมนจากรายการ'}
                    </p>
                  </div>

                  <div>
                    <label className="rg-label" htmlFor="rg-password">รหัสผ่าน</label>
                    <input
                      id="rg-password"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="rg-input"
                      value={formData.password}
                      onChange={setField('password')}
                      aria-invalid={Boolean(formErrors.password)}
                    />
                    {formErrors.password && <p className="rg-error">{formErrors.password}</p>}
                  </div>
                  <div>
                    <label className="rg-label" htmlFor="rg-confirm">ยืนยันรหัสผ่าน</label>
                    <input
                      id="rg-confirm"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="rg-input"
                      value={formData.confirmPassword}
                      onChange={setField('confirmPassword')}
                      aria-invalid={Boolean(formErrors.confirmPassword)}
                    />
                    {formErrors.confirmPassword && <p className="rg-error">{formErrors.confirmPassword}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <button type="button" className="rg-link" onClick={() => setShowPw((v) => !v)}>
                      {showPw ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    </button>
                  </div>
                </div>
              </section>

              {/* --- ข้อมูลส่วนตัว --- */}
              <section>
                <h2 className="rg-section-title">ข้อมูลส่วนตัว</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div>
                    <label className="rg-label" htmlFor="rg-first">ชื่อจริง</label>
                    <input id="rg-first" type="text" autoComplete="given-name" className="rg-input" value={formData.first_name} onChange={setField('first_name')} aria-invalid={Boolean(formErrors.first_name)} />
                    {formErrors.first_name && <p className="rg-error">{formErrors.first_name}</p>}
                  </div>
                  <div>
                    <label className="rg-label" htmlFor="rg-last">นามสกุล</label>
                    <input id="rg-last" type="text" autoComplete="family-name" className="rg-input" value={formData.last_name} onChange={setField('last_name')} aria-invalid={Boolean(formErrors.last_name)} />
                    {formErrors.last_name && <p className="rg-error">{formErrors.last_name}</p>}
                  </div>
                  <div>
                    <label className="rg-label" htmlFor="rg-nick">ชื่อเล่น</label>
                    <input id="rg-nick" type="text" autoComplete="nickname" className="rg-input" value={formData.nickname} onChange={setField('nickname')} aria-invalid={Boolean(formErrors.nickname)} />
                    {formErrors.nickname && <p className="rg-error">{formErrors.nickname}</p>}
                  </div>
                  <div>
                    <label className="rg-label" htmlFor="rg-tel">เบอร์โทรศัพท์</label>
                    <input id="rg-tel" type="tel" autoComplete="tel" className="rg-input" value={formData.tel} onChange={setField('tel')} aria-invalid={Boolean(formErrors.tel)} />
                    {formErrors.tel && <p className="rg-error">{formErrors.tel}</p>}
                  </div>
                </div>
              </section>

              {/* --- การศึกษาและสิทธิ์ --- */}
              <section>
                <h2 className="rg-section-title">การศึกษาและสิทธิ์</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="rg-label" htmlFor="rg-year">ชั้นปี</label>
                    <select id="rg-year" className="rg-input" value={formData.year_level} onChange={setField('year_level')}>
                      {YEAR_LEVELS.map((y) => (
                        <option key={y} value={String(y)}>ปี {y}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="rg-label" htmlFor="rg-sec">กลุ่มเรียน (SEC)</label>
                    <select id="rg-sec" className="rg-input" value={formData.sec} onChange={setField('sec')}>
                      {SECS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="rg-label" htmlFor="rg-role">ระดับสิทธิ์</label>
                    <select id="rg-role" className="rg-input" value={REGISTER_ROLE} disabled aria-describedby="rg-role-hint">
                      <option value={REGISTER_ROLE}>{REGISTER_ROLE.toUpperCase()}</option>
                    </select>
                    <p id="rg-role-hint" className="rg-hint">สมัครได้เฉพาะระดับ ADMIN</p>
                  </div>
                </div>
              </section>

              {/* --- ช่องทางติดต่อและรูปภาพ --- */}
              <section>
                <h2 className="rg-section-title">ช่องทางติดต่อและรูปภาพ</h2>
                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="rg-label" htmlFor="rg-fb">Facebook URL</label>
                    <input id="rg-fb" type="url" placeholder="https://facebook.com/..." className="rg-input" value={formData.facebook} onChange={setField('facebook')} aria-invalid={Boolean(formErrors.facebook)} />
                    {formErrors.facebook && <p className="rg-error">{formErrors.facebook}</p>}
                  </div>
                  <div>
                    <label className="rg-label" htmlFor="rg-ig">Instagram (@username)</label>
                    <input id="rg-ig" type="text" placeholder="@username" className="rg-input" value={formData.instagram} onChange={setField('instagram')} aria-invalid={Boolean(formErrors.instagram)} />
                    {formErrors.instagram && <p className="rg-error">{formErrors.instagram}</p>}
                  </div>
                  <div>
                    <label className="rg-label" htmlFor="rg-gh">GitHub Account URL</label>
                    <input id="rg-gh" type="url" placeholder="https://github.com/..." className="rg-input" value={formData.github_account} onChange={setField('github_account')} aria-invalid={Boolean(formErrors.github_account)} />
                    {formErrors.github_account && <p className="rg-error">{formErrors.github_account}</p>}
                  </div>
                </div>

                <div>
                  <label className="rg-label" htmlFor="rg-file">รูปโปรไฟล์ (ไม่บังคับ)</label>
                  <div className="flex items-center gap-3">
                    {previewUrl && <img src={previewUrl} alt="ตัวอย่างรูปโปรไฟล์" className="rg-preview" />}
                    <input
                      id="rg-file"
                      type="file"
                      accept={AVATAR_TYPES.join(',')}
                      className="rg-file"
                      onChange={onFileChange}
                      aria-invalid={Boolean(formErrors.file)}
                    />
                  </div>
                  {formErrors.file && <p className="rg-error">{formErrors.file}</p>}
                </div>
              </section>

              {/* honeypot: ผู้ใช้จริงไม่เห็นและไม่ต้องกรอก */}
              <div className="rg-honey" aria-hidden="true">
                <label htmlFor="rg-website">Website</label>
                <input id="rg-website" ref={honeyRef} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
              </div>
            </div>

            <div className="rg-card-foot">
              <button type="submit" className="rg-btn rg-btn-primary" disabled={submitting || checkingLock}>
                {submitting ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ===== Toast ===== */}
      {toast && (
        <div className="rg-toast" role="status" aria-live="polite">
          <span
            className="h-2 w-2 flex-shrink-0 rounded-full"
            style={{ background: toast.type === 'error' ? 'var(--rg-danger-solid)' : 'var(--rg-success-dot)' }}
          />
          {toast.message}
        </div>
      )}
    </div>
  )
}