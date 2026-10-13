import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/useAuthStore'
import { authApi } from '@/api/auth'

interface Props {
  onMenuClick: () => void
}

export default function Topbar({ onMenuClick }: Props) {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    logout()
    navigate('/login')
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
      <button
        onClick={onMenuClick}
        className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 lg:hidden"
        aria-label="Toggle menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <span className="text-sm font-semibold text-indigo-600 lg:hidden">HackMate</span>

      <div className="ml-auto flex items-center gap-3">
        <span className="text-sm text-gray-600 hidden sm:block">
          {user?.name}
          <span className="ml-1.5 text-xs text-gray-400 capitalize">({user?.role})</span>
        </span>
        <button
          onClick={() => navigate(`/${user?.role}/change-password`)}
          className="text-xs text-gray-500 hover:text-gray-700 hidden sm:block"
        >
          Change password
        </button>
        <button
          onClick={handleLogout}
          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
