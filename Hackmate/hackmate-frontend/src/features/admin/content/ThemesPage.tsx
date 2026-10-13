import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, Theme } from '@/api/admin'

const PRESET_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
]

const emptyForm = { name: '', description: '', color_code: '#3B82F6', is_active: 1 }

export default function ThemesPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Theme | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [err, setErr] = useState('')

  const { data: themes = [], isLoading, error } = useQuery({
    queryKey: ['admin-themes'],
    queryFn: async () => {
      const result = await adminApi.getThemes()
      return Array.isArray(result) ? result : []
    },
  })

  const createMutation = useMutation({
    mutationFn: adminApi.createTheme,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-themes'] }); closeForm() },
    onError: (e: any) => setErr(e?.response?.data?.detail ?? 'Failed to create theme'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adminApi.updateTheme(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-themes'] }); closeForm() },
    onError: (e: any) => setErr(e?.response?.data?.detail ?? 'Failed to update theme'),
  })

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteTheme,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-themes'] }),
    onError: (e: any) => setErr(e?.response?.data?.detail ?? 'Failed to delete theme'),
  })

  const openCreate = () => { setEditing(null); setForm(emptyForm); setErr(''); setShowForm(true) }
  const openEdit = (t: Theme) => {
    setEditing(t)
    setForm({ name: t.name, description: t.description ?? '', color_code: t.color_code, is_active: t.is_active })
    setErr('')
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyForm); setErr('') }

  const handleSubmit = () => {
    if (!form.name.trim()) { setErr('Name is required'); return }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const handleDelete = (t: Theme) => {
    if (confirm(`Delete theme "${t.name}"? Teams using this theme will have it unlinked.`)) {
      deleteMutation.mutate(t.id)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Themes</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage hackathon project themes</p>
        </div>
        <button onClick={openCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + Add Theme
        </button>
      </div>

      {err && !showForm && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{err}</div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
          Failed to load themes: {(error as any)?.response?.data?.detail ?? (error as any)?.message}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Theme' : 'Add Theme'}</h2>

            {err && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{err}</div>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Education, Fintech…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of this theme…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm((f) => ({ ...f, color_code: c }))}
                    style={{ backgroundColor: c }}
                    className={`w-7 h-7 rounded-full transition-transform ${form.color_code === c ? 'ring-2 ring-offset-2 ring-gray-800 scale-110' : 'hover:scale-105'}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.color_code}
                  onChange={(e) => setForm((f) => ({ ...f, color_code: e.target.value }))}
                  className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                />
                <span className="text-sm text-gray-500 font-mono">{form.color_code}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active === 1}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked ? 1 : 0 }))}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700 cursor-pointer">Active (visible to participants)</label>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={closeForm} className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={isPending}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                {isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create Theme'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Themes list */}
      {isLoading ? (
        <div className="py-20 text-center text-gray-400">Loading themes…</div>
      ) : themes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
          <p className="text-4xl mb-3">🎨</p>
          <p className="font-medium">No themes yet</p>
          <p className="text-sm mt-1">Add your first theme to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {themes.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: t.color_code }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 truncate">{t.name}</span>
                  {t.is_active ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
                  )}
                </div>
                {t.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{t.description}</p>}
                <p className="text-xs text-gray-400 font-mono mt-1">{t.color_code}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(t)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-sm">
                  ✏️
                </button>
                <button onClick={() => handleDelete(t)} disabled={deleteMutation.isPending}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
