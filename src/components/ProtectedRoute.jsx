import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ allowedRoles }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-se-background)]">
        <p className="text-se-text-muted">กำลังตรวจสอบสิทธิ์...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/sework/login" replace />
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-se-background)] p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-2">Access Denied</h1>
          <p className="text-se-text-muted">คุณไม่มีสิทธิ์ระดับ {allowedRoles.join(', ')} ในการเข้าถึงหน้านี้</p>
        </div>
      </div>
    )
  }
  return <Outlet />
}