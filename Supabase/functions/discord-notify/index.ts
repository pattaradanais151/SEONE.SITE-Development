import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// ตั้งค่า CORS เพื่ออนุญาตให้ Frontend (เว็บไซต์ของเรา) เรียกใช้งาน API นี้ได้
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // จัดการกับ Preflight Request (CORS OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. รับข้อความที่ส่งมาจาก Frontend
    const { message } = await req.json()

    // 2. ดึง Discord Webhook URL จาก Environment Variables (ที่ตั้งค่าไว้ใน Supabase Secrets)
    const webhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL')

    if (!webhookUrl) {
      throw new Error('DISCORD_WEBHOOK_URL is not set in environment variables.')
    }

    if (!message) {
      throw new Error('Message payload is missing.')
    }

    // 3. ส่ง Request ไปยัง Discord Webhook
    const discordResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // สามารถปรับแต่ง payload ให้สวยงามได้ที่นี่ (เช่น ใส่ Embeds)
      body: JSON.stringify({
        content: message,
      }),
    })

    if (!discordResponse.ok) {
      throw new Error(`Discord API error: ${discordResponse.status}`)
    }

    // 4. ตอบกลับ Frontend ว่าสำเร็จ
    return new Response(JSON.stringify({ success: true, message: 'Notification sent.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    // กรณีเกิด Error
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})