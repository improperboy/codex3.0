import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/useAuthStore'

interface Props {
  role?: string
  children: React.ReactNode
}

export default function ProtectedRoute({ role, children }: Props) {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)

  if (!token || !user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to={`/${user.role}`} replace />

  return <>{children}</>
}
