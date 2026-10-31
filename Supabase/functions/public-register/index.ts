// supabase/functions/public-register/index.ts
//
// สมัครสมาชิกสาธารณะ — ตรวจทุกอย่างที่ฝั่งเซิร์ฟเวอร์:
//   1) ล็อกการสมัคร 24 ชม. ถ้ากรอกอีเมลผู้แนะนำผิดครบ 2 ครั้ง (นับตาม IP + รหัสอุปกรณ์)
//   2) ผู้แนะนำต้องมีอยู่ในตาราง profiles (อ่านด้วย service_role — ไม่ต้องเปิด RLS ให้คนนอก)
//   3) อีเมลสมัครต้องเป็น @live.rmutl.ac.th หรือ @rmutl.ac.th เท่านั้น
//   4) role ถูกบังคับเป็น 'admin' เสมอ
//
// Secrets ที่ใช้ (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY มีให้อัตโนมัติ):
//   DISCORD_WEBHOOK_URL  (มีอยู่แล้ว — ถ้าไม่ตั้งจะข้ามการแจ้งเตือน)

import { createClient } from 'npm:@supabase/supabase-js@2'

/* ------------------------------ Config ------------------------------ */
const MAX_FAILS = 2 // ผิดครบกี่ครั้งถึงล็อก
const LOCK_HOURS = 24 // ล็อกกี่ชั่วโมง
// true  = นับตาม IP + อุปกรณ์ (กันแน่นกว่า แต่เครือข่ายมหาวิทยาลัยที่ใช้ IP ร่วมกันอาจโดนล็อกทั้งวง)
// false = นับตามอุปกรณ์อย่างเดียว (กระทบคนอื่นน้อยกว่า แต่หลบได้ง่ายกว่า)
const LOCK_BY_IP = true

const ALLOWED_DOMAINS = ['@live.rmutl.ac.th', '@rmutl.ac.th']
const LOCAL_RE = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_RE = /^https?:\/\/\S+$/i
const SECS = ['SEC 1', 'SEC 2']
const REGISTER_ROLE = 'admin'

const AVATAR_BUCKET = 'profile-images'
const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const AVATAR_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

/* ------------------------------ Helpers ------------------------------ */
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const sha256Hex = async (text: string) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// คีย์สำหรับนับ/ล็อก: hash ของ IP และ hash ของรหัสอุปกรณ์ (ไม่เก็บค่าจริงลงฐานข้อมูล)
const getLockKeys = async (req: Request, deviceId: string) => {
  const keys: string[] = []

  if (LOCK_BY_IP) {
    // cf-connecting-ip ถูกตั้งโดย Cloudflare เชื่อถือได้กว่า x-forwarded-for ที่ผู้ใช้ปลอมได้
    const ip =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      ''
    if (ip) keys.push(`ip:${await sha256Hex(`${SERVICE_KEY}|${ip}`)}`)
  }
  if (/^[A-Za-z0-9-]{16,64}$/.test(deviceId)) {
    keys.push(`dev:${await sha256Hex(`${SERVICE_KEY}|${deviceId}`)}`)
  }
  return keys
}

// คืนเวลาที่ล็อกสิ้นสุด (ISO) ถ้ามีคีย์ใดถูกล็อกอยู่ ไม่งั้น null
const getLockedUntil = async (keys: string[]) => {
  const { data, error } = await admin
    .from('registration_lockouts')
    .select('locked_until')
    .in('lock_key', keys)
  if (error) throw error

  const now = Date.now()
  const active = (data ?? [])
    .map((r: { locked_until: string | null }) => (r.locked_until ? new Date(r.locked_until).getTime() : 0))
    .filter((t: number) => t > now)
  return active.length ? new Date(Math.max(...active)).toISOString() : null
}

// บันทึกว่า "ผิด 1 ครั้ง" (atomic ใน Postgres) — ถ้า error ให้ throw เพื่อ fail closed
const recordFailure = async (keys: string[]) => {
  let failed = 0
  let lockedUntilMs = 0

  for (const key of keys) {
    const { data, error } = await admin.rpc('register_fail', {
      p_key: key,
      p_max: MAX_FAILS,
      p_lock_hours: LOCK_HOURS,
    })
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data
    failed = Math.max(failed, row?.out_failed ?? 0)
    if (row?.out_locked_until) lockedUntilMs = Math.max(lockedUntilMs, new Date(row.out_locked_until).getTime())
  }

  return {
    failed,
    lockedUntil: lockedUntilMs > Date.now() ? new Date(lockedUntilMs).toISOString() : null,
  }
}

const lockedResponse = (lockedUntil: string) =>
  json({
    success: false,
    code: 'LOCKED',
    lockedUntil,
    error: `ปิดการสมัครสมาชิกชั่วคราว เนื่องจากกรอกอีเมลผู้แนะนำผิดเกินกำหนด (ล็อก ${LOCK_HOURS} ชั่วโมง)`,
  })

const notifyDiscord = async (content: string) => {
  const webhook = Deno.env.get('DISCORD_WEBHOOK_URL')
  if (!webhook) return
  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // allowed_mentions.parse = [] → ข้อความจากผู้ใช้ไม่สามารถ ping @everyone / @here / คนอื่นได้
      body: JSON.stringify({ content: content.slice(0, 1900), allowed_mentions: { parse: [] } }),
    })
  } catch (err) {
    console.error('Discord notify failed:', err)
  }
}

/* ------------------------------ Handler ------------------------------ */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405)

  try {
    /* ----- อ่านข้อมูลที่ส่งมา (multipart = สมัคร / json = ตรวจสถานะล็อก) ----- */
    const fields: Record<string, string> = {}
    let avatar: File | null = null

    if ((req.headers.get('content-type') ?? '').includes('multipart/form-data')) {
      const fd = await req.formData()
      for (const [k, v] of fd.entries()) {
        if (typeof v === 'string') fields[k] = v
        else if (k === 'avatar' && v.size > 0) avatar = v
      }
    } else {
      const body = await req.json().catch(() => ({}))
      for (const [k, v] of Object.entries(body ?? {})) if (typeof v === 'string') fields[k] = v
    }

    const get = (k: string) => fields[k] ?? ''
    const trim = (k: string) => get(k).trim()

    /* ----- ล็อกอยู่หรือไม่ (ตรวจก่อนทำอย่างอื่นทั้งหมด) ----- */
    const keys = await getLockKeys(req, trim('deviceId'))
    if (keys.length === 0) {
      return json({ success: false, code: 'NO_IDENTITY', error: 'ไม่สามารถระบุอุปกรณ์ได้ กรุณารีเฟรชหน้าแล้วลองใหม่' })
    }

    const lockedUntil = await getLockedUntil(keys)

    if (get('action') === 'status') {
      return json({ success: true, locked: Boolean(lockedUntil), lockedUntil })
    }
    if (lockedUntil) return lockedResponse(lockedUntil)

    // Honeypot: บอทมักกรอกช่องที่ซ่อนไว้ → ตอบเหมือนสำเร็จ แต่ไม่ทำอะไร
    if (trim('website')) return json({ success: true, needsEmailConfirmation: true })

    /* ----- ตรวจข้อมูล (ไม่นับเป็นการ "ผิด" ของผู้แนะนำ) ----- */
    const fe: Record<string, string> = {}

    const local = trim('email_local').toLowerCase()
    const domain = trim('email_domain').toLowerCase()
    if (!ALLOWED_DOMAINS.includes(domain)) {
      fe.email = 'อีเมลต้องเป็น @live.rmutl.ac.th หรือ @rmutl.ac.th เท่านั้น'
    } else if (!local || local.length > 64 || !LOCAL_RE.test(local) || local.includes('..')) {
      fe.email = 'รูปแบบอีเมลไม่ถูกต้อง'
    }
    const email = `${local}${domain}`

    const password = get('password')
    if (password.length < 6 || password.length > 72) fe.password = 'รหัสผ่านต้องมี 6–72 ตัวอักษร'
    if (password !== get('confirmPassword')) fe.confirmPassword = 'รหัสผ่านและการยืนยันไม่ตรงกัน'

    const firstName = trim('first_name')
    const lastName = trim('last_name')
    const nickname = trim('nickname')
    if (!firstName || firstName.length > 100) fe.first_name = 'กรุณากรอกชื่อจริง (ไม่เกิน 100 ตัวอักษร)'
    if (!lastName || lastName.length > 100) fe.last_name = 'กรุณากรอกนามสกุล (ไม่เกิน 100 ตัวอักษร)'
    if (!nickname || nickname.length > 50) fe.nickname = 'กรุณากรอกชื่อเล่น (ไม่เกิน 50 ตัวอักษร)'

    const tel = trim('tel')
    if (tel.length > 30) fe.tel = 'เบอร์โทรยาวเกินไป'

    const yearLevel = parseInt(trim('year_level'), 10)
    if (!(yearLevel >= 1 && yearLevel <= 4)) fe.year_level = 'ชั้นปีไม่ถูกต้อง'
    const sec = trim('sec')
    if (!SECS.includes(sec)) fe.sec = 'กลุ่มเรียนไม่ถูกต้อง'

    const facebook = trim('facebook')
    const instagram = trim('instagram')
    const github = trim('github_account')
    if (facebook && (!URL_RE.test(facebook) || facebook.length > 300)) fe.facebook = 'ต้องขึ้นต้นด้วย https://'
    if (github && (!URL_RE.test(github) || github.length > 300)) fe.github_account = 'ต้องขึ้นต้นด้วย https://'
    if (instagram.length > 100) fe.instagram = 'ยาวเกินไป'

    const referrerEmail = trim('referrer_email').toLowerCase()
    if (!referrerEmail) fe.referrer = 'กรุณากรอกอีเมลผู้แนะนำ'
    else if (!EMAIL_RE.test(referrerEmail) || referrerEmail.length > 254) fe.referrer = 'รูปแบบอีเมลผู้แนะนำไม่ถูกต้อง'

    if (avatar) {
      if (!AVATAR_TYPES[avatar.type]) fe.file = 'รองรับเฉพาะรูป JPG, PNG, WEBP หรือ GIF'
      else if (avatar.size > MAX_AVATAR_BYTES) fe.file = 'รูปต้องมีขนาดไม่เกิน 5 MB'
    }

    if (Object.keys(fe).length > 0) {
      return json({ success: false, code: 'VALIDATION', fieldErrors: fe, error: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' })
    }

    /* ----- ตรวจผู้แนะนำจากตาราง profiles ----- */
    const { data: referrer, error: refErr } = await admin
      .from('profiles')
      .select('id, first_name, last_name, nickname')
      .eq('email', referrerEmail)
      .maybeSingle()
    if (refErr) throw refErr

    if (!referrer) {
      const result = await recordFailure(keys)
      if (result.lockedUntil) return lockedResponse(result.lockedUntil)
      return json({
        success: false,
        code: 'REFERRER_NOT_FOUND',
        attemptsLeft: Math.max(0, MAX_FAILS - result.failed),
        fieldErrors: { referrer: 'ไม่พบอีเมลนี้ในระบบ' },
        error: 'ไม่พบอีเมลผู้แนะนำในระบบ',
      })
    }

    /* ----- อีเมลสมัครต้องยังไม่ถูกใช้ ----- */
    const emailTaken = { success: false, code: 'EMAIL_EXISTS', fieldErrors: { email: 'อีเมลนี้ถูกใช้งานแล้ว' }, error: 'อีเมลนี้ถูกใช้งานแล้ว' }

    const { data: existing, error: existErr } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
    if (existErr) throw existErr
    if (existing) return json(emailTaken)

    /* ----- สร้างบัญชี (ใช้ anon client เพื่อให้ตั้งค่า "Confirm email" ของโปรเจกต์มีผล) ----- */
    const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: signUp, error: signUpErr } = await anon.auth.signUp({ email, password })

    if (signUpErr) {
      const msg = `${signUpErr.code ?? ''} ${signUpErr.message ?? ''}`.toLowerCase()
      if (msg.includes('already')) return json(emailTaken)
      console.error('signUp error:', signUpErr)
      return json({ success: false, code: 'AUTH_ERROR', error: 'สร้างบัญชีไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' })
    }
    if (!signUp.user || signUp.user.identities?.length === 0) return json(emailTaken)

    const userId = signUp.user.id
    let uploadedPath: string | null = null

    try {
      /* ----- อัปโหลดรูป (ไม่บังคับ) ด้วย service_role ----- */
      let imageUrl: string | null = null
      if (avatar) {
        const ext = AVATAR_TYPES[avatar.type]
        uploadedPath = `${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
        const { error: upErr } = await admin.storage
          .from(AVATAR_BUCKET)
          .upload(uploadedPath, avatar, { contentType: avatar.type })
        if (upErr) throw upErr
        imageUrl = admin.storage.from(AVATAR_BUCKET).getPublicUrl(uploadedPath).data.publicUrl
      }

      /* ----- บันทึกโปรไฟล์: role เป็น ADMIN เสมอ ----- */
      const { error: profErr } = await admin.from('profiles').upsert({
        id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        nickname,
        role: REGISTER_ROLE,
        year_level: yearLevel,
        sec,
        tel,
        facebook,
        instagram,
        github_account: github,
        referred_by: referrer.id,
        ...(imageUrl ? { profile_image_url: imageUrl } : {}),
        updated_at: new Date().toISOString(),
      })
      if (profErr) throw profErr
    } catch (err) {
      // ย้อนกลับ: ลบบัญชีและรูปที่เพิ่งสร้าง เพื่อให้สมัครซ้ำด้วยอีเมลเดิมได้
      console.error('Create profile failed, rolling back:', err)
      if (uploadedPath) await admin.storage.from(AVATAR_BUCKET).remove([uploadedPath]).catch(() => {})
      await admin.auth.admin.deleteUser(userId).catch((e: unknown) => console.error('Rollback deleteUser failed:', e))
      return json({ success: false, code: 'SERVER_ERROR', error: 'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }, 500)
    }

    // สมัครสำเร็จ → ล้างตัวนับที่ผิดของอุปกรณ์/IP นี้
    await admin.from('registration_lockouts').delete().in('lock_key', keys)

    const refName = [referrer.first_name, referrer.last_name].filter(Boolean).join(' ') || referrerEmail
    await notifyDiscord(
      `🆕 **สมาชิกสมัครใหม่ (หน้าสมัครสาธารณะ)**\n` +
        `👤 **ชื่อ:** ${firstName} ${lastName} (${nickname})\n` +
        `🔑 **สิทธิ์:** ${REGISTER_ROLE.toUpperCase()} | **กลุ่ม:** ${sec} (ปี ${yearLevel})\n` +
        `🤝 **ผู้แนะนำ:** ${refName}\n` +
        `📧 **ยืนยันอีเมล:** ${signUp.session ? 'ไม่ต้องยืนยัน (ใช้งานได้ทันที)' : 'รอผู้ใช้ยืนยันทางอีเมล'}`
    )

    return json({ success: true, needsEmailConfirmation: !signUp.session })
  } catch (err) {
    console.error('public-register error:', err)
    return json({ success: false, code: 'SERVER_ERROR', error: 'เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่ภายหลัง' }, 500)
  }
})