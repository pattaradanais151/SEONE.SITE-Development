import { useEffect } from 'react'

// ช่องที่ผู้ใช้ต้องพิมพ์/คัดลอกได้ตามปกติ (ฟอร์ม Login ฯลฯ)
// ถ้าอยากเปิดให้ copy เฉพาะจุดไหน ใส่ attribute data-allow-copy ที่ element นั้นได้
const ALLOWED = 'input, textarea, select, [contenteditable="true"], [data-allow-copy]'

const isAllowed = (target) =>
  target instanceof Element && Boolean(target.closest(ALLOWED))

/**
 * ปิดคลิกขวา / ปิดการคลุมดำ (select) / ปิด copy-cut / ปิดลากรูป
 * ใช้ครั้งเดียวที่ Layout หรือ App ก็พอ
 */
export default function useContentProtection() {
  useEffect(() => {
    const block = (e) => {
      if (isAllowed(e.target)) return
      e.preventDefault()
    }

    const events = ['contextmenu', 'copy', 'cut', 'selectstart', 'dragstart']
    events.forEach((ev) => document.addEventListener(ev, block))
    document.documentElement.classList.add('se-protected')

    return () => {
      events.forEach((ev) => document.removeEventListener(ev, block))
      document.documentElement.classList.remove('se-protected')
    }
  }, [])
}