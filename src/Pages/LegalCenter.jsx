import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export default function LegalCenter() {
  const [activeTab, setActiveTab] = useState('privacy')

  useEffect(() => {
    document.title = 'Legal Center | SE-ONE'
    window.scrollTo(0, 0)
  }, [activeTab])

  const tabs = [
    { id: 'privacy', title: 'Privacy Policy', label: 'นโยบายความเป็นส่วนตัว' },
    { id: 'pdpa', title: 'PDPA', label: 'นโยบายคุ้มครองข้อมูลส่วนบุคคล' },
    { id: 'terms', title: 'Terms of Use', label: 'ข้อตกลงการใช้งาน' },
    { id: 'license', title: 'License Agreement', label: 'ข้อตกลงอนุญาตให้ใช้สิทธิ' }
  ]

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FC] font-sans text-gray-900">
      {/* 2. Main Content Layout */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-12 flex flex-col md:flex-row gap-8 lg:gap-12">
        
        {/* Left Sidebar Navigation */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="sticky top-28">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-3">Legal Documents</h3>
            <nav className="flex flex-col space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`text-left px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                    activeTab === tab.id 
                      ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-500/20' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <div className="block">{tab.title}</div>
                  <div className={`text-[11px] mt-0.5 font-medium ${activeTab === tab.id ? 'text-blue-400' : 'text-gray-400'}`}>
                    {tab.label}
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Right Content Area */}
        <article className="flex-1 bg-white border border-gray-200 rounded-[32px] p-8 md:p-12 shadow-sm min-h-[600px]">
          
          {/* ======================================= */}
          {/* 1. Privacy Policy */}
          {/* ======================================= */}
          {activeTab === 'privacy' && (
            <div className="animate-in fade-in duration-500">
              <h1 className="text-3xl font-black tracking-tight mb-2">Privacy Policy</h1>
              <p className="text-gray-500 font-medium mb-8 pb-8 border-b border-gray-100">นโยบายความเป็นส่วนตัว • อัปเดตล่าสุด: ตุลาคม 2026</p>
              
              <div className="space-y-6 text-gray-600 text-sm leading-relaxed font-medium">
                <p>
                  แพลตฟอร์ม SE-ONE และระบบภายใน (รวมถึง SE-CONSOLE) ให้ความสำคัญกับการคุ้มครองข้อมูลส่วนบุคคลของคุณ นโยบายนี้อธิบายถึงวิธีการที่เรารวบรวม ใช้งาน และปกป้องข้อมูลของคุณเมื่อคุณใช้บริการของเรา
                </p>
                <h3 className="text-lg font-bold text-gray-900 pt-4">1. ข้อมูลที่เราเก็บรวบรวม</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>ข้อมูลบัญชี:</strong> ชื่อ, นามสกุล, ชื่อเล่น, รหัสนักศึกษา, อีเมล, และรหัสผ่าน</li>
                  <li><strong>ข้อมูลการศึกษา:</strong> ชั้นปี, กลุ่มเรียน (SEC), คะแนน (XP), ประวัติการส่งงาน</li>
                  <li><strong>ข้อมูลการติดต่อ (ทางเลือก):</strong> เบอร์โทรศัพท์, Facebook, Instagram, GitHub</li>
                </ul>
                <h3 className="text-lg font-bold text-gray-900 pt-4">2. วิธีการใช้ข้อมูลของคุณ</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>เพื่อสร้างและจัดการบัญชีผู้ใช้สำหรับการเรียนการสอน</li>
                  <li>เพื่อติดตามประเมินผลการเรียนและการส่งงานผ่าน SE-CONSOLE</li>
                  <li>เพื่ออำนวยความสะดวกในการติดต่อสื่อสารระหว่างนักศึกษาและผู้สอน (ผ่านฟีเจอร์ Contacts)</li>
                </ul>
                <h3 className="text-lg font-bold text-gray-900 pt-4">3. การรักษาความปลอดภัย</h3>
                <p>
                  เราใช้มาตรฐานการรักษาความปลอดภัยทางเทคนิค (เช่น การเข้ารหัสฐานข้อมูลผ่าน Supabase Row Level Security) เพื่อป้องกันการเข้าถึง การแก้ไข หรือการเปิดเผยข้อมูลของคุณโดยไม่ได้รับอนุญาต
                </p>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* 2. PDPA */}
          {/* ======================================= */}
          {activeTab === 'pdpa' && (
            <div className="animate-in fade-in duration-500">
              <h1 className="text-3xl font-black tracking-tight mb-2">PDPA Compliance</h1>
              <p className="text-gray-500 font-medium mb-8 pb-8 border-b border-gray-100">นโยบายคุ้มครองข้อมูลส่วนบุคคลตามกฎหมาย PDPA • อัปเดตล่าสุด: ตุลาคม 2026</p>
              
              <div className="space-y-6 text-gray-600 text-sm leading-relaxed font-medium">
                <p>
                  ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) ของประเทศไทย SE-ONE เคารพสิทธิในฐานะเจ้าของข้อมูลส่วนบุคคลของคุณ และมุ่งมั่นที่จะดำเนินการตามกฎหมายอย่างเคร่งครัด
                </p>
                <h3 className="text-lg font-bold text-gray-900 pt-4">สิทธิของเจ้าของข้อมูลส่วนบุคคล (Data Subject Rights)</h3>
                <ul className="list-decimal pl-5 space-y-3">
                  <li><strong>สิทธิในการเข้าถึงข้อมูล:</strong> คุณสามารถเข้าถึงและดูข้อมูลส่วนบุคคลของคุณได้ผ่านเมนู "My Profile"</li>
                  <li><strong>สิทธิในการแก้ไขข้อมูล:</strong> คุณมีสิทธิแก้ไขข้อมูลส่วนบุคคลให้ถูกต้อง เป็นปัจจุบัน และสมบูรณ์</li>
                  <li><strong>สิทธิในการขอให้ลบข้อมูล (Right to be forgotten):</strong> คุณสามารถร้องขอให้ผู้ดูแลระบบ (Admin/Manager) ลบบัญชีและข้อมูลส่วนบุคคลของคุณออกจากระบบได้เมื่อสิ้นสุดสถานะการเป็นนักศึกษา</li>
                  <li><strong>สิทธิในการเพิกถอนความยินยอม:</strong> คุณสามารถยกเลิกการให้ข้อมูลทางสังคม (Social Media) หรือเบอร์โทรศัพท์ได้ตลอดเวลาโดยการลบออกจากโปรไฟล์ตนเอง</li>
                </ul>
                <h3 className="text-lg font-bold text-gray-900 pt-4">การเปิดเผยข้อมูลต่อบุคคลที่สาม</h3>
                <p>
                  เราจะไม่มีการนำข้อมูลส่วนบุคคลของคุณไปขาย แลกเปลี่ยน หรือเปิดเผยต่อบุคคลภายนอกโดยเด็ดขาด ข้อมูลในสมุดรายชื่อ (Contacts) จะถูกจำกัดให้เห็นได้เฉพาะสมาชิกที่เข้าสู่ระบบและอยู่ภายใต้ระบบ SE-ONE เท่านั้น
                </p>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* 3. Terms of Use */}
          {/* ======================================= */}
          {activeTab === 'terms' && (
            <div className="animate-in fade-in duration-500">
              <h1 className="text-3xl font-black tracking-tight mb-2">Terms of Use</h1>
              <p className="text-gray-500 font-medium mb-8 pb-8 border-b border-gray-100">ข้อตกลงและเงื่อนไขการใช้งาน • อัปเดตล่าสุด: ตุลาคม 2026</p>
              
              <div className="space-y-6 text-gray-600 text-sm leading-relaxed font-medium">
                <p>
                  การเข้าถึงและใช้งานระบบ SE-ONE, SE-CONSOLE, CODING STUDIO หรือบริการอื่นๆ ในเครือ (รวมเรียกว่า "บริการ") ถือว่าคุณยอมรับข้อตกลงการใช้งานเหล่านี้
                </p>
                <h3 className="text-lg font-bold text-gray-900 pt-4">1. บัญชีผู้ใช้และความปลอดภัย</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>คุณต้องรักษาความลับของรหัสผ่านบัญชีของคุณ หากพบการใช้งานที่ผิดปกติ คุณต้องแจ้งให้ผู้ดูแลระบบทราบทันที</li>
                  <li>ระบบถูกสงวนสิทธิ์ไว้สำหรับนักศึกษาและบุคลากรที่เกี่ยวข้องเท่านั้น ไม่อนุญาตให้โอนสิทธิ์การใช้งานบัญชีให้บุคคลภายนอก</li>
                </ul>
                <h3 className="text-lg font-bold text-gray-900 pt-4">2. พฤติกรรมที่ยอมรับได้ (Code of Conduct)</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>คุณตกลงที่จะใช้บริการเพื่อการศึกษาเท่านั้น</li>
                  <li>ห้ามอัปโหลดไฟล์ที่มีไวรัส สคริปต์ประสงค์ร้าย หรือเนื้อหาที่ผิดกฎหมาย/ละเมิดลิขสิทธิ์ลงในระบบ</li>
                  <li>การทุจริตในการส่งงานผ่านระบบ หรือพยายามเข้าถึงสิทธิ์ผู้ดูแลระบบโดยไม่ได้รับอนุญาต จะมีบทลงโทษทางวิชาการและอาจถูกระงับบัญชีถาวร</li>
                </ul>
                <h3 className="text-lg font-bold text-gray-900 pt-4">3. การแก้ไขข้อตกลง</h3>
                <p>
                  SE-ONE ขอสงวนสิทธิ์ในการปรับปรุง เปลี่ยนแปลง หรือแก้ไขข้อตกลงนี้ได้ทุกเมื่อ โดยจะมีการประกาศแจ้งให้ทราบในหน้าระบบ
                </p>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* 4. License Agreement */}
          {/* ======================================= */}
          {activeTab === 'license' && (
            <div className="animate-in fade-in duration-500">
              <h1 className="text-3xl font-black tracking-tight mb-2">License Agreement</h1>
              <p className="text-gray-500 font-medium mb-8 pb-8 border-b border-gray-100">ข้อตกลงอนุญาตให้ใช้สิทธิซอฟต์แวร์ (EULA) • อัปเดตล่าสุด: ตุลาคม 2026</p>
              
              <div className="space-y-6 text-gray-600 text-sm leading-relaxed font-medium">
                <p>
                  ข้อตกลงฉบับนี้เป็นสัญญาระหว่างคุณ (ผู้ใช้งาน) และ InfiniteStack Corp. / ทีมผู้พัฒนาแพลตฟอร์ม SE-ONE
                </p>
                <h3 className="text-lg font-bold text-gray-900 pt-4">1. การอนุญาตให้ใช้สิทธิ</h3>
                <p>
                  เรามอบสิทธิ์แบบไม่ผูกขาด (Non-exclusive) และไม่สามารถโอนได้ (Non-transferable) ในการเข้าถึงและใช้งานซอฟต์แวร์ผ่านเว็บเบราว์เซอร์ เพื่อวัตถุประสงค์ในการศึกษาและจัดการงานภายในองค์กร/สาขาวิชาเท่านั้น
                </p>
                <h3 className="text-lg font-bold text-gray-900 pt-4">2. ทรัพย์สินทางปัญญา</h3>
                <p>
                  ซอร์สโค้ด (Source Code), การออกแบบ UI/UX, โลโก้, กราฟิก, และโครงสร้างฐานข้อมูลของระบบ ถือเป็นทรัพย์สินทางปัญญาของ InfiniteStack Corp. ไม่อนุญาตให้คัดลอก ทำซ้ำ ดัดแปลง หรือทำวิศวกรรมย้อนกลับ (Reverse Engineer) โดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร
                </p>
                <h3 className="text-lg font-bold text-gray-900 pt-4">3. ข้อจำกัดความรับผิดชอบ (Disclaimer)</h3>
                <p>
                  ซอฟต์แวร์นี้ให้บริการในลักษณะ "ตามที่เป็นอยู่" (As is) โดยไม่มีการรับประกันใดๆ ทั้งสิ้น ทีมผู้พัฒนาจะไม่รับผิดชอบต่อความสูญเสียของข้อมูล หรือความเสียหายที่เกิดจากการใช้งานระบบขัดข้อง 
                </p>
              </div>
            </div>
          )}

        </article>
      </main>

    </div>
  )
}