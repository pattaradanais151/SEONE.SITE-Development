import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { notifyDiscord } from '../../../lib/discord'

/* =====================================================================
 * Config
 * ===================================================================== */
const TOAST_MS = 3500
const MIN_PASSWORD = 6 // ให้ตรงกับหน้า Users Management และ Supabase Auth ของโปรเจกต์
const MAX_PASSWORD = 72 // ข้อจำกัดของ bcrypt ที่ Supabase Auth ใช้
const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const AVATAR_BUCKET = 'profile-images'

// รูปแบบที่ "บันทึกลงฐานข้อมูล" ของ Facebook / GitHub
//   'url'    → https://www.facebook.com/username  (เข้ากับหน้าอื่นที่ใช้ลิงก์ตรง ๆ เช่น Contacts / Users Management)
//   'handle' → @username                          (เหมือน Instagram)
// หน้านี้ "แสดงและให้กรอก" เป็น @username เสมอ ไม่ว่าจะเก็บแบบไหน และอ่านข้อมูลเก่าได้ทั้งสองแบบ
// Instagram เก็บเป็น @username เหมือนเดิมเสมอ
const SOCIAL_STORAGE_FORMAT = 'url'

const SOCIALS = {
  facebook: {
    label: 'Facebook',
    base: 'https://www.facebook.com/',
    shown: 'facebook.com/',
    hostRe: /(^|\.)(facebook\.com|fb\.com|fb\.me)$/i,
    valid: (h) => /^[A-Za-z0-9.]{5,50}$/.test(h),
    hint: 'ชื่อผู้ใช้ Facebook ใช้ได้เฉพาะ a-z, 0-9 และจุด (อย่างน้อย 5 ตัว)',
  },
  instagram: {
    label: 'Instagram',
    base: 'https://www.instagram.com/',
    shown: 'instagram.com/',
    hostRe: /(^|\.)instagram\.com$/i,
    valid: (h) => /^[A-Za-z0-9._]{1,30}$/.test(h),
    hint: 'ชื่อผู้ใช้ Instagram ใช้ได้เฉพาะ a-z, 0-9 จุด และขีดล่าง (สูงสุด 30 ตัว)',
  },
  github_account: {
    label: 'GitHub',
    base: 'https://github.com/',
    shown: 'github.com/',
    hostRe: /(^|\.)github\.com$/i,
    valid: (h) => h.length <= 39 && /^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$/.test(h),
    hint: 'ชื่อผู้ใช้ GitHub ใช้ได้เฉพาะ a-z, 0-9 และขีดกลาง (สูงสุด 39 ตัว)',
  },
}
const SOCIAL_KEYS = Object.keys(SOCIALS)

const FIELD_LABELS = {
  first_name: 'ชื่อจริง',
  last_name: 'นามสกุล',
  nickname: 'ชื่อเล่น',
  tel: 'เบอร์โทรศัพท์',
  facebook: 'Facebook',
  instagram: 'Instagram',
  github_account: 'GitHub',
  image: 'รูปโปรไฟล์',
}

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  nickname: '',
  tel: '',
  facebook: '',
  instagram: '',
  github_account: '',
}

/* =====================================================================
 * Helpers
 * ===================================================================== */
// กัน @everyone / @here / <@id> จากข้อความผู้ใช้ไม่ให้ ping คนใน Discord
const cleanForDiscord = (s = '') =>
  String(s).replace(/@(everyone|here)/gi, '@\u200b$1').replace(/<@/g, '<@\u200b')

// ส่ง Discord ผ่าน utility เดิม (→ Edge Function) — ล้มเหลวแล้วต้องไม่กระทบผู้ใช้
const notifyDiscordSafe = async (message) => {
  try {
    await notifyDiscord(message)
  } catch (err) {
    console.error('Discord notify failed:', err?.message || err)
  }
}

const formatDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : ''

/**
 * แปลงสิ่งที่ผู้ใช้พิมพ์/วาง → username
 * รับได้ทั้ง "@name", "name", "https://facebook.com/name?ref=..." และข้อมูลเก่าในฐานข้อมูล
 * คืน { handle, error }
 */
const parseSocial = (key, raw) => {
  const cfg = SOCIALS[key]
  const input = String(raw || '').trim()
  if (!input) return { handle: '' }

  let handle = input
  const looksLikeUrl = /^(https?:\/\/|www\.)/i.test(input) || /^[\w.-]+\.(com|me)\//i.test(input)

  if (looksLikeUrl) {
    let url
    try {
      url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`)
    } catch {
      return { handle: '', error: 'ลิงก์ไม่ถูกต้อง' }
    }
    if (!cfg.hostRe.test(url.hostname)) {
      return { handle: '', error: `ลิงก์นี้ไม่ใช่ของ ${cfg.label}` }
    }
    handle =
      key === 'facebook' && url.pathname.toLowerCase().startsWith('/profile.php')
        ? url.searchParams.get('id') || ''
        : url.pathname.split('/').filter(Boolean)[0] || ''
  }

  handle = handle.replace(/^@+/, '').replace(/[/?#].*$/, '').trim()
  if (!handle) return { handle: '', error: cfg.hint }
  if (!cfg.valid(handle)) return { handle, error: cfg.hint }
  return { handle }
}

// ค่าที่โชว์ในช่องกรอก (ถ้าข้อมูลเก่าอ่านไม่ออก ให้โชว์ค่าเดิมเพื่อให้ผู้ใช้แก้เอง)
const toDisplay = (key, stored) => {
  if (!stored) return ''
  const { handle, error } = parseSocial(key, stored)
  return error ? String(stored) : handle
}

// ค่าที่บันทึกลงฐานข้อมูล
const toStored = (key, handle) => {
  if (!handle) return ''
  if (key === 'instagram' || SOCIAL_STORAGE_FORMAT === 'handle') return `@${handle}`
  return `${SOCIALS[key].base}${handle}`
}

const isValidTel = (s) => !s || /^\+?[0-9\s-]{9,15}$/.test(s)

const storagePathFromUrl = (url) => {
  const m = String(url || '').match(new RegExp(`/${AVATAR_BUCKET}/(.+?)(?:\\?|$)`))
  return m ? decodeURIComponent(m[1]) : null
}

const passwordStrength = (pw) => {
  if (!pw) return { level: 0, label: '' }
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  const level = pw.length < MIN_PASSWORD ? 1 : s <= 1 ? 1 : s === 2 ? 2 : s === 3 ? 3 : 4
  return { level, label: ['', 'อ่อน', 'พอใช้', 'ดี', 'แข็งแรง'][level] }
}

const mapPasswordError = (err) => {
  const code = err?.code || ''
  const msg = String(err?.message || '')
  if (code === 'same_password' || /different from the old/i.test(msg)) return 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม'
  if (code === 'weak_password') return 'รหัสผ่านนี้คาดเดาง่ายเกินไป กรุณาตั้งให้ซับซ้อนขึ้น'
  if (code === 'reauthentication_needed' || /reauthentication/i.test(msg)) {
    return 'ระบบต้องการให้ยืนยันตัวตนใหม่ กรุณาออกจากระบบแล้วเข้าสู่ระบบอีกครั้ง จากนั้นลองเปลี่ยนรหัสผ่านใหม่'
  }
  if (err?.status === 429 || code === 'over_request_rate_limit') return 'ลองบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่'
  return msg || 'เปลี่ยนรหัสผ่านไม่สำเร็จ'
}

/* =====================================================================
 * Icons
 * ===================================================================== */
const Icon = ({ children, className = 'h-4 w-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
)
const CameraIcon = () => (
  <Icon className="h-[18px] w-[18px]">
    <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.66-.89l.82-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.66.89l.82 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <circle cx="12" cy="13" r="3" />
  </Icon>
)
const MailIcon = () => <Icon className="h-5 w-5"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></Icon>
const KeyIcon = () => <Icon className="h-5 w-5"><circle cx="8" cy="15" r="4" /><path d="M10.9 12.1L20 3M17 6l3 3M14 9l2 2" /></Icon>
const CloseIcon = () => <Icon className="h-5 w-5"><path d="M6 6l12 12M18 6L6 18" /></Icon>
const FacebookIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden style={{ color: '#1877f2' }}>
    <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
  </svg>
)
const InstagramIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden style={{ color: '#e1306c' }}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z" />
  </svg>
)
const GithubIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
)
const SOCIAL_ICONS = { facebook: <FacebookIcon />, instagram: <InstagramIcon />, github_account: <GithubIcon /> }

/* =====================================================================
 * Small components
 * ===================================================================== */
function SocialField({ name, value, error, onChange, onBlur }) {
  const cfg = SOCIALS[name]
  const preview = value && !error ? parseSocial(name, value) : null

  return (
    <div>
      <label className="pf-label flex items-center gap-2" htmlFor={`pf-${name}`}>
        {SOCIAL_ICONS[name]}
        {cfg.label}
      </label>
      <div className="pf-affix">
        <span className="pf-at" aria-hidden>@</span>
        <input
          id={`pf-${name}`}
          type="text"
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="username"
          className="pf-input"
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
        />
      </div>
      {error ? (
        <p className="pf-error">{error}</p>
      ) : (
        preview?.handle && <p className="pf-muted mt-1.5 truncate text-[12px]">{cfg.shown}{preview.handle}</p>
      )}
    </div>
  )
}

/* =====================================================================
 * Page
 * ===================================================================== */
export default function Profile() {
  const { profile, refreshProfile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  // ข้อมูลฟอร์ม + snapshot ล่าสุดที่บันทึกแล้ว (ไว้เทียบว่ามีการแก้ไขหรือยัง)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [saved, setSaved] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [account, setAccount] = useState(null) // ข้อมูลที่ผู้ใช้แก้เองไม่ได้ (email / role / sec / year)
  const [updating, setUpdating] = useState(false)

  // รูปโปรไฟล์
  const [file, setFile] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)
  const objectUrlRef = useRef(null)
  const fileInputRef = useRef(null)

  // เปลี่ยนรหัสผ่าน
  const [pwOpen, setPwOpen] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '', signOutOthers: true })
  const [pwErrors, setPwErrors] = useState({})
  const [showPw, setShowPw] = useState(false)
  const [changingPw, setChangingPw] = useState(false)
  const pwFieldRef = useRef(null)

  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  /* ---------- Toast ---------- */
  const showToast = useCallback((type, message) => {
    clearTimeout(toastTimer.current)
    setToast({ type, message })
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  /* ---------- Fetch ---------- */
  const revokeObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }

  useEffect(() => revokeObjectUrl, [])

  const fetchMyProfile = useCallback(async () => {
    if (!profile?.id) return
    try {
      setLoading(true)
      setLoadError(false)
      const { data, error } = await supabase.from('profiles').select('*').eq('id', profile.id).single()
      if (error) throw error

      const next = {
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        nickname: data.nickname || '',
        tel: data.tel || '',
        facebook: toDisplay('facebook', data.facebook),
        instagram: toDisplay('instagram', data.instagram),
        github_account: toDisplay('github_account', data.github_account),
      }
      revokeObjectUrl()
      setFormData(next)
      setSaved(next)
      setErrors({})
      setFile(null)
      setPreviewImage(data.profile_image_url || null)
      setAccount({
        email: data.email || profile.email || '',
        role: data.role,
        sec: data.sec,
        year_level: data.year_level,
        updated_at: data.updated_at,
        profile_image_url: data.profile_image_url || null,
      })
    } catch (err) {
      console.error('Error fetching profile:', err.message)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [profile?.id, profile?.email])

  useEffect(() => {
    document.title = 'My Profile | SE-CONSOLE'
    fetchMyProfile()
  }, [fetchMyProfile])

  /* ---------- Dirty state ---------- */
  const dirty = useMemo(
    () => Boolean(file) || Object.keys(EMPTY_FORM).some((k) => formData[k] !== saved[k]),
    [formData, saved, file]
  )

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  /* ---------- Password modal behaviour (ESC / scroll lock / focus) ---------- */
  useEffect(() => {
    if (!pwOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape' && !changingPw) setPwOpen(false)
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    pwFieldRef.current?.focus()
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [pwOpen, changingPw])

  /* ---------- Form handlers ---------- */
  const setField = (name) => (e) => {
    const value = e.target.value
    setFormData((f) => ({ ...f, [name]: value }))
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }))
  }

  // ตอนออกจากช่อง Social: ถ้าวางลิงก์/ใส่ @ มา ให้แปลงเป็น username สะอาด ๆ ให้ทันที
  const normalizeSocialOnBlur = (name) => () => {
    const { handle, error } = parseSocial(name, formData[name])
    if (!error) setFormData((f) => ({ ...f, [name]: handle }))
    else setErrors((er) => ({ ...er, [name]: error }))
  }

  const handleImageChange = (e) => {
    const picked = e.target.files?.[0]
    if (!picked) return
    if (!picked.type.startsWith('image/')) {
      e.target.value = ''
      return showToast('error', 'ไฟล์ต้องเป็นรูปภาพเท่านั้น')
    }
    if (picked.size > MAX_AVATAR_BYTES) {
      e.target.value = ''
      return showToast('error', 'รูปต้องมีขนาดไม่เกิน 5 MB')
    }
    revokeObjectUrl()
    objectUrlRef.current = URL.createObjectURL(picked)
    setFile(picked)
    setPreviewImage(objectUrlRef.current)
  }

  const handleReset = () => {
    revokeObjectUrl()
    if (fileInputRef.current) fileInputRef.current.value = ''
    setFormData(saved)
    setErrors({})
    setFile(null)
    setPreviewImage(account?.profile_image_url || null)
  }

  const validate = () => {
    const errs = {}
    if (!formData.first_name.trim()) errs.first_name = 'กรุณากรอกชื่อจริง'
    if (!formData.last_name.trim()) errs.last_name = 'กรุณากรอกนามสกุล'
    if (!formData.nickname.trim()) errs.nickname = 'กรุณากรอกชื่อเล่น'
    if (!isValidTel(formData.tel.trim())) errs.tel = 'เบอร์โทรศัพท์ไม่ถูกต้อง (9–15 หลัก)'
    SOCIAL_KEYS.forEach((k) => {
      const { error } = parseSocial(k, formData[k])
      if (error) errs[k] = error
    })
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (updating || !dirty) return

    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    try {
      setUpdating(true)
      if (!profile?.id) throw new Error('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่')

      // สิ่งที่เปลี่ยนจริง ๆ (ใช้ทั้งสร้าง payload และข้อความ Discord)
      const savedHandles = Object.fromEntries(SOCIAL_KEYS.map((k) => [k, parseSocial(k, saved[k]).handle]))
      const nextHandles = Object.fromEntries(SOCIAL_KEYS.map((k) => [k, parseSocial(k, formData[k]).handle]))
      const changed = []
      ;['first_name', 'last_name', 'nickname', 'tel'].forEach((k) => {
        if (formData[k].trim() !== saved[k].trim()) changed.push(k)
      })
      SOCIAL_KEYS.forEach((k) => {
        if (nextHandles[k] !== savedHandles[k]) changed.push(k)
      })
      if (file) changed.push('image')

      // 1. อัปโหลดรูปใหม่ (ถ้ามี)
      let newImageUrl = null
      if (file) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`
        const filePath = `${profile.id}/${fileName}`

        const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(filePath, file)
        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath)
        newImageUrl = publicUrl
      }

      // 2. อัปเดตโปรไฟล์ — Social ส่งเฉพาะช่องที่เปลี่ยน เพื่อไม่ไปแก้ข้อมูลเก่าที่ผู้ใช้ไม่ได้แตะ
      const payload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        nickname: formData.nickname.trim(),
        tel: formData.tel.trim(),
        updated_at: new Date().toISOString(),
      }
      SOCIAL_KEYS.forEach((k) => {
        if (changed.includes(k)) payload[k] = toStored(k, nextHandles[k])
      })
      if (newImageUrl) payload.profile_image_url = newImageUrl

      // .select('id') เพื่อตรวจว่าบันทึกได้จริง (RLS ที่บล็อกจะไม่ error แต่คืน 0 แถว)
      const { data, error } = await supabase.from('profiles').update(payload).eq('id', profile.id).select('id')
      if (error) throw error
      if (!data || data.length === 0) throw new Error('ไม่สามารถบันทึกข้อมูลได้')

      // 3. เก็บกวาดรูปเก่าใน Storage (ไม่สำเร็จก็ไม่เป็นไร)
      if (newImageUrl && account?.profile_image_url) {
        const oldPath = storagePathFromUrl(account.profile_image_url)
        if (oldPath && oldPath.startsWith(`${profile.id}/`)) {
          try {
            await supabase.storage.from(AVATAR_BUCKET).remove([oldPath])
          } catch (err) {
            console.warn('Old avatar cleanup skipped:', err?.message)
          }
        }
      }

      // 4. อัปเดตหน้าจอ
      const nextSaved = {
        ...formData,
        first_name: payload.first_name,
        last_name: payload.last_name,
        nickname: payload.nickname,
        tel: payload.tel,
        ...Object.fromEntries(SOCIAL_KEYS.map((k) => [k, nextHandles[k]])),
      }
      setFormData(nextSaved)
      setSaved(nextSaved)
      setErrors({})
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (newImageUrl) {
        revokeObjectUrl()
        setPreviewImage(newImageUrl)
      }
      setAccount((a) => ({
        ...a,
        updated_at: payload.updated_at,
        profile_image_url: newImageUrl || a?.profile_image_url || null,
      }))
      showToast('success', 'บันทึกข้อมูลเรียบร้อยแล้ว')

      // 5. แจ้งเตือน Discord (บอกแค่ว่าแก้ช่องไหน ไม่ส่งค่าจริง เช่น เบอร์โทร)
      await notifyDiscordSafe(
        `👤 **อัปเดตโปรไฟล์**\n` +
          `🙋 **ผู้ใช้:** ${cleanForDiscord(payload.first_name)} ${cleanForDiscord(payload.last_name)} (@${cleanForDiscord(payload.nickname)})\n` +
          `✏️ **แก้ไข:** ${changed.map((k) => FIELD_LABELS[k]).join(', ')}\n` +
          `📌 **กลุ่ม:** ${account?.sec || '-'} | **สิทธิ์:** ${String(account?.role || 'student').toUpperCase()}`
      )

      // 6. รีเฟรชข้อมูลผู้ใช้ใน Global State (ชื่อ/รูปที่ Header)
      if (typeof refreshProfile === 'function') {
        try {
          await refreshProfile()
        } catch (err) {
          console.warn('refreshProfile failed:', err?.message)
        }
      } else {
        // AuthContext ไม่มีฟังก์ชันรีเฟรช → โหลดหน้าใหม่เหมือนเดิม (หน่วงให้เห็น Toast ก่อน)
        setTimeout(() => window.location.reload(), 900)
      }
    } catch (err) {
      console.error('Update Profile Error:', err.message)
      showToast('error', err.message || 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล')
    } finally {
      setUpdating(false)
    }
  }

  /* ---------- Change password ---------- */
  const openPassword = () => {
    setPwForm({ current: '', next: '', confirm: '', signOutOthers: true })
    setPwErrors({})
    setShowPw(false)
    setPwOpen(true)
  }

  const setPwField = (name) => (e) => {
    const value = name === 'signOutOthers' ? e.target.checked : e.target.value
    setPwForm((f) => ({ ...f, [name]: value }))
    if (pwErrors[name] || pwErrors.form) setPwErrors((er) => ({ ...er, [name]: undefined, form: undefined }))
  }

  const resolveEmail = async () => {
    if (account?.email) return account.email
    if (profile?.email) return profile.email
    const { data } = await supabase.auth.getUser()
    return data?.user?.email || ''
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (changingPw) return

    const errs = {}
    if (!pwForm.current) errs.current = 'กรุณากรอกรหัสผ่านปัจจุบัน'
    if (pwForm.next.length < MIN_PASSWORD) errs.next = `รหัสผ่านใหม่ต้องมีอย่างน้อย ${MIN_PASSWORD} ตัวอักษร`
    else if (pwForm.next.length > MAX_PASSWORD) errs.next = `รหัสผ่านต้องไม่เกิน ${MAX_PASSWORD} ตัวอักษร`
    else if (pwForm.next === pwForm.current) errs.next = 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม'
    if (pwForm.confirm !== pwForm.next) errs.confirm = 'รหัสผ่านและการยืนยันไม่ตรงกัน'
    setPwErrors(errs)
    if (Object.keys(errs).length > 0) return

    try {
      setChangingPw(true)

      const email = await resolveEmail()
      if (!email) throw new Error('ไม่พบอีเมลบัญชี กรุณาเข้าสู่ระบบใหม่')

      // 1. ยืนยันรหัสผ่านปัจจุบันด้วย client ชั่วคราว (ไม่แตะ session จริง → AuthContext ไม่กระพริบ)
      const verifier = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
      )
      const { error: verifyErr } = await verifier.auth.signInWithPassword({ email, password: pwForm.current })
      if (verifyErr) {
        const wrong = verifyErr.code === 'invalid_credentials' || /invalid login credentials/i.test(verifyErr.message || '')
        if (wrong) {
          setPwErrors({ current: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' })
          return
        }
        throw verifyErr
      }
      // scope 'local' สำคัญมาก — ค่าเริ่มต้นคือ 'global' ซึ่งจะเตะทุก session รวมถึงของเราเอง
      verifier.auth.signOut({ scope: 'local' }).catch(() => {})

      // 2. เปลี่ยนรหัสผ่านของ session ปัจจุบัน
      const { error: updateErr } = await supabase.auth.updateUser({ password: pwForm.next })
      if (updateErr) throw updateErr

      // 3. เตะอุปกรณ์อื่นออก (เว้น session นี้) — ล้มเหลวไม่ถือว่าเปลี่ยนรหัสไม่สำเร็จ
      if (pwForm.signOutOthers) {
        try {
          await supabase.auth.signOut({ scope: 'others' })
        } catch (err) {
          console.warn('Sign out others failed:', err?.message)
        }
      }

      setPwOpen(false)
      setPwForm({ current: '', next: '', confirm: '', signOutOthers: true })
      showToast('success', 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว')

      // ห้ามใส่รหัสผ่านใน Discord
      await notifyDiscordSafe(
        `🔐 **เปลี่ยนรหัสผ่าน**\n` +
          `🙋 **ผู้ใช้:** ${cleanForDiscord(formData.first_name)} ${cleanForDiscord(formData.last_name)} (@${cleanForDiscord(formData.nickname)}) เปลี่ยนรหัสผ่านของตัวเอง\n` +
          `🚪 **ออกจากระบบอุปกรณ์อื่น:** ${pwForm.signOutOthers ? 'ใช่' : 'ไม่'}`
      )
    } catch (err) {
      console.error('Change Password Error:', err?.message)
      setPwErrors({ form: mapPasswordError(err) })
    } finally {
      setChangingPw(false)
    }
  }

  /* ---------- Derived ---------- */
  const strength = passwordStrength(pwForm.next)
  const role = String(account?.role || 'student').toLowerCase()
  const initial = (formData.first_name || formData.nickname || account?.email || '?').trim().charAt(0).toUpperCase()

  /* =====================================================================
   * Render
   * ===================================================================== */
  return (
    <div className="se-pf relative mx-auto w-full max-w-[860px] pb-12">
      {/*
        Design tokens — ผูกกับธีมเดิมของโปรเจกต์ (--color-se-*)
        เวอร์ชัน Dark Mode: ทำเพียง override ตัวแปรในบล็อก :root[data-theme='dark'] / .dark ด้านล่าง
        สีพื้นผิวย่อยทั้งหมดคำนวณด้วย color-mix จากสีตัวอักษร จึงปรับตามธีมเองอัตโนมัติ
      */}
      <style>{`
        .se-pf {
          --pf-bg: var(--color-se-background, #f5f5f7);
          --pf-card: var(--color-se-surface, #ffffff);
          --pf-border: var(--color-se-border, rgba(0,0,0,0.12));
          --pf-text: var(--color-se-text-main, #1d1d1f);
          --pf-muted: var(--color-se-text-muted, #6e6e73);
          --pf-primary: var(--color-se-primary, #0071e3);
          --pf-primary-hover: var(--color-se-primary-hover, #0077ed);

          --pf-subtle: color-mix(in srgb, var(--pf-text) 6%, transparent);
          --pf-subtle-hover: color-mix(in srgb, var(--pf-text) 11%, transparent);
          --pf-primary-soft: color-mix(in srgb, var(--pf-primary) 14%, transparent);

          --pf-danger: #d70015;
          --pf-danger-solid: #ff3b30;
          --pf-danger-soft: rgba(255,59,48,0.12);
          --pf-success-dot: #34c759;
          --pf-warn-dot: #ff9f0a;

          --pf-role-ceo: #b25e00;
          --pf-role-manager: #8944ab;
          --pf-role-admin: #0066cc;

          --pf-s1: #ff3b30; --pf-s2: #ff9500; --pf-s3: #d4a800; --pf-s4: #34c759;

          --pf-overlay: rgba(0,0,0,0.38);
          --pf-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05);
          --pf-shadow-lg: 0 24px 80px rgba(0,0,0,0.20);
          color: var(--pf-text);
        }
        :root[data-theme='dark'] .se-pf,
        .dark .se-pf {
          color-scheme: dark;
          --pf-danger: #ff6961;
          --pf-danger-solid: #ff453a;
          --pf-danger-soft: rgba(255,69,58,0.18);
          --pf-success-dot: #30d158;
          --pf-warn-dot: #ffb340;
          --pf-role-ceo: #ffb340;
          --pf-role-manager: #da8fff;
          --pf-role-admin: #64b5ff;
          --pf-s1: #ff453a; --pf-s2: #ff9f0a; --pf-s3: #ffd60a; --pf-s4: #30d158;
          --pf-overlay: rgba(0,0,0,0.6);
          --pf-shadow: 0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.25);
          --pf-shadow-lg: 0 24px 80px rgba(0,0,0,0.6);
        }

        @keyframes pf-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pf-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pf-pop  { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: none; } }
        @keyframes pf-pulse { 50% { opacity: .5; } }
        .pf-rise { animation: pf-rise .6s cubic-bezier(.28,.11,.32,1) both; }

        .pf-muted { color: var(--pf-muted); }

        .pf-card {
          background: var(--pf-card);
          border: 1px solid var(--pf-border);
          border-radius: 28px;
          box-shadow: var(--pf-shadow);
        }

        .pf-cover {
          height: 140px;
          background: linear-gradient(135deg, var(--pf-primary), color-mix(in srgb, var(--pf-primary) 42%, #6e56ff));
        }
        @media (min-width: 768px) { .pf-cover { height: 176px; } }

        .pf-avatar-ring {
          position: relative; flex-shrink: 0; overflow: hidden; border-radius: 999px;
          width: 124px; height: 124px; background: var(--pf-card);
          box-shadow: 0 0 0 5px var(--pf-card), var(--pf-shadow);
        }
        @media (min-width: 768px) { .pf-avatar-ring { width: 148px; height: 148px; } }
        .pf-avatar-ring img { width: 100%; height: 100%; object-fit: cover; }
        .pf-avatar-fallback {
          display: flex; width: 100%; height: 100%; align-items: center; justify-content: center;
          font-size: 48px; font-weight: 600; background: var(--pf-primary-soft); color: var(--pf-primary);
        }

        .pf-section-title {
          font-size: 17px; font-weight: 600; letter-spacing: -0.015em;
          padding-bottom: 12px; margin-bottom: 18px; border-bottom: 1px solid var(--pf-border);
        }

        .pf-info {
          display: flex; align-items: center; gap: 14px; padding: 14px 18px; border-radius: 18px;
          background: var(--pf-subtle);
        }
        .pf-info-icon {
          display: flex; flex-shrink: 0; align-items: center; justify-content: center;
          width: 40px; height: 40px; border-radius: 999px; background: var(--pf-primary-soft); color: var(--pf-primary);
        }

        .pf-input {
          width: 100%; height: 46px; padding: 0 14px; border-radius: 12px;
          border: 1px solid var(--pf-border); background: var(--pf-bg); color: var(--pf-text);
          font-size: 15px; outline: none; transition: border-color .2s, box-shadow .2s, background .2s;
        }
        .pf-input::placeholder { color: var(--pf-muted); opacity: .7; }
        .pf-input:focus { border-color: var(--pf-primary); background: var(--pf-card); box-shadow: 0 0 0 4px var(--pf-primary-soft); }
        .pf-input[aria-invalid='true'] { border-color: var(--pf-danger-solid); }
        .pf-input[aria-invalid='true']:focus { box-shadow: 0 0 0 4px var(--pf-danger-soft); }

        .pf-affix { position: relative; }
        .pf-affix .pf-at { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: var(--pf-muted); font-size: 15px; pointer-events: none; }
        .pf-affix .pf-input { padding-left: 32px; }

        .pf-label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; }
        .pf-error { margin-top: 6px; font-size: 13px; color: var(--pf-danger); }
        .pf-banner-error {
          padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.5;
          background: var(--pf-danger-soft); color: var(--pf-danger);
        }

        .pf-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          height: 42px; padding: 0 22px; border: 0; border-radius: 999px;
          font-size: 14px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background .2s, opacity .2s, transform .1s;
        }
        .pf-btn-sm { height: 34px; padding: 0 16px; font-size: 13px; }
        .pf-btn:active:not(:disabled) { transform: scale(.98); }
        .pf-btn:disabled { opacity: .45; cursor: not-allowed; }
        .pf-btn-primary { background: var(--pf-primary); color: #fff; }
        .pf-btn-primary:hover:not(:disabled) { background: var(--pf-primary-hover); }
        .pf-btn-ghost { background: var(--pf-subtle); color: var(--pf-text); }
        .pf-btn-ghost:hover:not(:disabled) { background: var(--pf-subtle-hover); }
        .pf-btn:focus-visible, .pf-icon-btn:focus-visible, .pf-link:focus-visible,
        .pf-avatar-ring:focus-within { outline: 2px solid var(--pf-primary); outline-offset: 3px; }

        .pf-icon-btn {
          display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
          width: 36px; height: 36px; border: 0; border-radius: 999px; background: transparent;
          color: var(--pf-muted); cursor: pointer; transition: background .2s, color .2s;
        }
        .pf-icon-btn:hover:not(:disabled) { background: var(--pf-subtle); color: var(--pf-text); }

        .pf-chip {
          display: inline-flex; align-items: center; padding: 3px 12px; border-radius: 999px;
          font-size: 12px; font-weight: 500; background: var(--pf-subtle); color: var(--pf-muted);
        }
        .pf-role {
          --rc: var(--pf-muted);
          display: inline-flex; align-items: center; padding: 3px 12px; border-radius: 999px;
          font-size: 12px; font-weight: 600; color: var(--rc);
          background: color-mix(in srgb, var(--rc) 14%, transparent);
        }
        .pf-role-ceo { --rc: var(--pf-role-ceo); }
        .pf-role-manager { --rc: var(--pf-role-manager); }
        .pf-role-admin { --rc: var(--pf-role-admin); }

        .pf-link { background: none; border: 0; padding: 0; font-size: 14px; color: var(--pf-primary); cursor: pointer; }
        .pf-link:hover { text-decoration: underline; text-underline-offset: 4px; }

        .pf-check { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 14px; line-height: 1.5; }
        .pf-check input { width: 18px; height: 18px; margin-top: 2px; flex-shrink: 0; accent-color: var(--pf-primary); cursor: pointer; }

        .pf-meter { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top: 10px; }
        .pf-meter span { height: 4px; border-radius: 999px; background: var(--pf-subtle-hover); transition: background .25s; }
        .pf-meter[data-level='1'] span:nth-child(-n+1) { background: var(--pf-s1); }
        .pf-meter[data-level='2'] span:nth-child(-n+2) { background: var(--pf-s2); }
        .pf-meter[data-level='3'] span:nth-child(-n+3) { background: var(--pf-s3); }
        .pf-meter[data-level='4'] span:nth-child(-n+4) { background: var(--pf-s4); }

        .pf-footer {
          display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;
          margin-top: 36px; padding-top: 22px; border-top: 1px solid var(--pf-border);
        }

        .pf-backdrop {
          position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center;
          padding: 16px; background: var(--pf-overlay); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          animation: pf-fade .25s both;
        }
        .pf-modal {
          width: 100%; max-height: calc(100vh - 32px); overflow-y: auto;
          background: var(--pf-card); border: 1px solid var(--pf-border); border-radius: 28px;
          box-shadow: var(--pf-shadow-lg); animation: pf-pop .35s cubic-bezier(.28,.11,.32,1) both;
        }

        .pf-toast {
          position: fixed; left: 50%; bottom: 24px; z-index: 60; transform: translateX(-50%);
          display: flex; align-items: center; gap: 10px; padding: 12px 20px; border-radius: 999px;
          background: var(--pf-text); color: var(--pf-card); font-size: 14px; font-weight: 500;
          box-shadow: var(--pf-shadow-lg); animation: pf-pop .35s cubic-bezier(.28,.11,.32,1) both;
          max-width: calc(100vw - 32px);
        }

        .pf-skeleton { background: var(--pf-subtle); border-radius: 10px; animation: pf-pulse 1.6s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .pf-rise, .pf-backdrop, .pf-modal, .pf-toast { animation: none; }
          .pf-meter span { transition: none; }
        }
      `}</style>

      {/* ===== Header ===== */}
      <div className="pf-rise mb-8">
        <h1 className="text-[32px] font-semibold leading-[1.15] tracking-[-0.03em] md:text-[40px]">My Profile</h1>
        <p className="pf-muted mt-1 text-[16px]">จัดการข้อมูลส่วนตัว ช่องทางติดต่อ และความปลอดภัยของบัญชี</p>
      </div>

      {loading ? (
        <div className="pf-card overflow-hidden" aria-busy="true">
          <div className="pf-skeleton pf-cover !rounded-none" />
          <div className="p-6 md:p-10">
            <div className="pf-skeleton -mt-20 h-[124px] w-[124px] !rounded-full md:-mt-24 md:h-[148px] md:w-[148px]" />
            <div className="pf-skeleton mt-6 h-6 w-1/3" />
            <div className="pf-skeleton mt-8 h-14 w-full" />
            <div className="pf-skeleton mt-6 h-40 w-full" />
          </div>
        </div>
      ) : loadError ? (
        <div className="pf-card px-8 py-14 text-center">
          <h3 className="text-[20px] font-semibold tracking-[-0.02em]">โหลดข้อมูลโปรไฟล์ไม่สำเร็จ</h3>
          <p className="pf-muted mt-2 text-[15px]">เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง</p>
          <button type="button" className="pf-btn pf-btn-primary mt-6" onClick={fetchMyProfile}>
            ลองใหม่อีกครั้ง
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ===== Profile card ===== */}
          <form id="pf-form" onSubmit={handleSubmit} noValidate className="pf-card pf-rise overflow-hidden" style={{ animationDelay: '60ms' }}>
            <div className="pf-cover" />

            <div className="p-6 md:p-10">
              {/* Identity */}
              <div className="-mt-[74px] mb-8 flex flex-col items-center gap-5 md:-mt-[88px] md:flex-row md:items-end md:gap-7">
                <div className="flex flex-col items-center gap-3">
                  <div className="pf-avatar-ring">
                    {previewImage ? (
                      <img src={previewImage} alt="รูปโปรไฟล์" />
                    ) : (
                      <div className="pf-avatar-fallback" aria-hidden>{initial}</div>
                    )}
                  </div>
                  <label className="pf-btn pf-btn-ghost pf-btn-sm cursor-pointer">
                    <CameraIcon /> เปลี่ยนรูปโปรไฟล์
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="sr-only"
                    />
                  </label>
                </div>

                <div className="min-w-0 pb-1 text-center md:text-left">
                  <h2 className="text-[26px] font-semibold leading-[1.2] tracking-[-0.025em] [overflow-wrap:anywhere] md:text-[30px]">
                    {formData.first_name || 'ไม่ได้ระบุชื่อ'} {formData.last_name}
                  </h2>
                  <p className="pf-muted mt-0.5 text-[15px]">@{formData.nickname || 'student'}</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2 md:justify-start">
                    <span className={`pf-role pf-role-${role}`}>{role.toUpperCase()}</span>
                    <span className="pf-chip">{account?.sec || 'ไม่มีกลุ่ม'}</span>
                    {account?.year_level && <span className="pf-chip">ปี {account.year_level}</span>}
                  </div>
                </div>
              </div>

              {/* Read-only account info */}
              <div className="pf-info mb-9">
                <span className="pf-info-icon"><MailIcon /></span>
                <div className="min-w-0 flex-1">
                  <p className="pf-muted text-[13px]">อีเมลบัญชี</p>
                  <p className="truncate text-[15px] font-medium">{account?.email || '-'}</p>
                </div>
                <span className="pf-chip hidden sm:inline-flex">แก้ไขไม่ได้</span>
              </div>

              <div className="space-y-10">
                {/* Personal */}
                <section>
                  <h3 className="pf-section-title">ข้อมูลส่วนตัว</h3>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="pf-label" htmlFor="pf-first">ชื่อจริง</label>
                      <input id="pf-first" type="text" className="pf-input" value={formData.first_name} onChange={setField('first_name')} aria-invalid={Boolean(errors.first_name)} />
                      {errors.first_name && <p className="pf-error">{errors.first_name}</p>}
                    </div>
                    <div>
                      <label className="pf-label" htmlFor="pf-last">นามสกุล</label>
                      <input id="pf-last" type="text" className="pf-input" value={formData.last_name} onChange={setField('last_name')} aria-invalid={Boolean(errors.last_name)} />
                      {errors.last_name && <p className="pf-error">{errors.last_name}</p>}
                    </div>
                    <div>
                      <label className="pf-label" htmlFor="pf-nick">ชื่อเล่น</label>
                      <input id="pf-nick" type="text" className="pf-input" value={formData.nickname} onChange={setField('nickname')} aria-invalid={Boolean(errors.nickname)} />
                      {errors.nickname && <p className="pf-error">{errors.nickname}</p>}
                    </div>
                    <div>
                      <label className="pf-label" htmlFor="pf-tel">เบอร์โทรศัพท์</label>
                      <input id="pf-tel" type="tel" inputMode="tel" className="pf-input" value={formData.tel} onChange={setField('tel')} aria-invalid={Boolean(errors.tel)} />
                      {errors.tel && <p className="pf-error">{errors.tel}</p>}
                    </div>
                  </div>
                </section>

                {/* Social */}
                <section>
                  <h3 className="pf-section-title">ช่องทางการติดต่อ</h3>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                    {SOCIAL_KEYS.map((k) => (
                      <SocialField
                        key={k}
                        name={k}
                        value={formData[k]}
                        error={errors[k]}
                        onChange={setField(k)}
                        onBlur={normalizeSocialOnBlur(k)}
                      />
                    ))}
                  </div>
                  <p className="pf-muted mt-4 text-[13px] leading-[1.6]">
                    กรอกเฉพาะชื่อผู้ใช้ เช่น <span className="font-medium" style={{ color: 'var(--pf-text)' }}>username</span> หรือวางลิงก์โปรไฟล์มาได้เลย ระบบจะแปลงให้อัตโนมัติ
                  </p>
                </section>
              </div>

              {/* Footer */}
              <div className="pf-footer">
                <p className="flex items-center gap-2 text-[13px]" role="status" aria-live="polite">
                  {dirty ? (
                    <>
                      <span className="h-2 w-2 rounded-full" style={{ background: 'var(--pf-warn-dot)' }} />
                      มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก
                    </>
                  ) : (
                    <span className="pf-muted">
                      {account?.updated_at ? `แก้ไขล่าสุด ${formatDateTime(account.updated_at)}` : 'ข้อมูลเป็นปัจจุบันแล้ว'}
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-3">
                  <button type="button" className="pf-btn pf-btn-ghost" onClick={handleReset} disabled={!dirty || updating}>
                    ย้อนกลับ
                  </button>
                  <button type="submit" className="pf-btn pf-btn-primary" disabled={!dirty || updating}>
                    {updating ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* ===== Security card ===== */}
          <section className="pf-card pf-rise p-6 md:p-8" style={{ animationDelay: '120ms' }} aria-labelledby="pf-security-title">
            <h3 id="pf-security-title" className="text-[20px] font-semibold tracking-[-0.02em]">ความปลอดภัย</h3>
            <div className="pf-info mt-5">
              <span className="pf-info-icon"><KeyIcon /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium">รหัสผ่าน</p>
                <p className="pf-muted text-[13px] leading-[1.5]">ตั้งรหัสผ่านที่คาดเดายาก และไม่ซ้ำกับบริการอื่น</p>
              </div>
              <button type="button" className="pf-btn pf-btn-ghost pf-btn-sm" onClick={openPassword}>
                เปลี่ยนรหัสผ่าน
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ===== Change password modal ===== */}
      {pwOpen && (
        <div
          className="pf-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !changingPw) setPwOpen(false)
          }}
        >
          <div className="pf-modal max-w-[460px] p-7 md:p-8" role="dialog" aria-modal="true" aria-labelledby="pf-pw-title">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="pf-pw-title" className="text-[24px] font-semibold tracking-[-0.025em]">เปลี่ยนรหัสผ่าน</h2>
                <p className="pf-muted mt-1 text-[14px]">ยืนยันรหัสผ่านปัจจุบันก่อนตั้งรหัสผ่านใหม่</p>
              </div>
              <button type="button" className="pf-icon-btn" aria-label="ปิด" onClick={() => setPwOpen(false)} disabled={changingPw}>
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleChangePassword} noValidate className="mt-6 space-y-4">
              <div>
                <label className="pf-label" htmlFor="pf-pw-current">รหัสผ่านปัจจุบัน</label>
                <input
                  id="pf-pw-current"
                  ref={pwFieldRef}
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="pf-input"
                  value={pwForm.current}
                  onChange={setPwField('current')}
                  aria-invalid={Boolean(pwErrors.current)}
                />
                {pwErrors.current && <p className="pf-error">{pwErrors.current}</p>}
              </div>

              <div>
                <label className="pf-label" htmlFor="pf-pw-next">รหัสผ่านใหม่</label>
                <input
                  id="pf-pw-next"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="pf-input"
                  value={pwForm.next}
                  onChange={setPwField('next')}
                  aria-invalid={Boolean(pwErrors.next)}
                />
                {pwErrors.next && <p className="pf-error">{pwErrors.next}</p>}
                {pwForm.next && (
                  <>
                    <div className="pf-meter" data-level={strength.level} aria-hidden>
                      <span /><span /><span /><span />
                    </div>
                    <p className="pf-muted mt-1.5 text-[12px]">ความแข็งแรง: {strength.label} (แนะนำ 8 ตัวอักษรขึ้นไป ผสมตัวเลขหรือสัญลักษณ์)</p>
                  </>
                )}
              </div>

              <div>
                <label className="pf-label" htmlFor="pf-pw-confirm">ยืนยันรหัสผ่านใหม่</label>
                <input
                  id="pf-pw-confirm"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="pf-input"
                  value={pwForm.confirm}
                  onChange={setPwField('confirm')}
                  aria-invalid={Boolean(pwErrors.confirm)}
                />
                {pwErrors.confirm && <p className="pf-error">{pwErrors.confirm}</p>}
              </div>

              <button type="button" className="pf-link" onClick={() => setShowPw((v) => !v)}>
                {showPw ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              </button>

              <label className="pf-check">
                <input type="checkbox" checked={pwForm.signOutOthers} onChange={setPwField('signOutOthers')} />
                <span>
                  ออกจากระบบบนอุปกรณ์อื่นทั้งหมด
                  <span className="pf-muted block text-[13px]">แนะนำ หากสงสัยว่ามีผู้อื่นเข้าใช้บัญชีของคุณ</span>
                </span>
              </label>

              {pwErrors.form && <div className="pf-banner-error" role="alert">{pwErrors.form}</div>}

              <div className="flex gap-3 pt-2">
                <button type="button" className="pf-btn pf-btn-ghost flex-1" onClick={() => setPwOpen(false)} disabled={changingPw}>
                  ยกเลิก
                </button>
                <button type="submit" className="pf-btn pf-btn-primary flex-1" disabled={changingPw}>
                  {changingPw ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Toast ===== */}
      {toast && (
        <div className="pf-toast" role="status" aria-live="polite">
          <span
            className="h-2 w-2 flex-shrink-0 rounded-full"
            style={{
              background:
                toast.type === 'error'
                  ? 'var(--pf-danger-solid)'
                  : toast.type === 'info'
                    ? 'var(--pf-primary)'
                    : 'var(--pf-success-dot)',
            }}
          />
          {toast.message}
        </div>
      )}
    </div>
  )
}