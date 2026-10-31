import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
// แก้วันที่อัปเดตที่เดียว แล้วจะเปลี่ยนในทุกเอกสาร
const LAST_UPDATED = 'พฤศจิกายน 2026'

/* ------------------------------------------------------------------ */
/*  เนื้อหาเอกสาร                                                       */
/*  - items ในลิสต์เป็นได้ทั้ง string หรือ { term, text } (term = ตัวหนา)  */
/* ------------------------------------------------------------------ */
const DOCUMENTS = [
  {
    id: 'privacy',
    tabTitle: 'Privacy Policy',
    tabLabel: 'นโยบายความเป็นส่วนตัว',
    title: 'Privacy Policy',
    subtitle: 'นโยบายความเป็นส่วนตัว',
    intro: [
      'แพลตฟอร์ม SE-ONE และระบบภายใน (รวมถึง SE-CONSOLE) ให้ความสำคัญกับการคุ้มครองข้อมูลส่วนบุคคลของคุณ นโยบายนี้อธิบายถึงวิธีการที่เรารวบรวม ใช้งาน และปกป้องข้อมูลของคุณเมื่อคุณใช้บริการของเรา',
    ],
    sections: [
      {
        heading: '1. ข้อมูลที่เราเก็บรวบรวม',
        list: {
          type: 'ul',
          items: [
            { term: 'ข้อมูลบัญชี:', text: 'ชื่อ, นามสกุล, ชื่อเล่น, รหัสนักศึกษา, อีเมล, และรหัสผ่าน' },
            { term: 'ข้อมูลการศึกษา:', text: 'ชั้นปี, กลุ่มเรียน (SEC), คะแนน (XP), ประวัติการส่งงาน' },
            { term: 'ข้อมูลการติดต่อ (ทางเลือก):', text: 'เบอร์โทรศัพท์, Facebook, Instagram, GitHub' },
          ],
        },
      },
      {
        heading: '2. วิธีการใช้ข้อมูลของคุณ',
        list: {
          type: 'ul',
          items: [
            'เพื่อสร้างและจัดการบัญชีผู้ใช้สำหรับการเรียนการสอน',
            'เพื่อติดตามประเมินผลการเรียนและการส่งงานผ่าน SE-CONSOLE',
            'เพื่ออำนวยความสะดวกในการติดต่อสื่อสารระหว่างนักศึกษาและผู้สอน (ผ่านฟีเจอร์ Contacts)',
          ],
        },
      },
      {
        heading: '3. การรักษาความปลอดภัย',
        paragraphs: [
          'เราใช้มาตรฐานการรักษาความปลอดภัยทางเทคนิค (เช่น การเข้ารหัสฐานข้อมูลผ่าน Supabase Row Level Security) เพื่อป้องกันการเข้าถึง การแก้ไข หรือการเปิดเผยข้อมูลของคุณโดยไม่ได้รับอนุญาต',
        ],
      },
    ],
  },
  {
    id: 'pdpa',
    tabTitle: 'PDPA',
    tabLabel: 'นโยบายคุ้มครองข้อมูลส่วนบุคคล',
    title: 'PDPA Compliance',
    subtitle: 'นโยบายคุ้มครองข้อมูลส่วนบุคคลตามกฎหมาย PDPA',
    intro: [
      'ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) ของประเทศไทย SE-ONE เคารพสิทธิในฐานะเจ้าของข้อมูลส่วนบุคคลของคุณ และมุ่งมั่นที่จะดำเนินการตามกฎหมายอย่างเคร่งครัด',
    ],
    sections: [
      {
        heading: 'สิทธิของเจ้าของข้อมูลส่วนบุคคล (Data Subject Rights)',
        list: {
          type: 'ol',
          items: [
            { term: 'สิทธิในการเข้าถึงข้อมูล:', text: 'คุณสามารถเข้าถึงและดูข้อมูลส่วนบุคคลของคุณได้ผ่านเมนู “My Profile”' },
            { term: 'สิทธิในการแก้ไขข้อมูล:', text: 'คุณมีสิทธิแก้ไขข้อมูลส่วนบุคคลให้ถูกต้อง เป็นปัจจุบัน และสมบูรณ์' },
            {
              term: 'สิทธิในการขอให้ลบข้อมูล (Right to be forgotten):',
              text: 'คุณสามารถร้องขอให้ผู้ดูแลระบบ (Admin/Manager) ลบบัญชีและข้อมูลส่วนบุคคลของคุณออกจากระบบได้เมื่อสิ้นสุดสถานะการเป็นนักศึกษา',
            },
            {
              term: 'สิทธิในการเพิกถอนความยินยอม:',
              text: 'คุณสามารถยกเลิกการให้ข้อมูลทางสังคม (Social Media) หรือเบอร์โทรศัพท์ได้ตลอดเวลาโดยการลบออกจากโปรไฟล์ตนเอง',
            },
          ],
        },
      },
      {
        heading: 'การเปิดเผยข้อมูลต่อบุคคลที่สาม',
        paragraphs: [
          'เราจะไม่มีการนำข้อมูลส่วนบุคคลของคุณไปขาย แลกเปลี่ยน หรือเปิดเผยต่อบุคคลภายนอกโดยเด็ดขาด ข้อมูลในสมุดรายชื่อ (Contacts) จะถูกจำกัดให้เห็นได้เฉพาะสมาชิกที่เข้าสู่ระบบและอยู่ภายใต้ระบบ SE-ONE เท่านั้น',
        ],
      },
    ],
  },
  {
    id: 'terms',
    tabTitle: 'Terms of Use',
    tabLabel: 'ข้อตกลงการใช้งาน',
    title: 'Terms of Use',
    subtitle: 'ข้อตกลงและเงื่อนไขการใช้งาน',
    intro: [
      'การเข้าถึงและใช้งานระบบ SE-ONE, SE-CONSOLE, CODING STUDIO หรือบริการอื่นๆ ในเครือ (รวมเรียกว่า “บริการ”) ถือว่าคุณยอมรับข้อตกลงการใช้งานเหล่านี้',
    ],
    sections: [
      {
        heading: '1. บัญชีผู้ใช้และความปลอดภัย',
        list: {
          type: 'ul',
          items: [
            'คุณต้องรักษาความลับของรหัสผ่านบัญชีของคุณ หากพบการใช้งานที่ผิดปกติ คุณต้องแจ้งให้ผู้ดูแลระบบทราบทันที',
            'ระบบถูกสงวนสิทธิ์ไว้สำหรับนักศึกษาและบุคลากรที่เกี่ยวข้องเท่านั้น ไม่อนุญาตให้โอนสิทธิ์การใช้งานบัญชีให้บุคคลภายนอก',
          ],
        },
      },
      {
        heading: '2. พฤติกรรมที่ยอมรับได้ (Code of Conduct)',
        list: {
          type: 'ul',
          items: [
            'คุณตกลงที่จะใช้บริการเพื่อการศึกษาเท่านั้น',
            'ห้ามอัปโหลดไฟล์ที่มีไวรัส สคริปต์ประสงค์ร้าย หรือเนื้อหาที่ผิดกฎหมาย/ละเมิดลิขสิทธิ์ลงในระบบ',
            'การทุจริตในการส่งงานผ่านระบบ หรือพยายามเข้าถึงสิทธิ์ผู้ดูแลระบบโดยไม่ได้รับอนุญาต จะมีบทลงโทษทางวิชาการและอาจถูกระงับบัญชีถาวร',
          ],
        },
      },
      {
        heading: '3. การแก้ไขข้อตกลง',
        paragraphs: [
          'SE-ONE ขอสงวนสิทธิ์ในการปรับปรุง เปลี่ยนแปลง หรือแก้ไขข้อตกลงนี้ได้ทุกเมื่อ โดยจะมีการประกาศแจ้งให้ทราบในหน้าระบบ',
        ],
      },
    ],
  },
  {
    id: 'license',
    tabTitle: 'License Agreement',
    tabLabel: 'ข้อตกลงอนุญาตให้ใช้สิทธิ',
    title: 'License Agreement',
    subtitle: 'ข้อตกลงอนุญาตให้ใช้สิทธิซอฟต์แวร์ (EULA)',
    intro: [
      'ข้อตกลงฉบับนี้เป็นสัญญาระหว่างคุณ (ผู้ใช้งาน) และ InfiniteStack Corp. / ทีมผู้พัฒนาแพลตฟอร์ม SE-ONE',
    ],
    sections: [
      {
        heading: '1. การอนุญาตให้ใช้สิทธิ',
        paragraphs: [
          'เรามอบสิทธิ์แบบไม่ผูกขาด (Non-exclusive) และไม่สามารถโอนได้ (Non-transferable) ในการเข้าถึงและใช้งานซอฟต์แวร์ผ่านเว็บเบราว์เซอร์ เพื่อวัตถุประสงค์ในการศึกษาและจัดการงานภายในองค์กร/สาขาวิชาเท่านั้น',
        ],
      },
      {
        heading: '2. ทรัพย์สินทางปัญญา',
        paragraphs: [
          'ซอร์สโค้ด (Source Code), การออกแบบ UI/UX, โลโก้, กราฟิก, และโครงสร้างฐานข้อมูลของระบบ ถือเป็นทรัพย์สินทางปัญญาของ InfiniteStack Corp. ไม่อนุญาตให้คัดลอก ทำซ้ำ ดัดแปลง หรือทำวิศวกรรมย้อนกลับ (Reverse Engineer) โดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร',
        ],
      },
      {
        heading: '3. ข้อจำกัดความรับผิดชอบ (Disclaimer)',
        paragraphs: [
          'ซอฟต์แวร์นี้ให้บริการในลักษณะ “ตามที่เป็นอยู่” (As is) โดยไม่มีการรับประกันใดๆ ทั้งสิ้น ทีมผู้พัฒนาจะไม่รับผิดชอบต่อความสูญเสียของข้อมูล หรือความเสียหายที่เกิดจากการใช้งานระบบขัดข้อง',
        ],
      },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
const FADE_CSS = `
@keyframes legal-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.legal-fade { animation: legal-fade-in .35s ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .legal-fade { animation: none; }
}
`

const linkClass =
  'rounded text-sm font-medium focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-se-primary/30'

/* ------------------------------------------------------------------ */
/*  ชิ้นส่วนย่อย                                                        */
/* ------------------------------------------------------------------ */
function ListItem({ item }) {
  if (typeof item === 'string') return <li>{item}</li>
  return (
    <li>
      <strong className="font-semibold">{item.term}</strong> {item.text}
    </li>
  )
}

function Section({ section }) {
  const isOrdered = section.list?.type === 'ol'
  const ListTag = isOrdered ? 'ol' : 'ul'

  return (
    <section className="mt-10">
      <h3 className="text-[21px] font-semibold leading-snug tracking-tight text-se-text-main">
        {section.heading}
      </h3>

      {section.paragraphs?.map((p) => (
        <p key={p} className="mt-3">
          {p}
        </p>
      ))}

      {section.list && (
        <ListTag
          className={`mt-3 space-y-2.5 pl-6 marker:text-se-text-muted ${
            isOrdered ? 'list-decimal' : 'list-disc'
          }`}
        >
          {section.list.items.map((item, i) => (
            <ListItem key={i} item={item} />
          ))}
        </ListTag>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */

export default function LegalCenter() {
  // เอกสารที่เปิดอยู่ผูกกับ URL hash เช่น #terms → แชร์ลิงก์ตรงไปที่เอกสารได้ และปุ่ม Back ใช้งานได้
  const { hash } = useLocation()
  const doc = DOCUMENTS.find((d) => `#${d.id}` === hash) ?? DOCUMENTS[0]

  useEffect(() => {
    document.title = `${doc.title} | Legal Center | SE-ONE`
    window.scrollTo(0, 0)
  }, [doc.id, doc.title])

  return (
    <div className="min-h-screen bg-se-background antialiased">
      <style>{FADE_CSS}</style>

      <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-12 sm:px-6 md:pt-16">
        {/* ---------- Page header ---------- */}
        <header className="mb-10 md:mb-14">
          <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-se-text-main md:text-[44px]">
            Legal Center
          </h1>
          <p className="mt-2 text-[17px] leading-relaxed text-se-text-muted">
            นโยบายและข้อตกลงที่เกี่ยวข้องกับการใช้งาน SE-ONE
          </p>
        </header>

        <div className="flex flex-col gap-6 md:flex-row md:gap-10 lg:gap-14">
          {/* ---------- Navigation (มือถือ: แถบเลื่อนแนวนอน / เดสก์ท็อป: sidebar) ---------- */}
          <aside className="md:w-64 md:shrink-0">
            <nav aria-label="เอกสารทางกฎหมาย" className="md:sticky md:top-28">
              <p className="mb-3 hidden px-4 text-[13px] font-semibold text-se-text-muted md:block">
                เอกสารทางกฎหมาย
              </p>

              <ul className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:mx-0 md:flex-col md:gap-1 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
                {DOCUMENTS.map((d) => {
                  const active = d.id === doc.id
                  return (
                    <li key={d.id} className="shrink-0 md:shrink">
                      <Link
                        to={`#${d.id}`}
                        replace
                        aria-current={active ? 'page' : undefined}
                        className={`block rounded-2xl px-4 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-se-primary/30 md:py-3 ${
                          active
                            ? 'bg-se-primary/10 text-se-primary'
                            : 'bg-se-surface text-se-text-muted ring-1 ring-se-border hover:text-se-text-main md:bg-transparent md:ring-0 md:hover:bg-se-border/40'
                        }`}
                      >
                        <span className="block whitespace-nowrap text-[15px] font-semibold md:whitespace-normal">
                          {d.tabTitle}
                        </span>
                        <span
                          className={`mt-0.5 hidden text-[12.5px] leading-snug md:block ${
                            active ? 'text-se-primary/70' : 'text-se-text-muted'
                          }`}
                        >
                          {d.tabLabel}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </aside>

          {/* ---------- Document ---------- */}
          <div className="min-w-0 flex-1">
            <article
              aria-labelledby="legal-doc-title"
              className="rounded-[28px] bg-se-surface px-6 py-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_48px_rgba(0,0,0,0.07)] sm:px-10 sm:py-12 lg:px-14 md:min-h-[560px]"
            >
              <div key={doc.id} className="legal-fade max-w-[720px]">
                <header className="border-b border-se-border pb-8">
                  <h2
                    id="legal-doc-title"
                    className="text-[32px] font-semibold leading-tight tracking-tight text-se-text-main"
                  >
                    {doc.title}
                  </h2>
                  <p className="mt-2 text-[17px] leading-relaxed text-se-text-muted">{doc.subtitle}</p>
                  <p className="mt-1 text-sm text-se-text-muted">อัปเดตล่าสุด: {LAST_UPDATED}</p>
                </header>

                <div className="pt-8 text-[16px] leading-[1.8] text-se-text-main sm:text-[17px]">
                  {doc.intro.map((p) => (
                    <p key={p}>{p}</p>
                  ))}

                  {doc.sections.map((section) => (
                    <Section key={section.heading} section={section} />
                  ))}
                </div>
              </div>
            </article>

            <footer className="mt-8 flex flex-col items-start gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-se-text-muted">
                มีคำถามเกี่ยวกับเอกสารเหล่านี้?{' '}
                <Link to="/support" className={`${linkClass} text-se-primary hover:underline`}>
                  ติดต่อทีมงาน
                </Link>
              </p>
              <Link
                to="/"
                className={`${linkClass} text-se-text-muted transition-colors hover:text-se-text-main`}
              >
                &larr; กลับสู่หน้าหลัก
              </Link>
            </footer>
          </div>
        </div>
      </main>
    </div>
  )
}