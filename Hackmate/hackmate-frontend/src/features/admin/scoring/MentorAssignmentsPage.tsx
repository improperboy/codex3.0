import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import client from '@/api/client'
import type { User } from '@/types/user'

export default function MentorAssignmentsPage() {
  const qc = useQueryClient()
  const [mentorId, setMentorId] = useState('')
  const [floorId, setFloorId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const { data: mentors = [] } = useQuery<User[]>({
    queryKey: ['mentors'],
    queryFn: () => client.get<{ total: number; users: User[] }>('/users/', { params: { role: 'mentor' } }).then((r) => r.data.users ?? []),
  })
  const { data: floors = [] } = useQuery({ queryKey: ['floors'], queryFn: adminApi.getFloors })
  const { data: rooms = [] } = useQuery({ queryKey: ['rooms'], queryFn: adminApi.getRooms })
  const { data: assignments = [], isLoading } = useQuery({ queryKey: ['mentor-assignments'], queryFn: adminApi.getMentorAssignments })

  const assign = useMutation({
    mutationFn: () => adminApi.assignMentor(Number(mentorId), Number(floorId), Number(roomId)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mentor-assignments'] }); setMsg('Mentor assigned!'); setMentorId(''); setFloorId(''); setRoomId('') },
    onError: (e: any) => setErr(e?.response?.data?.detail ?? 'Failed to assign'),
  })

  const remove = useMutation({
    mutationFn: (id: number) => adminApi.removeMentorAssignment(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mentor-assignments'] }); setMsg('Assignment removed') },
    onError: () => setErr('Failed to remove'),
  })

  const filteredRooms = floorId ? rooms.filter((r) => r.floor_id === Number(floorId)) : rooms

  const getMentorName = (id: number) => mentors.find((m) => m.id === id)?.name ?? 'Mentor'
  const getFloorNum = (id: number) => floors.find((f) => f.id === id)?.floor_number ?? id
  const getRoomNum = (id: number) => rooms.find((r) => r.id === id)?.room_number ?? id

  const stats = {
    total: mentors.length,
    assigned: new Set(assignments.map((a) => a.mentor_id)).size,
    totalAssignments: assignments.length,
    totalRooms: rooms.length,
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mentor Assignments</h1>
        <p className="text-gray-500 text-sm mt-0.5">Assign mentors to floors and rooms</p>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">{msg}</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{err}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Mentors', value: stats.total, icon: '🎓' },
          { label: 'Assigned Mentors', value: stats.assigned, icon: '✅' },
          { label: 'Total Assignments', value: stats.totalAssignments, icon: '📌' },
          { label: 'Available Rooms', value: stats.totalRooms, icon: '🚪' },
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

      {/* Assignment Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Assign Mentor to Location</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Mentor</label>
            <select value={mentorId} onChange={(e) => setMentorId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Choose mentor…</option>
              {mentors.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
            <select value={floorId} onChange={(e) => { setFloorId(e.target.value); setRoomId('') }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select Floor</option>
              {floors.map((f) => <option key={f.id} value={f.id}>Floor {f.floor_number}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select Room</option>
              {filteredRooms.map((r) => <option key={r.id} value={r.id}>Room {r.room_number} (Cap: {r.capacity})</option>)}
            </select>
          </div>
        </div>
        <button
          disabled={!mentorId || !floorId || !roomId}
          onClick={() => { setMsg(''); setErr(''); assign.mutate() }}
          className="mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
          + Assign Mentor
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
                  <th className="px-5 py-3 text-left">Mentor</th>
                  <th className="px-5 py-3 text-left">Location</th>
                  <th className="px-5 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-xs font-semibold">
                          {getMentorName(a.mentor_id).slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{getMentorName(a.mentor_id)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">Floor {getFloorNum(a.floor_id)} · Room {getRoomNum(a.room_id)}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => { if (confirm('Remove this assignment?')) { setMsg(''); setErr(''); remove.mutate(a.id) } }}
                        className="text-red-500 hover:text-red-700 text-xs font-medium transition-colors">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
