import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import client from '@/api/client'
import type { User } from '@/types/user'
import { Trash2 } from 'lucide-react'

export default function VolunteerAssignmentsPage() {
  const qc = useQueryClient()
  const [volunteerId, setVolunteerId] = useState('')
  const [floorId, setFloorId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const { data: volunteers = [] } = useQuery<User[]>({
    queryKey: ['volunteers'],
    queryFn: () => client.get<{ total: number; users: User[] }>('/users/', { params: { role: 'volunteer' } }).then((r) => r.data.users ?? []),
  })
  const { data: floors = [] } = useQuery({ queryKey: ['floors'], queryFn: adminApi.getFloors })
  const { data: rooms = [] } = useQuery({ queryKey: ['rooms'], queryFn: adminApi.getRooms })
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['volunteer-assignments'],
    queryFn: adminApi.getVolunteerAssignments,
  })

  const assign = useMutation({
    mutationFn: () => adminApi.assignVolunteer(Number(volunteerId), Number(floorId), Number(roomId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['volunteer-assignments'] })
      setMsg('Volunteer assigned successfully!')
      setVolunteerId(''); setFloorId(''); setRoomId('')
      setTimeout(() => setMsg(''), 3000)
    },
    onError: (e: any) => { setErr(e?.response?.data?.detail ?? 'Failed to assign'); setTimeout(() => setErr(''), 4000) },
  })

  const unassign = useMutation({
    mutationFn: (id: number) => adminApi.removeVolunteerAssignment(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['volunteer-assignments'] }); setMsg('Assignment removed.'); setTimeout(() => setMsg(''), 3000) },
    onError: (e: any) => { setErr(e?.response?.data?.detail ?? 'Failed to remove'); setTimeout(() => setErr(''), 4000) },
  })

  const filteredRooms = floorId ? rooms.filter((r) => r.floor_id === Number(floorId)) : rooms
  const assignedVolunteerIds = new Set(assignments.map((a) => a.volunteer_id))

  const getVolunteerName = (id: number) => volunteers.find((v) => v.id === id)?.name ?? 'Volunteer'
  const getFloorNum = (id: number) => floors.find((f) => f.id === id)?.floor_number ?? `Floor ${id}`
  const getRoomNum = (id: number) => rooms.find((r) => r.id === id)?.room_number ?? `Room ${id}`

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Volunteer Assignments</h1>
        <p className="text-gray-500 text-sm mt-0.5">Assign volunteers to floors and rooms — they can only see teams and mentors in their assigned location</p>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">{msg}</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{err}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Volunteers', value: volunteers.length, icon: '🤝' },
          { label: 'Assigned', value: assignedVolunteerIds.size, icon: '✅' },
          { label: 'Unassigned', value: volunteers.length - assignedVolunteerIds.size, icon: '⏳' },
          { label: 'Total Assignments', value: assignments.length, icon: '📌' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-800">
        ℹ️ Unassigned volunteers cannot see any teams or mentors. Assign them to a floor and room to grant access.
      </div>

      {/* Assignment Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Assign Volunteer to Location</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Volunteer</label>
            <select value={volunteerId} onChange={(e) => setVolunteerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Choose volunteer…</option>
              {volunteers.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}{assignedVolunteerIds.has(v.id) ? ' (assigned)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
            <select value={floorId} onChange={(e) => { setFloorId(e.target.value); setRoomId('') }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Select Floor</option>
              {floors.map((f) => <option key={f.id} value={f.id}>{f.floor_number}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Select Room</option>
              {filteredRooms.map((r) => <option key={r.id} value={r.id}>{r.room_number} (Cap: {r.capacity})</option>)}
            </select>
          </div>
        </div>
        <button
          disabled={!volunteerId || !floorId || !roomId || assign.isPending}
          onClick={() => { setMsg(''); setErr(''); assign.mutate() }}
          className="mt-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
          {assign.isPending ? 'Assigning…' : '+ Assign Volunteer'}
        </button>
      </div>

      {/* Current Assignments */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Current Assignments ({assignments.length})</h3>
        </div>
        {isLoading ? (
          <div className="py-10 text-center text-gray-400">Loading…</div>
        ) : assignments.length === 0 ? (
          <div className="py-10 text-center text-gray-400">No assignments yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left">Volunteer</th>
                  <th className="px-5 py-3 text-left">Location</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 text-xs font-semibold">
                          {getVolunteerName(a.volunteer_id).slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{getVolunteerName(a.volunteer_id)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 text-xs font-medium px-2.5 py-1 rounded-full">
                        📍 {getFloorNum(a.floor_id)} — {getRoomNum(a.room_id)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => unassign.mutate(a.id)}
                        disabled={unassign.isPending}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors disabled:opacity-50"
                        title="Remove assignment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unassigned volunteers */}
      {volunteers.filter((v) => !assignedVolunteerIds.has(v.id)).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <span className="text-yellow-500">⚠️</span>
            <h3 className="font-semibold text-gray-900">Unassigned Volunteers</h3>
            <span className="text-xs text-gray-400 ml-1">— cannot see any data until assigned</span>
          </div>
          <div className="divide-y divide-gray-100">
            {volunteers.filter((v) => !assignedVolunteerIds.has(v.id)).map((v) => (
              <div key={v.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 text-xs font-semibold">
                    {v.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{v.name}</p>
                    <p className="text-xs text-gray-400">{v.email}</p>
                  </div>
                </div>
                <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">Not assigned</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
