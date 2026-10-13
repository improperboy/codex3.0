import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, DatabaseResetResult } from '@/api/admin'

const SETTING_KEYS = [
  'hackathon_name', 'hackathon_description', 'max_team_size', 'min_team_size',
  'registration_open', 'hackathon_start_date', 'hackathon_end_date',
  'contact_email', 'timezone', 'maintenance_mode', 'show_mentoring_scores_to_participants',
]

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Kolkata', 'Australia/Sydney',
]

export default function SystemSettingsPage() {
  const qc = useQueryClient()
  const [values, setValues] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  
  // Team Management state
  const [teamMgmtEnabled, setTeamMgmtEnabled] = useState(true)
  const [teamMgmtStartTime, setTeamMgmtStartTime] = useState('')
  const [teamMgmtEndTime, setTeamMgmtEndTime] = useState('')
  const [teamMgmtMsg, setTeamMgmtMsg] = useState('')
  const [teamMgmtErr, setTeamMgmtErr] = useState('')

  // Database Reset Danger Zone state
  const [showResetModal, setShowResetModal] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [resetResult, setResetResult] = useState<DatabaseResetResult | null>(null)
  const [resetErr, setResetErr] = useState('')

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: adminApi.getSettings,
  })
  
  const { data: teamMgmtSettings } = useQuery({
    queryKey: ['team-management-settings'],
    queryFn: adminApi.getTeamManagementSettings,
  })

  useEffect(() => {
    if (settings.length > 0) {
      const map: Record<string, string> = {}
      settings.forEach((s) => { map[s.setting_key] = s.setting_value })
      setValues(map)
    }
  }, [settings])
  
  useEffect(() => {
    if (teamMgmtSettings) {
      setTeamMgmtEnabled(teamMgmtSettings.enabled)
      setTeamMgmtStartTime(teamMgmtSettings.start_time ? new Date(teamMgmtSettings.start_time).toISOString().slice(0, 16) : '')
      setTeamMgmtEndTime(teamMgmtSettings.end_time ? new Date(teamMgmtSettings.end_time).toISOString().slice(0, 16) : '')
    }
  }, [teamMgmtSettings])

  const updateAll = useMutation({
    mutationFn: async () => {
      // Update max_team_size before min_team_size to avoid temporary min > max validation conflicts
      const orderedKeys = [
        'max_team_size',
        'min_team_size',
        ...SETTING_KEYS.filter((k) => k !== 'max_team_size' && k !== 'min_team_size'),
      ]
      for (const key of orderedKeys) {
        if (values[key] !== undefined) {
          await adminApi.updateSetting(key, values[key])
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-settings'] })
      qc.invalidateQueries({ queryKey: ['public-settings'] })
      qc.invalidateQueries({ queryKey: ['teams-list'] })
      qc.invalidateQueries({ queryKey: ['my-team'] })
      setMsg('Settings saved successfully! Team size limits and system configurations are now active.')
    },
    onError: (e: any) => setErr(e?.response?.data?.detail ?? 'Failed to save settings'),
  })
  
  const updateTeamManagement = useMutation({
    mutationFn: async () => {
      const payload: { enabled: boolean; start_time?: string; end_time?: string } = {
        enabled: teamMgmtEnabled,
      }
      
      // Only include start_time and end_time if they have actual values (not empty strings)
      if (teamMgmtStartTime && teamMgmtStartTime.trim() !== '') {
        payload.start_time = new Date(teamMgmtStartTime).toISOString()
      }
      if (teamMgmtEndTime && teamMgmtEndTime.trim() !== '') {
        payload.end_time = new Date(teamMgmtEndTime).toISOString()
      }
      
      await adminApi.updateTeamManagementSettings(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team-management-settings'] })
      setTeamMgmtMsg('Team management settings saved successfully!')
      setTimeout(() => setTeamMgmtMsg(''), 3000)
    },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail
      const errorMsg = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((err: any) => err.msg || err).join(', ') : 'Failed to save team management settings'
      setTeamMgmtErr(errorMsg)
    },
  })

  const resetDbMutation = useMutation({
    mutationFn: (confirmation: string) => adminApi.resetDatabase(confirmation),
    onSuccess: (data) => {
      setResetResult(data)
      setResetErr('')
      qc.invalidateQueries()
    },
    onError: (e: any) => {
      setResetResult(null)
      const detail = e?.response?.data?.detail
      const errorMsg =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
          ? detail.map((errItem: any) => errItem.msg || errItem).join(', ')
          : 'Failed to delete database data.'
      setResetErr(errorMsg)
    },
  })

  const handleOpenResetModal = () => {
    setShowResetModal(true)
    setConfirmText('')
    setResetResult(null)
    setResetErr('')
  }

  const handleCloseResetModal = () => {
    if (resetDbMutation.isPending) return
    setShowResetModal(false)
    setConfirmText('')
    setResetResult(null)
    setResetErr('')
  }

  const handleExecuteReset = () => {
    if (confirmText.trim() !== 'DELETE ALL DATA') return
    resetDbMutation.mutate(confirmText.trim())
  }

  const handleSave = () => {
    setMsg('')
    setErr('')
    const minSize = parseInt(values['min_team_size'] || '1', 10)
    const maxSize = parseInt(values['max_team_size'] || '4', 10)
    if (isNaN(minSize) || minSize < 1) {
      setErr('Minimum team size must be at least 1.')
      return
    }
    if (isNaN(maxSize) || maxSize < 1) {
      setErr('Maximum team size must be at least 1.')
      return
    }
    if (minSize > maxSize) {
      setErr(`Minimum team size (${minSize}) cannot be greater than maximum team size (${maxSize}).`)
      return
    }
    updateAll.mutate()
  }
  
  const handleSaveTeamManagement = () => {
    setTeamMgmtMsg('')
    setTeamMgmtErr('')
    
    if (teamMgmtStartTime && teamMgmtEndTime) {
      const start = new Date(teamMgmtStartTime)
      const end = new Date(teamMgmtEndTime)
      if (start >= end) {
        setTeamMgmtErr('Start time must be before end time.')
        return
      }
    }
    
    updateTeamManagement.mutate()
  }

  const set = (key: string, val: string) => setValues((prev) => ({ ...prev, [key]: val }))
  const isMaintenance = values['maintenance_mode'] === 'true' || values['maintenance_mode'] === '1'

  if (isLoading) return <div className="py-20 text-center text-gray-400">Loading settings…</div>

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-500 text-sm mt-0.5">Configure hackathon system settings</p>
        </div>
        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-xs font-medium">Admin Only</span>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">{msg}</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{err}</div>}
      {isMaintenance && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-2 rounded-lg text-sm">
          ⚠️ Maintenance mode is currently enabled. Only admins can access the system.
        </div>
      )}

      {/* Hackathon Info */}
      <Section title="Hackathon Information" icon="ℹ️">
        <Field label="Hackathon Name *">
          <input type="text" value={values['hackathon_name'] ?? ''} onChange={(e) => set('hackathon_name', e.target.value)}
            className="input" />
        </Field>
        <Field label="Description">
          <textarea rows={3} value={values['hackathon_description'] ?? ''} onChange={(e) => set('hackathon_description', e.target.value)}
            className="input resize-none" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start Date & Time">
            <input type="datetime-local" value={(values['hackathon_start_date'] ?? '').replace(' ', 'T')} onChange={(e) => set('hackathon_start_date', e.target.value)}
              className="input" />
          </Field>
          <Field label="End Date & Time">
            <input type="datetime-local" value={(values['hackathon_end_date'] ?? '').replace(' ', 'T')} onChange={(e) => set('hackathon_end_date', e.target.value)}
              className="input" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Contact Email *">
            <input type="email" value={values['contact_email'] ?? ''} onChange={(e) => set('contact_email', e.target.value)}
              className="input" />
          </Field>
          <Field label="Timezone">
            <select value={values['timezone'] ?? 'UTC'} onChange={(e) => set('timezone', e.target.value)} className="input">
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      {/* Team Config */}
      <Section title="Team Configuration" icon="👥">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Minimum Team Size *">
            <input type="number" min={1} max={10} value={values['min_team_size'] ?? '1'} onChange={(e) => set('min_team_size', e.target.value)}
              className="input" />
          </Field>
          <Field label="Maximum Team Size *">
            <input type="number" min={2} max={20} value={values['max_team_size'] ?? '4'} onChange={(e) => set('max_team_size', e.target.value)}
              className="input" />
          </Field>
        </div>
        <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 px-3 py-2.5 rounded-lg">
          👥 <strong>Team Approval & Size Rules:</strong> Participants can save teams in draft state, visible publicly for other participants to join. Teams can <strong>only submit for approval</strong> when they have between <strong>{values['min_team_size'] ?? 1}</strong> and <strong>{values['max_team_size'] ?? 4}</strong> members. No team will ever be allowed to exceed the maximum size of {values['max_team_size'] ?? 4}.
        </p>
      </Section>

      {/* Team Management Control */}
      <Section title="Team Management Control" icon="🔐">
        {teamMgmtMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">{teamMgmtMsg}</div>}
        {teamMgmtErr && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{teamMgmtErr}</div>}
        
        {teamMgmtSettings && !teamMgmtSettings.is_currently_active && (
          <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-2 rounded-lg text-sm">
            ⚠️ Team management is currently <strong>disabled</strong>. Users cannot create teams, join teams, or send/accept join requests.
          </div>
        )}
        
        <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
          ℹ️ Control when users can create and join teams. When disabled, existing teams remain accessible but no new teams can be created or joined.
        </p>
        
        <div className="flex items-start gap-3">
          <input type="checkbox" id="team-management-enabled"
            checked={teamMgmtEnabled}
            onChange={(e) => setTeamMgmtEnabled(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded text-indigo-600" />
          <div>
            <label htmlFor="team-management-enabled" className="text-sm font-medium text-gray-900 cursor-pointer">
              Enable Team Management
            </label>
            <p className="text-xs text-gray-500 mt-0.5">
              When enabled, users can create teams, join teams, and send/accept join requests
            </p>
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">⏰ Schedule (Optional)</h4>
          <p className="text-xs text-gray-500 mb-3">
            Optionally restrict team management to a specific time window. Leave blank for no time restrictions.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Date & Time">
              <input 
                type="datetime-local" 
                value={teamMgmtStartTime}
                onChange={(e) => setTeamMgmtStartTime(e.target.value)}
                className="input" 
                disabled={!teamMgmtEnabled}
              />
            </Field>
            <Field label="End Date & Time">
              <input 
                type="datetime-local" 
                value={teamMgmtEndTime}
                onChange={(e) => setTeamMgmtEndTime(e.target.value)}
                className="input"
                disabled={!teamMgmtEnabled}
              />
            </Field>
          </div>
          
          {teamMgmtStartTime && teamMgmtEndTime && (
            <p className="text-xs text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg mt-3">
              📅 Team management will be active from <strong>{new Date(teamMgmtStartTime).toLocaleString()}</strong> to <strong>{new Date(teamMgmtEndTime).toLocaleString()}</strong>
            </p>
          )}
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {teamMgmtSettings?.is_currently_active 
              ? '✅ Team management is currently active' 
              : '🚫 Team management is currently disabled'}
          </p>
          <button 
            onClick={handleSaveTeamManagement} 
            disabled={updateTeamManagement.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
            {updateTeamManagement.isPending ? 'Saving…' : '💾 Save Team Management Settings'}
          </button>
        </div>
      </Section>

      {/* System Controls */}
      <Section title="System Controls" icon="⚙️">
        <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg mb-3">
          ℹ️ These settings control system-wide behavior and participant access.
        </p>
        {[
          { key: 'registration_open', label: 'Enable User Registration', desc: 'When disabled, new users cannot register (except through admin panel)' },
          { key: 'show_mentoring_scores_to_participants', label: 'Show Mentoring Scores to Participants', desc: 'When enabled, participants see actual numerical scores. When disabled, they only see feedback status.' },
          { key: 'maintenance_mode', label: 'Enable Maintenance Mode', desc: '⚠️ Warning: Only admins can access the system when maintenance mode is enabled', warn: true },
        ].map(({ key, label, desc, warn }) => (
          <div key={key} className="flex items-start gap-3">
            <input type="checkbox" id={key}
              checked={values[key] === 'true' || values[key] === '1'}
              onChange={(e) => set(key, e.target.checked ? 'true' : 'false')}
              className={`mt-0.5 w-4 h-4 rounded ${warn ? 'text-red-600' : 'text-indigo-600'}`} />
            <div>
              <label htmlFor={key} className="text-sm font-medium text-gray-900 cursor-pointer">{label}</label>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </Section>

      {/* Save */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
        <p className="text-sm text-gray-500">Changes take effect immediately across all services</p>
        <button onClick={handleSave} disabled={updateAll.isPending}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
          {updateAll.isPending ? 'Saving…' : '💾 Save Settings'}
        </button>
      </div>

      {/* Danger Zone: Database Reset */}
      <div className="bg-red-50/60 rounded-xl border border-red-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-red-950 flex items-center gap-2">
              <span className="text-lg">⚠️</span> Danger Zone: Delete All Database Data
            </h3>
            <p className="text-xs text-red-700 mt-1 max-w-2xl leading-relaxed">
              Permanently delete all teams, submissions, scores, participants, mentors, volunteers, messages, and logs from the database.
              <span className="block mt-1 font-semibold text-emerald-800">
                🛡️ Admin account(s) will be preserved and will not be deleted.
              </span>
            </p>
          </div>
          <button
            onClick={handleOpenResetModal}
            type="button"
            className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm whitespace-nowrap self-start sm:self-center flex items-center gap-2"
          >
            <span>🗑️</span>
            <span>Delete All Data</span>
          </button>
        </div>
      </div>

      {/* Caution Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-red-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-red-50 border-b border-red-100 p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-red-600 text-xl font-bold flex-shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-950">Delete All Database Data</h3>
                <p className="text-xs text-red-700 font-medium">High Caution Required • Admin Authentication Enforced</p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {!resetResult ? (
                <>
                  <div className="bg-red-50/70 border border-red-200 rounded-xl p-4 text-xs text-red-900 space-y-2">
                    <p className="font-semibold text-sm text-red-950">
                      This will permanently wipe:
                    </p>
                    <ul className="list-disc list-inside space-y-1 pl-1 text-red-800">
                      <li>All teams, submissions, and GitHub links</li>
                      <li>All scores, judging rounds progress, and reviews</li>
                      <li>All participants, mentors, and volunteers</li>
                      <li>All team invitations, join requests, and chat logs</li>
                      <li>All notifications and support tickets</li>
                    </ul>
                    <div className="pt-2 border-t border-red-200/80 font-medium text-emerald-800 flex items-center gap-1.5">
                      <span>🛡️</span>
                      <span><strong>Admin Protection:</strong> All admin accounts will remain intact and will NOT be deleted.</span>
                    </div>
                  </div>

                  {resetErr && (
                    <div className="bg-red-100 border border-red-300 text-red-900 text-xs rounded-lg p-3">
                      ❌ {resetErr}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-700">
                      To confirm, type <span className="font-mono bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-bold">DELETE ALL DATA</span> below:
                    </label>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="DELETE ALL DATA"
                      disabled={resetDbMutation.isPending}
                      className="w-full border border-gray-300 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-lg px-3 py-2 text-sm font-mono tracking-wider outline-none"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-950 space-y-2">
                    <p className="font-bold text-sm flex items-center gap-2 text-emerald-900">
                      <span>✅</span> Database Data Deleted Successfully!
                    </p>
                    <p className="text-xs text-emerald-800">
                      {resetResult.message}
                    </p>
                  </div>

                  {resetResult.admins_preserved?.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 text-xs border border-gray-200 space-y-1">
                      <p className="font-semibold text-gray-800">Preserved Admin Account(s):</p>
                      {resetResult.admins_preserved.map((a) => (
                        <div key={a.id} className="text-gray-600 font-mono text-[11px]">
                          • {a.name} ({a.email})
                        </div>
                      ))}
                    </div>
                  )}

                  {resetResult.deleted_counts && Object.keys(resetResult.deleted_counts).length > 0 && (
                    <div className="max-h-36 overflow-y-auto bg-gray-50 rounded-lg p-3 text-xs border border-gray-200 space-y-1">
                      <p className="font-semibold text-gray-800">Deleted Record Summary:</p>
                      {Object.entries(resetResult.deleted_counts)
                        .filter(([_, count]) => count > 0)
                        .map(([tbl, count]) => (
                          <div key={tbl} className="flex justify-between text-gray-600 text-[11px]">
                            <span>{tbl}</span>
                            <span className="font-mono font-medium">{count}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              {!resetResult ? (
                <>
                  <button
                    type="button"
                    onClick={handleCloseResetModal}
                    disabled={resetDbMutation.isPending}
                    className="px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteReset}
                    disabled={confirmText.trim() !== 'DELETE ALL DATA' || resetDbMutation.isPending}
                    className="px-5 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors shadow-sm flex items-center gap-2"
                  >
                    {resetDbMutation.isPending ? (
                      <>
                        <span className="inline-block animate-spin">⏳</span>
                        <span>Deleting Database Data...</span>
                      </>
                    ) : (
                      'Permanently Delete All Data'
                    )}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleCloseResetModal}
                  className="px-5 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h3 className="font-semibold text-gray-900">{icon} {title}</h3>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}
