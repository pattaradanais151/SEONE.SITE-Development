import { supabase } from './supabase'

/**
 * ส่งข้อความแจ้งเตือนไปยัง Discord ผ่าน Server-side (Edge Function)
 * @param {string} message - ข้อความที่ต้องการส่ง
 * @returns {Promise<boolean>} - สถานะการส่ง (true = สำเร็จ, false = ล้มเหลว)
 */
export const notifyDiscord = async (message) => {
  try {
    // โค้ดนี้จะยิงไปยัง Supabase Edge Function ชื่อ 'discord-notify'
    // ซึ่งจะถูกสร้างและนำไปวางบน Supabase Server ในภายหลัง
    const { data, error } = await supabase.functions.invoke('discord-notify', {
      body: { message },
    })

    if (error) {
      console.error('Discord Notification Error (Invoke):', error.message)
      return false
    }

    return data?.success || false
  } catch (err) {
    console.error('Discord Notification Exception:', err.message)
    return false
  }
}