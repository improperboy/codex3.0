import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '@/api/client'

interface Post {
  id: number
  title: string
  content: string
  link_url?: string
  link_text?: string
  author_id: number
  created_at: string
}

export default function PostsPage() {
  const qc = useQueryClient()
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ title: '', content: '', link_url: '', link_text: '' })
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const { data: posts = [], isLoading } = useQuery<Post[]>({
    queryKey: ['admin-posts'],
    queryFn: () => client.get<Post[]>('/announcements/').then((r) => r.data),
  })

  const submit = useMutation({
    mutationFn: () => editId
      ? client.put(`/announcements/${editId}`, form).then((r) => r.data)
      : client.post('/announcements/', form).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-posts'] })
      setMsg(editId ? 'Announcement updated!' : 'Announcement posted!')
      setEditId(null)
      setForm({ title: '', content: '', link_url: '', link_text: '' })
    },
    onError: (e: any) => setErr(e?.response?.data?.detail ?? 'Failed to save'),
  })

  const deletePost = useMutation({
    mutationFn: (id: number) => client.delete(`/announcements/${id}`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-posts'] }); setMsg('Announcement deleted') },
    onError: () => setErr('Failed to delete'),
  })

  const startEdit = (post: Post) => {
    setEditId(post.id)
    setForm({ title: post.title, content: post.content, link_url: post.link_url ?? '', link_text: post.link_text ?? '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const reset = () => { setEditId(null); setForm({ title: '', content: '', link_url: '', link_text: '' }) }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage Announcements</h1>
        <p className="text-gray-500 text-sm mt-0.5">Create and manage hackathon announcements</p>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">{msg}</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{err}</div>}

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">
          {editId ? '✏️ Edit Announcement' : '+ Create New Announcement'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Important Update, Submission Deadline Extended"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
            <textarea required rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Write your announcement details here…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Optional Link</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Link URL</label>
                <input type="url" value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Link Text</label>
                <input type="text" value={form.link_text} onChange={(e) => setForm({ ...form, link_text: e.target.value })}
                  placeholder="e.g., View Form, Download Document"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setMsg(''); setErr(''); submit.mutate() }} disabled={!form.title || !form.content || submit.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
              {submit.isPending ? 'Saving…' : editId ? 'Update' : '📢 Post Announcement'}
            </button>
            {editId && (
              <button onClick={reset} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium transition-colors">
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Posts List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">All Announcements ({posts.length})</h3>
        </div>
        {isLoading ? (
          <div className="py-10 text-center text-gray-400">Loading…</div>
        ) : posts.length === 0 ? (
          <div className="py-10 text-center text-gray-400">No announcements yet</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {posts.map((post) => (
              <div key={post.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-semibold text-gray-900">{post.title}</h4>
                  <div className="flex gap-3 shrink-0">
                    <button onClick={() => startEdit(post)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">Edit</button>
                    <button onClick={() => { if (confirm('Delete this announcement?')) { setMsg(''); setErr(''); deletePost.mutate(post.id) } }}
                      className="text-red-500 hover:text-red-700 text-xs font-medium">Delete</button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{post.content}</p>
                {post.link_url && post.link_text && (
                  <a href={post.link_url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg hover:bg-indigo-100 transition-colors">
                    🔗 {post.link_text}
                  </a>
                )}
                <p className="text-xs text-gray-400 mt-2">{new Date(post.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
