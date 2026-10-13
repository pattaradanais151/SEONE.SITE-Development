import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { notifyDiscord } from '../../../lib/discord'

export default function Schedules() {
  const { profile } = useAuth()
  const canManage = ['admin', 'manager', 'ceo'].includes(profile?.role)

  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [secFilter, setSecFilter] = useState('All')
  
  // States สำหรับฟอร์มเพิ่มตารางเรียน
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    sec: 'SEC 1'
  })

  // State สำหรับดูรูปเต็มจอ
  const [viewImage, setViewImage] = useState(null)

  useEffect(() => {
    document.title = 'Schedules | SE-CONSOLE'
    fetchSchedules()
  }, [])

  const fetchSchedules = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('schedules')
        .select(`id, title, image_url, image_path, sec, created_at, author:profiles(first_name)`)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSchedules(data || [])
    } catch (err) {
      console.error('Error fetching schedules:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setPreview(URL.createObjectURL(selectedFile))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file || !formData.title) return alert('กรุณาระบุชื่อและอัปโหลดรูปภาพ')

    try {
      setSubmitting(true)
      
      // 1. อัปโหลดรูปภาพไปยัง Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`
      const filePath = `schedules/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('schedule-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 2. ขอ URL สาธารณะของรูปภาพ
      const { data: { publicUrl } } = supabase.storage
        .from('schedule-images')
        .getPublicUrl(filePath)

      // 3. บันทึกข้อมูลลง Database
      const { error: dbError } = await supabase
        .from('schedules')
        .insert([{
          title: formData.title,
          image_url: publicUrl,
          image_path: filePath,
          sec: formData.sec,
          author_id: profile.id
        }])

      if (dbError) throw dbError

      await notifyDiscord(`📅 **อัปเดตตารางเรียนใหม่**\n📌 **หัวข้อ:** ${formData.title}\n👥 **กลุ่ม:** ${formData.sec}\nอัปเดตโดย: ${profile?.first_name || 'System'}`)

      setShowForm(false)
      setFile(null)
      setPreview(null)
      setFormData({ title: '', sec: 'SEC 1' })
      fetchSchedules()
      
    } catch (err) {
      console.error('Submit Error:', err.message)
      alert('เกิดข้อผิดพลาดในการอัปโหลด')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id, title, imagePath) => {
    if (!window.confirm(`ลบตารางเรียน "${title}" ใช่หรือไม่?\n(รูปภาพจะถูกลบออกจากเซิร์ฟเวอร์ด้วย)`)) return
    
    try {
      // 1. ลบรู้ออกจาก Storage เพื่อประหยัดพื้นที่
      if (imagePath) {
        await supabase.storage.from('schedule-images').remove([imagePath])
      }

      // 2. ลบข้อมูลจาก Database
      const { error } = await supabase.from('schedules').delete().eq('id', id)
      if (error) throw error
      
      await notifyDiscord(`🗑️ **ลบตารางเรียน:** "${title}" ถูกลบออกจากระบบ`)
      fetchSchedules()
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบ')
    }
  }

  // กรอง SEC
  const filteredSchedules = schedules.filter(s => secFilter === 'All' ? true : s.sec === secFilter)

  return (
    <div className="font-sans pb-12">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-se-text-main">Schedules</h1>
          <p className="text-se-text-muted mt-1">ตารางเรียนและตารางสอบของแต่ละกลุ่มเรียน</p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={secFilter} 
            onChange={e => setSecFilter(e.target.value)}
            className="bg-white border border-[var(--color-se-border)] text-se-text-main text-sm font-medium rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--color-se-primary)] shadow-sm"
          >
            <option value="All">ทุกกลุ่มเรียน (All SEC)</option>
            <option value="SEC 1">SEC 1 (ปกติ)</option>
            <option value="SEC 2">SEC 2 (เทียบโอน)</option>
          </select>
          {canManage && (
            <button 
              onClick={() => setShowForm(true)}
              className="px-5 py-2.5 bg-[var(--color-se-primary)] text-white text-sm font-medium rounded-xl hover:bg-[var(--color-se-primary-hover)] transition-colors shadow-sm whitespace-nowrap"
            >
              + อัปโหลดตารางเรียน
            </button>
          )}
        </div>
      </div>

      {/* Modal เพิ่มตารางเรียน */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-lg shadow-2xl border border-[var(--color-se-border)] max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-se-text-main mb-6">อัปโหลดตารางเรียนใหม่</h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-se-text-main mb-1.5 ml-1">หัวข้อตาราง</label>
                <input type="text" placeholder="เช่น ตารางเรียน ปี 1 เทอม 1" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-[var(--color-se-border)] bg-gray-50 focus:outline-none focus:border-[var(--color-se-primary)]" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-se-text-main mb-1.5 ml-1">กลุ่มเรียน (SEC)</label>
                <select value={formData.sec} onChange={e => setFormData({...formData, sec: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-[var(--color-se-border)] bg-gray-50 focus:outline-none focus:border-[var(--color-se-primary)]">
                  <option value="SEC 1">SEC 1 (ปกติ)</option>
                  <option value="SEC 2">SEC 2 (เทียบโอน)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-se-text-main mb-1.5 ml-1">แนบรูปภาพตาราง (JPG, PNG)</label>
                {preview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-gray-200">
                    <img src={preview} alt="Preview" className="w-full h-auto object-contain bg-gray-100" style={{ maxHeight: '200px' }} />
                    <button type="button" onClick={() => { setFile(null); setPreview(null); }} className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-2xl hover:bg-gray-50 hover:border-blue-400 transition-colors cursor-pointer bg-white">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                      <p className="text-sm text-gray-500 font-medium">คลิกเพื่อเลือกไฟล์รูปภาพ</p>
                    </div>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--color-se-border)] mt-6">
                <button type="button" onClick={() => { setShowForm(false); setPreview(null); setFile(null); }} className="px-6 py-2.5 rounded-xl text-se-text-main font-medium hover:bg-gray-100 transition-colors">ยกเลิก</button>
                <button type="submit" disabled={submitting || !file} className={`px-6 py-2.5 rounded-xl text-white font-medium transition-colors shadow-sm ${submitting || !file ? 'bg-blue-300 cursor-not-allowed' : 'bg-[var(--color-se-primary)] hover:bg-[var(--color-se-primary-hover)]'}`}>
                  อัปโหลด
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ดูรูปภาพแบบเต็มจอ */}
      {viewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in" onClick={() => setViewImage(null)}>
          <button className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
          <img src={viewImage} alt="Schedule Fullscreen" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
        </div>
      )}

      {/* Grid แสดงตารางเรียน */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-12 text-center text-se-text-muted bg-white rounded-[32px] border border-[var(--color-se-border)]">กำลังโหลดข้อมูล...</div>
        ) : filteredSchedules.length === 0 ? (
          <div className="col-span-full p-12 text-center text-se-text-muted bg-white rounded-[32px] border border-[var(--color-se-border)] border-dashed">
            ยังไม่มีตารางเรียนสำหรับกลุ่มนี้
          </div>
        ) : (
          filteredSchedules.map((item) => (
            <div key={item.id} className="bg-white rounded-[32px] border border-[var(--color-se-border)] shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group relative">
              
              {canManage && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.title, item.image_path); }} 
                  className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/50 hover:bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all"
                  title="ลบตารางนี้"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              )}

              {/* ส่วนแสดงรูปภาพ (คลิกเพื่อขยาย) */}
              <div 
                className="w-full h-48 bg-gray-100 cursor-pointer relative overflow-hidden"
                onClick={() => setViewImage(item.image_url)}
              >
                <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 bg-black/60 text-white px-4 py-2 rounded-full text-xs font-bold backdrop-blur-sm transition-all transform translate-y-2 group-hover:translate-y-0">
                    คลิกเพื่อซูมดู
                  </div>
                </div>
              </div>

              {/* ข้อมูลด้านล่าง */}
              <div className="p-6 flex-1 flex flex-col bg-white z-10 relative">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-se-text-main line-clamp-1 flex-1 pr-2">{item.title}</h3>
                  <span className="text-[10px] font-bold bg-blue-50 text-[var(--color-se-primary)] px-2.5 py-1 rounded-md uppercase whitespace-nowrap">
                    {item.sec}
                  </span>
                </div>
                <div className="mt-auto pt-4 border-t border-[var(--color-se-border)] flex items-center gap-2 text-xs text-gray-400 font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  อัปโหลดเมื่อ: {new Date(item.created_at).toLocaleDateString('th-TH')}
                </div>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  )
}