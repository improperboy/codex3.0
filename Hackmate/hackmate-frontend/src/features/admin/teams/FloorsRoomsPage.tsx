import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, Floor, Room, TeamLocationInfo, TeamReassignItem } from '@/api/admin'

// ── Reassign Modal ─────────────────────────────────────────────────────────

interface ReassignModalProps {
  teams: TeamLocationInfo[]
  floors: Floor[]
  rooms: Room[]
  onConfirm: (reassignments: TeamReassignItem[]) => void
  onCancel: () => void
  loading: boolean
}

function ReassignModal({ teams, floors, rooms, onConfirm, onCancel, loading }: ReassignModalProps) {
  const [assignments, setAssignments] = useState<Record<number, { floor_id: string; room_id: string }>>(
    Object.fromEntries(teams.map((t) => [t.team_id, { floor_id: '', room_id: '' }]))
  )

  const setFloor = (teamId: number, floor_id: string) =>
    setAssignments((prev) => ({ ...prev, [teamId]: { floor_id, room_id: '' } }))

  const setRoom = (teamId: number, room_id: string) =>
    setAssignments((prev) => ({ ...prev, [teamId]: { ...prev[teamId], room_id } }))

  const allAssigned = teams.every(
    (t) => assignments[t.team_id]?.floor_id && assignments[t.team_id]?.room_id
  )

  const handleConfirm = () => {
    const reassignments: TeamReassignItem[] = teams.map((t) => ({
      team_id: t.team_id,
      new_floor_id: Number(assignments[t.team_id].floor_id),
      new_room_id: Number(assignments[t.team_id].room_id),
    }))
    onConfirm(reassignments)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Reassign Teams Before Deleting</h2>
          <p className="text-sm text-gray-500 mt-1">
            The following teams are assigned to this location. Reassign each one to proceed with deletion.
          </p>
        </div>

        <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
          {teams.map((team) => {
            const selectedFloor = assignments[team.team_id]?.floor_id
            const availableRooms = rooms.filter((r) => String(r.floor_id) === selectedFloor)
            return (
              <div key={team.team_id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium text-gray-800">{team.team_name}</p>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={selectedFloor}
                    onChange={(e) => setFloor(team.team_id, e.target.value)}
                    className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">New Floor</option>
                    {floors.map((f) => (
                      <option key={f.id} value={f.id}>Floor {f.floor_number}</option>
                    ))}
                  </select>
                  <select
                    value={assignments[team.team_id]?.room_id}
                    onChange={(e) => setRoom(team.team_id, e.target.value)}
                    disabled={!selectedFloor}
                    className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    <option value="">New Room</option>
                    {availableRooms.map((r) => (
                      <option key={r.id} value={r.id}>Room {r.room_number}</option>
                    ))}
                  </select>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!allAssigned || loading}
            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? 'Reassigning...' : 'Reassign & Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

interface PendingDelete {
  type: 'floor' | 'room'
  id: number
  teams: TeamLocationInfo[]
}

export default function FloorsRoomsPage() {
  const qc = useQueryClient()
  const [floorNum, setFloorNum] = useState('')
  const [floorDesc, setFloorDesc] = useState('')
  const [roomFloor, setRoomFloor] = useState('')
  const [roomNum, setRoomNum] = useState('')
  const [roomCap, setRoomCap] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)

  const { data: floors = [] } = useQuery({ queryKey: ['floors'], queryFn: adminApi.getFloors })
  const { data: rooms = [] } = useQuery({ queryKey: ['rooms'], queryFn: adminApi.getRooms })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['floors'] })
    qc.invalidateQueries({ queryKey: ['rooms'] })
  }

  const addFloor = useMutation({
    mutationFn: () => adminApi.createFloor(floorNum, floorDesc || undefined),
    onSuccess: () => { invalidate(); setMsg('Floor added!'); setFloorNum(''); setFloorDesc('') },
    onError: (e: any) => setErr(e?.response?.data?.detail ?? 'Failed to add floor'),
  })

  const addRoom = useMutation({
    mutationFn: () => adminApi.createRoom(Number(roomFloor), roomNum, Number(roomCap)),
    onSuccess: () => { invalidate(); setMsg('Room added!'); setRoomFloor(''); setRoomNum(''); setRoomCap('') },
    onError: (e: any) => setErr(e?.response?.data?.detail ?? 'Failed to add room'),
  })

  const deleteFloor = useMutation({
    mutationFn: adminApi.deleteFloor,
    onSuccess: () => { invalidate(); setMsg('Floor deleted'); setPendingDelete(null) },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail
      if (e?.response?.status === 409 && detail?.teams) {
        setPendingDelete({ type: 'floor', id: pendingDeleteId!, teams: detail.teams })
        setErr(detail.message ?? 'Teams are assigned to this floor.')
      } else {
        setErr(typeof detail === 'string' ? detail : 'Failed to delete floor')
      }
    },
  })

  const deleteRoom = useMutation({
    mutationFn: adminApi.deleteRoom,
    onSuccess: () => { invalidate(); setMsg('Room deleted'); setPendingDelete(null) },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail
      if (e?.response?.status === 409 && detail?.teams) {
        setPendingDelete({ type: 'room', id: pendingDeleteId!, teams: detail.teams })
        setErr(detail.message ?? 'Teams are assigned to this room.')
      } else {
        setErr(typeof detail === 'string' ? detail : 'Failed to delete room')
      }
    },
  })

  const reassignAndDelete = useMutation({
    mutationFn: async ({ reassignments, deleteType, deleteId }: {
      reassignments: TeamReassignItem[]
      deleteType: 'floor' | 'room'
      deleteId: number
    }) => {
      await adminApi.bulkReassignTeams(reassignments)
      if (deleteType === 'floor') await adminApi.deleteFloor(deleteId)
      else await adminApi.deleteRoom(deleteId)
    },
    onSuccess: () => {
      invalidate()
      setMsg('Teams reassigned and location deleted.')
      setPendingDelete(null)
      setErr('')
    },
    onError: (e: any) => setErr(e?.response?.data?.detail?.message ?? 'Reassignment failed'),
  })

  const handleDeleteFloor = (id: number) => {
    setMsg(''); setErr('')
    setPendingDeleteId(id)
    deleteFloor.mutate(id)
  }

  const handleDeleteRoom = (id: number) => {
    setMsg(''); setErr('')
    setPendingDeleteId(id)
    deleteRoom.mutate(id)
  }

  const handleReassignConfirm = (reassignments: TeamReassignItem[]) => {
    if (!pendingDelete) return
    reassignAndDelete.mutate({
      reassignments,
      deleteType: pendingDelete.type,
      deleteId: pendingDelete.id,
    })
  }

  const getFloorNum = (id: number) => floors.find((f) => f.id === id)?.floor_number ?? id

  return (
    <div className="space-y-5">
      {pendingDelete && (
        <ReassignModal
          teams={pendingDelete.teams}
          floors={floors}
          rooms={rooms}
          onConfirm={handleReassignConfirm}
          onCancel={() => { setPendingDelete(null); setErr('') }}
          loading={reassignAndDelete.isPending}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Floors & Rooms</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage venue floors and rooms</p>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">{msg}</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{err}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Floors */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Add Floor</h3>
            <div className="space-y-3">
              <input type="text" placeholder="Floor number (e.g., 1, 2, Ground)" value={floorNum} onChange={(e) => setFloorNum(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <input type="text" placeholder="Description (optional)" value={floorDesc} onChange={(e) => setFloorDesc(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <button disabled={!floorNum} onClick={() => { setMsg(''); setErr(''); addFloor.mutate() }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                + Add Floor
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Floors ({floors.length})</h3>
            </div>
            {floors.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">No floors yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {floors.map((f) => (
                  <div key={f.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">Floor {f.floor_number}</span>
                      {f.description && <span className="text-xs text-gray-500 ml-2">{f.description}</span>}
                    </div>
                    <button
                      onClick={() => { if (confirm('Delete this floor and all its rooms?')) handleDeleteFloor(f.id) }}
                      className="text-red-500 hover:text-red-700 text-xs transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rooms */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Add Room</h3>
            <div className="space-y-3">
              <select value={roomFloor} onChange={(e) => setRoomFloor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select Floor</option>
                {floors.map((f) => <option key={f.id} value={f.id}>Floor {f.floor_number}</option>)}
              </select>
              <input type="text" placeholder="Room number (e.g., 101, A1)" value={roomNum} onChange={(e) => setRoomNum(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <input type="number" placeholder="Capacity" min={1} value={roomCap} onChange={(e) => setRoomCap(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <button disabled={!roomFloor || !roomNum || !roomCap} onClick={() => { setMsg(''); setErr(''); addRoom.mutate() }}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                + Add Room
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Rooms ({rooms.length})</h3>
            </div>
            {rooms.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">No rooms yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {rooms.map((r) => (
                  <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">Room {r.room_number}</span>
                      <span className="text-xs text-gray-500 ml-2">Floor {getFloorNum(r.floor_id)} · Cap: {r.capacity}</span>
                    </div>
                    <button
                      onClick={() => { if (confirm('Delete this room?')) handleDeleteRoom(r.id) }}
                      className="text-red-500 hover:text-red-700 text-xs transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
