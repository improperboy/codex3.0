import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '@/api/client'

export default function AddUserPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm_password: '', role: '', tech_stack: '' })
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(''); setErr('')
    if (form.password !== form.confirm_password) { setErr('Passwords do not match'); return }
    if (form.password.length < 6) { setErr('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const res = await client.post('/auth/register', { name: form.name, email: form.email, password: form.password, role: form.role })
      // Update tech_stack if provided
      if (form.tech_stack.trim() && res.data?.id) {
        await client.put(`/users/${res.data.id}`, { tech_stack: form.tech_stack.trim() })
      }
      setMsg('User added successfully!')
      setForm({ name: '', email: '', password: '', confirm_password: '', role: '', tech_stack: '' })
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? 'Failed to add user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/users')} className="text-gray-500 hover:text-gray-700 text-sm">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900">Add New User</h1>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">{msg}</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{err}</div>}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Full Name', key: 'name', type: 'text', placeholder: 'John Doe' },
            { label: 'Email Address', key: 'email', type: 'email', placeholder: 'user@example.com' },
            { label: 'Password', key: 'password', type: 'password', placeholder: '••••••••' },
            { label: 'Confirm Password', key: 'confirm_password', type: 'password', placeholder: '••••••••' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type={type} placeholder={placeholder} required
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select Role</option>
              {['admin', 'participant', 'mentor', 'volunteer'].map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tech Stack <span className="text-gray-400 font-normal">(comma-separated, e.g. Python, React, Docker)</span></label>
            <input
              type="text" placeholder="Python, React, Docker"
              value={form.tech_stack}
              onChange={(e) => setForm({ ...form, tech_stack: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
              {loading ? 'Adding…' : '+ Add User'}
            </button>
            <button type="button" onClick={() => navigate('/admin/users')}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
