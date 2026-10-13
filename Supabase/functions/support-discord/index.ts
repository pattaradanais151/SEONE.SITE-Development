// วางไฟล์นี้ที่: supabase/functions/support-discord/index.ts
//
// ตั้งค่าและ deploy:
//   supabase secrets set DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/xxxx/yyyy"
//   supabase secrets set ALLOWED_ORIGIN="https://se-one.site"      (ไม่ตั้งก็ได้ จะเป็น * )
//   supabase functions deploy support-discord
//
// เหตุผลที่ต้องผ่านฟังก์ชันนี้: ลิงก์ Webhook คือ "กุญแจ" ที่ใครได้ไปก็ส่งข้อความเข้า Discord ของคุณได้
// ถ้าใส่ไว้ในโค้ดหน้าเว็บ ทุกคนเปิด DevTools แล้วเห็นได้ จึงเก็บเป็น secret ฝั่งเซิร์ฟเวอร์แทน

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const WEBHOOK_URL = Deno.env.get('DISCORD_WEBHOOK_URL')
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*'

const cors = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

// Rate limit แบบง่าย (ต่อ instance): 3 ครั้ง / 10 นาที / IP
const WINDOW_MS = 10 * 60 * 1000
const LIMIT = 3
const hits = new Map<string, number[]>()

function isLimited(ip: string) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= LIMIT) {
    hits.set(ip, recent)
    return true
  }
  recent.push(now)
  hits.set(ip, recent)
  return false
}

// ตัดอักขระควบคุม + จำกัดความยาว
const clean = (v: unknown, max: number) =>
  typeof v === 'string'
    ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max)
    : ''

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!WEBHOOK_URL) return json({ error: 'Server is not configured' }, 500)

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isLimited(ip)) return json({ error: 'Too many requests' }, 429)

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  // honeypot: บอทกรอกช่องที่ซ่อนไว้ → ตอบ ok เฉย ๆ แต่ไม่ส่งต่อ
  if (clean(payload.website, 200)) return json({ ok: true })

  const firstName = clean(payload.firstName, 60)
  const lastName = clean(payload.lastName, 60)
  const nickname = clean(payload.nickname, 40)
  const email = clean(payload.email, 120)
  const subject = clean(payload.subject, 120)
  const message = clean(payload.message, 1500)

  if (!firstName || !lastName) return json({ error: 'Name is required' }, 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Invalid email' }, 400)
  if (subject.length < 3) return json({ error: 'Subject is too short' }, 400)
  if (message.length < 10) return json({ error: 'Message is too short' }, 400)

  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'SE-ONE Support',
      // ห้าม @everyone / @here / ping role จากข้อความผู้ใช้
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title: `📩 ${subject}`.slice(0, 256),
          description: message.slice(0, 4000),
          color: 0x0071e3,
          fields: [
            { name: 'ชื่อ-นามสกุล', value: `${firstName} ${lastName}`.slice(0, 1024), inline: true },
            { name: 'ชื่อเล่น', value: nickname || '-', inline: true },
            { name: 'อีเมลตอบกลับ', value: email, inline: false },
          ],
          footer: { text: 'SE-ONE Support Form' },
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  })

  if (!res.ok) {
    console.error('Discord webhook failed', res.status, await res.text())
    return json({ error: 'Failed to deliver message' }, 502)
  }

  return json({ ok: true })
})