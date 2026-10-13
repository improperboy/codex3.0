import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teamsApi } from '@/api/teams'
import { adminApi } from '@/api/admin'

export default function TeamCreatePage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', idea: '', problem_statement: '', tech_skills: '', theme_id: '' })
  const [error, setError] = useState('')

  const { data: themes = [] } = useQuery({ queryKey: ['themes'], queryFn: teamsApi.getThemes })

  const { data: publicSettings = [] } = useQuery({
    queryKey: ['public-settings'],
    queryFn: adminApi.getPublicSettings,
    staleTime: 10 * 1000,
  })
  
  const { data: teamMgmtSettings } = useQuery({
    queryKey: ['team-management-settings'],
    queryFn: adminApi.getTeamManagementSettings,
    staleTime: 10 * 1000,
  })

  const minTeamSize = (() => {
    const s = publicSettings.find((s) => s.setting_key === 'min_team_size')
    return s ? parseInt(s.setting_value, 10) || 1 : 1
  })()

  const maxTeamSize = (() => {
    const s = publicSettings.find((s) => s.setting_key === 'max_team_size')
    return s ? parseInt(s.setting_value, 10) || 4 : 4
  })()

  const { mutate: createTeam, isPending } = useMutation({
    mutationFn: () => teamsApi.createTeam({
      name: form.name,
      idea: form.idea,
      problem_statement: form.problem_statement,
      tech_skills: form.tech_skills,
      theme_id: form.theme_id ? Number(form.theme_id) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-team'] })
      qc.invalidateQueries({ queryKey: ['teams-list'] })
      navigate('/participant/dashboard')
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail
      const errorMsg = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((e: any) => e.msg || e).join(', ') : 'Failed to create team. Please try again.'
      setError(errorMsg)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name || !form.idea || !form.problem_statement || !form.tech_skills || !form.theme_id) {
      setError('All fields are required.')
      return
    }
    createTeam()
  }

  const selectedTheme = themes.find((t) => t.id === Number(form.theme_id))

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center text-white text-lg">+</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create & Save Team</h1>
          <p className="text-gray-500 text-sm">Save your team as a draft, build your roster publicly, and submit for approval once ready</p>
        </div>
      </div>

      {/* Team Management Disabled Alert */}
      {teamMgmtSettings && !teamMgmtSettings.is_currently_active && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-900 px-5 py-4 rounded-xl mb-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🚫</span>
            <div>
              <p className="font-semibold mb-1">Team Management Currently Disabled</p>
              <p className="text-sm text-yellow-800">
                {teamMgmtSettings.enabled && teamMgmtSettings.start_time 
                  ? `Team creation will be available starting ${new Date(teamMgmtSettings.start_time).toLocaleString()}.`
                  : teamMgmtSettings.enabled && teamMgmtSettings.end_time
                  ? `The team management period ended on ${new Date(teamMgmtSettings.end_time).toLocaleString()}.`
                  : 'The administrator has temporarily disabled team creation and joining. Please check back later or contact support for more information.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Team Name *" icon="👥">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Innovators, CodeMasters"
              className="input"
              required
            />
          </Field>

          <Field label="Project Idea *" icon="💡">
            <textarea
              value={form.idea}
              onChange={(e) => setForm({ ...form, idea: e.target.value })}
              placeholder="Briefly describe your project idea..."
              rows={4}
              className="input resize-none"
              required
            />
          </Field>

          <Field label="Problem Statement *" icon="❓">
            <textarea
              value={form.problem_statement}
              onChange={(e) => setForm({ ...form, problem_statement: e.target.value })}
              placeholder="What problem does your project aim to solve?"
              rows={4}
              className="input resize-none"
              required
            />
          </Field>

          <Field label="Required Tech Skills *" icon="💻">
            <textarea
              value={form.tech_skills}
              onChange={(e) => setForm({ ...form, tech_skills: e.target.value })}
              placeholder="e.g., React, Node.js, Python, MongoDB..."
              rows={3}
              className="input resize-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">List technologies needed — helps match you with the right mentor.</p>
          </Field>

          <Field label="Theme Category *" icon="🏷️">
            <select
              value={form.theme_id}
              onChange={(e) => setForm({ ...form, theme_id: e.target.value })}
              className="input"
              required
              style={selectedTheme ? { borderLeftColor: selectedTheme.color_code, borderLeftWidth: 4 } : {}}
            >
              <option value="">Select a theme for your project</option>
              {themes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {selectedTheme?.description && (
              <p className="text-xs text-gray-600 mt-1 font-medium">{selectedTheme.description}</p>
            )}
          </Field>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-gray-700 space-y-2">
            <p className="font-semibold text-gray-900 flex items-center gap-1.5">
              <span>💡</span> How Team Formation Works
            </p>
            <p className="text-xs text-gray-600">
              • <strong>Save Team (Draft):</strong> Your team will be saved as a <strong>Draft</strong> and immediately become visible on the public team list for other participants to discover and join.
            </p>
            <p className="text-xs text-gray-600">
              • <strong>Team Size Requirements:</strong> Min: <strong>{minTeamSize}</strong> member(s), Max: <strong>{maxTeamSize}</strong> member(s).
            </p>
            <p className="text-xs text-gray-600">
              • <strong>Submit for Approval:</strong> Once your team has at least <strong>{minTeamSize}</strong> member(s) (and at most <strong>{maxTeamSize}</strong>), the option to submit your team for admin approval will unlock on your team details page.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending || (teamMgmtSettings && !teamMgmtSettings.is_currently_active)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {isPending ? 'Saving Team…' : '💾 Save Team'}
            </button>
            <Link to="/participant/dashboard" className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-6 rounded-xl transition-all border border-gray-300">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        <span className="mr-1">{icon}</span>{label}
      </label>
      {children}
    </div>
  )
}
