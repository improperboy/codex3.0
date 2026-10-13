import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/useAuthStore'
import { teamsApi } from '@/api/teams'
import { submissionsApi } from '@/api/submissions'

export default function SubmitProjectPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const [form, setForm] = useState({ github_link: '', live_link: '', tech_stack: '', demo_video: '', ppt_link: '' })
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  const { data: myTeam, isLoading: teamLoading } = useQuery({
    queryKey: ['my-team'],
    queryFn: teamsApi.getMyTeam,
    retry: false,
  })

  const isLeader = myTeam?.leader_id === user?.id

  const { data: settings } = useQuery({
    queryKey: ['submission-settings'],
    queryFn: submissionsApi.getSettings,
    retry: false,
  })

  const { data: existing } = useQuery({
    queryKey: ['submission', myTeam?.id],
    queryFn: () => submissionsApi.getByTeam(myTeam!.id),
    enabled: !!myTeam?.id,
    retry: false,
  })

  useEffect(() => {
    if (existing) {
      setForm({
        github_link: existing.github_link ?? '',
        live_link: existing.live_link ?? '',
        tech_stack: existing.tech_stack ?? '',
        demo_video: existing.demo_video ?? '',
        ppt_link: existing.ppt_link ?? '',
      })
    }
  }, [existing])

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () =>
      existing
        ? submissionsApi.update(existing.id, form)
        : submissionsApi.submit({ team_id: myTeam!.id, ...form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submission', myTeam?.id] })
      setToast(existing ? 'Submission updated successfully!' : 'Project submitted successfully!')
      setTimeout(() => navigate('/participant/dashboard'), 2000)
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail ?? 'Submission failed. Please try again.')
      setTimeout(() => setError(''), 5000)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.github_link || !form.tech_stack) {
      setError('GitHub link and tech stack are required.')
      return
    }
    submit()
  }

  if (teamLoading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>

  if (!myTeam || myTeam.status !== 'approved') {
    return (
      <div className="max-w-xl mx-auto text-center mt-20">
        <p className="text-gray-500 mb-4">You must have an approved team to submit projects.</p>
        <Link to="/participant/dashboard" className="text-indigo-600 hover:underline">← Back to Dashboard</Link>
      </div>
    )
  }

  if (!isLeader) {
    return (
      <div className="max-w-xl mx-auto text-center mt-20">
        <p className="text-gray-500 mb-4">Only team leaders can submit projects.</p>
        <Link to="/participant/dashboard" className="text-indigo-600 hover:underline">← Back to Dashboard</Link>
      </div>
    )
  }

  // Check submission window
  let windowError = ''
  if (!settings) {
    windowError = 'Submissions are not yet open.'
  } else {
    const now = new Date()
    if (now < new Date(settings.start_time)) {
      windowError = `Submissions have not started yet. Start time: ${new Date(settings.start_time).toLocaleString()}`
    } else if (now > new Date(settings.end_time)) {
      windowError = `Submission deadline has passed. Deadline was: ${new Date(settings.end_time).toLocaleString()}`
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{existing ? 'Update' : 'Submit'} Project</h1>
        <p className="text-gray-500 text-sm">Team: {myTeam.name}</p>
      </div>

      {toast && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">{toast}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

      {settings && !windowError && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-xl text-sm text-blue-700">
          <strong>Submission Deadline:</strong> {new Date(settings.end_time).toLocaleString()}
        </div>
      )}

      {windowError ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-xl text-sm">
          {windowError}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GitHub Repository URL *
              </label>
              <input
                type="url"
                value={form.github_link}
                onChange={(e) => setForm({ ...form, github_link: e.target.value })}
                placeholder="https://github.com/username/repository"
                className="input"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Your project's GitHub repository URL</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Live Demo URL (Optional)</label>
              <input
                type="url"
                value={form.live_link}
                onChange={(e) => setForm({ ...form, live_link: e.target.value })}
                placeholder="https://your-project-demo.com"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Technology Stack *</label>
              <textarea
                value={form.tech_stack}
                onChange={(e) => setForm({ ...form, tech_stack: e.target.value })}
                placeholder="List the technologies, frameworks, and tools used..."
                rows={4}
                className="input resize-none"
                required
              />
              <p className="text-xs text-gray-500 mt-1">e.g., React, Node.js, MongoDB, Express, etc.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Presentation / PPT Link</label>
              <input
                type="url"
                value={form.ppt_link}
                onChange={(e) => setForm({ ...form, ppt_link: e.target.value })}
                placeholder="https://docs.google.com/presentation/d/... or Canva / OneDrive public link"
                className="input"
              />
              <p className="text-xs text-gray-500 mt-1">Submit public/shareable link to your project presentation (Google Slides, Canva, Pitch, OneDrive, etc.)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Demo Video URL (Optional)</label>
              <input
                type="url"
                value={form.demo_video}
                onChange={(e) => setForm({ ...form, demo_video: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
                className="input"
              />
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-xl text-sm text-yellow-700">
              <strong>Important:</strong> Make sure your GitHub repository is public and contains a README with setup instructions.
              You can update your submission multiple times before the deadline.
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors disabled:opacity-60"
              >
                {isPending ? 'Submitting…' : `${existing ? 'Update' : 'Submit'} Project`}
              </button>
              <Link to="/participant/dashboard" className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2.5 px-6 rounded-xl transition-colors">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      )}

      {/* Current submission info */}
      {existing && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Current Submission</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500">GitHub</p>
              <a href={existing.github_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">{existing.github_link}</a>
            </div>
            {existing.live_link && (
              <div>
                <p className="text-gray-500">Live Demo</p>
                <a href={existing.live_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">{existing.live_link}</a>
              </div>
            )}
            {existing.ppt_link && (
              <div>
                <p className="text-gray-500">Presentation / PPT</p>
                <a href={existing.ppt_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">{existing.ppt_link}</a>
              </div>
            )}
            {existing.demo_video && (
              <div>
                <p className="text-gray-500">Demo Video</p>
                <a href={existing.demo_video} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">{existing.demo_video}</a>
              </div>
            )}
            <div>
              <p className="text-gray-500">Last Updated</p>
              <p className="text-gray-800">{existing.submitted_at ? new Date(existing.submitted_at).toLocaleString() : '—'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
