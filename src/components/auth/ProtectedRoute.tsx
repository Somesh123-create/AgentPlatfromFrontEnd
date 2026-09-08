import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'

export function ProtectedRoute() {
  const { user, loading } = useAuth(); const location = useLocation()
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f7f8fb] text-sm font-semibold text-slate-500 dark:bg-[#080d18] dark:text-slate-400">Loading your workspace...</div>
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />
}