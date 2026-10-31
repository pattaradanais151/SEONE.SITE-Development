import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'

/*
  Coding Studio Landing — Apple.com style
  - สีหน้าเพจอ้างอิงจาก design tokens (--color-se-*) เหมือนเดิม
  - หน้าต่าง editor ใช้ชุดสี VS Code Dark+ คงที่ (เหมือน editor จริงที่เป็นธีมมืด)
  - Hero มี editor จำลองที่กดเลือกภาษาแล้วโค้ด "พิมพ์" ขึ้นมาให้ดู เป็นจุดเด่นเพียงจุดเดียวของหน้า
*/

// @@js-start
const CODE_ICON = 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4'
const BOLT_ICON = 'M13 10V3L4 14h7v7l9-11h-7z'
const CHEVRON = 'M9 5l7 7-7 7'

const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-se-primary/30'
const pill = `inline-flex items-center justify-center rounded-full bg-se-primary font-medium text-white transition-colors hover:bg-se-primary-hover ${focusRing}`

// สีโค้ด (VS Code Dark+)
const T = {
  plain: 'text-[#d4d4d4]',
  kw: 'text-[#c586c0]',
  fn: 'text-[#dcdcaa]',
  str: 'text-[#ce9178]',
  cls: 'text-[#4ec9b0]',
  lit: 'text-[#569cd6]',
  num: 'text-[#b5cea8]',
  com: 'text-[#6a9955]',
}

// regex แบ่งโค้ดเป็น token: 1=คอมเมนต์ 2=สตริง 3=แท็ก/#include 4=ตัวเลข 5=คำ
const STR = String.raw`"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\x60(?:[^\x60\\]|\\.)*\x60`
const makeRe = (com) =>
  new RegExp(String.raw`(${com}.*)|(${STR})|(<\/?[A-Za-z][\w-]*|#include)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][\w-]*)`, 'g')

const RAW = [
  {
    name: 'HTML', file: 'index.html', group: 'web', kw: 'class id',
    code: ['<main class="hero">', '  <h1>สวัสดี SE-ONE</h1>', '  <button id="run">เริ่มเลย</button>', '</main>'],
    out: ['สวัสดี SE-ONE', '[ เริ่มเลย ]'],
  },
  {
    name: 'CSS', file: 'style.css', group: 'web', kw: 'display place-items border-radius',
    code: ['.card {', '  display: grid;', '  place-items: center;', '  border-radius: 28px;', '}'],
    out: ['ใช้สไตล์ .card แล้ว 3 รายการ'],
  },
  {
    name: 'JavaScript', file: 'main.js', group: 'web', kw: 'const for of',
    code: ["const names = ['Mint', 'Beam', 'Ploy']", 'for (const name of names) {', '  console.log(`Hello, ${name}!`)', '}'],
    out: ['Hello, Mint!', 'Hello, Beam!', 'Hello, Ploy!'],
  },
  {
    name: 'JSX', file: 'App.jsx', group: 'web', kw: 'export default function const return',
    code: ['export default function App() {', '  const [n, setN] = useState(0)', '  return <button onClick={() => setN(n + 1)}>{n}</button>', '}'],
    out: ['[ 0 ]  คลิกเพื่อเพิ่มค่า'],
  },
  {
    name: 'TSX', file: 'Card.tsx', group: 'web', kw: 'type export const',
    code: ['type Props = { title: string }', 'export const Card = ({ title }: Props) => (', '  <h2 className="title">{title}</h2>', ')'],
    out: ['ตรวจชนิดข้อมูลผ่านแล้ว', 'แสดงผล <Card /> เรียบร้อย'],
  },
  {
    name: 'C', file: 'main.c', group: 'console', kw: 'int void return',
    code: ['#include <stdio.h>', '', 'int main(void) {', '  printf("Hello, C!\\n");', '  return 0;', '}'],
    out: ['Hello, C!'],
  },
  {
    name: 'C++', file: 'main.cpp', group: 'console', kw: 'int return',
    code: ['#include <iostream>', '', 'int main() {', '  std::cout << "Hello, C++" << std::endl;', '}'],
    out: ['Hello, C++'],
  },
  {
    name: 'C#', file: 'Program.cs', group: 'console', kw: 'using var new',
    code: ['using System;', '', 'var scores = new[] { 90, 85, 100 };', 'Console.WriteLine($"Max = {scores.Max()}");'],
    out: ['Max = 100'],
  },
  {
    name: 'Java', file: 'Main.java', group: 'console', kw: 'public class static void',
    code: ['public class Main {', '  public static void main(String[] args) {', '    System.out.println("Hello, Java");', '  }', '}'],
    out: ['Hello, Java'],
  },
  {
    name: 'Python', file: 'main.py', group: 'console', kw: 'for in if def import return', com: '#',
    code: ['scores = [72, 88, 95]', 'avg = sum(scores) / len(scores)', 'print(f"average = {avg:.2f}")'],
    out: ['average = 85.00'],
  },
]

const LANGS = RAW.map((l) => ({ ...l, kw: new Set(l.kw.split(' ')), re: makeRe(l.com ?? '//') }))

// แปลงโค้ดหนึ่งบรรทัดเป็นรายการ [คลาสสี, ข้อความ]
function tokens(line, lang) {
  const out = []
  let last = 0
  for (const m of line.matchAll(lang.re)) {
    const [txt, com, str, tag, num, word] = m
    if (m.index > last) out.push([T.plain, line.slice(last, m.index)])
    let color = T.plain
    if (com) color = T.com
    else if (str) color = T.str
    else if (tag) color = tag === '#include' ? T.kw : T.lit
    else if (num) color = T.num
    else if (lang.kw.has(word)) color = T.kw
    else if (/^[A-Z]/.test(word)) color = T.cls
    else if (line[m.index + txt.length] === '(') color = T.fn
    out.push([color, txt])
    last = m.index + txt.length
  }
  if (last < line.length) out.push([T.plain, line.slice(last)])
  return out
}
// @@js-end

const NAV = [
  ['#languages', 'ภาษา'],
  ['#features', 'ฟีเจอร์'],
  ['#faq', 'คำถามที่พบบ่อย'],
]

const GROUPS = [
  {
    id: 'web',
    title: 'หน้าเว็บ ดูผลได้ทันที',
    text: 'เขียน HTML, CSS, JavaScript และ React แล้วกดรันเพื่อดูหน้าเว็บของคุณทันที ไม่ต้องตั้งค่าอะไรเพิ่ม',
  },
  {
    id: 'console',
    title: 'โปรแกรม Console รับอินพุตได้',
    text: 'เขียนโปรแกรมด้วย C, C++, C#, Java และ Python ป้อนอินพุต แล้วดูเอาต์พุตได้ในหน้าต่างเดียว',
  },
]

const STEPS = [
  ['เลือกภาษา', `เลือกภาษาที่ต้องการจาก ${LANGS.length} ภาษาที่รองรับ`],
  ['เขียนโค้ด', 'เขียนและป้อนอินพุตใน Workspace ส่วนตัวของคุณ'],
  ['กดรัน', 'ดูผลลัพธ์ทันที ไฟล์จะถูกบันทึกให้อัตโนมัติ'],
]

const FAQ = [
  ['ต้องติดตั้งโปรแกรมอะไรไหม', 'ไม่ต้องติดตั้ง CODING STUDIO ทำงานบนเบราว์เซอร์ เปิด Workspace แล้วเริ่มเขียนโค้ดได้ทันที'],
  ['ปิดหน้าต่างแล้วไฟล์จะหายไหม', 'ไม่หาย ไฟล์ใน Workspace ส่วนตัวถูกบันทึกอัตโนมัติ กลับมาเปิดทำต่อได้ทุกเมื่อ'],
  ['ใครใช้งานได้บ้าง', 'สมาชิก SE-ONE ที่เข้าสู่ระบบแล้ว โดยแต่ละคนจะมี Workspace เป็นของตัวเอง'],
  ['รองรับภาษาอะไรบ้าง', LANGS.map((l) => l.name).join(', ')],
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

function Bento({ className = '', icon, title, text, children }) {
  return (
    <article className={`flex flex-col rounded-[28px] bg-se-surface p-8 md:p-10 ${className}`}>
      {icon && (
        <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-full bg-se-primary/10 text-se-primary">
          <Icon d={icon} />
        </div>
      )}
      <h3 className="text-2xl font-semibold leading-snug tracking-tight md:text-3xl">{title}</h3>
      <p className="mt-3 text-[17px] leading-relaxed text-se-text-muted">{text}</p>
      {children}
    </article>
  )
}

/* ------------------------------------------------------------------ */
/*  EditorDemo — เลือกภาษา แล้วโค้ดค่อย ๆ "พิมพ์" ขึ้นมา พร้อมผลลัพธ์          */
/* ------------------------------------------------------------------ */

function EditorDemo() {
  const [idx, setIdx] = useState(2)
  const [runKey, setRunKey] = useState(0)
  const [reduce] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  const lang = LANGS[idx]
  const code = lang.code.join('\n')
  const key = `${idx}:${runKey}`

  // จำนวนตัวอักษรที่พิมพ์แล้ว ผูกกับ key เพื่อให้เริ่มจาก 0 ทุกครั้งที่เปลี่ยนภาษา/กดรัน
  const [typed, setTyped] = useState({ key, n: 0 })
  const n = reduce ? code.length : typed.key === key ? typed.n : 0
  const done = n >= code.length

  useEffect(() => {
    if (reduce || n >= code.length) return undefined
    const id = setTimeout(() => setTyped({ key, n: Math.min(n + 2, code.length) }), 28)
    return () => clearTimeout(id)
  }, [key, n, code, reduce])

  const lines = code.slice(0, n).split('\n')

  return (
    <div className="mx-auto max-w-4xl">
      <div role="group" aria-label="เลือกภาษา" className="mb-8 flex flex-wrap justify-center gap-2">
        {LANGS.map((l, i) => (
          <button
            key={l.name}
            type="button"
            aria-pressed={i === idx}
            onClick={() => setIdx(i)}
            className={`rounded-full px-4 py-1.5 text-[15px] font-medium transition-colors ${focusRing} ${
              i === idx
                ? 'bg-se-text-main text-se-background'
                : 'bg-se-surface text-se-text-main ring-1 ring-se-border/70 hover:bg-se-border/40'
            }`}
          >
            {l.name}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-[22px] bg-[#1e1e1e] text-left font-mono text-[13px] leading-6 shadow-[0_30px_80px_rgba(0,0,0,0.25)] ring-1 ring-black/10 md:text-sm md:leading-7">
        {/* Title bar */}
        <div className="relative flex h-11 items-center justify-between bg-[#323233] px-4">
          <div className="flex gap-2" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]"></span>
            <span className="h-3 w-3 rounded-full bg-[#febc2e]"></span>
            <span className="h-3 w-3 rounded-full bg-[#28c840]"></span>
          </div>
          <span className="pointer-events-none absolute inset-x-0 text-center font-sans text-xs text-[#9d9d9d]">
            {lang.file} — Sandbox
          </span>
          <button
            type="button"
            aria-label="รันโค้ดอีกครั้ง"
            onClick={() => setRunKey((k) => k + 1)}
            className={`relative flex h-7 items-center gap-1.5 rounded-full bg-[#28c840] px-3 font-sans text-xs font-semibold text-[#06260d] transition-opacity hover:opacity-85 ${focusRing}`}
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
            รัน
          </button>
        </div>

        {/* Tab */}
        <div className="flex bg-[#252526] font-sans text-xs">
          <div className="flex items-center gap-2 border-t border-t-[#0078d4] bg-[#1e1e1e] px-4 py-2 text-white">
            {lang.file}
          </div>
        </div>

        {/* Code */}
        <div className="flex min-h-[200px] overflow-x-auto px-2 py-4 md:px-4">
          <div className="select-none pr-4 text-right text-[#858585]" aria-hidden="true">
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <pre className="m-0 flex-1" aria-label={`ตัวอย่างโค้ด ${lang.name}`}>
            {lines.map((line, i) => (
              <div key={i} className="min-h-6 whitespace-pre md:min-h-7">
                {tokens(line, lang).map(([color, text], j) => (
                  <span key={j} className={color}>
                    {text}
                  </span>
                ))}
                {i === lines.length - 1 && (
                  <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-[#aeafad]"></span>
                )}
              </div>
            ))}
          </pre>
        </div>

        {/* Output */}
        <div className="border-t border-white/10 bg-[#181818] px-4 py-3 md:px-5">
          <p className="mb-1 font-sans text-[11px] text-[#9d9d9d]">
            {lang.group === 'web' ? 'ตัวอย่างผลลัพธ์' : 'เอาต์พุต'}
          </p>
          <div className={`min-h-[5rem] text-[#cccccc] transition-opacity duration-500 ${done ? 'opacity-100' : 'opacity-0'}`}>
            {lang.out.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between bg-[#007acc] px-3 py-1 font-sans text-[11px] text-white">
          <span>SE-ONE</span>
          <span>{lang.name}</span>
        </div>
      </div>

      <p className="mt-5 text-center text-[13px] text-se-text-muted">ภาพจำลองเพื่อแสดงหน้าตาการทำงานของ Workspace</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  CodingLanding                                                      */
/* ------------------------------------------------------------------ */

export default function CodingLanding() {
  const { session, profile } = useAuth()

  useEffect(() => {
    document.title = 'CODING STUDIO | SE-ONE'
  }, [])

  const workspacePath = profile?.nickname ? `/coding/workspace/${profile.nickname}` : '/coding/workspace'
  const cta = session
    ? { to: workspacePath, label: 'เปิด Workspace', short: 'เปิด Workspace' }
    : { to: '/sework/login', label: 'เข้าสู่ระบบด้วย SE-ONE', short: 'เข้าสู่ระบบ' }

  return (
    <div className="min-h-screen bg-se-background font-sans text-se-text-main antialiased selection:bg-se-primary/20">
      {/* Nav — โปร่งแสง + blur แบบ apple.com */}
      <nav className="sticky top-0 z-50 border-b border-se-border/60 bg-se-background/75 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-6 px-6">
          <Link to="/" className={`flex items-center gap-2.5 rounded-lg ${focusRing}`}>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500">
              <Icon d={CODE_ICON} className="h-4 w-4 text-white" strokeWidth={2} />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">CODING STUDIO</span>
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
      <header className="mx-auto max-w-5xl px-6 pb-14 pt-20 text-center md:pt-28">
        <p className="text-xl font-semibold md:text-2xl">CODING STUDIO</p>
        <h1 className="mt-3 text-5xl font-semibold leading-[1.2] tracking-tight md:text-7xl md:leading-[1.15]">
          เขียนโค้ด
          <br />
          แล้วเห็นผลทันที
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-se-text-muted md:text-2xl md:leading-relaxed">
          IDE ออนไลน์สำหรับนักศึกษาวิศวกรรมซอฟต์แวร์ ฝึกโจทย์ ทดสอบโค้ด และเก็บงานทั้งหมดไว้ใน Workspace ส่วนตัว
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          <Link to={cta.to} className={`${pill} px-7 py-3 text-[17px]`}>
            {cta.label}
          </Link>
          <TextLink href="#features">ดูว่ามีอะไรบ้าง</TextLink>
        </div>
      </header>

      <section className="px-6 pb-24 md:pb-32">
        <EditorDemo />
      </section>

      {/* Languages */}
      <section id="languages" className="scroll-mt-12 bg-se-surface py-24 md:py-32">
        <div className="mx-auto max-w-5xl px-6">
          <SectionHead
            title={
              <>
                ทุกภาษาที่เรียน
                <br />
                อยู่ในที่เดียว
              </>
            }
            sub={`รองรับ ${LANGS.length} ภาษา ทั้งงานหน้าเว็บและโปรแกรมแบบ Console`}
          />
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {GROUPS.map((g) => (
              <article key={g.id} className="rounded-[28px] bg-se-background p-8 md:p-10">
                <h3 className="text-2xl font-semibold leading-snug tracking-tight md:text-3xl">{g.title}</h3>
                <p className="mt-3 text-[17px] leading-relaxed text-se-text-muted">{g.text}</p>
                <ul className="mt-8 flex flex-wrap gap-2">
                  {LANGS.filter((l) => l.group === g.id).map((l) => (
                    <li key={l.name} className="rounded-full bg-se-surface px-4 py-1.5 text-[15px] font-medium ring-1 ring-se-border/70">
                      {l.name}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-12 py-24 md:py-32">
        <div className="mx-auto max-w-5xl px-6">
          <SectionHead
            title={
              <>
                ออกแบบมาให้
                <br />
                ซ้อมได้เต็มที่
              </>
            }
            sub="ตั้งแต่โจทย์แรกจนถึงงานที่ต้องส่ง ทุกอย่างอยู่ในหน้าเดียว"
          />
          <div className="mt-14 grid gap-5 md:grid-cols-6">
            <Bento
              className="md:col-span-4"
              title="ฝึกแก้โจทย์อัลกอริทึม"
              text="เขียนโค้ด รับค่าอินพุต และดูผลลัพธ์ในที่เดียว เหมาะกับการซ้อมโจทย์ก่อนส่งงานจริง"
            >
              <div className="mt-8 grid gap-1 rounded-2xl bg-[#1e1e1e] p-5 font-mono text-[14px] leading-7 text-[#d4d4d4]">
                <p>
                  <span className="text-[#9d9d9d]">อินพุต </span>3 5
                </p>
                <p>
                  <span className="text-[#9d9d9d]">เอาต์พุต </span>
                  <span className="text-[#4ec9b0]">8</span>
                </p>
              </div>
            </Bento>
            <Bento className="md:col-span-2" icon={BOLT_ICON} title="ทดสอบแบบเรียลไทม์" text="กดรันแล้วเห็นผลทันที ไม่ต้องรอ ไม่ต้องสลับโปรแกรม" />
            <Bento className="md:col-span-2" icon={CODE_ICON} title="คุ้นมือตั้งแต่แรกเห็น" text="หน้าตาแบบ Visual Studio Code ที่นักพัฒนาคุ้นเคย" />
            <Bento
              className="md:col-span-4"
              title="Workspace ส่วนตัว"
              text="ไฟล์ทั้งหมดถูกบันทึกอัตโนมัติ เปิดกลับมาทำต่อได้ทุกเมื่อ"
            >
              <ul className="mt-8 divide-y divide-se-border/60 overflow-hidden rounded-2xl bg-se-background text-[14px] ring-1 ring-se-border/60">
                {['index.html', 'style.css', 'main.js'].map((f) => (
                  <li key={f} className="flex items-center justify-between px-4 py-3">
                    <span className="font-mono">{f}</span>
                    <span className="flex items-center gap-1.5 text-[12px] text-se-text-muted">
                      <span className="h-1.5 w-1.5 rounded-full bg-se-success" aria-hidden="true"></span>
                      บันทึกแล้ว
                    </span>
                  </li>
                ))}
              </ul>
            </Bento>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-se-surface py-24 md:py-32">
        <div className="mx-auto max-w-5xl px-6">
          <SectionHead title="เริ่มได้ใน 3 ขั้นตอน" />
          <ol className="mt-16 grid gap-12 md:grid-cols-3">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="text-center">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-se-text-main text-[17px] font-semibold text-se-background">
                  {i + 1}
                </span>
                <h3 className="mt-6 text-2xl font-semibold tracking-tight">{title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-[17px] leading-relaxed text-se-text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </div>
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
          เปิด Workspace
          <br />
          แล้วเริ่มเขียนได้เลย
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-xl leading-relaxed text-se-text-muted">
          ไม่ต้องติดตั้งอะไร ใช้บัญชี SE-ONE ของคุณก็พร้อมแล้ว
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          <Link to={cta.to} className={`${pill} px-7 py-3 text-[17px]`}>
            {cta.label}
          </Link>
          <TextLink href="#languages">ดูภาษาที่รองรับ</TextLink>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-se-border/60">
        <div className="mx-auto max-w-5xl px-6 py-8 text-[12px] leading-relaxed text-se-text-muted">
          <p>
            CODING STUDIO ใช้งานได้สำหรับสมาชิก SE-ONE ที่เข้าสู่ระบบ
            ภาพโค้ดตัวอย่างในหน้านี้เป็นภาพจำลองเพื่อแสดงหน้าตาของ Workspace
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