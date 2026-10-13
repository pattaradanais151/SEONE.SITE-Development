import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'

/*
  CloudFiles Dashboard — Apple.com style
  - สีทั้งหมดอ้างอิงจาก design tokens (--color-se-*) รองรับ Light/Dark Mode เมื่อ override ตัวแปร
  - แทน alert()/confirm() ด้วย Notification (toast) และ Dialog ที่ออกแบบเอง
*/

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

const ICONS = {
  cloud: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
  folderFill:
    'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z',
  doc: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  upload: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
  newFolder:
    'M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  trash:
    'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  back: 'M15 19l-7-7 7-7',
}

const ring = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-se-primary/30'

const btnPrimary = `inline-flex h-10 items-center justify-center gap-2 rounded-full bg-se-primary px-5 text-sm font-medium text-white transition-colors hover:bg-se-primary-hover disabled:cursor-not-allowed disabled:opacity-50 ${ring}`
const btnSecondary = `inline-flex h-10 items-center justify-center gap-2 rounded-full bg-se-surface px-5 text-sm font-medium text-se-text-main ring-1 ring-se-border transition-colors hover:bg-se-border/30 disabled:cursor-not-allowed disabled:opacity-50 ${ring}`
const btnDanger = `inline-flex h-10 items-center justify-center gap-2 rounded-full bg-se-danger px-5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${ring}`

function Icon({ d, className = 'h-5 w-5', strokeWidth = 1.75 }) {
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

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Notification — banner ลอยด้านบนแบบ iOS (ปิดเองอัตโนมัติ)             */
/* ------------------------------------------------------------------ */
const NOTICE_STYLES = {
  error: {
    title: 'เกิดข้อผิดพลาด',
    tone: 'bg-se-danger/10 text-se-danger',
    icon: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM12 8v5M12 16h.01',
  },
  success: {
    title: 'สำเร็จ',
    tone: 'bg-se-success/15 text-se-success',
    icon: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM8 12.5l2.5 2.5L16 9.5',
  },
}

function Notification({ type = 'error', message, duration = 5000, onClose }) {
  const [visible, setVisible] = useState(false)
  const closeRef = useRef(onClose)
  const exitTimer = useRef()
  const style = NOTICE_STYLES[type]

  useEffect(() => {
    closeRef.current = onClose
  })

  const dismiss = useCallback(() => {
    setVisible(false)
    exitTimer.current = setTimeout(() => closeRef.current?.(), 300)
  }, [])

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    const timer = duration ? setTimeout(dismiss, duration) : null
    return () => {
      cancelAnimationFrame(raf)
      if (timer) clearTimeout(timer)
    }
  }, [duration, dismiss])

  useEffect(() => () => clearTimeout(exitTimer.current), [])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
      <div
        role={type === 'error' ? 'alert' : 'status'}
        className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-se-border/60 bg-se-surface/80 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl backdrop-saturate-150 transition-all duration-300 ease-out motion-reduce:transition-none ${
          visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
        }`}
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style.tone}`}>
          <Icon d={style.icon} strokeWidth={2} />
        </span>

        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold text-se-text-main">{style.title}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-se-text-muted">{message}</p>
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="ปิดการแจ้งเตือน"
          className={`-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-se-text-muted transition-colors hover:bg-se-border/40 hover:text-se-text-main ${ring}`}
        >
          <Icon d="M6 6l12 12M18 6L6 18" className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Dialog — กล่องโต้ตอบแบบ Apple (กด Esc หรือคลิกพื้นหลังเพื่อปิด)         */
/* ------------------------------------------------------------------ */
function Dialog({ title, description, onClose, children }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={`relative w-full max-w-sm rounded-[22px] border border-se-border/60 bg-se-surface p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)] transition-all duration-200 ease-out motion-reduce:transition-none ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <h2 id="dialog-title" className="text-xl font-semibold tracking-tight">
          {title}
        </h2>
        {description && <p className="mt-1.5 text-[15px] leading-relaxed text-se-text-muted">{description}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

const formatBytes = (bytes) => {
  if (!bytes) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getExt = (name = '') => (name.includes('.') ? name.split('.').pop().slice(0, 4).toUpperCase() : '')

export default function CloudFilesDashboard() {
  const { session, profile } = useAuth()
  const { folderId } = useParams()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentFolder, setCurrentFolder] = useState(null)
  const [notice, setNotice] = useState(null)

  // สร้างโฟลเดอร์
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [creating, setCreating] = useState(false)

  // อัปโหลด
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  // ลบ
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const notify = (type, message) => setNotice({ id: Date.now(), type, message })
  const closeNotice = useCallback(() => setNotice(null), [])
  const closeNewFolder = useCallback(() => {
    setShowNewFolder(false)
    setFolderName('')
  }, [])
  const closeDelete = useCallback(() => setDeleteTarget(null), [])

  useEffect(() => {
    document.title = 'My Files | CLOUDFILES'
  }, [])

  useEffect(() => {
    if (!session || !profile?.id) return
    fetchFiles()
    setCurrentFolder(null)
    if (folderId) fetchCurrentFolderInfo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, profile?.id, folderId])

  const fetchCurrentFolderInfo = async () => {
    const { data } = await supabase
      .from('cloud_files')
      .select('*')
      .eq('id', folderId)
      .eq('owner_id', profile.id)
      .single()
    if (data) setCurrentFolder(data)
  }

  const fetchFiles = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('cloud_files')
        .select('*')
        .eq('owner_id', profile.id)
        .order('is_folder', { ascending: false }) // ให้โฟลเดอร์ขึ้นก่อน
        .order('created_at', { ascending: false })

      if (folderId) {
        query = query.eq('parent_id', folderId)
      } else {
        query = query.is('parent_id', null)
      }

      const { data, error } = await query
      if (error) throw error
      setItems(data || [])
    } catch (err) {
      console.error('Error fetching files:', err.message)
      notify('error', 'โหลดรายการไฟล์ไม่สำเร็จ กรุณาลองรีเฟรชหน้านี้')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFolder = async (e) => {
    e.preventDefault()
    const name = folderName.trim()
    if (!name) return

    try {
      setCreating(true)
      const { error } = await supabase.from('cloud_files').insert([
        {
          file_name: name,
          is_folder: true,
          parent_id: folderId || null,
          owner_id: profile.id,
        },
      ])

      if (error) throw error
      closeNewFolder()
      notify('success', `สร้างโฟลเดอร์ "${name}" แล้ว`)
      fetchFiles()
    } catch (err) {
      console.error(err)
      notify('error', 'สร้างโฟลเดอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setCreating(false)
    }
  }

  const handleUploadFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // เช็คขนาด (100MB)
    if (file.size > MAX_FILE_SIZE) {
      notify('error', 'ไฟล์ใหญ่เกินไป (จำกัด 100MB ต่อไฟล์)')
      e.target.value = ''
      return
    }

    try {
      setUploading(true)
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')
      const filePath = `${profile.id}/${Date.now()}_${sanitizedName}`

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage.from('cloudfiles').upload(filePath, file)

      if (uploadError) throw uploadError

      // 2. Get URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('cloudfiles').getPublicUrl(filePath)

      // 3. Save to Database
      const { error: dbError } = await supabase.from('cloud_files').insert([
        {
          file_name: file.name,
          file_path: filePath,
          file_url: publicUrl,
          file_size_bytes: file.size,
          file_type: file.type,
          is_folder: false,
          parent_id: folderId || null,
          owner_id: profile.id,
        },
      ])

      if (dbError) throw dbError
      notify('success', `อัปโหลด "${file.name}" แล้ว`)
      fetchFiles()
    } catch (err) {
      console.error(err)
      notify('error', 'อัปโหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    const { id, file_path: filePath, is_folder: isFolder, file_name: name } = deleteTarget

    try {
      setDeleting(true)

      // ลบจาก Storage (ถ้าไม่ใช่โฟลเดอร์)
      if (!isFolder && filePath) {
        await supabase.storage.from('cloudfiles').remove([filePath])
      }

      // ลบจาก Database
      const { error } = await supabase.from('cloud_files').delete().eq('id', id)
      if (error) throw error

      setDeleteTarget(null)
      notify('success', `ลบ "${name}" แล้ว`)
      fetchFiles()
    } catch (err) {
      console.error(err)
      notify('error', 'ลบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setDeleting(false)
    }
  }

  const backTo = currentFolder?.parent_id ? `/cloudfiles/folder/${currentFolder.parent_id}` : '/cloudfiles/dashboard'

  return (
    <div className="flex min-h-screen flex-col bg-se-background font-sans text-se-text-main antialiased">
      {notice && (
        <Notification key={notice.id} type={notice.type} message={notice.message} onClose={closeNotice} />
      )}

      {/* Header — โปร่งแสง + blur */}
      <header className="sticky top-0 z-40 border-b border-se-border/60 bg-se-background/75 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link to="/cloudfiles/landing" className={`flex items-center gap-2.5 rounded-lg ${ring}`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-orange-400 to-rose-500">
              <Icon d={ICONS.cloud} className="h-4 w-4 text-white" strokeWidth={2} />
            </span>
            <span className="text-[17px] font-semibold tracking-tight">CLOUDFILES</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/portal"
              className={`rounded-lg text-sm text-se-text-muted transition-colors hover:text-se-text-main ${ring}`}
            >
              Portal
            </Link>
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-se-primary/10 text-xs font-semibold text-se-primary ring-1 ring-se-border">
              {profile?.profile_image_url ? (
                <img src={profile.profile_image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                profile?.first_name?.charAt(0)
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-16 pt-10">
        {/* Title & Actions */}
        <div className="mb-8">
          {folderId && (
            <Link
              to={backTo}
              className={`-ml-1 mb-3 inline-flex items-center gap-1 rounded-lg text-[15px] font-medium text-se-primary ${ring}`}
            >
              <Icon d={ICONS.back} className="h-4 w-4" strokeWidth={2.5} />
              ย้อนกลับ
            </Link>
          )}

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <h1 className="truncate text-4xl font-semibold leading-tight tracking-tight">
                {folderId ? currentFolder?.file_name || 'โฟลเดอร์' : 'My Files'}
              </h1>
              <p className="mt-1 text-[17px] text-se-text-muted">
                {loading ? 'กำลังโหลด...' : `${items.length} รายการ`}
              </p>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setShowNewFolder(true)} className={btnSecondary}>
                <Icon d={ICONS.newFolder} className="h-4 w-4" strokeWidth={2} />
                สร้างโฟลเดอร์
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={btnPrimary}
              >
                {uploading ? (
                  <>
                    <Spinner />
                    กำลังอัปโหลด...
                  </>
                ) : (
                  <>
                    <Icon d={ICONS.upload} className="h-4 w-4" strokeWidth={2} />
                    อัปโหลดไฟล์
                  </>
                )}
              </button>
              <input type="file" ref={fileInputRef} onChange={handleUploadFile} className="hidden" />
            </div>
          </div>
        </div>

        {/* File Grid */}
        {loading ? (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <li key={i} className="rounded-[22px] bg-se-surface p-3">
                <div className="aspect-square animate-pulse rounded-2xl bg-se-border/40"></div>
                <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-se-border/40"></div>
                <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-se-border/40"></div>
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[28px] bg-se-surface px-6 py-20 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-se-primary/10 text-se-primary">
              <Icon d={ICONS.cloud} className="h-8 w-8" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">ยังไม่มีไฟล์ในพื้นที่นี้</h2>
            <p className="mt-1.5 max-w-sm text-[15px] leading-relaxed text-se-text-muted">
              อัปโหลดไฟล์หรือสร้างโฟลเดอร์เพื่อเริ่มจัดระเบียบ
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={`${btnPrimary} mt-6`}
            >
              <Icon d={ICONS.upload} className="h-4 w-4" strokeWidth={2} />
              อัปโหลดไฟล์
            </button>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {items.map((item) => {
              const cardClass = `flex flex-col rounded-[22px] bg-se-surface p-3 transition-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] ${ring}`
              return (
                <li key={item.id} className="group relative">
                  {/* Delete Button — แสดงเมื่อ hover/focus (และแสดงตลอดบนอุปกรณ์ทัชสกรีน) */}
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    aria-label={`ลบ ${item.file_name}`}
                    className={`absolute right-5 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-se-surface/85 text-se-text-muted opacity-0 ring-1 ring-se-border/60 backdrop-blur transition-all hover:text-se-danger focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100 ${ring}`}
                  >
                    <Icon d={ICONS.trash} className="h-4 w-4" />
                  </button>

                  {item.is_folder ? (
                    <Link to={`/cloudfiles/folder/${item.id}`} className={cardClass}>
                      <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-se-background">
                        <svg className="h-16 w-16 text-se-primary" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path d={ICONS.folderFill} />
                        </svg>
                      </div>
                      <div className="mt-3 min-w-0 px-1 pb-1">
                        <p className="truncate text-[15px] font-medium">{item.file_name}</p>
                        <p className="mt-0.5 text-xs text-se-text-muted">โฟลเดอร์</p>
                      </div>
                    </Link>
                  ) : (
                    <a href={item.file_url} target="_blank" rel="noopener noreferrer" className={cardClass}>
                      <div className="relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-se-background">
                        {item.file_type?.startsWith('image/') ? (
                          <img
                            src={item.file_url}
                            alt={item.file_name}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <>
                            <Icon d={ICONS.doc} className="h-12 w-12 text-se-text-muted" strokeWidth={1.5} />
                            {getExt(item.file_name) && (
                              <span className="mt-2 text-[11px] font-semibold text-se-text-muted">
                                {getExt(item.file_name)}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <div className="mt-3 min-w-0 px-1 pb-1">
                        <p className="truncate text-[15px] font-medium">{item.file_name}</p>
                        <p className="mt-0.5 text-xs text-se-text-muted">{formatBytes(item.file_size_bytes)}</p>
                      </div>
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </main>

      {/* Dialog: สร้างโฟลเดอร์ */}
      {showNewFolder && (
        <Dialog title="สร้างโฟลเดอร์ใหม่" onClose={closeNewFolder}>
          <form onSubmit={handleCreateFolder}>
            <input
              type="text"
              autoFocus
              placeholder="ชื่อโฟลเดอร์"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="h-12 w-full rounded-xl border border-se-border bg-se-background px-4 text-[17px] text-se-text-main transition placeholder:text-se-text-muted/60 focus:border-se-primary focus:outline-none focus:ring-4 focus:ring-se-primary/20"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeNewFolder} className={btnSecondary}>
                ยกเลิก
              </button>
              <button type="submit" disabled={creating || !folderName.trim()} className={btnPrimary}>
                {creating && <Spinner />}
                สร้าง
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Dialog: ยืนยันการลบ */}
      {deleteTarget && (
        <Dialog
          title="ลบรายการนี้ใช่หรือไม่?"
          description={`"${deleteTarget.file_name}" จะถูกลบและไม่สามารถกู้คืนได้`}
          onClose={closeDelete}
        >
          <div className="flex justify-end gap-3">
            <button type="button" autoFocus onClick={closeDelete} className={btnSecondary}>
              ยกเลิก
            </button>
            <button type="button" onClick={handleConfirmDelete} disabled={deleting} className={btnDanger}>
              {deleting && <Spinner />}
              ลบ
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}