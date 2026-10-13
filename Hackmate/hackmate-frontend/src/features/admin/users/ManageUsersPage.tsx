import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import client from '@/api/client'
import type { User } from '@/types/user'

const ROLES = ['admin', 'mentor', 'participant', 'volunteer']

const roleBadge: Record<string, string> = {
  admin: 'bg-red-100 text-red-800',
  mentor: 'bg-green-100 text-green-800',
  participant: 'bg-blue-100 text-blue-800',
  volunteer: 'bg-purple-100 text-purple-800',
}

export default function ManageUsersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [editingSkills, setEditingSkills] = useState<{ id: number; tech_stack: string } | null>(null)

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['admin-users', search, roleFilter],
    queryFn: () => client.get<{ total: number; users: User[] }>('/users/', { params: { search: search || undefined, role: roleFilter || undefined } }).then((r) => r.data.users ?? []),
  })

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      client.put(`/users/${id}/role`, { role }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setMsg('Role updated!') },
    onError: () => setErr('Failed to update role'),
  })

  const updateSkills = useMutation({
    mutationFn: ({ id, tech_stack }: { id: number; tech_stack: string }) =>
      client.put(`/users/${id}`, { tech_stack }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setMsg('Skills updated!'); setEditingSkills(null) },
    onError: () => setErr('Failed to update skills'),
  })

  const deleteUser = useMutation({
    mutationFn: (id: number) => client.delete(`/users/${id}`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setMsg('User deleted!') },
    onError: () => setErr('Failed to delete user'),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage all registered users</p>
        </div>
        <Link to="/admin/users/add" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + Add User
        </Link>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">{msg}</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{err}</div>}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <input
          type="text" placeholder="Search by name or email…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
        <button onClick={() => { setSearch(''); setRoleFilter('') }}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors">
          Clear
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">All Users ({users.length})</h3>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-gray-400">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left">Name</th>
                  <th className="px-5 py-3 text-left">Email</th>
                  <th className="px-5 py-3 text-left">Role</th>
                  <th className="px-5 py-3 text-left">Tech Stack</th>
                  <th className="px-5 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{u.name}</td>
                    <td className="px-5 py-3 text-gray-600">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${roleBadge[u.role] ?? 'bg-gray-100 text-gray-700'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 max-w-[200px]">
                      {u.tech_stack ? (
                        <span className="text-gray-600 text-xs truncate block" title={u.tech_stack}>{u.tech_stack}</span>
                      ) : (
                        <span className="text-gray-300 text-xs italic">none</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <select
                          value={u.role}
                          onChange={(e) => { setMsg(''); setErr(''); updateRole.mutate({ id: u.id, role: e.target.value }) }}
                          className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <button
                          onClick={() => { setMsg(''); setErr(''); setEditingSkills({ id: u.id, tech_stack: u.tech_stack ?? '' }) }}
                          className="text-indigo-500 hover:text-indigo-700 text-xs font-medium transition-colors"
                        >
                          Skills
                        </button>
                        <button
                          onClick={() => { if (confirm('Delete this user?')) { setMsg(''); setErr(''); deleteUser.mutate(u.id) } }}
                          className="text-red-500 hover:text-red-700 text-xs font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Skills Modal */}
      {editingSkills && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-1">Edit Tech Stack</h3>
            <p className="text-xs text-gray-500 mb-4">Comma-separated skills used for AI mentor matching (e.g. Python, React, Docker)</p>
            <input
              type="text"
              value={editingSkills.tech_stack}
              onChange={(e) => setEditingSkills({ ...editingSkills, tech_stack: e.target.value })}
              placeholder="Python, React, Docker, PostgreSQL"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => updateSkills.mutate({ id: editingSkills.id, tech_stack: editingSkills.tech_stack })}
                disabled={updateSkills.isPending}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
              >
                {updateSkills.isPending ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setEditingSkills(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
