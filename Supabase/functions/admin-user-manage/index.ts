// supabase/functions/admin-user-manage/index.ts
//
// Edge Function สำหรับงานที่ต้องใช้ service_role (หน้าบ้านทำเองไม่ได้และไม่ควรเห็น key นี้):
//   - delete-user     ลบผู้ใช้ออกจาก Supabase Auth + ตาราง profiles
//   - change-password เปลี่ยนรหัสผ่านของผู้ใช้อื่น
//
// สิทธิ์ถูกตรวจ "ที่ฝั่ง Server" ทุกครั้ง (ไม่เชื่อค่าที่หน้าบ้านส่งมา นอกจาก userId/รหัสผ่านใหม่)
//   CEO     : ลบได้ทุกคน (ยกเว้นตัวเอง) / เปลี่ยนรหัสผ่านได้ทุกคน
//   Manager : เปลี่ยนรหัสผ่านได้เฉพาะ Admin กับ Manager ใน SEC เดียวกัน / ลบไม่ได้
//   อื่น ๆ   : ทำไม่ได้
//
// Deploy:  supabase functions deploy admin-user-manage
// (SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ถูกใส่ให้อัตโนมัติ ไม่ต้องตั้งเอง)

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const fail = (error: string, status: number) => json({ success: false, error }, status)

const norm = (v: unknown) => String(v ?? '').toLowerCase()

const MANAGER_PASSWORD_TARGET_ROLES = ['admin', 'manager']
const MIN_PASSWORD_LENGTH = 6
const MAX_PASSWORD_LENGTH = 72 // ข้อจำกัดของ bcrypt ที่ Supabase Auth ใช้
const AVATAR_BUCKET = 'profile-images'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return fail('Method not allowed', 405)

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    /* ---------- 1. ระบุตัวผู้เรียกจาก JWT ---------- */
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    if (!token) return fail('กรุณาเข้าสู่ระบบก่อน', 401)

    const { data: authData, error: authErr } = await admin.auth.getUser(token)
    if (authErr || !authData?.user) return fail('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 401)
    const callerId = authData.user.id

    const { data: caller, error: callerErr } = await admin
      .from('profiles')
      .select('id, role, sec')
      .eq('id', callerId)
      .maybeSingle()
    if (callerErr || !caller) return fail('ไม่พบข้อมูลผู้ใช้ที่เรียกใช้งาน', 403)

    const callerRole = norm(caller.role)
    if (!['ceo', 'manager'].includes(callerRole)) {
      return fail('ไม่มีสิทธิ์ดำเนินการนี้', 403)
    }

    /* ---------- 2. อ่านคำสั่ง ---------- */
    const body = await req.json().catch(() => ({}))
    const action = body?.action
    const userId = body?.userId
    if (typeof userId !== 'string' || !userId) return fail('ไม่พบรหัสผู้ใช้เป้าหมาย', 400)

    const { data: target } = await admin
      .from('profiles')
      .select('id, role, sec, first_name')
      .eq('id', userId)
      .maybeSingle()

    /* ---------- 3. ลบผู้ใช้ (CEO เท่านั้น) ---------- */
    if (action === 'delete-user') {
      if (callerRole !== 'ceo') return fail('เฉพาะ CEO เท่านั้นที่ลบผู้ใช้ได้', 403)
      if (userId === callerId) return fail('ไม่สามารถลบบัญชีของตัวเองได้', 400)

      // ลบ Auth ก่อน — ถ้าล้มเหลวข้อมูลทั้งหมดยังอยู่ครบ
      // ถ้า Auth ไม่มีผู้ใช้นี้แล้ว (เช่นลบค้างจากครั้งก่อน) ให้ไปลบ profile ต่อได้เลย
      const { error: delAuthErr } = await admin.auth.admin.deleteUser(userId)
      const notFound = delAuthErr && (delAuthErr.status === 404 || delAuthErr.code === 'user_not_found')
      if (delAuthErr && !notFound) {
        console.error('deleteUser failed:', delAuthErr.message)
        return fail(`ลบบัญชีเข้าสู่ระบบไม่สำเร็จ: ${delAuthErr.message}`, 500)
      }

      // ลบแถวใน profiles (ถ้า FK เป็น ON DELETE CASCADE จะถูกลบไปแล้วตอนข้างบน — ตรงนี้ไม่เป็นไร)
      const { error: delProfileErr } = await admin.from('profiles').delete().eq('id', userId)
      if (delProfileErr) {
        console.error('delete profile failed:', delProfileErr.message)
        return fail(
          `ลบบัญชีเข้าสู่ระบบแล้ว แต่ลบข้อมูลโปรไฟล์ไม่ได้ (อาจมีข้อมูลอื่นอ้างอิงอยู่): ${delProfileErr.message}`,
          409
        )
      }

      // เก็บกวาดรูปโปรไฟล์ (best effort — พลาดก็ไม่ถือว่าล้มเหลว)
      try {
        const { data: files } = await admin.storage.from(AVATAR_BUCKET).list(userId)
        if (files?.length) {
          await admin.storage.from(AVATAR_BUCKET).remove(files.map((f) => `${userId}/${f.name}`))
        }
      } catch (e) {
        console.warn('avatar cleanup skipped:', (e as Error).message)
      }

      console.log(`[delete-user] ${callerId} -> ${userId}`)
      return json({ success: true })
    }

    /* ---------- 4. เปลี่ยนรหัสผ่าน ---------- */
    if (action === 'change-password') {
      const newPassword = body?.newPassword
      if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
        return fail(`รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`, 400)
      }
      if (newPassword.length > MAX_PASSWORD_LENGTH) {
        return fail(`รหัสผ่านต้องไม่เกิน ${MAX_PASSWORD_LENGTH} ตัวอักษร`, 400)
      }

      let allowed = false
      if (callerRole === 'ceo') {
        allowed = true
      } else if (callerRole === 'manager') {
        allowed =
          !!target &&
          !!caller.sec &&
          target.sec === caller.sec &&
          MANAGER_PASSWORD_TARGET_ROLES.includes(norm(target.role))
      }
      if (!allowed) {
        return fail('ไม่มีสิทธิ์เปลี่ยนรหัสผ่านของผู้ใช้นี้ (Manager เปลี่ยนได้เฉพาะ Admin/Manager ใน SEC ของตัวเอง)', 403)
      }

      const { error: pwErr } = await admin.auth.admin.updateUserById(userId, { password: newPassword })
      if (pwErr) {
        console.error('updateUserById failed:', pwErr.message)
        return fail(`เปลี่ยนรหัสผ่านไม่สำเร็จ: ${pwErr.message}`, 500)
      }

      // ไม่ log รหัสผ่านเด็ดขาด
      console.log(`[change-password] ${callerId} -> ${userId}`)
      return json({ success: true })
    }

    return fail('ไม่รู้จักคำสั่งที่ส่งมา', 400)
  } catch (err) {
    console.error('admin-user-manage error:', (err as Error).message)
    return fail('เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์', 500)
  }
})