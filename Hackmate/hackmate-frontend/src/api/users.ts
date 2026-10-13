import client from './client'
import type { User } from '@/types/user'

export const usersApi = {
  search: (params: { q?: string; tech?: string; team_id?: number }) =>
    client.get<{ total: number; users: User[] }>('/users/search', { params }).then((r) => r.data.users),

  getMe: () =>
    client.get<User>('/users/me').then((r) => r.data),

  getById: (id: number) =>
    client.get<User>(`/users/${id}`).then((r) => r.data),

  /** Fetch multiple users by their IDs in parallel, returning a map id → User. */
  getByIds: async (ids: number[]): Promise<Record<number, User>> => {
    const unique = [...new Set(ids)]
    const results = await Promise.allSettled(
      unique.map((id) =>
        client
          .get<User>(`/users/${id}`)
          .then((r) => r.data)
          .catch((err) => {
            if (err?.response?.status === 403) return null
            throw err
          }),
      ),
    )
    const map: Record<number, User> = {}
    results.forEach((res, i) => {
      if (res.status === 'fulfilled' && res.value !== null) {
        map[unique[i]] = res.value
      }
    })
    return map
  },
}
