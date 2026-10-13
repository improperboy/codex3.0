import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import client from '@/api/client'
import { Megaphone, ExternalLink, Clock, ChevronLeft, ChevronRight } from 'lucide-react'

interface Post {
  id: number
  title: string
  content: string
  link_url?: string
  link_text?: string
  author_name?: string
  author_role?: string
  created_at: string
}

interface PostsResponse {
  items?: Post[]
  total?: number
}

const PER_PAGE = 10

export default function AnnouncementsPage() {
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<number | null>(null)

  const { data, isLoading } = useQuery<PostsResponse | Post[]>({
    queryKey: ['participant-announcements', page],
    queryFn: () =>
      client.get(`/announcements/?page=${page}&per_page=${PER_PAGE}`).then((r) => r.data),
  })

  const posts: Post[] = Array.isArray(data) ? data : (data?.items ?? [])
  const total: number = Array.isArray(data) ? data.length : (data?.total ?? posts.length)
  const totalPages = Math.ceil(total / PER_PAGE)

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        <p className="text-gray-500 text-sm mt-0.5">Stay updated with important hackathon information</p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Announcements', value: total, icon: '📢', gradient: 'from-indigo-500 to-purple-600' },
          { label: 'Current Page', value: page, icon: '📄', gradient: 'from-green-500 to-teal-600' },
          { label: 'Total Pages', value: totalPages || 1, icon: '📑', gradient: 'from-purple-500 to-pink-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className={`w-11 h-11 bg-gradient-to-br ${s.gradient} rounded-xl flex items-center justify-center text-lg`}>
              {s.icon}
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading announcements…</div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No Announcements Yet</h3>
          <p className="text-gray-500 text-sm">Check back later for updates and important information.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const isExpanded = expanded === post.id
            const isLong = post.content.length > 300
            const displayContent = isExpanded || !isLong ? post.content : post.content.slice(0, 300) + '…'

            return (
              <div
                key={post.id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-indigo-200 hover:shadow-sm transition-all"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shrink-0">
                      <Megaphone className="text-white w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900">{post.title}</h3>
                        {post.link_url && post.link_text && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🔗 Has Link</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                        {post.author_name && (
                          <span className="flex items-center gap-1">
                            <span className="w-4 h-4 bg-gradient-to-br from-green-500 to-blue-500 rounded-full inline-flex items-center justify-center text-white text-[8px]">👤</span>
                            {post.author_name}
                            {post.author_role && (
                              <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full capitalize">{post.author_role}</span>
                            )}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(post.created_at).toLocaleDateString()} · {timeAgo(post.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                  <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-line">{displayContent}</p>

                  {isLong && (
                    <button
                      onClick={() => setExpanded(isExpanded ? null : post.id)}
                      className="mt-2 text-indigo-600 text-xs font-medium hover:underline"
                    >
                      {isExpanded ? 'Show less' : 'Read more'}
                    </button>
                  )}

                  {post.link_url && post.link_text && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                        <ExternalLink className="text-white w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-blue-600 font-medium">Additional Resource</p>
                        <a
                          href={post.link_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-blue-800 font-semibold hover:underline truncate block"
                        >
                          {post.link_text}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .map((p, idx, arr) => (
              <>
                {idx > 0 && arr[idx - 1] !== p - 1 && (
                  <span key={`ellipsis-${p}`} className="text-gray-400 text-sm">…</span>
                )}
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    p === page
                      ? 'bg-indigo-600 text-white'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              </>
            ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
