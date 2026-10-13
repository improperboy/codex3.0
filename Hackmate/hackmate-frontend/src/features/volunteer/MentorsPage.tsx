import { useQuery } from '@tanstack/react-query'
import { volunteerApi } from '@/api/volunteer'
import { MapPin, User, AlertTriangle, Code2 } from 'lucide-react'

export default function VolunteerMentorsPage() {
  const { data: assignments = [] } = useQuery({
    queryKey: ['volunteer-assignments'],
    queryFn: volunteerApi.getMyAssignments,
  })

  const { data: mentors = [], isLoading } = useQuery({
    queryKey: ['volunteer-assigned-mentors'],
    queryFn: volunteerApi.getAssignedMentors,
    enabled: assignments.length > 0,
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mentors in My Area</h1>
        <p className="text-gray-500 text-sm mt-0.5">Mentors assigned to your floor/room locations</p>
      </div>

      {/* Location banner */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-5 text-white">
        <h2 className="text-lg font-bold mb-2">Your Assigned Locations</h2>
        {assignments.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {assignments.map((a) => (
              <span key={a.id} className="bg-white/20 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {a.floor_number ?? `Floor ${a.floor_id}`} — {a.room_number ?? `Room ${a.room_id}`}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-teal-100 text-sm">No locations assigned yet</p>
        )}
      </div>

      {/* No assignment warning */}
      {assignments.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">No location assigned</p>
            <p className="text-xs text-yellow-600 mt-0.5">Contact an admin to get assigned to a floor and room. You can only see mentors in your assigned area.</p>
          </div>
        </div>
      )}

      {/* Mentors list */}
      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading mentors…</div>
      ) : mentors.length === 0 && assignments.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No Mentors Found</h3>
          <p className="text-gray-500 text-sm">No mentors are assigned to your locations yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mentors.map((mentor) => (
            <div key={mentor.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {mentor.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{mentor.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{mentor.email}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-teal-600 bg-teal-50 px-2 py-1 rounded-full w-fit">
                    <MapPin className="w-3 h-3" />
                    {mentor.floor_number} — {mentor.room_number}
                  </div>
                  {mentor.tech_stack && (
                    <div className="mt-3">
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1.5">
                        <Code2 className="w-3 h-3" /> Skills
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {mentor.tech_stack.split(',').slice(0, 5).map((s) => (
                          <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {s.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
