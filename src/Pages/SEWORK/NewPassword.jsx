import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function NewPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  useEffect(() => {
    document.title = 'ตั้งรหัสผ่านใหม่ | SE-CONSOLE'
    
    // ตรวจสอบว่าผู้ใช้มี Session จากลิงก์ Recovery ที่กดมาจากอีเมลหรือไม่
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showToast('ไม่พบสิทธิ์การเข้าถึง หรือลิงก์หมดอายุ กรุณาขอลิงก์ใหม่', 'error')
        setTimeout(() => navigate('/sework/login'), 3000)
      }
    }
    checkSession()
  }, [navigate])

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (password.length < 6) {
      return showToast('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 'error')
    }
    if (password !== confirmPassword) {
      return showToast('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน', 'error')
    }

    try {
      setLoading(true)
      
      // อัปเดตรหัสผ่านใหม่ผ่าน Supabase
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      showToast('ตั้งรหัสผ่านใหม่สำเร็จ! กำลังพากลับไปหน้าเข้าสู่ระบบ...', 'success')
      
      // ล้างเซสชันและพากลับไปหน้า Login
      setTimeout(async () => {
        await supabase.auth.signOut()
        navigate('/sework/login')
      }, 3000)

    } catch (err) {
      console.error('Update password error:', err.message)
      showToast('เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#F5F5F7] dark:bg-black transition-colors duration-300 px-4 font-sans selection:bg-blue-200">
      
      {/* Custom Toast Notification (Apple Glassmorphism Style) */}
      <div className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ease-out ${toast.show ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-8 opacity-0 scale-95 pointer-events-none'}`}>
        <div className="bg-white/80 dark:bg-[#2C2C2E]/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-full px-6 py-3 flex items-center gap-3">
          {toast.type === 'success' ? (
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
            </div>
          )}
          <span className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">{toast.message}</span>
        </div>
      </div>

      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1D1D1F] dark:bg-white rounded-2xl shadow-lg mb-6">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain dark:invert" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] mb-3">ตั้งรหัสผ่านใหม่</h1>
          <p className="text-[#86868B] dark:text-[#A1A1A6] text-sm font-medium">
            กรุณาระบุรหัสผ่านใหม่ที่คุณต้องการใช้งาน
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)] p-8 md:p-10 border border-gray-100 dark:border-[#2C2C2E]">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#86868B] dark:text-[#A1A1A6] uppercase tracking-wider mb-2 ml-1">
                  รหัสผ่านใหม่
                </label>
                <input
                  type="password"
                  required
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-transparent focus:border-[#0071E3] dark:focus:border-[#2997FF] rounded-2xl px-5 py-4 text-[#1D1D1F] dark:text-[#F5F5F7] text-sm focus:outline-none focus:ring-4 focus:ring-[#0071E3]/10 dark:focus:ring-[#2997FF]/10 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#86868B] dark:text-[#A1A1A6] uppercase tracking-wider mb-2 ml-1">
                  ยืนยันรหัสผ่านใหม่
                </label>
                <input
                  type="password"
                  required
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-transparent focus:border-[#0071E3] dark:focus:border-[#2997FF] rounded-2xl px-5 py-4 text-[#1D1D1F] dark:text-[#F5F5F7] text-sm focus:outline-none focus:ring-4 focus:ring-[#0071E3]/10 dark:focus:ring-[#2997FF]/10 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className={`w-full py-4 rounded-full text-white font-semibold text-sm transition-all duration-300 shadow-md flex items-center justify-center gap-2 ${
                loading || !password || !confirmPassword 
                  ? 'bg-blue-300 dark:bg-blue-800 cursor-not-allowed shadow-none' 
                  : 'bg-[#0071E3] hover:bg-[#0077ED] hover:shadow-lg hover:-translate-y-0.5 dark:bg-[#0071E3] dark:hover:bg-[#2997FF]'
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  กำลังดำเนินการ...
                </>
              ) : (
                'บันทึกรหัสผ่านใหม่'
              )}
            </button>

          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[#86868B] dark:text-[#A1A1A6] text-[11px] font-medium mt-10">
          SE-ONE Project Development. All rights reserved.
        </p>
      </div>
    </div>
  )
}