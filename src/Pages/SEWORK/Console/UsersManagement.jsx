import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { notifyDiscord } from '../../../lib/discord'

/* =====================================================================
 * Config
 * ===================================================================== */
const SECS = [
  { value: 'SEC 1', label: 'SEC 1 (ปกติ)' },
  { value: 'SEC 2', label: 'SEC 2 (เทียบโอน)' },
]
const YEAR_LEVELS = [1, 2, 3, 4]
const TOAST_MS = 3500

// Edge Function ที่ใช้ service_role (ลบ Auth user / เปลี่ยนรหัสผ่าน) — ดูไฟล์ admin-user-manage/index.ts
const ADMIN_FUNCTION = 'admin-user-manage'

const MIN_PASSWORD = 6
const MAX_PASSWORD = 72
const MAX_AVATAR_BYTES = 5 * 1024 * 1024

// Manager เปลี่ยนรหัสผ่านได้เฉพาะ role เหล่านี้ (และต้องอยู่ SEC เดียวกัน)
const MANAGER_PASSWORD_TARGET_ROLES = ['admin', 'manager']

const EMPTY_FORM = {
  email: '',
  password: '',
  confirmPassword: '',
  first_name: '',
  last_name: '',
  nickname: '',
  role: 'student',
  year_level: '1',
  sec: 'SEC 1',
  tel: '',
  facebook: '',
  instagram: '',
  github_account: '',
}

/* =====================================================================
 * Permissions
 * ---------------------------------------------------------------------
 * ฝั่งหน้าบ้านใช้ซ่อน/แสดงปุ่มเท่านั้น — สิทธิ์จริงของ "ลบ" และ "เปลี่ยนรหัสผ่าน"
 * ถูกตรวจซ้ำใน Edge Function ส่วน "แก้ไขข้อมูล" ยังพึ่ง RLS ของตาราง profiles
 * ===================================================================== */
const norm = (r) => String(r || '').toLowerCase()

// CEO: แก้ได้ทุกคน / Manager: แก้ได้ทุกคนยกเว้น CEO (เพราะ role สูงกว่า)
const canEditUser = (actor, target) => {
  const a = norm(actor?.role)
  if (a === 'ceo') return true
  if (a === 'manager') return norm(target?.role) !== 'ceo'
  return false
}

// เฉพาะ CEO และลบตัวเองไม่ได้
const canDeleteUser = (actor, target) => norm(actor?.role) === 'ceo' && actor?.id !== target?.id

// CEO: ทุกคน / Manager: เฉพาะ Admin กับ Manager ใน SEC เดียวกับตัวเอง
const canChangePassword = (actor, target) => {
  const a = norm(actor?.role)
  if (a === 'ceo') return true
  if (a === 'manager') {
    return (
      Boolean(actor?.sec) &&
      target?.sec === actor.sec &&
      MANAGER_PASSWORD_TARGET_ROLES.includes(norm(target?.role))
    )
  }
  return false
}

const roleOptionsFor = (actor, current) => {
  const base =
    norm(actor?.role) === 'ceo'
      ? ['student', 'admin', 'manager', 'ceo']
      : ['student', 'admin', 'manager']
  // กัน select ไม่มีตัวเลือกตรงกับ role ปัจจุบันของผู้ใช้ (ไม่งั้นบันทึกแล้ว role เปลี่ยนเงียบ ๆ)
  return current && !base.includes(current) ? [...base, current] : base
}

/* =====================================================================
 * Helpers
 * ===================================================================== */
const fullName = (u) => [u?.first_name, u?.last_name].filter(Boolean).join(' ') || 'ไม่ระบุชื่อ'
const initialOf = (u) => (u?.first_name || u?.nickname || '?').trim().charAt(0).toUpperCase() || '?'
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

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

// เรียก Edge Function ที่ใช้ service_role และดึงข้อความ error จริงออกมา
const invokeAdmin = async (action, payload) => {
  const { data, error } = await supabase.functions.invoke(ADMIN_FUNCTION, {
    body: { action, ...payload },
  })

  if (error) {
    let message = error.message
    try {
      const body = await error.context?.json()
      if (body?.error) message = body.error
    } catch {
      /* ใช้ message เดิม */
    }
    throw new Error(message)
  }
  if (!data?.success) throw new Error(data?.error || 'ดำเนินการไม่สำเร็จ')
  return data
}

/* =====================================================================
 * Icons
 * ===================================================================== */
const Icon = ({ children, className = 'h-4 w-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
)
const PlusIcon = () => <Icon><path d="M12 5v14M5 12h14" /></Icon>
const SearchIcon = () => <Icon><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Icon>
const CloseIcon = () => <Icon className="h-5 w-5"><path d="M6 6l12 12M18 6L6 18" /></Icon>
const TrashIcon = ({ className }) => (
  <Icon className={className}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" /></Icon>
)
const KeyIcon = ({ className }) => (
  <Icon className={className}><circle cx="8" cy="15" r="4" /><path d="M10.9 12.1L20 3M17 6l3 3M14 9l2 2" /></Icon>
)
const UsersIcon = () => (
  <Icon className="h-7 w-7"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0113 0M16 4.6a3.5 3.5 0 010 6.8M18 14.2a6.5 6.5 0 013.5 5.8" /></Icon>
)

/* =====================================================================
 * Small components
 * ===================================================================== */
function Avatar({ person, size = 40 }) {
  const [failed, setFailed] = useState(false)
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) }

  if (person.profile_image_url && !failed) {
    return <img src={person.profile_image_url} alt="" className="um-avatar" style={style} onError={() => setFailed(true)} />
  }
  return (
    <div className="um-avatar um-avatar-fallback" style={style} aria-hidden>
      {initialOf(person)}
    </div>
  )
}

/* =====================================================================
 * Page
 * ===================================================================== */
export default function UsersManagement() {
  const { profile } = useAuth()
  const isCeoOrManager = ['ceo', 'manager'].includes(norm(profile?.role))

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  // view
  const [searchQuery, setSearchQuery] = useState('')
  const [secFilter, setSecFilter] = useState('all')
  const [toast, setToast] = useState(null)

  // create / edit
  const [showForm, setShowForm] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [file, setFile] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})

  // delete
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // change password
  const [passwordTarget, setPasswordTarget] = useState(null)
  const [pwForm, setPwForm] = useState({ password: '', confirm: '' })
  const [pwErrors, setPwErrors] = useState({})
  const [showPw, setShowPw] = useState(false)
  const [changingPw, setChangingPw] = useState(false)

  const toastTimer = useRef(null)
  const firstFieldRef = useRef(null)
  const pwFieldRef = useRef(null)

  /* ---------- Toast ---------- */
  const showToast = useCallback((type, message) => {
    clearTimeout(toastTimer.current)
    setToast({ type, message })
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  /* ---------- Fetch ---------- */
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(false)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('role', { ascending: true })
        .order('first_name', { ascending: true })

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error fetching users:', err.message)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    document.title = 'Users Management | SE-CONSOLE'
    if (isCeoOrManager) {
      fetchUsers()
    } else {
      setLoading(false)
    }
  }, [isCeoOrManager, fetchUsers])

  /* ---------- Modal behaviour (ESC / scroll lock / focus) ---------- */
  const modalOpen = showForm || Boolean(deleteTarget) || Boolean(passwordTarget)
  const busy = updating || deleting || changingPw

  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e) => {
      if (e.key !== 'Escape' || busy) return
      setShowForm(false)
      setDeleteTarget(null)
      setPasswordTarget(null)
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [modalOpen, busy])

  useEffect(() => {
    if (showForm) firstFieldRef.current?.focus()
  }, [showForm])

  useEffect(() => {
    if (passwordTarget) pwFieldRef.current?.focus()
  }, [passwordTarget])

  /* ---------- Create / Edit ---------- */
  const setField = (name) => (e) => {
    setFormData((f) => ({ ...f, [name]: e.target.value }))
    if (formErrors[name]) setFormErrors((er) => ({ ...er, [name]: undefined }))
  }

  const openCreateModal = () => {
    setIsCreating(true)
    setEditingUser(null)
    setFile(null)
    setFormErrors({})
    setFormData(EMPTY_FORM)
    setShowForm(true)
  }

  const openEditModal = (user) => {
    if (!canEditUser(profile, user)) return
    setIsCreating(false)
    setEditingUser(user)
    setFile(null)
    setFormErrors({})
    setFormData({
      ...EMPTY_FORM,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      nickname: user.nickname || '',
      role: user.role || 'student',
      year_level: user.year_level?.toString() || '1',
      sec: user.sec || 'SEC 1',
      tel: user.tel || '',
      facebook: user.facebook || '',
      instagram: user.instagram || '',
      github_account: user.github_account || '',
    })
    setShowForm(true)
  }

  const closeForm = () => {
    if (!updating) setShowForm(false)
  }

  const onFileChange = (e) => {
    const picked = e.target.files?.[0] || null
    if (picked && !picked.type.startsWith('image/')) {
      setFile(null)
      e.target.value = ''
      return setFormErrors((er) => ({ ...er, file: 'ไฟล์ต้องเป็นรูปภาพเท่านั้น' }))
    }
    if (picked && picked.size > MAX_AVATAR_BYTES) {
      setFile(null)
      e.target.value = ''
      return setFormErrors((er) => ({ ...er, file: 'รูปต้องมีขนาดไม่เกิน 5 MB' }))
    }
    setFile(picked)
    setFormErrors((er) => ({ ...er, file: undefined }))
  }

  const validateForm = () => {
    const errs = {}
    if (isCreating) {
      if (!isEmail(formData.email.trim())) errs.email = 'อีเมลไม่ถูกต้อง'
      if (formData.password.length < MIN_PASSWORD) errs.password = `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD} ตัวอักษร`
      else if (formData.password.length > MAX_PASSWORD) errs.password = `รหัสผ่านต้องไม่เกิน ${MAX_PASSWORD} ตัวอักษร`
      if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'รหัสผ่านและการยืนยันไม่ตรงกัน'
    }
    if (!formData.first_name.trim()) errs.first_name = 'กรุณากรอกชื่อจริง'
    if (!formData.last_name.trim()) errs.last_name = 'กรุณากรอกนามสกุล'
    if (!formData.nickname.trim()) errs.nickname = 'กรุณากรอกชื่อเล่น'
    if (formData.facebook.trim() && !/^https?:\/\//i.test(formData.facebook.trim())) errs.facebook = 'ต้องขึ้นต้นด้วย https://'
    if (formData.github_account.trim() && !/^https?:\/\//i.test(formData.github_account.trim())) errs.github_account = 'ต้องขึ้นต้นด้วย https://'
    if (formErrors.file) errs.file = formErrors.file
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (updating) return

    const errs = validateForm()
    setFormErrors(errs)
    if (Object.keys(errs).length > 0) return

    // กัน Manager ตั้ง/แก้เป็น CEO แม้จะถูกแก้ HTML ผ่าน DevTools
    if (norm(profile?.role) !== 'ceo' && formData.role === 'ceo' && norm(editingUser?.role) !== 'ceo') {
      return showToast('error', 'ไม่มีสิทธิ์กำหนดระดับสิทธิ์ CEO')
    }
    if (!isCreating && !canEditUser(profile, editingUser)) {
      return showToast('error', 'ไม่มีสิทธิ์แก้ไขผู้ใช้นี้')
    }

    try {
      setUpdating(true)
      let targetUserId = editingUser?.id
      let uploadedImageUrl = null

      // 1. สร้าง Account ใหม่ (client ชั่วคราว ไม่ทับ session ของคนที่ล็อกอินอยู่)
      if (isCreating) {
        const tempClient = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          { auth: { persistSession: false, autoRefreshToken: false } }
        )

        const { data: authData, error: authError } = await tempClient.auth.signUp({
          email: formData.email.trim(),
          password: formData.password,
        })

        if (authError) throw authError
        // อีเมลที่มีอยู่แล้วบางโปรเจกต์จะไม่ error แต่คืน identities ว่าง
        if (!authData.user || authData.user.identities?.length === 0) {
          throw new Error('ไม่สามารถสร้างบัญชีได้ (อีเมลนี้อาจถูกใช้งานแล้ว)')
        }

        targetUserId = authData.user.id
      }

      // 2. อัปโหลดรูปภาพ
      if (file) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`
        const filePath = `${targetUserId}/${fileName}`

        const { error: uploadError } = await supabase.storage.from('profile-images').upload(filePath, file)
        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage.from('profile-images').getPublicUrl(filePath)
        uploadedImageUrl = publicUrl
      }

      const profilePayload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        nickname: formData.nickname.trim(),
        role: formData.role,
        year_level: parseInt(formData.year_level),
        sec: formData.sec,
        tel: formData.tel.trim(),
        facebook: formData.facebook.trim(),
        instagram: formData.instagram.trim(),
        github_account: formData.github_account.trim(),
        updated_at: new Date().toISOString(),
      }
      if (uploadedImageUrl) profilePayload.profile_image_url = uploadedImageUrl

      // 3. บันทึกโปรไฟล์: Create → upsert / Edit → update
      if (isCreating) {
        profilePayload.email = formData.email.trim()
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({ id: targetUserId, ...profilePayload })
        if (profileError) throw profileError
      } else {
        // .select('id') เพื่อตรวจว่าแก้ได้จริง (RLS ที่บล็อกจะไม่ error แต่คืน 0 แถว)
        const { data, error: profileError } = await supabase
          .from('profiles')
          .update(profilePayload)
          .eq('id', targetUserId)
          .select('id')
        if (profileError) throw profileError
        if (!data || data.length === 0) throw new Error('ไม่มีสิทธิ์แก้ไขผู้ใช้นี้ หรือไม่พบข้อมูลผู้ใช้')
      }

      // 4. ปิดฟอร์ม แจ้งผล และโหลดข้อมูลใหม่
      setShowForm(false)
      showToast('success', isCreating ? 'ลงทะเบียนสมาชิกเรียบร้อยแล้ว' : 'บันทึกข้อมูลเรียบร้อยแล้ว')
      fetchUsers()

      // 5. แจ้งเตือน Discord
      const who = cleanForDiscord(profile?.first_name || 'System')
      const nameText = `${cleanForDiscord(profilePayload.first_name)} ${cleanForDiscord(profilePayload.last_name)} (${cleanForDiscord(profilePayload.nickname)})`
      if (isCreating) {
        await notifyDiscordSafe(
          `✅ **สมาชิกลงทะเบียนใหม่ (ผ่านระบบแอดมิน)**\n` +
            `👤 **ชื่อ:** ${nameText}\n` +
            `🔑 **สิทธิ์:** ${formData.role.toUpperCase()} | **กลุ่ม:** ${formData.sec} (ปี ${formData.year_level})\n` +
            `👨‍💻 **ลงทะเบียนโดย:** ${who}`
        )
      } else {
        await notifyDiscordSafe(
          `🔄 **อัปเดตข้อมูลผู้ใช้**\n` +
            `👤 **ชื่อ:** ${nameText}\n` +
            `🔑 **สิทธิ์:** ${formData.role.toUpperCase()} | **กลุ่ม:** ${formData.sec} (ปี ${formData.year_level})\n` +
            `👨‍💻 **แก้ไขโดย:** ${who}`
        )
      }
    } catch (err) {
      console.error('Submit Error:', err.message)
      showToast('error', err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    } finally {
      setUpdating(false)
    }
  }

  /* ---------- Delete user ---------- */
  const openDelete = (user) => {
    if (!canDeleteUser(profile, user)) return
    setDeleteTarget(user)
  }

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return
    const target = deleteTarget

    try {
      setDeleting(true)

      // Edge Function ลบทั้ง Supabase Auth และแถวใน profiles (+ รูปโปรไฟล์) และตรวจสิทธิ์ซ้ำที่ Server
      await invokeAdmin('delete-user', { userId: target.id })

      setUsers((prev) => prev.filter((u) => u.id !== target.id))
      setDeleteTarget(null)
      showToast('success', 'ลบผู้ใช้ออกจากระบบเรียบร้อยแล้ว')

      await notifyDiscordSafe(
        `🗑️ **ลบผู้ใช้ออกจากระบบ**\n` +
          `👤 **ชื่อ:** ${cleanForDiscord(fullName(target))} (@${cleanForDiscord(target.nickname || '-')})\n` +
          `🔑 **สิทธิ์:** ${String(target.role || '-').toUpperCase()} | **กลุ่ม:** ${target.sec || '-'} (ปี ${target.year_level || '-'})\n` +
          `👨‍💻 **ลบโดย:** ${cleanForDiscord(profile?.first_name || 'System')}`
      )
    } catch (err) {
      console.error('Delete User Error:', err.message)
      showToast('error', err.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้')
      setDeleteTarget(null)
      fetchUsers() // ลบอาจสำเร็จบางส่วน — โหลดสถานะจริงอีกครั้ง
    } finally {
      setDeleting(false)
    }
  }

  /* ---------- Change password ---------- */
  const openPassword = (user) => {
    if (!canChangePassword(profile, user)) return
    setPwForm({ password: '', confirm: '' })
    setPwErrors({})
    setShowPw(false)
    setPasswordTarget(user)
  }

  const setPwField = (name) => (e) => {
    setPwForm((f) => ({ ...f, [name]: e.target.value }))
    if (pwErrors[name] || pwErrors.form) setPwErrors((er) => ({ ...er, [name]: undefined, form: undefined }))
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!passwordTarget || changingPw) return
    const target = passwordTarget

    const errs = {}
    if (pwForm.password.length < MIN_PASSWORD) errs.password = `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD} ตัวอักษร`
    else if (pwForm.password.length > MAX_PASSWORD) errs.password = `รหัสผ่านต้องไม่เกิน ${MAX_PASSWORD} ตัวอักษร`
    if (pwForm.confirm !== pwForm.password) errs.confirm = 'รหัสผ่านและการยืนยันไม่ตรงกัน'
    setPwErrors(errs)
    if (Object.keys(errs).length > 0) return

    try {
      setChangingPw(true)
      await invokeAdmin('change-password', { userId: target.id, newPassword: pwForm.password })

      setPasswordTarget(null)
      setPwForm({ password: '', confirm: '' })
      showToast('success', 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว')

      // ห้ามใส่รหัสผ่านใน Discord
      await notifyDiscordSafe(
        `🔐 **เปลี่ยนรหัสผ่านผู้ใช้**\n` +
          `👤 **ผู้ใช้:** ${cleanForDiscord(fullName(target))} (@${cleanForDiscord(target.nickname || '-')})\n` +
          `📌 **กลุ่ม:** ${target.sec || '-'} | **สิทธิ์:** ${String(target.role || '-').toUpperCase()}\n` +
          `👨‍💻 **เปลี่ยนโดย:** ${cleanForDiscord(profile?.first_name || 'System')}`
      )
    } catch (err) {
      console.error('Change Password Error:', err.message)
      setPwErrors({ form: err.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ' }) // แสดงในกล่อง ไม่ปิด เพื่อให้แก้แล้วลองใหม่ได้
    } finally {
      setChangingPw(false)
    }
  }

  /* ---------- Derived ---------- */
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return users.filter((u) => {
      if (secFilter !== 'all' && u.sec !== secFilter) return false
      if (!q) return true
      return [u.first_name, u.last_name, u.nickname, u.sec, u.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    })
  }, [users, searchQuery, secFilter])

  const roleOptions = roleOptionsFor(profile, formData.role)

  /* =====================================================================
   * Render
   * ===================================================================== */
  if (!isCeoOrManager) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-se-text-main">Access Denied</h1>
        <p className="mt-2 text-se-text-muted">เฉพาะ CEO และ Manager เท่านั้นที่สามารถจัดการผู้ใช้งานได้</p>
      </div>
    )
  }

  return (
    <div className="se-um relative mx-auto w-full max-w-[1100px] pb-12">
      {/*
        Design tokens — ผูกกับธีมเดิมของโปรเจกต์ (--color-se-*)
        เวอร์ชัน Dark Mode: ทำเพียง override ตัวแปรในบล็อก :root[data-theme='dark'] / .dark ด้านล่าง
        สีพื้นผิวย่อยทั้งหมดคำนวณด้วย color-mix จากสีตัวอักษร จึงปรับตามธีมเองอัตโนมัติ
      */}
      <style>{`
        .se-um {
          --um-bg: var(--color-se-background, #f5f5f7);
          --um-card: var(--color-se-surface, #ffffff);
          --um-border: var(--color-se-border, rgba(0,0,0,0.12));
          --um-text: var(--color-se-text-main, #1d1d1f);
          --um-muted: var(--color-se-text-muted, #6e6e73);
          --um-primary: var(--color-se-primary, #0071e3);
          --um-primary-hover: var(--color-se-primary-hover, #0077ed);

          --um-subtle: color-mix(in srgb, var(--um-text) 6%, transparent);
          --um-subtle-hover: color-mix(in srgb, var(--um-text) 11%, transparent);
          --um-primary-soft: color-mix(in srgb, var(--um-primary) 14%, transparent);

          --um-danger: #d70015;
          --um-danger-solid: #ff3b30;
          --um-danger-soft: rgba(255,59,48,0.12);
          --um-success-dot: #34c759;

          --um-role-ceo: #b25e00;
          --um-role-manager: #8944ab;
          --um-role-admin: #0066cc;

          --um-overlay: rgba(0,0,0,0.38);
          --um-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05);
          --um-shadow-lg: 0 24px 80px rgba(0,0,0,0.20);
          color: var(--um-text);
        }
        :root[data-theme='dark'] .se-um,
        .dark .se-um {
          color-scheme: dark;
          --um-danger: #ff6961;
          --um-danger-solid: #ff453a;
          --um-danger-soft: rgba(255,69,58,0.18);
          --um-success-dot: #30d158;
          --um-role-ceo: #ffb340;
          --um-role-manager: #da8fff;
          --um-role-admin: #64b5ff;
          --um-overlay: rgba(0,0,0,0.6);
          --um-shadow: 0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.25);
          --um-shadow-lg: 0 24px 80px rgba(0,0,0,0.6);
        }

        @keyframes um-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes um-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes um-pop  { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: none; } }
        @keyframes um-pulse { 50% { opacity: .5; } }
        .um-rise { animation: um-rise .6s cubic-bezier(.28,.11,.32,1) both; }

        .um-muted { color: var(--um-muted); }

        .um-card {
          background: var(--um-card);
          border: 1px solid var(--um-border);
          border-radius: 24px;
          box-shadow: var(--um-shadow);
        }

        .um-input {
          width: 100%; height: 44px; padding: 0 14px; border-radius: 12px;
          border: 1px solid var(--um-border); background: var(--um-bg); color: var(--um-text);
          font-size: 15px; outline: none; transition: border-color .2s, box-shadow .2s, background .2s;
        }
        .um-input::placeholder { color: var(--um-muted); opacity: .7; }
        .um-input:focus { border-color: var(--um-primary); background: var(--um-card); box-shadow: 0 0 0 4px var(--um-primary-soft); }
        .um-input[aria-invalid='true'] { border-color: var(--um-danger-solid); }
        .um-input[aria-invalid='true']:focus { box-shadow: 0 0 0 4px var(--um-danger-soft); }

        .um-file {
          width: 100%; padding: 7px 10px; border-radius: 12px; border: 1px dashed var(--um-border);
          background: var(--um-bg); color: var(--um-muted); font-size: 14px; cursor: pointer; outline: none;
        }
        .um-file::file-selector-button {
          margin-right: 12px; height: 30px; padding: 0 14px; border: 0; border-radius: 999px;
          background: var(--um-primary); color: #fff; font-size: 13px; font-weight: 500; cursor: pointer;
        }
        .um-file:focus-visible { border-color: var(--um-primary); box-shadow: 0 0 0 4px var(--um-primary-soft); }

        .um-label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; }
        .um-error { margin-top: 6px; font-size: 13px; color: var(--um-danger); }
        .um-banner-error {
          padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.5;
          background: var(--um-danger-soft); color: var(--um-danger);
        }

        .um-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          height: 40px; padding: 0 20px; border: 0; border-radius: 999px;
          font-size: 14px; font-weight: 500; cursor: pointer; white-space: nowrap;
          transition: background .2s, opacity .2s, transform .1s;
        }
        .um-btn-sm { height: 32px; padding: 0 14px; font-size: 13px; }
        .um-btn:active:not(:disabled) { transform: scale(.98); }
        .um-btn:disabled { opacity: .6; cursor: not-allowed; }
        .um-btn-primary { background: var(--um-primary); color: #fff; }
        .um-btn-primary:hover:not(:disabled) { background: var(--um-primary-hover); }
        .um-btn-ghost { background: var(--um-subtle); color: var(--um-text); }
        .um-btn-ghost:hover:not(:disabled) { background: var(--um-subtle-hover); }
        .um-btn-danger { background: var(--um-danger-solid); color: #fff; }
        .um-btn-danger:hover:not(:disabled) { filter: brightness(.94); }

        .um-icon-btn {
          display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
          width: 34px; height: 34px; border: 0; border-radius: 999px; background: transparent;
          color: var(--um-muted); cursor: pointer; transition: background .2s, color .2s;
        }
        .um-icon-btn:hover { background: var(--um-subtle); color: var(--um-text); }
        .um-icon-btn-danger:hover { background: var(--um-danger-soft); color: var(--um-danger); }
        .um-icon-btn:focus-visible, .um-btn:focus-visible, .um-seg button:focus-visible, .um-link:focus-visible {
          outline: 2px solid var(--um-primary); outline-offset: 2px;
        }

        .um-chip {
          display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px;
          font-size: 12px; font-weight: 500; background: var(--um-subtle); color: var(--um-muted);
        }
        .um-chip-primary { background: var(--um-primary-soft); color: var(--um-primary); }

        .um-role {
          --rc: var(--um-muted);
          display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px;
          font-size: 12px; font-weight: 600; color: var(--rc);
          background: color-mix(in srgb, var(--rc) 14%, transparent);
        }
        .um-role-ceo { --rc: var(--um-role-ceo); }
        .um-role-manager { --rc: var(--um-role-manager); }
        .um-role-admin { --rc: var(--um-role-admin); }

        .um-seg { display: inline-flex; padding: 3px; border-radius: 999px; background: var(--um-subtle); }
        .um-seg button {
          height: 32px; padding: 0 14px; border: 0; border-radius: 999px; background: transparent;
          font-size: 13px; font-weight: 500; color: var(--um-muted); cursor: pointer; transition: all .2s; white-space: nowrap;
        }
        .um-seg button[aria-pressed='true'] { background: var(--um-card); color: var(--um-text); box-shadow: 0 1px 3px rgba(0,0,0,0.14); }

        .um-link { background: none; border: 0; padding: 0; font-size: 14px; color: var(--um-primary); cursor: pointer; }
        .um-link:hover { text-decoration: underline; text-underline-offset: 4px; }

        .um-avatar { flex-shrink: 0; border-radius: 999px; object-fit: cover; }
        .um-avatar-fallback {
          display: flex; align-items: center; justify-content: center; font-weight: 600;
          background: var(--um-primary-soft); color: var(--um-primary);
        }

        /* ---------- Table ---------- */
        .um-table-wrap { overflow-x: auto; }
        .um-table { width: 100%; min-width: 720px; border-collapse: collapse; text-align: left; }
        .um-table th {
          padding: 14px 20px; font-size: 13px; font-weight: 500; color: var(--um-muted);
          background: color-mix(in srgb, var(--um-text) 3%, transparent); border-bottom: 1px solid var(--um-border);
        }
        .um-table td { padding: 14px 20px; border-top: 1px solid var(--um-border); vertical-align: middle; }
        .um-table tbody tr:first-child td { border-top: 0; }
        .um-table tbody tr { transition: background .2s; }
        .um-table tbody tr:hover { background: var(--um-subtle); }
        .um-center { text-align: center !important; }

        /* ---------- Modal / toast ---------- */
        .um-backdrop {
          position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center;
          padding: 16px; background: var(--um-overlay); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          animation: um-fade .25s both;
        }
        .um-modal {
          width: 100%; max-height: calc(100vh - 32px); overflow-y: auto;
          background: var(--um-card); border: 1px solid var(--um-border); border-radius: 28px;
          box-shadow: var(--um-shadow-lg); animation: um-pop .35s cubic-bezier(.28,.11,.32,1) both;
        }
        .um-modal-flex { display: flex; flex-direction: column; overflow: hidden; }
        .um-modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 28px 32px 20px; border-bottom: 1px solid var(--um-border); }
        .um-modal-body { flex: 1; overflow-y: auto; padding: 24px 32px; }
        .um-modal-foot { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 32px; border-top: 1px solid var(--um-border); background: color-mix(in srgb, var(--um-text) 3%, transparent); }
        @media (max-width: 640px) {
          .um-modal-head { padding: 22px 20px 16px; }
          .um-modal-body { padding: 20px; }
          .um-modal-foot { padding: 14px 20px; }
        }

        .um-section-title { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; padding-bottom: 10px; margin-bottom: 14px; border-bottom: 1px solid var(--um-border); }

        .um-toast {
          position: fixed; left: 50%; bottom: 24px; z-index: 60; transform: translateX(-50%);
          display: flex; align-items: center; gap: 10px; padding: 12px 20px; border-radius: 999px;
          background: var(--um-text); color: var(--um-card); font-size: 14px; font-weight: 500;
          box-shadow: var(--um-shadow-lg); animation: um-pop .35s cubic-bezier(.28,.11,.32,1) both;
          max-width: calc(100vw - 32px);
        }

        .um-skeleton { background: var(--um-subtle); border-radius: 10px; animation: um-pulse 1.6s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .um-rise, .um-backdrop, .um-modal, .um-toast { animation: none; }
          .um-table tbody tr { transition: none; }
        }
      `}</style>

      {/* ===== Header ===== */}
      <div className="um-rise mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[32px] font-semibold leading-[1.15] tracking-[-0.03em] md:text-[40px]">Users Management</h1>
          <p className="um-muted mt-1 text-[16px]">จัดการระดับสิทธิ์ ลงทะเบียน และดูแลบัญชีสมาชิก</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span className="um-chip um-chip-primary" style={{ height: 32, fontSize: 13 }}>
            ทั้งหมด {users.length} คน
          </span>
          <button type="button" className="um-btn um-btn-primary" onClick={openCreateModal}>
            <PlusIcon /> ลงทะเบียนสมาชิก
          </button>
        </div>
      </div>

      {/* ===== Toolbar ===== */}
      <div className="um-rise mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between" style={{ animationDelay: '60ms' }}>
        <div className="relative w-full md:max-w-[380px]">
          <span className="um-muted pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
            <SearchIcon />
          </span>
          <input
            type="search"
            className="um-input"
            style={{ paddingLeft: 40, borderRadius: 999 }}
            placeholder="ค้นหาชื่อ ชื่อเล่น อีเมล หรือ SEC"
            aria-label="ค้นหาผู้ใช้"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between gap-4 md:justify-end">
          <div className="um-seg" role="group" aria-label="กรองตาม SEC">
            {['all', ...SECS.map((s) => s.value)].map((s) => (
              <button key={s} type="button" aria-pressed={secFilter === s} onClick={() => setSecFilter(s)}>
                {s === 'all' ? 'ทั้งหมด' : s}
              </button>
            ))}
          </div>
          {!loading && !loadError && (
            <span className="um-muted whitespace-nowrap text-[13px] tabular-nums">{filteredUsers.length} รายการ</span>
          )}
        </div>
      </div>

      {/* ===== List ===== */}
      {loading ? (
        <div className="um-card p-5" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="mb-3 flex items-center gap-3 last:mb-0">
              <div className="um-skeleton h-10 w-10 !rounded-full" />
              <div className="flex-1">
                <div className="um-skeleton h-4 w-1/3" />
                <div className="um-skeleton mt-2 h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="um-card px-8 py-14 text-center">
          <h3 className="text-[20px] font-semibold tracking-[-0.02em]">โหลดรายชื่อผู้ใช้ไม่สำเร็จ</h3>
          <p className="um-muted mt-2 text-[15px]">เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง</p>
          <button type="button" className="um-btn um-btn-primary mt-6" onClick={fetchUsers}>
            ลองใหม่อีกครั้ง
          </button>
        </div>
      ) : users.length === 0 ? (
        <div className="um-card flex flex-col items-center px-8 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'var(--um-primary-soft)', color: 'var(--um-primary)' }}>
            <UsersIcon />
          </div>
          <h3 className="mt-5 text-[20px] font-semibold tracking-[-0.02em]">ยังไม่มีสมาชิกในระบบ</h3>
          <p className="um-muted mt-2 text-[15px]">เริ่มต้นโดยลงทะเบียนสมาชิกคนแรก</p>
          <button type="button" className="um-btn um-btn-primary mt-6" onClick={openCreateModal}>
            <PlusIcon /> ลงทะเบียนสมาชิก
          </button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="um-card px-8 py-14 text-center">
          <h3 className="text-[20px] font-semibold tracking-[-0.02em]">ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไข</h3>
          <button
            type="button"
            className="um-link mt-3"
            onClick={() => {
              setSearchQuery('')
              setSecFilter('all')
            }}
          >
            ล้างตัวกรอง
          </button>
        </div>
      ) : (
        <div className="um-card um-rise overflow-hidden" style={{ animationDelay: '100ms' }}>
          <div className="um-table-wrap">
            <table className="um-table">
              <thead>
                <tr>
                  <th>ชื่อ-นามสกุล</th>
                  <th className="um-center">ชั้นปี / SEC</th>
                  <th className="um-center">ระดับสิทธิ์</th>
                  <th className="um-center">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isMe = user.id === profile?.id
                  const editable = canEditUser(profile, user)
                  const pwAllowed = canChangePassword(profile, user)
                  const deletable = canDeleteUser(profile, user)
                  const role = norm(user.role)

                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar person={user} size={40} />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[15px] font-semibold tracking-[-0.01em]">{fullName(user)}</p>
                              {isMe && <span className="um-chip um-chip-primary">คุณ</span>}
                            </div>
                            <p className="um-muted flex flex-wrap gap-x-3 text-[13px]">
                              <span>@{user.nickname || 'student'}</span>
                              <span>{user.tel || 'ไม่มีเบอร์โทร'}</span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="um-center">
                        <p className="text-[14px] font-semibold">{user.sec || 'ไม่มีกลุ่ม'}</p>
                        <p className="um-muted text-[13px]">ปี {user.year_level || '-'}</p>
                      </td>
                      <td className="um-center">
                        <span className={`um-role ${role ? `um-role-${role}` : ''}`}>{(user.role || '-').toUpperCase()}</span>
                      </td>
                      <td className="um-center">
                        <div className="flex items-center justify-center gap-1">
                          {editable && (
                            <button type="button" className="um-btn um-btn-ghost um-btn-sm" onClick={() => openEditModal(user)}>
                              แก้ไข
                            </button>
                          )}
                          {pwAllowed && (
                            <button
                              type="button"
                              className="um-icon-btn"
                              aria-label={`เปลี่ยนรหัสผ่านของ ${fullName(user)}`}
                              title="เปลี่ยนรหัสผ่าน"
                              onClick={() => openPassword(user)}
                            >
                              <KeyIcon className="h-[18px] w-[18px]" />
                            </button>
                          )}
                          {deletable && (
                            <button
                              type="button"
                              className="um-icon-btn um-icon-btn-danger"
                              aria-label={`ลบผู้ใช้ ${fullName(user)}`}
                              title="ลบผู้ใช้"
                              onClick={() => openDelete(user)}
                            >
                              <TrashIcon className="h-[18px] w-[18px]" />
                            </button>
                          )}
                          {!editable && !pwAllowed && !deletable && <span className="um-muted text-[13px]">ไม่มีสิทธิ์จัดการ</span>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== Create / Edit modal ===== */}
      {showForm && (
        <div
          className="um-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeForm()
          }}
        >
          <div className="um-modal um-modal-flex max-w-[860px]" role="dialog" aria-modal="true" aria-labelledby="um-form-title">
            <div className="um-modal-head">
              <div>
                <h2 id="um-form-title" className="text-[24px] font-semibold tracking-[-0.025em]">
                  {isCreating ? 'ลงทะเบียนสมาชิกใหม่' : 'แก้ไขข้อมูลสมาชิก'}
                </h2>
                <p className="um-muted mt-1 text-[14px]">
                  {isCreating
                    ? 'กรอกข้อมูลเพื่อสร้างบัญชีใหม่ และจะแจ้งเตือนไปยัง Discord อัตโนมัติ'
                    : `กำลังแก้ไขข้อมูลของ ${editingUser?.first_name || ''}`}
                </p>
              </div>
              <button type="button" className="um-icon-btn" aria-label="ปิด" onClick={closeForm} disabled={updating}>
                <CloseIcon />
              </button>
            </div>

            <div className="um-modal-body">
              <form id="um-user-form" onSubmit={handleSubmit} noValidate className="space-y-8">
                {isCreating && (
                  <section>
                    <h3 className="um-section-title">บัญชีผู้ใช้</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <label className="um-label" htmlFor="um-email">อีเมล</label>
                        <input
                          id="um-email"
                          ref={firstFieldRef}
                          type="email"
                          autoComplete="off"
                          className="um-input"
                          value={formData.email}
                          onChange={setField('email')}
                          aria-invalid={Boolean(formErrors.email)}
                        />
                        {formErrors.email && <p className="um-error">{formErrors.email}</p>}
                      </div>
                      <div>
                        <label className="um-label" htmlFor="um-password">รหัสผ่าน</label>
                        <input
                          id="um-password"
                          type="password"
                          autoComplete="new-password"
                          className="um-input"
                          value={formData.password}
                          onChange={setField('password')}
                          aria-invalid={Boolean(formErrors.password)}
                        />
                        {formErrors.password && <p className="um-error">{formErrors.password}</p>}
                      </div>
                      <div>
                        <label className="um-label" htmlFor="um-confirm">ยืนยันรหัสผ่าน</label>
                        <input
                          id="um-confirm"
                          type="password"
                          autoComplete="new-password"
                          className="um-input"
                          value={formData.confirmPassword}
                          onChange={setField('confirmPassword')}
                          aria-invalid={Boolean(formErrors.confirmPassword)}
                        />
                        {formErrors.confirmPassword && <p className="um-error">{formErrors.confirmPassword}</p>}
                      </div>
                    </div>
                  </section>
                )}

                <section>
                  <h3 className="um-section-title">ข้อมูลส่วนตัว</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div>
                      <label className="um-label" htmlFor="um-first">ชื่อจริง</label>
                      <input
                        id="um-first"
                        ref={isCreating ? undefined : firstFieldRef}
                        type="text"
                        className="um-input"
                        value={formData.first_name}
                        onChange={setField('first_name')}
                        aria-invalid={Boolean(formErrors.first_name)}
                      />
                      {formErrors.first_name && <p className="um-error">{formErrors.first_name}</p>}
                    </div>
                    <div>
                      <label className="um-label" htmlFor="um-last">นามสกุล</label>
                      <input id="um-last" type="text" className="um-input" value={formData.last_name} onChange={setField('last_name')} aria-invalid={Boolean(formErrors.last_name)} />
                      {formErrors.last_name && <p className="um-error">{formErrors.last_name}</p>}
                    </div>
                    <div>
                      <label className="um-label" htmlFor="um-nick">ชื่อเล่น</label>
                      <input id="um-nick" type="text" className="um-input" value={formData.nickname} onChange={setField('nickname')} aria-invalid={Boolean(formErrors.nickname)} />
                      {formErrors.nickname && <p className="um-error">{formErrors.nickname}</p>}
                    </div>
                    <div>
                      <label className="um-label" htmlFor="um-tel">เบอร์โทรศัพท์</label>
                      <input id="um-tel" type="tel" className="um-input" value={formData.tel} onChange={setField('tel')} />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="um-section-title">การศึกษาและสิทธิ์</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label className="um-label" htmlFor="um-year">ชั้นปี</label>
                      <select id="um-year" className="um-input" value={formData.year_level} onChange={setField('year_level')}>
                        {YEAR_LEVELS.map((y) => (
                          <option key={y} value={String(y)}>ปี {y}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="um-label" htmlFor="um-sec">กลุ่มเรียน (SEC)</label>
                      <select id="um-sec" className="um-input" value={formData.sec} onChange={setField('sec')}>
                        {SECS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="um-label" htmlFor="um-role">ระดับสิทธิ์</label>
                      <select id="um-role" className="um-input" value={formData.role} onChange={setField('role')}>
                        {roleOptions.map((r) => (
                          <option key={r} value={r}>{r.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="um-section-title">ช่องทางติดต่อและรูปภาพ</h3>
                  <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label className="um-label" htmlFor="um-fb">Facebook URL</label>
                      <input id="um-fb" type="url" placeholder="https://facebook.com/..." className="um-input" value={formData.facebook} onChange={setField('facebook')} aria-invalid={Boolean(formErrors.facebook)} />
                      {formErrors.facebook && <p className="um-error">{formErrors.facebook}</p>}
                    </div>
                    <div>
                      <label className="um-label" htmlFor="um-ig">Instagram (@username)</label>
                      <input id="um-ig" type="text" placeholder="@username" className="um-input" value={formData.instagram} onChange={setField('instagram')} />
                    </div>
                    <div>
                      <label className="um-label" htmlFor="um-gh">GitHub Account URL</label>
                      <input id="um-gh" type="url" placeholder="https://github.com/..." className="um-input" value={formData.github_account} onChange={setField('github_account')} aria-invalid={Boolean(formErrors.github_account)} />
                      {formErrors.github_account && <p className="um-error">{formErrors.github_account}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="um-label" htmlFor="um-file">รูปโปรไฟล์ (ไม่บังคับ)</label>
                    <input id="um-file" type="file" accept="image/*" className="um-file" onChange={onFileChange} />
                    {formErrors.file && <p className="um-error">{formErrors.file}</p>}
                  </div>
                </section>
              </form>
            </div>

            <div className="um-modal-foot">
              <button type="button" className="um-btn um-btn-ghost" onClick={closeForm} disabled={updating}>
                ยกเลิก
              </button>
              <button type="submit" form="um-user-form" className="um-btn um-btn-primary" disabled={updating}>
                {updating ? 'กำลังบันทึก...' : isCreating ? 'ลงทะเบียน' : 'บันทึกข้อมูล'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Change password modal ===== */}
      {passwordTarget && (
        <div
          className="um-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !changingPw) setPasswordTarget(null)
          }}
        >
          <div className="um-modal max-w-[460px] p-7 md:p-8" role="dialog" aria-modal="true" aria-labelledby="um-pw-title">
            <div className="flex items-center gap-3">
              <Avatar person={passwordTarget} size={44} />
              <div className="min-w-0">
                <h2 id="um-pw-title" className="text-[22px] font-semibold leading-tight tracking-[-0.025em]">เปลี่ยนรหัสผ่าน</h2>
                <p className="um-muted truncate text-[14px]">
                  {fullName(passwordTarget)} {passwordTarget.sec ? `(${passwordTarget.sec})` : ''}
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} noValidate className="mt-6 space-y-4">
              <div>
                <label className="um-label" htmlFor="um-new-pw">รหัสผ่านใหม่</label>
                <input
                  id="um-new-pw"
                  ref={pwFieldRef}
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="um-input"
                  value={pwForm.password}
                  onChange={setPwField('password')}
                  aria-invalid={Boolean(pwErrors.password)}
                />
                {pwErrors.password && <p className="um-error">{pwErrors.password}</p>}
              </div>
              <div>
                <label className="um-label" htmlFor="um-new-pw2">ยืนยันรหัสผ่านใหม่</label>
                <input
                  id="um-new-pw2"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="um-input"
                  value={pwForm.confirm}
                  onChange={setPwField('confirm')}
                  aria-invalid={Boolean(pwErrors.confirm)}
                />
                {pwErrors.confirm && <p className="um-error">{pwErrors.confirm}</p>}
              </div>

              <button type="button" className="um-link" onClick={() => setShowPw((v) => !v)}>
                {showPw ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              </button>

              {pwErrors.form && <div className="um-banner-error" role="alert">{pwErrors.form}</div>}

              <p className="um-muted text-[13px] leading-[1.6]">
                ผู้ใช้จะต้องใช้รหัสผ่านใหม่ในการเข้าสู่ระบบครั้งถัดไป และจะมีการแจ้งเตือนไปยัง Discord (ไม่แสดงรหัสผ่าน)
              </p>

              <div className="flex gap-3 pt-2">
                <button type="button" className="um-btn um-btn-ghost flex-1" onClick={() => setPasswordTarget(null)} disabled={changingPw}>
                  ยกเลิก
                </button>
                <button type="submit" className="um-btn um-btn-primary flex-1" disabled={changingPw}>
                  {changingPw ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Delete confirm modal ===== */}
      {deleteTarget && (
        <div
          className="um-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeleteTarget(null)
          }}
        >
          <div className="um-modal max-w-[440px] p-7 text-center md:p-8" role="alertdialog" aria-modal="true" aria-labelledby="um-del-title">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: 'var(--um-danger-soft)', color: 'var(--um-danger)' }}
            >
              <TrashIcon className="h-6 w-6" />
            </div>
            <h2 id="um-del-title" className="mt-5 text-[22px] font-semibold tracking-[-0.025em]">ลบผู้ใช้นี้ออกจากระบบ?</h2>
            <p className="um-muted mt-2 text-[15px] leading-[1.6]">
              “<span className="font-medium" style={{ color: 'var(--um-text)' }}>{fullName(deleteTarget)}</span>”
              <br />
              บัญชีเข้าสู่ระบบและข้อมูลโปรไฟล์จะถูกลบถาวร ไม่สามารถย้อนกลับได้ และจะมีการแจ้งเตือนไปยัง Discord
            </p>
            <div className="mt-7 flex gap-3">
              <button type="button" className="um-btn um-btn-ghost flex-1" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                ยกเลิก
              </button>
              <button type="button" className="um-btn um-btn-danger flex-1" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'กำลังลบ...' : 'ลบผู้ใช้'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Toast ===== */}
      {toast && (
        <div className="um-toast" role="status" aria-live="polite">
          <span
            className="h-2 w-2 flex-shrink-0 rounded-full"
            style={{
              background:
                toast.type === 'error'
                  ? 'var(--um-danger-solid)'
                  : toast.type === 'info'
                    ? 'var(--um-primary)'
                    : 'var(--um-success-dot)',
            }}
          />
          {toast.message}
        </div>
      )}
    </div>
  )
}