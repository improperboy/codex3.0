import { useQuery } from '@tanstack/react-query'
import { usersApi } from '@/api/users'
import type { User } from '@/types/user'

/**
 * Batch-fetches user info for a list of user IDs.
 * Returns a stable map: { [userId]: User }.
 * Safe to call with an empty array -- skips the fetch entirely.
 */
export function useUserMap(userIds: number[]): Record<number, User> {
  const unique = [...new Set(userIds)].sort()

  const { data = {} } = useQuery({
    queryKey: ['user-map', unique],
    queryFn: () => usersApi.getByIds(unique),
    enabled: unique.length > 0,
    staleTime: 5 * 60 * 1000, // 5 min -- user names rarely change mid-session
  })

  return data
}
