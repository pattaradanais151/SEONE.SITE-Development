import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'

/*
  CloudFiles Landing — Apple.com style
  - สีหน้าเพจอ้างอิงจาก design tokens (--color-se-*) เหมือนเดิม
  - จุดเด่นของหน้าคือ File browser จำลองใน Hero: คลิกโฟลเดอร์เพื่อเข้า/ออก และกดอัปโหลดเพื่อดูไฟล์ใหม่ปรากฏ
  - ข้อมูลไฟล์ทั้งหมดในหน้านี้เป็นภาพจำลอง ไม่ได้เรียกฐานข้อมูลจริง
*/

const CLOUD_ICON =
  'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z'
const FOLDER_FILL =
  'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z'
const DOC_ICON =
  'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z'
const UPLOAD_ICON = 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12'
const LOCK_ICON =
  'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
const CHEVRON = 'M9 5l7 7-7 7'

const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-se-primary/30'
const pill = `inline-flex items-center justify-center rounded-full bg-se-primary font-medium text-white transition-colors hover:bg-se-primary-hover ${focusRing}`

// สีป้ายประเภทไฟล์
const BADGE = {
  pdf: 'bg-rose-500',
  img: 'bg-sky-500',
  code: 'bg-emerald-500',
  txt: 'bg-slate-500',
  zip: 'bg-orange-500',
  doc: 'bg-indigo-500',
}

// @@js-start
const dir = (name) => ({ name, kind: 'folder' })
const file = (name, kind, size) => ({ name, kind, size })

// โครงสร้างโฟลเดอร์ตัวอย่าง: key คือ path ('' = ราก)
const SEED = {
  '': [dir('Projects'), dir('Assignments'), dir('Photos'), file('report.pdf', 'pdf', '1.8 MB'), file('notes.txt', 'txt', '4 KB')],
  Projects: [dir('se-console'), file('schema.sql', 'code', '8 KB'), file('api-design.md', 'doc', '12 KB')],
  'Projects/se-console': [file('ConsoleLayout.jsx', 'code', '31 KB'), file('logo.png', 'img', '48 KB')],
  Assignments: [file('lab-03.pdf', 'pdf', '2.2 MB'), file('wireframe.png', 'img', '860 KB'), file('source.zip', 'zip', '14 MB')],
  Photos: [file('campus-01.jpg', 'img', '3.1 MB'), file('campus-02.jpg', 'img', '2.7 MB')],
}

// ไฟล์ที่จะ "อัปโหลด" ตามลำดับเมื่อกดปุ่ม
const SAMPLES = [
  file('slides-week5.pdf', 'pdf', '4.6 MB'),
  file('lab-report.docx', 'doc', '1.2 MB'),
  file('diagram.png', 'img', '640 KB'),
  file('project.zip', 'zip', '38 MB'),
]

// ตั้งชื่อไฟล์อัปโหลดรอบที่ n (รอบแรกใช้ชื่อเดิม รอบถัดไปต่อท้าย -1, -2 เพื่อไม่ให้ซ้ำ)
const sampleAt = (n) => {
  const base = SAMPLES[n % SAMPLES.length]
  const round = Math.floor(n / SAMPLES.length)
  return round ? { ...base, name: base.name.replace(/(\.[^.]+)$/, `-${round}$1`) } : base
}
// @@js-end

const NAV = [
  ['#features', 'ฟีเจอร์'],
  ['#usecases', 'การใช้งาน'],
  ['#faq', 'คำถามที่พบบ่อย'],
]

const SIZES = [
  ['slides-week5.pdf', '4.6 MB', 4.6],
  ['project.zip', '38 MB', 38],
  ['screen-record.mp4', '100 MB', 100],
]

const TREE = [
  ['ภาคเรียน 1', 0],
  ['Database', 1],
  ['Lab 3', 2],
  ['Final project', 2],
  ['Web Programming', 1],
]

// [ขนาดกรอบ, ชื่ออุปกรณ์]
const DEVICES = [
  ['h-28 w-44 rounded-xl', 'คอมพิวเตอร์'],
  ['h-32 w-24 rounded-2xl', 'แท็บเล็ต'],
  ['h-28 w-14 rounded-2xl', 'โทรศัพท์'],
]

const USES = [
  ['pdf', 'PDF', 'งานส่งอาจารย์', 'เก็บรายงานและใบงานของแต่ละวิชาไว้ในโฟลเดอร์เดียว'],
  ['code', '</>', 'โปรเจกต์และโค้ด', 'เก็บซอร์สโค้ดและเอกสารออกแบบของโปรเจกต์ไว้ด้วยกัน'],
  ['img', 'PNG', 'รูปและแผนภาพ', 'เก็บภาพหน้าจอ แผนภาพ และรูปประกอบงานไว้เปิดดูภายหลัง'],
  ['zip', 'ZIP', 'งานทั้งชุด', 'รวมงานทั้งชุดเป็นไฟล์เดียวแล้วเก็บไว้อย่างเป็นระเบียบ'],
]

const FAQ = [
  ['อัปโหลดไฟล์ได้ใหญ่แค่ไหน', 'สูงสุด 100 MB ต่อไฟล์ เลือกไฟล์แล้วอัปโหลดได้เลย'],
  ['ต้องติดตั้งโปรแกรมไหม', 'ไม่ต้องติดตั้ง เปิดผ่านเว็บเบราว์เซอร์บนอุปกรณ์ใดก็ได้'],
  ['สร้างโฟลเดอร์ซ้อนกันได้ไหม', 'ได้ สร้างโฟลเดอร์ซ้อนกันเพื่อแยกตามวิชาหรือโปรเจกต์ได้ตามต้องการ'],
  ['ใครใช้งานได้บ้าง', 'สมาชิก SE-ONE ที่เข้าสู่ระบบแล้ว โดยแต่ละบัญชีมีพื้นที่เก็บไฟล์เป็นของตัวเอง'],
]

function Icon({ d, className = 'h-6 w-6', strokeWidth = 1.75 }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}

function Folder({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d={FOLDER_FILL} />
    </svg>
  )
}

function SectionHead({ title, sub }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <h2 className="text-4xl font-semibold leading-[1.2] tracking-tight md:text-6xl md:leading-[1.15]">{title}</h2>
      {sub && <p className="mx-auto mt-5 max-w-2xl text-xl leading-relaxed text-se-text-muted">{sub}</p>}
    </div>
  )
}

function TextLink({ href, children }) {
  return (
    <a href={href} className={`inline-flex items-center gap-1 rounded-lg text-[17px] text-se-primary hover:underline ${focusRing}`}>
      {children}
      <Icon d={CHEVRON} className="h-4 w-4" strokeWidth={2.2} />
    </a>
  )
}

// แถวฟีเจอร์: ข้อความซ้าย ภาพประกอบขวา (flip = สลับด้านบนจอใหญ่)
function FeatureRow({ title, text, flip, children }) {
  return (
    <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
      <div className={flip ? 'md:order-2' : ''}>
        <h3 className="text-3xl font-semibold leading-[1.25] tracking-tight md:text-5xl md:leading-[1.2]">{title}</h3>
        <p className="mt-4 max-w-md text-xl leading-relaxed text-se-text-muted">{text}</p>
      </div>
      <div className="rounded-[28px] bg-se-background p-8 md:p-10">{children}</div>
    </div>
  )
}

function FileTile({ item, onOpen }) {
  const isDir = item.kind === 'folder'
  const body = (
    <>
      <div className="relative flex aspect-square items-center justify-center rounded-2xl bg-se-background">
        {isDir ? (
          <Folder className="h-12 w-12 text-se-primary md:h-14 md:w-14" />
        ) : (
          <>
            <Icon d={DOC_ICON} className="h-10 w-10 text-se-text-muted md:h-12 md:w-12" strokeWidth={1.5} />
            <span
              className={`absolute bottom-2 left-2 rounded px-1.5 py-0.5 text-[9px] font-bold leading-none text-white ${BADGE[item.kind]}`}
            >
              {item.name.split('.').pop().toUpperCase()}
            </span>
          </>
        )}
      </div>
      <p className="mt-2 truncate text-center text-xs font-medium">{item.name}</p>
      {!isDir && <p className="text-center text-[11px] text-se-text-muted">{item.size}</p>}
    </>
  )

  return isDir ? (
    <button
      type="button"
      aria-label={`เปิดโฟลเดอร์ ${item.name}`}
      onClick={onOpen}
      className={`block w-full min-w-0 rounded-2xl transition-transform hover:scale-[1.03] ${focusRing}`}
    >
      {body}
    </button>
  ) : (
    <div className="min-w-0">{body}</div>
  )
}

/* ------------------------------------------------------------------ */
/*  FileBrowser — หน้าต่างจัดการไฟล์จำลอง (เข้าโฟลเดอร์ / อัปโหลด)            */
/* ------------------------------------------------------------------ */

function FileBrowser() {
  const [files, setFiles] = useState(SEED)
  const [path, setPath] = useState('')
  const [up, setUp] = useState(null) // { file, dir, pct }
  const [count, setCount] = useState(0)
  const [reduce] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  const items = files[path] ?? []
  const crumbs = path ? path.split('/') : []
  const topFolders = files[''].filter((i) => i.kind === 'folder')

  // เดินแถบความคืบหน้า แล้วเพิ่มไฟล์เข้าโฟลเดอร์ที่กดอัปโหลดไว้
  useEffect(() => {
    if (!up) return undefined
    if (up.pct >= 100) {
      setFiles((f) => ({ ...f, [up.dir]: [...(f[up.dir] ?? []), up.file] }))
      setUp(null)
      return undefined
    }
    const id = setTimeout(() => setUp((u) => (u ? { ...u, pct: Math.min(100, u.pct + 14) } : u)), 100)
    return () => clearTimeout(id)
  }, [up])

  const startUpload = () => {
    if (up) return
    setUp({ file: sampleAt(count), dir: path, pct: reduce ? 100 : 0 })
    setCount((c) => c + 1)
  }

  const isActive = (dest) => (dest === '' ? path === '' : path === dest || path.startsWith(`${dest}/`))

  return (
    <div id="demo" className="mx-auto max-w-5xl scroll-mt-16">
      <div className="overflow-hidden rounded-[28px] bg-se-surface shadow-[0_30px_80px_rgba(0,0,0,0.12)] ring-1 ring-se-border/60">
        {/* Title bar */}
        <div className="relative flex h-12 items-center border-b border-se-border/60 px-5">
          <div className="flex gap-2" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]"></span>
            <span className="h-3 w-3 rounded-full bg-[#febc2e]"></span>
            <span className="h-3 w-3 rounded-full bg-[#28c840]"></span>
          </div>
          <span className="pointer-events-none absolute inset-x-0 text-center text-sm font-medium text-se-text-muted">
            My Files
          </span>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <aside className="hidden w-52 flex-shrink-0 space-y-1 border-r border-se-border/60 p-3 md:block">
            {[{ name: 'My Files', dest: '' }, ...topFolders.map((f) => ({ name: f.name, dest: f.name }))].map((s) => (
              <button
                key={s.dest}
                type="button"
                onClick={() => setPath(s.dest)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[14px] transition-colors ${focusRing} ${
                  isActive(s.dest) ? 'bg-se-primary/10 font-semibold text-se-primary' : 'hover:bg-se-border/30'
                }`}
              >
                {s.dest === '' ? <Icon d={CLOUD_ICON} className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
                <span className="truncate">{s.name}</span>
              </button>
            ))}
          </aside>

          <div className="min-w-0 flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 border-b border-se-border/60 px-5 py-3">
              <nav aria-label="ตำแหน่งโฟลเดอร์" className="flex min-w-0 items-center gap-1 text-[14px]">
                {['My Files', ...crumbs].map((c, i, arr) => (
                  <span key={`${i}-${c}`} className="flex min-w-0 items-center gap-1">
                    {i > 0 && <Icon d={CHEVRON} className="h-3.5 w-3.5 flex-shrink-0 text-se-text-muted" strokeWidth={2.2} />}
                    <button
                      type="button"
                      disabled={i === arr.length - 1}
                      onClick={() => setPath(crumbs.slice(0, i).join('/'))}
                      className={`truncate rounded px-1 ${focusRing} ${
                        i === arr.length - 1 ? 'font-semibold' : 'text-se-text-muted hover:text-se-text-main'
                      }`}
                    >
                      {c}
                    </button>
                  </span>
                ))}
              </nav>
              <button
                type="button"
                onClick={startUpload}
                disabled={Boolean(up)}
                className={`${pill} flex-shrink-0 gap-1.5 px-4 py-1.5 text-[13px] disabled:opacity-50`}
              >
                <Icon d={UPLOAD_ICON} className="h-4 w-4" strokeWidth={2} />
                อัปโหลด
              </button>
            </div>

            {/* File grid */}
            <div className="grid min-h-[320px] grid-cols-3 content-start gap-4 p-6 md:grid-cols-4 md:p-8">
              {items.map((item) => (
                <FileTile key={item.name} item={item} onOpen={() => setPath(path ? `${path}/${item.name}` : item.name)} />
              ))}
              {items.length === 0 && (
                <p className="col-span-full py-20 text-center text-sm text-se-text-muted">โฟลเดอร์ว่าง ลองกดอัปโหลดดูได้เลย</p>
              )}
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between gap-4 border-t border-se-border/60 px-5 py-2.5 text-xs text-se-text-muted">
          {up ? (
            <>
              <span className="truncate">กำลังอัปโหลด {up.file.name}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-se-border">
                <span className="block h-full rounded-full bg-se-primary transition-[width] duration-100" style={{ width: `${up.pct}%` }}></span>
              </span>
              <span className="tabular-nums">{up.pct}%</span>
            </>
          ) : (
            <>
              <span>{items.length} รายการ</span>
              <span>ไฟล์ละไม่เกิน 100 MB</span>
            </>
          )}
        </div>
      </div>

      <p className="mt-5 text-center text-[13px] text-se-text-muted">ภาพจำลอง ลองคลิกโฟลเดอร์หรือกดอัปโหลดได้เลย</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  CloudFilesLanding                                                  */
/* ------------------------------------------------------------------ */

export default function CloudFilesLanding() {
  const { session, profile } = useAuth()

  useEffect(() => {
    document.title = 'CLOUDFILES | Secure Cloud Storage'
  }, [])

  const cta = session
    ? { to: '/cloudfiles/dashboard', label: 'เข้าสู่ไฟล์ของฉัน', short: 'ไฟล์ของฉัน' }
    : { to: '/sework/login', label: 'เข้าสู่ระบบด้วย SE-ONE', short: 'เข้าสู่ระบบ' }

  return (
    <div className="min-h-screen bg-se-background font-sans text-se-text-main antialiased selection:bg-se-primary/20">
      {/* Nav — โปร่งแสง + blur แบบ apple.com */}
      <nav className="sticky top-0 z-50 border-b border-se-border/60 bg-se-background/75 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-6 px-6">
          <Link to="/" className={`flex items-center gap-2.5 rounded-lg ${focusRing}`}>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-rose-500">
              <Icon d={CLOUD_ICON} className="h-4 w-4 text-white" strokeWidth={2} />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">CLOUDFILES</span>
          </Link>

          <div className="hidden items-center gap-7 text-[13px] text-se-text-muted md:flex">
            {NAV.map(([href, label]) => (
              <a key={href} href={href} className={`rounded transition-colors hover:text-se-text-main ${focusRing}`}>
                {label}
              </a>
            ))}
            <Link to="/" className={`rounded transition-colors hover:text-se-text-main ${focusRing}`}>
              กลับสู่ SE-ONE Portal
            </Link>
          </div>

          <Link to={cta.to} className={`${pill} px-3.5 py-1 text-[12px]`}>
            {cta.short}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="mx-auto max-w-4xl px-6 pb-14 pt-20 text-center md:pt-28">
        <p className="text-xl font-semibold md:text-2xl">CLOUDFILES</p>
        <h1 className="mt-3 text-5xl font-semibold leading-[1.2] tracking-tight md:text-7xl md:leading-[1.15]">
          เก็บไว้ที่เดียว
          <br />
          หยิบได้จากทุกที่
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-se-text-muted md:text-2xl md:leading-relaxed">
          พื้นที่จัดเก็บไฟล์ส่วนตัวสำหรับนักพัฒนาและนักศึกษา อัปโหลด จัดระเบียบ และเปิดดูได้จากทุกอุปกรณ์
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          <Link to={cta.to} className={`${pill} px-7 py-3 text-[17px]`}>
            {cta.label}
          </Link>
          <TextLink href="#demo">ลองเล่นตัวอย่าง</TextLink>
        </div>

        {/* User Info Preview (ถ้าล็อกอินแล้ว) */}
        {profile && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="h-8 w-8 overflow-hidden rounded-full bg-se-primary/10 ring-1 ring-se-border">
              {profile.profile_image_url ? (
                <img src={profile.profile_image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-se-primary">
                  {profile.first_name?.charAt(0)}
                </div>
              )}
            </div>
            <p className="text-[15px] text-se-text-muted">
              กำลังใช้งานในชื่อ{' '}
              <span className="font-semibold text-se-text-main">
                {profile.first_name} {profile.last_name}
              </span>
            </p>
          </div>
        )}
      </header>

      <section className="px-6 pb-24 md:pb-32">
        <FileBrowser />
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-12 bg-se-surface py-24 md:py-32">
        <div className="mx-auto max-w-5xl px-6">
          <SectionHead
            title={
              <>
                ทุกอย่างที่ไฟล์ของคุณ
                <br />
                ควรได้รับ
              </>
            }
          />
          <div className="mt-20 space-y-20 md:space-y-28">
            <FeatureRow title="อัปโหลดไฟล์ใหญ่ได้สบาย" text="รองรับไฟล์ขนาดสูงสุด 100 MB ต่อไฟล์ เลือกไฟล์แล้วอัปโหลดได้เลย">
              <ul className="space-y-6">
                {SIZES.map(([name, label, pct]) => (
                  <li key={name}>
                    <div className="mb-2 flex items-center justify-between gap-4 text-[14px]">
                      <span className="truncate font-mono">{name}</span>
                      <span className="flex-shrink-0 text-se-text-muted">{label}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-se-border/60">
                      <div className="h-full rounded-full bg-se-primary" style={{ width: `${pct}%` }}></div>
                    </div>
                  </li>
                ))}
              </ul>
            </FeatureRow>

            <FeatureRow flip title="จัดระเบียบเป็นโฟลเดอร์" text="สร้างโฟลเดอร์ซ้อนกันเพื่อแยกงานของแต่ละวิชาและแต่ละโปรเจกต์">
              <ul className="space-y-1">
                {TREE.map(([name, depth]) => (
                  <li key={name} className="flex items-center gap-2.5 py-1.5 text-[15px]" style={{ paddingLeft: depth * 24 }}>
                    <Folder className="h-5 w-5 flex-shrink-0 text-se-primary" />
                    {name}
                  </li>
                ))}
              </ul>
            </FeatureRow>

            <FeatureRow title="เปิดได้จากทุกอุปกรณ์" text="เปิดไฟล์ของคุณผ่านเว็บบนอุปกรณ์ใดก็ได้ ไม่ต้องติดตั้งโปรแกรมเพิ่ม">
              <div className="flex items-end justify-center gap-5">
                {DEVICES.map(([size, label]) => (
                  <figure key={label} className="flex flex-col items-center gap-3">
                    <div className={`flex items-center justify-center border-2 border-se-text-muted/40 bg-se-surface ${size}`}>
                      <Folder className="h-6 w-6 text-se-primary" />
                    </div>
                    <figcaption className="text-[12px] text-se-text-muted">{label}</figcaption>
                  </figure>
                ))}
              </div>
            </FeatureRow>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section id="usecases" className="scroll-mt-12 py-24 md:py-32">
        <div className="mx-auto max-w-5xl px-6">
          <SectionHead title="เก็บอะไรได้บ้าง" sub="ไฟล์ทุกประเภทที่นักศึกษาและนักพัฒนาใช้ทุกวัน" />
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {USES.map(([kind, label, title, text]) => (
              <article key={title} className="rounded-[28px] bg-se-surface p-8">
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold text-white ${BADGE[kind]}`}>
                  {label}
                </span>
                <h3 className="mt-8 text-xl font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-se-text-muted">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Private */}
      <section className="bg-se-text-main px-6 py-24 text-center text-se-background md:py-32">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-se-background/10">
          <Icon d={LOCK_ICON} className="h-7 w-7" />
        </span>
        <h2 className="mt-8 text-4xl font-semibold leading-[1.2] tracking-tight md:text-6xl md:leading-[1.15]">
          ไฟล์ของคุณ
          <br />
          เป็นของคุณ
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-xl leading-relaxed text-se-background/70">
          แต่ละบัญชีมีพื้นที่เก็บไฟล์เป็นของตัวเอง ใช้บัญชี SE-ONE เดียวเข้าสู่ระบบได้ทันที
        </p>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-12 py-24 md:py-32">
        <div className="mx-auto max-w-3xl px-6">
          <SectionHead title="คำถามที่พบบ่อย" />
          <div className="mt-12 divide-y divide-se-border/70 border-y border-se-border/70">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary
                  className={`flex cursor-pointer list-none items-center justify-between gap-6 rounded-lg text-left text-lg font-semibold [&::-webkit-details-marker]:hidden ${focusRing}`}
                >
                  {q}
                  <Icon
                    d="M19 9l-7 7-7-7"
                    strokeWidth={2}
                    className="h-5 w-5 flex-shrink-0 text-se-text-muted transition-transform duration-200 group-open:rotate-180"
                  />
                </summary>
                <p className="mt-3 text-[17px] leading-relaxed text-se-text-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-se-surface px-6 py-24 text-center md:py-32">
        <h2 className="text-4xl font-semibold leading-[1.2] tracking-tight md:text-6xl md:leading-[1.15]">
          เริ่มเก็บไฟล์
          <br />
          ได้ตั้งแต่วันนี้
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-xl leading-relaxed text-se-text-muted">
          ไม่ต้องติดตั้งอะไร ใช้บัญชี SE-ONE ของคุณก็พร้อมแล้ว
        </p>
        <div className="mt-9 flex justify-center">
          <Link to={cta.to} className={`${pill} px-7 py-3 text-[17px]`}>
            {cta.label}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-se-border/60">
        <div className="mx-auto max-w-5xl px-6 py-8 text-[12px] leading-relaxed text-se-text-muted">
          <p>
            CLOUDFILES ใช้งานได้สำหรับสมาชิก SE-ONE ที่เข้าสู่ระบบ
            ไฟล์และโฟลเดอร์ตัวอย่างในหน้านี้เป็นภาพจำลองเพื่อแสดงหน้าตาการใช้งาน
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-se-border/60 pt-5">
            <p>Copyright © {new Date().getFullYear()} SE-ONE. สงวนลิขสิทธิ์</p>
            <Link to="/" className={`rounded transition-colors hover:text-se-text-main ${focusRing}`}>
              กลับสู่ SE-ONE Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}