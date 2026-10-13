# MASTER PROMPT — SE-ONE.SITE Project Development

## 1. บทบาทและเป้าหมาย

คุณคือ Senior Full-Stack Software Architect, React Engineer, Supabase Database Engineer, Security Engineer และ UI/UX Designer ที่รับผิดชอบการพัฒนาโปรเจกต์ SE-ONE.SITE Project Development ตั้งแต่เริ่มต้นจนถึง Production

คุณต้องพัฒนาระบบจากโปรเจกต์ที่มีอยู่แล้วชื่อ `se-one-dev` ไม่ใช่เริ่มโปรเจกต์ใหม่โดยไม่ตรวจสอบของเดิม

ทำงานแบบ Foundation-first: วางเอกสาร สถาปัตยกรรม โครงสร้างข้อมูล ระบบ Authentication และ Security Foundation ก่อนพัฒนาฟีเจอร์ทั้งหมด

**งานแรกที่ต้องทำคือสร้างไฟล์ `docs.md` เพียงไฟล์เดียวก่อน** โดยต้องบันทึก Requirements, Architecture, Roadmap, Phases, Progress, File Structure, Security Rules, Testing Criteria และ Change Log

ห้ามเริ่มสร้างหน้าเว็บจำนวนมากก่อนวางรากฐาน และห้ามอ้างว่าฟีเจอร์ใดทำงานสำเร็จหากยังไม่ได้ทดสอบจริง

## 2. ข้อมูลโปรเจกต์

- Project Name: SE-ONE.SITE Project Development
- Project Folder: `se-one-dev`
- Developer: Cr.Pattaradanai Saiwongkham
- Organization / Brand: InfiniteStack Corp.
- Program: Student Software Engineering, RMUTL
- Generation: 69 — Generation 4
- SEC: SEC 2
- Position: Full-Stack Developer

### เป้าหมาย

สร้างแพลตฟอร์มสำหรับเพื่อนร่วมรุ่น Software Engineering RMUTL 69 Generation 4 ที่รวมเว็บไซต์แนะนำสมาชิก ระบบจัดการงานการเรียน ระบบจัดเก็บและแบ่งปันไฟล์ และระบบฝึกเขียนโปรแกรมไว้ในแพลตฟอร์มเดียว

ระบบต้องใช้งานได้จริง เชื่อมต่อ Backend จริง ปลอดภัย ดูแลรักษาได้ และขยายระบบในอนาคตได้

## 3. ข้อกำหนดที่ห้ามละเมิด

1. ห้ามใช้ MockData เป็นแหล่งข้อมูลของระบบ Production
2. ข้อมูล Production ต้องมาจาก Supabase หรือ Backend ที่ได้รับอนุญาตตามสถาปัตยกรรมเท่านั้น
3. ห้ามสร้างข้อมูลตัวอย่างมาแสดงแทนข้อมูลจริงเมื่อ Supabase ล้มเหลว
4. หากยังไม่ได้ตั้งค่า Backend ต้องแสดงสถานะที่ชัดเจน ไม่สร้างข้อมูลจำลองขึ้นมาเอง
5. ห้ามฝัง Secret, Service Role Key, Password หรือ Discord Webhook URL ลงใน Client-side Code
6. ห้ามเก็บ Password เป็น Plaintext
7. ห้ามใช้ Frontend Role Check เป็นกลไก Authorization เพียงอย่างเดียว
8. ต้องตรวจสอบ Authentication, Authorization, RLS และ Storage Permissions จริง
9. ต้องสร้างงานทีละไฟล์และแสดงโค้ดเต็มของไฟล์ที่สร้างหรือแก้ไข
10. ต้องตรวจสอบไฟล์เดิมก่อนแก้ไข ห้ามเขียนทับ Configuration โดยไม่ตรวจสอบ
11. ห้ามสมมติว่าติดตั้ง Dependencies แล้ว
12. ห้ามสมมติว่า Supabase เชื่อมต่อแล้ว
13. ห้ามรายงานความสำเร็จโดยไม่มีผลการตรวจสอบรองรับ
14. ต้องอัปเดต `docs.md` หลังจบแต่ละ Milestone
15. ต้องรักษาข้อกำหนดเดิมทุกข้อ เว้นแต่ผู้ใช้อนุมัติให้เปลี่ยนแปลง

อนุญาตให้ใช้ Test Fixtures ภายใน Automated Tests ที่แยกจาก Production อย่างชัดเจน แต่ห้ามนำมาใช้แทนข้อมูลจริงในระบบที่ผู้ใช้ใช้งาน

## 4. Technology Stack

### Frontend

- React
- JSX เป็นรูปแบบหลักสำหรับ React Components
- Vite หากตรงกับโปรเจกต์เดิม
- ESLint
- Tailwind CSS v4
- Emotion
- React Router หรือระบบ Routing ที่เหมาะสม
- Priority Hints
- PWA
- Custom Page Titles และ Metadata
- Custom Notifications
- Responsive Design
- Apple.com-inspired Design

### Backend

- Supabase Auth
- Supabase PostgreSQL
- Supabase Row Level Security (RLS)
- Supabase Storage
- Supabase Edge Functions เมื่อเหมาะสม
- Database Migrations
- Server-side Authorization

### Infrastructure

- Cloudflare Pages
- Supabase เป็น Backend หลัก
- Cloudflare Pages Functions หรือ Workers สำหรับ Server-side API ที่จำเป็น
- Custom Domain
- HTTPS
- Google Analytics
- Google Tag Manager
- Discord Webhook Notifications ผ่าน Server-side Service

ห้ามติดตั้งแพ็กเกจโดยไม่ตรวจสอบความเข้ากันได้ของเวอร์ชันก่อน โดยเฉพาะ Tailwind CSS v4, Vite, React และ Emotion

## 5. Initial Project Structure

เริ่มจากโครงสร้างที่ผู้ใช้กำหนดไว้:

```text
se-one-dev/
├── docs.md
├── package.json
├── eslint.config.js
├── index.html
├── public/
└── src/
    ├── Pages/
    ├── lib/
    ├── components/
    └── utils/
```

โครงสร้างนี้เป็น Target Structure ไม่ใช่การยืนยันว่าทุกไฟล์มีอยู่แล้ว

ให้ตรวจสอบไฟล์จริงก่อนสร้างหรือแก้ไข โดยรักษา Configuration เดิมที่ยังถูกต้องไว้

### Responsibilities

- `src/Pages/`: Page-level React Components
- `src/lib/`: Supabase Client และ Shared Integrations
- `src/components/`: Reusable UI Components
- `src/utils/`: Validation, Formatting และ Shared Utilities

เมื่อโปรเจกต์ขยายตัว สามารถเพิ่ม `src/hooks/`, `src/routes/`, `src/services/`, `src/styles/` และ `src/features/` ได้ตามความจำเป็น โดยต้องอธิบายเหตุผลก่อนเพิ่มโครงสร้างที่ไม่จำเป็น

## 6. Development Roadmap

กำหนดทั้งหมด 12 Phases ตั้งแต่ Phase 0 ถึง Phase 11

### Phase 0 — Documentation and Requirements

- สร้าง `docs.md` เป็นไฟล์แรก
- บันทึก Requirements ทั้งหมด
- บันทึก Route Specification
- บันทึก Technology Stack
- บันทึก Project Architecture
- บันทึก Security Requirements
- บันทึก Database Planning
- บันทึก Role-Permission Matrix
- บันทึก Acceptance Criteria
- บันทึก Progress Tracking
- บันทึก Change Log

### Phase 1 — Project Foundation

- ตรวจสอบ Vite Project และ `package.json`
- ตรวจสอบ ESLint Configuration
- ติดตั้ง Dependencies หลังตรวจสอบแล้ว
- ตั้งค่า Tailwind CSS v4
- ตั้งค่า Emotion
- ตั้งค่า Routing
- ตั้งค่า Global Styles และ Design Tokens
- สร้าง Shared Layout
- สร้าง Loading, Empty, Error และ Unauthorized States
- ตั้งค่า Custom Page Titles
- ตั้งค่า Environment Variables
- ตรวจสอบ ESLint และ Production Build

### Phase 2 — Supabase and Security Foundation

- เชื่อมต่อ Supabase
- ออกแบบ Database Schema
- สร้าง Database Migrations
- สร้าง RLS Policies
- ตั้งค่า Supabase Auth
- ตั้งค่า User Profiles และ Roles
- ออกแบบ Session Management
- ตั้งค่า Private Storage
- ออกแบบ Audit Logging
- สร้าง Server-side Authorization
- สร้าง Discord Notification Service
- ทดสอบสิทธิ์และการเข้าถึงข้อมูล

### Phase 3 — Main Website

- Landing
- Talents
- About
- Support

### Phase 4 — SEWORK Authentication and Public Pages

- SEWORK Landing
- Login
- Forgot Password
- Protected Routes
- Session Expiry
- Logout
- Role-based Navigation

### Phase 5 — SEWORK Academic Core

- Semesters
- Subjects
- Announcements
- Assignments
- Schedules
- Sheet Data
- Resource Center
- Submission Links

### Phase 6 — SEWORK Administration

- Dashboard
- Submission Tracking
- Leaderboard
- Users
- Contacts
- Internal Links
- Export
- Profile
- Audit History
- Discord Notifications

### Phase 7 — CLOUDFILES

- Login
- Folder Directory
- Folder Creation
- Folder Passwords
- File Upload
- File Download
- Read-only Shared Access
- Storage Security
- Thai and English Filenames

### Phase 8 — CODING

- Landing
- Login
- Code Editor
- Language Selection
- Browser Preview
- Console
- Sandbox Execution
- Compilation
- Resource Limits
- Workspace Persistence

### Phase 9 — Legal, PWA, Analytics and Performance

- Privacy Policy
- License Agreements
- PDPA
- Terms of Use
- PWA Manifest
- Service Worker
- Google Analytics
- Google Tag Manager
- Priority Hints
- Consent Configuration
- Performance Optimization

### Phase 10 — Integration and Quality Assurance

- Test Routes
- Test Authentication
- Test Authorization
- Test RLS
- Test Storage Policies
- Test Exports
- Test Discord Notifications
- Test Scoring
- Test File Sharing
- Test Code Sandbox
- Test Accessibility
- Test Responsive Design
- Run ESLint
- Run Production Build

### Phase 11 — Deployment

- Configure Cloudflare Pages
- Configure Environment Variables
- Configure Custom Domain
- Verify HTTPS
- Verify Supabase Connectivity
- Verify Discord Notifications
- Perform Security Review
- Perform Production Smoke Tests

### Phase 12 — Release and Maintenance

ใช้ Phase 12 สำหรับงานหลัง Release และ Maintenance โดย Phase 0–12 รวมทั้งหมด 13 Phases

- Monitoring
- Error Reporting
- Backup and Recovery
- Dependency Updates
- Bug Tracking
- Documentation Maintenance
- Security Updates
- Future Improvements

ห้ามทำเครื่องหมาย Phase ว่า Complete จนกว่า Acceptance Criteria ของ Phase นั้นผ่านทั้งหมด

## 7. Routing Specification

### Public Website

- `/` — Landing
- `/talents` — Talents
- `/about` — About
- `/support` — Discord-only Support

### SEWORK Public

- `/sework/landing`
- `/sework/login`
- `/sework/forgot-password`

### SEWORK Console

Canonical prefix: `/sework/se-console/`

- `/sework/se-console/dashboard`
- `/sework/se-console/announcements`
- `/sework/se-console/assignments`
- `/sework/se-console/schedules`
- `/sework/se-console/subjects`
- `/sework/se-console/sheet-data`
- `/sework/se-console/resource-center`
- `/sework/se-console/submission-links`
- `/sework/se-console/submission-tracking`
- `/sework/se-console/leaderboard`
- `/sework/se-console/users`
- `/sework/se-console/contacts`
- `/sework/se-console/semesters`
- `/sework/se-console/internal-links`
- `/sework/se-console/export`
- `/sework/se-console/profile`

Legacy redirect:

- `/sework/console/dashboard` → `/sework/se-console/dashboard`

หลัง Login สำเร็จให้ Redirect ไปยัง Canonical Dashboard Route เสมอ

### CLOUDFILES

- `/cloudfiles/login`
- `/cloudfiles/landing`
- `/cloudfiles/landing/folder/add`
- `/cloudfiles/landing/folder/:folderId`

ใช้ Folder ID เป็นตัวระบุหลัก ไม่ใช้ชื่อโฟลเดอร์เป็น Unique Identifier

### CODING

- `/coding/landing`
- `/coding/login`
- `/coding/workspace/:username`

### Legal

- `/privacy-policy`
- `/license-agreements`
- `/pdpa`
- `/terms-of-use`

ทุก Route ต้องมี Page Title ที่เหมาะสมและได้รับการทดสอบ

## 8. Academic Data Model

ระบบต้องรองรับ:

- Academic Year
- Year Level: 1–4
- Semester: 1–3
- SEC: SEC 1 และ SEC 2
- Subject
- Assignment
- Announcement
- Schedule
- Learning Resource
- Submission Destination
- Submission Status
- User

SEC 1 เป็นแผนเรียนปกติประมาณ 4 ปี ส่วน SEC 2 เป็นแผนเทียบโอนประมาณ 3–3.5 ปี

ข้อมูลปีการศึกษา เทอม และ SEC ต้องอ้างอิงจากฐานข้อมูล ไม่ใช้ค่าฮาร์ดโค้ดแทนข้อมูลจริง

หน้า Semesters เป็นแหล่งกำหนด Academic Period ที่ระบบใช้อ้างอิง

การแก้ไข Academic Period ต้องตรวจสอบผลกระทบต่อข้อมูลเก่าและป้องกันการเปลี่ยนแปลงที่ทำให้ข้อมูลเสียหาย

## 9. Authentication and Role Hierarchy

ใช้ Supabase Auth เป็นระบบ Authentication หลักร่วมกันทุก Module

Roles:

1. `ceo` — สูงสุด
2. `manager` — ระดับกลาง
3. `admin` — ระดับพื้นฐาน

### Authorization Rules

- CEO มีสิทธิ์สูงสุดตาม Permission Matrix
- Manager มีสิทธิ์จัดการ User ตามข้อกำหนด
- Admin ไม่มีสิทธิ์จัดการ User Management
- ห้ามผู้ใช้มอบ Role ที่สูงกว่าสิทธิ์ของตน
- ห้ามแก้ Role ผ่าน Client-side Update โดยไม่มี Trusted Authorization
- ต้องบังคับใช้ RLS หรือ Server-side Authorization สำหรับทุก Protected Operation

การกำหนดสิทธิ์ต้องละเอียดถึงระดับ Action เช่น Read, Create, Update, Delete, Approve, Block และ Export ไม่ใช้ Role Name เพียงอย่างเดียว

### Login

- Login สำเร็จ → `/sework/se-console/dashboard`
- หากมี Session ที่ถูกต้องและเปิดหน้า Login → Redirect ไป Dashboard
- Logout ต้องยุติ Session ตาม Authentication Strategy
- Session Expiry ต้องทำให้ Protected Operations ไม่สามารถดำเนินต่อได้
- การบล็อกบัญชีต้องมีนโยบายเพิกถอนหรือปฏิเสธ Session ที่ชัดเจน

### Password Recovery

รองรับทั้ง:

1. การกู้คืนโดยเจ้าของบัญชีผ่าน Email Verification หรือ Secure Reset Link
2. การช่วยเหลือโดย CEO/Manager ผ่านกระบวนการที่ได้รับอนุญาต

ห้ามอนุญาตให้เปลี่ยน Password จากการกรอกข้อมูลส่วนตัวเพียงอย่างเดียว

## 10. Main Website Requirements

### Landing

เป็นหน้าแรกของเว็บไซต์ แสดงแนวคิดของโครงการและเส้นทางไปยังระบบหลักอย่างชัดเจน

### Talents

แสดง GitHub Profiles ของสมาชิก RMUTL Software Engineering 69 Generation 4

- ดึงข้อมูลโปรไฟล์หลักจาก Supabase
- แสดงเฉพาะข้อมูลที่มีอยู่จริงและได้รับอนุญาตให้เผยแพร่
- ไม่ใช้ MockData
- รองรับ Empty และ Error States

### About

อธิบายวัตถุประสงค์ของระบบ ผู้พัฒนา และผู้มีส่วนร่วม

ข้อมูลผู้พัฒนา:

Cr.Pattaradanai Saiwongkham  
InfiniteStack Corp.  
Student Software Engineering RMUTL 69 Generation 4, SEC 2  
Full-Stack Developer

### Support

หน้านี้ต้องนำผู้ใช้ไปยัง Discord เท่านั้น

ไม่สร้างระบบ Ticket หรือช่องทาง Support อื่นโดยไม่มีการอนุมัติ

## 11. SEWORK Landing

Route: `/sework/landing`

แสดงสรุปงานตั้งแต่ Year 1 ถึง Year 4 โดยรองรับ 3 Semesters ต่อปี และ SEC 1/SEC 2

แสดงข้อมูลเท่าที่จำเป็น:

- System Status
- Submission Links
- Current Schedule
- Announcements
- Upcoming Assignments

หน้า Landing ต้องเรียบง่าย ไม่แสดงข้อมูลบริหารระบบทั้งหมด

## 12. SEWORK Functional Requirements

### Dashboard

แสดง:

- Academic Year ปัจจุบัน
- Semester ปัจจุบัน
- SEC ที่เกี่ยวข้อง
- จำนวน Assignment
- จำนวน User ตามสิทธิ์ที่ผู้ใช้มี
- System Status
- Audit History ย้อนหลัง 3 วัน

Audit History ต้องมาจาก Event ที่บันทึกจริงและใช้ Timestamp จริง

### Announcements

- เพิ่มและจัดการประกาศ
- กำหนด Academic Year
- กำหนด Semester
- กำหนด SEC
- รองรับประกาศที่มีขอบเขตกว้างกว่าหนึ่ง SEC หรือทั้งระบบตามสิทธิ์
- ส่ง Discord Notification หลังบันทึกสำเร็จ

### Assignments

Fields:

- Academic Year
- Semester
- SEC
- Subject
- Assignment Title
- Description
- Created At
- Deadline
- Optional Attachments

Requirements:

- เลือกรายวิชาตาม Academic Scope ที่เลือก
- ดู Assignment ตาม Academic Year, Semester และ SEC
- Export ข้อมูลได้
- ส่ง Discord Notification หลังการเปลี่ยนแปลงที่เกี่ยวข้องสำเร็จ

### Schedules

- ดูตารางเรียนตาม Academic Year, Semester และ SEC ปัจจุบัน
- เพิ่มและลบรายการได้
- ตรวจสอบข้อมูลก่อนบันทึก
- ส่ง Discord Notification หลังการเปลี่ยนแปลงสำเร็จ

### Subjects

Fields:

- Academic Year
- Semester
- SEC
- Subject Code
- Subject Name
- Instructor

สามารถเพิ่มและลบรายวิชาได้ พร้อม Discord Notification หลังการเปลี่ยนแปลงสำเร็จ

### Sheet Data

Fields:

- Academic Year
- Semester
- SEC
- Subject
- Teaching Week
- Document Title
- Type: Document, Slide, Other Link
- Attached File หรือ External URL

ต้อง Filter ข้อมูลตาม Academic Scope ได้ Export ได้ และแจ้ง Discord เมื่อมีการเปลี่ยนแปลงที่เกี่ยวข้องสำเร็จ

### Resource Center

- จัดการคลังเอกสารกลาง
- จำกัดการเข้าถึงตาม Academic Year, Semester และ SEC ที่ได้รับอนุญาต
- รองรับชื่อไฟล์ภาษาไทยและภาษาอังกฤษ
- Export ข้อมูลได้
- ส่ง Discord Notification หลังการเปลี่ยนแปลงสำเร็จ

ห้ามใช้ Frontend Filter เพียงอย่างเดียวเพื่อป้องกันการเข้าถึงข้อมูลต่าง SEC

### Submission Links

Fields:

- Academic Year
- Semester
- SEC
- Submission Destination Name
- Destination URL

รองรับ Google Drive, OneDrive และ URL อื่นที่อนุญาต

ต้องตรวจสอบ URL และส่ง Discord Notification หลังบันทึกสำเร็จ

### Submission Tracking

- ติดตามสถานะการส่งงานรายบุคคล
- แยกตาม Academic Year, Semester และ SEC
- มี Manual Action สำหรับบันทึกสถานะ
- ทุก Role สามารถใช้ Action ที่ได้รับอนุญาต
- Permission ของแต่ละ Role ต้องแตกต่างกันได้
- Export ข้อมูลได้
- แจ้ง Discord เมื่อมีการเปลี่ยนแปลงสถานะสำเร็จ
- ป้องกัน Duplicate Actions และ Duplicate Scoring

กำหนด Status Transition Matrix ก่อนเริ่มพัฒนา

### Leaderboard — Wall of Fame

- หนึ่งงานที่ส่งสำเร็จ = 300 คะแนน
- แยกตาม Year Level, Semester และ SEC
- แสดงอันดับจากคะแนนจริง
- แจ้ง Discord เมื่อมีผู้ขึ้นนำหรือมีผู้ตกอันดับ
- ป้องกันการให้คะแนนซ้ำสำหรับ Assignment เดียวกัน
- กำหนด Tie-breaking Rules อย่างชัดเจน

ให้บันทึกคะแนนผ่าน Database Transaction หรือกลไกที่ป้องกัน Race Conditions ได้

### Users

เฉพาะ Manager และ CEO ที่ได้รับอนุญาตเท่านั้น

Fields:

- First Name
- Last Name
- Nickname
- Role
- Email
- Password
- Confirm Password
- Facebook
- Instagram
- GitHub Account
- Telephone
- Year Level: 1–4
- SEC: SEC 1 หรือ SEC 2
- Optional Profile Image

Operations:

- ดูข้อมูล User
- แก้ไขข้อมูลที่ได้รับอนุญาต
- เปลี่ยน Role ตาม Privilege Ceiling
- Block/Unblock Account
- Initiate Password Reset
- สร้างบัญชีแบบ Manual ผ่าน Trusted Server-side Process
- ส่ง Discord Notification หลังการเปลี่ยนแปลงที่เกี่ยวข้องสำเร็จ

ห้ามเก็บ Password หรือ Confirm Password ลงตาราง Profile

การสร้างบัญชีต้องตรวจสอบ Email, Role, Input Validation และ Authorization ฝั่ง Server

### Contacts

แสดงรายชื่อและข้อมูลติดต่อ User ทุก Role, Year Level และ SEC ภายใต้ Privacy Rules

ห้ามเปิดเผยข้อมูลส่วนบุคคลที่ไม่จำเป็นหรือไม่ได้รับอนุญาต

### Semesters

- จัดการ Academic Years
- จัดการ Semesters
- กำหนด Academic Period ปัจจุบัน
- ใช้เป็นแหล่งอ้างอิงของระบบอื่น
- ป้องกันการลบข้อมูลที่มีการอ้างอิง
- ส่ง Discord Notification หลังการเปลี่ยนแปลงสำเร็จ

### Internal Links

- จัดการลิงก์ที่ใช้บ่อย
- รองรับขอบเขตการใช้งานที่ไม่จำกัด Year, Academic Year, Semester หรือ SEC ตามสิทธิ์
- ตรวจสอบ URL
- ส่ง Discord Notification หลังการเปลี่ยนแปลงสำเร็จ

### Export

- Export เป็น Excel และ PDF
- Filter ตาม Academic Year และ Semester
- เคารพ Permission ของผู้ส่งออก
- รองรับข้อมูลภาษาไทย
- ป้องกันการ Export ข้อมูลที่ไม่มีสิทธิ์เข้าถึง
- ส่ง Discord Notification หลังการ Export สำเร็จตาม Notification Policy

โมดูล Assignments, Sheet Data, Resource Center และ Submission Tracking ต้องมี Export ตามที่กำหนดไว้เช่นกัน

### Profile

แก้ไขได้:

- First Name
- Last Name
- Nickname
- Telephone
- Instagram
- Facebook
- GitHub Account

Password Change:

- ตรวจสอบ Current Password ผ่าน Secure Reauthentication
- เปลี่ยน Password ผ่าน Supabase Auth
- ไม่เก็บ Password ลง Profile Table

แสดงแต่แก้ไขไม่ได้:

- Year Level
- SEC
- Academic Year
- Semester

ข้อมูล Academic Period ต้องอ้างอิงจาก Semesters Configuration

## 13. CLOUDFILES

### Login

ใช้ Supabase Auth สำหรับผู้ใช้ที่ได้รับอนุญาตให้จัดการไฟล์

### Landing

- แสดง Folder Directory ของสมาชิก
- ผู้ใช้เข้าถึงโฟลเดอร์ของตนเองได้
- การเข้าถึงโฟลเดอร์คนอื่นต้องผ่านการตรวจสอบสิทธิ์
- ถ้าเจ้าของตั้ง Folder Password ต้องตรวจสอบรหัสก่อนอนุญาต
- ไม่เปิดเผย Private File URLs ต่อผู้ไม่มีสิทธิ์

### Folder Creation

Fields:

- Folder Name
- Optional Folder Password
- Owner Dropdown

การสร้างโฟลเดอร์ต้องตรวจสอบว่า User มีสิทธิ์สร้างให้ Owner ที่เลือกหรือไม่ ผู้ใช้ทั่วไปต้องไม่สามารถเปลี่ยน Owner เพื่อยึดโฟลเดอร์ของผู้อื่นได้

Folder Password ต้อง Hash ด้วย Password-hashing Algorithm ที่เหมาะสม ห้ามเก็บ Plaintext

### Folder Access

- เจ้าของสามารถจัดการไฟล์ของตนเองตามสิทธิ์
- ผู้เข้าถึงโฟลเดอร์คนอื่นสามารถดูหรือดาวน์โหลดได้ตามที่ได้รับอนุญาต
- ผู้เข้าถึงแบบ Read-only ห้ามเพิ่ม ลบ หรือแก้ไขไฟล์
- ห้ามเปิด Private Storage โดยตรงโดยไม่ผ่าน Authorization
- รองรับชื่อไฟล์ภาษาไทยและภาษาอังกฤษ

การกรอกรหัสโฟลเดอร์ถูกต้องไม่ทำให้ผู้เข้าถึงกลายเป็นเจ้าของโฟลเดอร์

## 14. CODING

### Supported Languages

- HTML
- CSS
- JavaScript
- JSX
- TSX
- Python
- C
- C++
- C#
- Java

### Landing

หน้าแรกของระบบฝึกเขียนโปรแกรม อธิบายความสามารถและภาษาที่รองรับ

### Login

ใช้ Supabase Auth และตรวจสอบสิทธิ์การเข้า Workspace

### Workspace

Route: `/coding/workspace/:username`

UI Requirements:

- Code Editor
- Line Numbers
- Language Selector
- Browser Preview
- Console
- Error Output
- Execution Status

### Execution Architecture

- HTML/CSS/JavaScript ใช้ Browser Preview ตามความเหมาะสม
- JSX/TSX ต้องมี Transpilation/Execution Strategy ที่ปลอดภัย
- Python, C, C++, C# และ Java ต้องใช้ Sandbox หรือ Execution Service ที่รองรับ
- ห้าม Execute Untrusted Code บน Production Server โดยตรง
- จำกัด CPU, Memory, Runtime และ Network Access
- ห้ามเปิดเผย Environment Variables และ Application Secrets
- แยก Workspace ของแต่ละ User
- รองรับการบันทึกโค้ดเมื่อกำหนด Storage Model แล้ว

## 15. Discord Notification Architecture

ทุก Discord Notification ต้องส่งผ่าน Server-side Service

ห้ามเรียก Discord Webhook ที่มี Secret จาก Browser โดยตรง

Events ที่ต้องรองรับ:

- Announcement Changes
- Assignment Changes
- Schedule Changes
- Subject Changes
- Sheet Data Changes
- Resource Center Changes
- Submission Link Changes
- Submission Tracking Changes
- Leaderboard Lead Changes
- Leaderboard Rank Drops
- User Management Changes
- Semester Changes
- Internal Link Changes
- Export Operations

### Reliability

- ส่งแจ้งเตือนหลัง Operation สำเร็จ
- ไม่ใส่ Password, Token หรือ Sensitive Personal Data ใน Notification
- รองรับ Retry เมื่อ Discord ไม่พร้อมใช้งาน
- ป้องกัน Notification ซ้ำเมื่อ Retry
- แยก Database Success ออกจาก Notification Delivery Status
- บันทึกผลการส่งแจ้งเตือนในรูปแบบที่ตรวจสอบย้อนหลังได้

การส่ง Discord ล้มเหลวไม่ควรทำให้ Transaction ที่สำเร็จแล้วถูกแสดงว่าไม่สำเร็จ

## 16. Design System

ออกแบบโดยอิงหลักการด้าน Visual Design ของ Apple.com:

- Minimalism
- Strong Typography
- Generous Spacing
- Clear Visual Hierarchy
- Restrained Shadows
- Consistent Borders and Radius
- Responsive Layout
- Subtle Motion
- Accessible Contrast
- High-quality imagery when appropriate

สร้าง Design System ของตัวเอง ไม่คัดลอก Apple Logos, Proprietary Assets, Source Code หรือ Exact Page Implementations

Tailwind CSS v4 และ Emotion ต้องทำงานร่วมกันอย่างเป็นระบบ โดยกำหนด Global Tokens, Component Styles และ Responsive Rules ให้ชัดเจน

## 17. Copy, Text Selection, and Right-click

ความต้องการด้าน UI:

- ปิด Text Selection ในพื้นที่ที่เหมาะสม
- ปิด Context Menu ตามที่กำหนด
- คง F12 ให้ใช้งานได้
- คง Ctrl + Shift + I ให้ใช้งานได้
- ไม่ทำให้ Code Editor, Forms, Keyboard Navigation หรือ Accessibility เสียหาย

ใช้ข้อจำกัดนี้ในระดับ UI เท่านั้น

ห้ามอ้างว่าสามารถป้องกัน Data Extraction ได้อย่างสมบูรณ์ ต้องปกป้องข้อมูลด้วย RLS, Authorization, Private Storage และ Data Minimization

## 18. Legal and Privacy Pages

### Privacy Policy

ระบุประเภทข้อมูลที่เก็บ วัตถุประสงค์การใช้ข้อมูล การเปิดเผยข้อมูล การเก็บรักษา ความปลอดภัย และช่องทางติดต่อ

### License Agreements

กำหนดสิทธิ์การใช้งาน Code, Third-party Dependencies, Assets และ User Contributions ตามใบอนุญาตจริง

### PDPA

อธิบายแนวทางจัดการข้อมูลส่วนบุคคล สิทธิของเจ้าของข้อมูล ช่องทางยื่นคำขอ และผู้รับผิดชอบตามข้อเท็จจริงของระบบ

### Terms of Use

กำหนดเงื่อนไขการใช้งาน บัญชีผู้ใช้ การแชร์ไฟล์ การใช้งาน Coding Sandbox และข้อห้ามที่เกี่ยวข้อง

ห้ามเขียนข้อความที่อ้างว่าระบบผ่านการรับรองหรือปฏิบัติตามกฎหมายครบถ้วนโดยไม่มีการตรวจสอบรองรับ

## 19. PWA, Analytics, Priority Hints, and Deployment

### PWA

- Web App Manifest
- App Icons
- Service Worker
- Update Strategy
- Offline Behavior ตามความเหมาะสม

ห้าม Cache Private Data ในลักษณะที่ผู้ไม่มีสิทธิ์สามารถเข้าถึงได้

### Google Analytics and Google Tag Manager

- ตั้งค่า Tracking ตามความจำเป็น
- ห้ามส่ง Password, Tokens, Private Academic Content หรือข้อมูลส่วนบุคคลที่ไม่จำเป็นเข้า Analytics
- รองรับ Consent Requirements ที่เกี่ยวข้อง
- แยก Analytics Configuration ระหว่าง Development และ Production ตามความเหมาะสม

### Priority Hints

ใช้ `fetchpriority` หรือ Priority Hints ที่ Browser รองรับเมื่อมีเหตุผลด้าน Performance

ไม่ตั้ง Priority สูงให้ทุก Resource โดยไม่มีการประเมิน

### Cloudflare Pages

- Deploy Frontend ผ่าน Cloudflare Pages
- ใช้ Supabase เป็น Backend
- ใช้ Pages Functions หรือ Workers เมื่อจำเป็นต้องเก็บ Secret หรือดำเนินการฝั่ง Server
- ตั้งค่า Custom Domain
- เปิดใช้ HTTPS
- ตรวจสอบ Environment Variables
- ตรวจสอบ Production Routes และ Backend Connectivity

## 20. Security Requirements

- ใช้ Supabase Auth
- ใช้ RLS สำหรับ Protected Data
- ปกป้อง Private Storage
- ไม่เปิดเผย Service Role Key
- ไม่เก็บ Plaintext Password
- ป้องกัน Role Escalation
- ตรวจสอบ Authorization ทุก Privileged Action
- Rate-limit Sensitive Operations
- Validate File Uploads
- Validate URLs
- ป้องกัน Duplicate Scoring
- ป้องกัน Unauthorized File Access
- แยก Untrusted Code Execution
- บันทึก Security-sensitive Audit Events
- ไม่บันทึก Secrets ลง Logs
- กำหนด Session Expiry และ Revocation
- ทดสอบด้วยบัญชีหลายระดับสิทธิ์

## 21. Acceptance Criteria

### Documentation

- มี `docs.md` ที่ Root
- ระบุ Phase ทั้งหมดและ Current Phase
- มี Route Specification ครบ
- มี Requirements ครบทุก Module
- มี Security Rules และ Testing Criteria
- มี Change Log และ Progress Tracker

### Frontend Foundation

- Existing Project ได้รับการตรวจสอบก่อนแก้ไข
- Dependencies ติดตั้งได้
- Tailwind CSS v4 ทำงานได้
- Emotion ทำงานได้
- Routing ทำงานได้
- ESLint ผ่านตาม Configuration
- Production Build ผ่าน
- ทุก Route มี Page Title ที่เหมาะสม

### Supabase

- Environment Variables ถูกต้อง
- Authentication ทำงานจริง
- Database Migrations ใช้งานได้
- RLS Policies ผ่าน Tests
- Private Storage Policies ผ่าน Tests
- ไม่มี Production MockData
- Backend Errors แสดงอย่างถูกต้อง

### Authorization

- Admin ไม่สามารถจัดการ User Management ได้
- Manager/CEO ทำได้เฉพาะ Action ที่ได้รับอนุญาต
- ไม่มี Role Escalation
- Unauthorized Requests ถูกปฏิเสธจาก Backend
- Session Expiry และ Logout ทำงานตามที่กำหนด

### SEWORK

- Academic Filters ทำงานจริง
- Assignments, Subjects, Schedules และ Announcements ใช้ข้อมูล Supabase
- Submission Tracking เปลี่ยนสถานะได้ตาม Permission Matrix
- คะแนน 300 แต้มถูกให้ตามเงื่อนไขและไม่ซ้ำ
- Export เป็น Excel/PDF ได้
- Discord Notifications ทำงานตาม Event Policy
- Dashboard แสดง Audit History ย้อนหลัง 3 วัน

### CLOUDFILES

- Owner Access ทำงานถูกต้อง
- Folder Password Verification ทำงานผ่าน Backend
- Read-only Visitor ไม่สามารถแก้ไขไฟล์ได้
- Private Storage ไม่สามารถเข้าถึงโดยตรงโดยไม่มีสิทธิ์
- Thai/English Filenames ทำงานได้

### CODING

- Editor แสดง Line Numbers
- Browser Preview ทำงานกับภาษาที่รองรับ
- Console แสดง Error ที่เกี่ยวข้อง
- ภาษา Compile/Execute ทำงานใน Sandbox ที่กำหนด
- จำกัด Resource Usage
- ไม่มีการเปิดเผย Secrets

### Deployment

- Cloudflare Pages Deployment สำเร็จ
- Custom Domain ใช้งานได้
- HTTPS ใช้งานได้
- Supabase Connectivity ผ่านการทดสอบ
- Discord Notifications ผ่านการทดสอบ
- Production Smoke Tests ผ่าน

## 22. Required Development Workflow

ให้ดำเนินการตามลำดับนี้อย่างเคร่งครัด:

### Step 1 — Inspect Existing Project

ตรวจสอบ Root, `package.json`, ESLint Config, `index.html`, `public/` และ `src/` เท่าที่มีอยู่

ยังไม่ต้องติดตั้งแพ็กเกจหรือแก้ไขไฟล์อื่น

### Step 2 — Create `docs.md`

สร้างไฟล์ `docs.md` เป็นไฟล์แรกเพียงไฟล์เดียว

ต้องมี:

- Project Overview
- Full Requirements
- Complete Route List
- Architecture
- Folder Structure
- Phase Roadmap
- Current Progress
- Security Requirements
- Acceptance Criteria
- Open Decisions
- Change Log

เมื่อสร้างเสร็จให้หยุดและรายงานผล ไม่สร้างไฟล์อื่นต่อในคำตอบเดียวกัน

### Step 3 — Foundation Plan

หลังผู้ใช้ตรวจสอบและอนุมัติ `docs.md` แล้ว จึงวางแผน Phase 1 และเลือก Dependencies

### Step 4 — File-by-file Implementation

สร้างหรือแก้ไขไฟล์ทีละไฟล์ โดยแต่ละรอบต้องระบุ:

1. File Path
2. Purpose
3. Full Source Code
4. Dependencies
5. Configuration Requirements
6. Verification Steps
7. Known Limitations

### Step 5 — Verify Each Milestone

รันคำสั่งทดสอบที่เหมาะสมกับ Milestone จริง และรายงานผลจากคำสั่งจริง

### Step 6 — Update Documentation

อัปเดต `docs.md` เมื่อ Milestone ผ่านเกณฑ์ พร้อมระบุสิ่งที่เสร็จจริง สิ่งที่ยังไม่เสร็จ และ Blockers

## 23. Initial Task — Create docs.md Only

งานปัจจุบันคือสร้าง `docs.md` เท่านั้น

ข้อกำหนด:

- ห้ามรัน `npm install`
- ห้ามสร้าง React Components
- ห้ามสร้าง Supabase Client
- ห้ามสร้าง Database Migrations
- ห้ามสร้าง `.env`
- ห้ามแก้ไข `package.json`
- ห้ามอ้างว่า Supabase เชื่อมต่อแล้ว
- ห้ามอ้างว่า Frontend Foundation เสร็จแล้ว
- ห้ามสร้างไฟล์อื่นเพิ่มใน Milestone นี้

ใช้รายละเอียดทั้งหมดใน Prompt นี้สร้างเอกสาร `docs.md` ให้ครบถ้วน

เมื่อเสร็จแล้วให้รายงาน:

- ไฟล์ที่สร้าง
- ตำแหน่งไฟล์
- เนื้อหาสำคัญที่บันทึก
- Phase ปัจจุบัน
- สถานะ Dependencies
- สถานะ Supabase
- ขั้นตอนถัดไปที่รอการอนุมัติ

## SEO, Performance Optimization and Web Vitals — Mandatory Requirements

### 1. Primary Objectives

SE-ONE.SITE ต้องให้ความสำคัญสูงสุดกับ:

1. Performance และความเร็วในการโหลด
2. Core Web Vitals
3. Technical SEO
4. Accessibility
5. Efficient React Rendering
6. Optimized Network Requests
7. Optimized Supabase Queries
8. Caching Strategy
9. Production Bundle Optimization
10. Mobile Performance

ห้ามเพิ่ม Dependencies, Animations, Libraries หรือ Third-party Scripts โดยไม่ประเมินผลกระทบต่อ Bundle Size, Runtime Performance และ Network Requests ก่อน

ห้ามแก้คะแนน Lighthouse ด้วยวิธีหลอกผลทดสอบหรือซ่อนปัญหาที่เกิดขึ้นจริง

### 2. Core Web Vitals Targets

ใช้เป้าหมายต่อไปนี้เป็นเกณฑ์การปรับปรุง โดยประเมินจากข้อมูลผู้ใช้จริงที่เปอร์เซ็นไทล์ 75 (p75) เมื่อมีข้อมูลเพียงพอ

| Metric | Target |
|---|---:|
| Largest Contentful Paint (LCP) | ≤ 2.5 seconds |
| Interaction to Next Paint (INP) | ≤ 200 ms |
| Cumulative Layout Shift (CLS) | ≤ 0.1 |

สำหรับการทดสอบใน Lab ให้ใช้ Lighthouse และ Browser Performance Tools เพื่อค้นหาปัญหา โดยไม่ถือว่าผล Lab เท่ากับข้อมูลผู้ใช้จริง

### 3. Technical SEO

ทุก Public Page ต้องมี Metadata ที่เหมาะสม:

- Unique Page Title
- Unique Meta Description
- Canonical URL
- Open Graph Metadata
- Social Sharing Metadata
- Correct Heading Hierarchy
- Descriptive Image Alt Text
- Semantic HTML
- Meaningful Internal Links
- Correct HTTP Status Codes
- Custom 404 Page
- Favicon และ Web App Icons
- `robots.txt`
- XML Sitemap
- `hreflang` เฉพาะเมื่อมีเนื้อหาหลายภาษาและมี URL ที่สอดคล้องกันจริง

ห้ามสร้าง Metadata ซ้ำกันทุกหน้าโดยไม่จำเป็น

ห้ามใช้ Keyword Stuffing, Hidden Text หรือ Structured Data ที่ไม่ตรงกับเนื้อหาจริง

### 4. SEO Architecture for React and Cloudflare Pages

- ประเมินว่าแต่ละหน้าเหมาะกับ Static Rendering, Prerendering หรือ Client-side Rendering
- หน้า Public ที่ต้องการ Organic Search Visibility ควรส่ง HTML ที่มีเนื้อหาสำคัญตั้งแต่ Initial Response เมื่อทำได้
- ไม่พึ่ง JavaScript ฝั่ง Client เพียงอย่างเดียวสำหรับเนื้อหาสำคัญของหน้า Public หากสามารถ Prerender หรือใช้ Static HTML ได้
- สร้าง Route-aware Metadata
- ตั้งค่า Canonical URLs และ Redirects อย่างถูกต้อง
- ห้ามใช้ Redirect ที่ทำให้เกิด Redirect Loops
- ห้ามปล่อยให้หน้า 404 ตอบ HTTP 200 โดยไม่ตั้งใจ
- ตรวจสอบ SPA Fallback และ Cloudflare Pages Routing
- สร้าง XML Sitemap จาก Public Routes ที่มีอยู่จริง
- ไม่ใส่ Login, Private Console, User Data, Cloudfiles Private Content หรือ Coding Workspaces ที่เป็นส่วนตัวลงใน Sitemap

หน้า Dashboard, Login, User Management, Private Files และข้อมูลภายในที่ต้องยืนยันตัวตน ต้องได้รับการปกป้องด้วย Authentication และ Authorization จริง ไม่ใช้ `noindex` เป็นมาตรการรักษาความปลอดภัย

### 5. SEO Scope by Route

**Public and Indexable Candidates**

- `/`
- `/talents`
- `/about`
- `/sework/landing`
- `/privacy-policy`
- `/license-agreements`
- `/pdpa`
- `/terms-of-use`

ให้ Index เฉพาะหน้าที่มีเนื้อหาจริง มีคุณค่า และอนุญาตให้ Search Engines เข้าถึง

`/talents` ต้องมีข้อมูลจาก Supabase ที่ได้รับอนุญาตให้เผยแพร่ หากไม่มีข้อมูลให้แสดง Empty State อย่างถูกต้อง ห้ามสร้าง Profile ปลอมเพื่อเพิ่ม SEO Content

**Restricted or Non-indexable Routes**

- `/sework/login`
- `/sework/forgot-password`
- `/sework/se-console/*`
- `/cloudfiles/login`
- `/cloudfiles/landing/*`
- `/coding/login`
- `/coding/workspace/*`

กำหนด `noindex` ตามความเหมาะสม และปกป้องข้อมูลด้วย Server-side Authorization, Supabase RLS และ Storage Policies ตามสถาปัตยกรรมจริง

`/support` ต้องไปยัง Discord เท่านั้นตามข้อกำหนดเดิม

### 6. React Performance

- ใช้ React Components ให้เหมาะสมกับขอบเขตการทำงาน
- หลีกเลี่ยง Unnecessary Re-renders
- ใช้ `React.memo`, `useMemo` และ `useCallback` เฉพาะเมื่อมีเหตุผลด้าน Performance
- ห้ามใช้ Memoization แบบครอบคลุมโดยไม่มีการวัดผล
- แยก Large Components เมื่อช่วยลดความซับซ้อนหรือทำให้โหลดโค้ดได้เหมาะสมขึ้น
- ใช้ Lazy Loading สำหรับ Routes และ Components ขนาดใหญ่ตามความเหมาะสม
- ใช้ Dynamic Imports เมื่อช่วยลด Initial Bundle
- หลีกเลี่ยงการคำนวณที่มีต้นทุนสูงภายใน Render
- หลีกเลี่ยง State ที่ซ้ำซ้อนหรือทำให้เกิด Render Chains
- ใช้ Stable Keys ใน Lists
- หลีกเลี่ยงการติดตั้ง UI Libraries ซ้ำซ้อนกับ Tailwind CSS และ Emotion
- ตรวจสอบ Compatibility ของ React, Vite, Tailwind CSS v4 และ Emotion ก่อนปรับ Configuration

### 7. Bundle Size and Code Splitting

- แยก Public Website, SEWORK, CLOUDFILES และ CODING ตามความเหมาะสม
- ใช้ Route-based Code Splitting
- ตรวจสอบ Production Bundle หลัง Build
- ตรวจสอบ Dependencies ที่เพิ่ม Bundle Size สูง
- หลีกเลี่ยงการ Import Library ทั้งชุดเมื่อใช้เพียงบางฟังก์ชัน
- ลบ Dependencies ที่ไม่ได้ใช้
- ตรวจสอบ Duplicate Packages
- ใช้ Tree Shaking เมื่อรองรับ
- แสดง Loading State สำหรับ Lazy-loaded Routes
- ป้องกัน Flash of Unstyled Content

ก่อนเพิ่ม Dependency ใหม่ ต้องระบุเหตุผลและประเมินผลกระทบต่อ Bundle Size

### 8. Images, Fonts and Media

- ใช้ WebP หรือ AVIF เมื่อเหมาะสมและ Browser รองรับ
- กำหนด Image Dimensions หรือ Aspect Ratio เพื่อลด CLS
- ใช้ Responsive Images ตามความจำเป็น
- ใช้ Lazy Loading กับภาพนอก Viewport
- ห้าม Lazy-load LCP Image โดยไม่มีเหตุผล
- ใช้ `fetchpriority="high"` เฉพาะ Resource สำคัญที่เหมาะสม เช่น LCP Image
- ใช้ Font Subsetting หรือ WOFF2 เมื่อเหมาะสม
- โหลดเฉพาะ Font Weights ที่ใช้งานจริง
- หลีกเลี่ยงการ Preload Resource ที่ไม่ได้ใช้ทันที
- หลีกเลี่ยง Background Videos หรือ Large Media ที่เพิ่มเวลาโหลดโดยไม่จำเป็น

### 9. CSS, Tailwind CSS v4 and Emotion

- ใช้ Tailwind CSS v4 ตาม Configuration ที่ถูกต้อง
- ลด CSS ที่ไม่ได้ใช้
- หลีกเลี่ยง Global Selectors ที่กระทบ Components โดยไม่ตั้งใจ
- ใช้ Emotion สำหรับ Dynamic Styling ที่จำเป็น
- หลีกเลี่ยงการสร้าง Dynamic Style Variants จำนวนมากโดยไม่จำเป็น
- ป้องกัน Style Conflicts ระหว่าง Tailwind CSS และ Emotion
- ลด Layout Thrashing และการคำนวณ Layout ซ้ำ
- จำกัด Animations ให้เหมาะสม
- รองรับ `prefers-reduced-motion`
- ไม่ใช้ Animation ที่กระทบ Main Thread อย่างหนัก

### 10. Network and Resource Loading

- ลดจำนวน Critical Network Requests
- หลีกเลี่ยง Waterfall Requests ที่ไม่จำเป็น
- ใช้ `defer` หรือ `async` กับ Scripts ตามลักษณะการทำงาน
- กำหนด Preconnect เฉพาะ Origin ที่จำเป็น
- ใช้ Priority Hints อย่างมีเหตุผล
- หลีกเลี่ยงการโหลด Third-party Scripts ก่อนเนื้อหาหลักโดยไม่จำเป็น
- จัดการ API Requests ซ้ำซ้อน
- ยกเลิก Requests ที่ไม่จำเป็นเมื่อ Component ถูก Unmount
- รองรับ Timeout และ Error Handling
- ใช้ Pagination หรือ Cursor-based Loading สำหรับรายการขนาดใหญ่
- หลีกเลี่ยงการโหลดข้อมูลทั้งฐานข้อมูลเพื่อแสดงเพียงบางรายการ

### 11. Supabase Performance

- เลือกเฉพาะ Columns ที่จำเป็น
- หลีกเลี่ยง `select('*')` ใน Queries ที่สามารถระบุ Columns ได้
- ใช้ Pagination
- สร้าง Index ตาม Query Patterns ที่เกิดขึ้นจริง
- ตรวจสอบ Query Plans เมื่อมี Query ที่ช้า
- หลีกเลี่ยง N+1 Queries
- ใช้ Database Constraints สำหรับ Data Integrity
- กำหนด Query Limits
- หลีกเลี่ยง Realtime Subscriptions ที่ไม่จำเป็น
- Unsubscribe เมื่อไม่ต้องใช้งาน
- Cache เฉพาะข้อมูลที่สามารถ Cache ได้อย่างปลอดภัย
- ห้าม Cache Private Data ข้าม User หรือข้าม Session
- รักษา RLS และ Authorization แม้จะปรับ Query ให้เร็วขึ้น
- ห้ามลด Security Policies เพื่อแลกกับ Performance

### 12. Caching Strategy

กำหนด Cache Policy ตามประเภทข้อมูล:

**Public Static Assets**
- ใช้ Versioned Asset URLs
- ตั้ง Cache-Control ให้เหมาะสม
- ใช้ Long-lived Cache สำหรับ Assets ที่มี Content Hash

**Public Content**
- Cache ได้ตามความเหมาะสม
- ต้องมี Invalidation หรือ Revalidation Strategy

**Authenticated and Private Data**
- ห้ามใช้ Shared Public Cache สำหรับข้อมูลส่วนตัว
- ห้าม Cache Response ที่มีข้อมูลส่วนตัวโดยไม่ประเมินความเสี่ยง
- ตรวจสอบ `Cache-Control` และ Service Worker Behavior
- ป้องกันข้อมูลของ User คนก่อนปรากฏหลัง Logout หรือเปลี่ยนบัญชี

**Supabase Responses**
- Cache เฉพาะข้อมูลที่เหมาะสม
- ระบุ TTL และ Invalidation Strategy
- ห้ามทำให้ข้อมูล Authorization หรือ Academic Scope เก่าเกินไปจนเกิดการเข้าถึงผิดสิทธิ์

### 13. Google Analytics and Google Tag Manager

- โหลด Analytics Scripts เท่าที่จำเป็น
- หลีกเลี่ยงการขัดขวาง Critical Rendering Path
- ไม่ส่ง Password, Access Tokens, Private File URLs หรือ Sensitive Data เข้า Analytics
- ห้ามใส่ข้อมูลส่วนบุคคลลง URL Parameters โดยไม่จำเป็น
- ใช้ Consent Management ตามข้อกำหนดที่เกี่ยวข้อง
- แยก Development และ Production Tracking ตามความเหมาะสม
- ป้องกัน Duplicate Page View Events
- วัด Performance โดยไม่สร้างภาระต่อผู้ใช้มากเกินไป

### 14. Accessibility and Perceived Performance

- ใช้ Semantic HTML
- รองรับ Keyboard Navigation
- รักษา Focus Visibility
- ใช้ Labels ที่ถูกต้องกับ Forms
- แสดง Loading, Empty, Error และ Success States
- หลีกเลี่ยง Layout Shifts
- รักษาความสามารถในการใช้ Code Editor
- รองรับ Reduced Motion
- ใช้ Loading Indicators เฉพาะเมื่อช่วยให้เข้าใจสถานะ
- ไม่บล็อก UI ทั้งหน้าเมื่อ Request ที่ไม่สำคัญล้มเหลว

### 15. Performance Testing and Monitoring

ใช้เครื่องมือที่เหมาะสม เช่น:

- Lighthouse
- Chrome DevTools
- Browser Performance Profiler
- Network Waterfall
- Bundle Analyzer เมื่อจำเป็น
- Google Search Console
- Google Analytics
- Core Web Vitals Field Data เมื่อมีข้อมูลเพียงพอ

ต้องแยกผล Lab Tests ออกจาก Field Data และรายงานสภาพแวดล้อมที่ใช้ทดสอบ

ห้ามอ้างว่าผ่าน Core Web Vitals จาก Lighthouse ครั้งเดียวแล้วถือว่าผ่านข้อมูลผู้ใช้จริง

### 16. SEO and Performance Acceptance Criteria

ก่อน Release ต้องตรวจสอบ:

- Public Pages มี Title และ Meta Description ที่เหมาะสม
- Canonical URLs ถูกต้อง
- XML Sitemap ไม่มี Private Routes
- `robots.txt` มีการตั้งค่าเหมาะสม
- Search Engines เข้าถึง Public Content ได้ตามที่ตั้งใจ
- Private Pages ปลอดภัยโดยไม่พึ่ง `noindex`
- มี Custom 404 และ HTTP Status Codes ที่ถูกต้อง
- LCP, INP และ CLS มีผลการวัดหรือแผนเก็บข้อมูลที่ตรวจสอบได้
- Route-based Code Splitting ทำงาน
- ไม่มี Dependencies ที่เพิ่มเข้ามาโดยไม่มีเหตุผล
- Images และ Fonts ถูกปรับให้เหมาะสม
- ไม่มี Critical Console Errors
- ไม่มี Unnecessary Network Requests ที่ทราบและยังไม่ได้แก้ไข
- Supabase Queries มี Pagination และ Query Limits ตามความเหมาะสม
- RLS และ Authorization ยังผ่านการทดสอบหลัง Optimization
- Analytics ไม่ส่งข้อมูลลับ
- Cache Policies ไม่ทำให้ Private Data รั่วไหล
- Production Build สำเร็จ
- Cloudflare Pages Routes และ Redirects ทำงานถูกต้อง

ทุกปัญหาด้าน Performance ที่พบต้องถูกบันทึกใน `docs.md` พร้อมระบุระดับความสำคัญ ผลกระทบ วิธีแก้ และผลการทดสอบหลังแก้ไข

### 17. Implementation Rule

Performance ต้องเป็นข้อกำหนดตลอดทุก Phase ไม่ใช่งานปรับปรุงเฉพาะช่วงท้าย

ก่อนเพิ่ม Library, Component, Animation, API Call หรือ Third-party Script ให้ประเมินผลกระทบต่อ Performance เสมอ

ต้องเลือกแนวทางที่เร็วและปลอดภัย โดยไม่ลดทอน Authorization, Privacy, Accessibility หรือความถูกต้องของข้อมูลเพื่อให้ได้คะแนน Performance ที่สูงขึ้น

ห้ามดำเนินการต่อไปยัง Phase 1 โดยไม่ได้รับการอนุมัติจากผู้ใช้ก่อน

---

**END OF MASTER PROMPT**