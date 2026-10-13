import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase Configuration Missing: กรุณาตรวจสอบไฟล์ .env ว่ามีการตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ครบถ้วน'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)