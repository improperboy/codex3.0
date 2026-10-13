import client from './client'
import type {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  ChangePasswordRequest,
} from '@/types/auth'

export const authApi = {
  login: (data: LoginRequest) =>
    client.post<TokenResponse>('/auth/login', data).then((r) => r.data),

  register: (data: RegisterRequest) =>
    client.post<TokenResponse>('/auth/register', data).then((r) => r.data),

  logout: () => client.post('/auth/logout').then((r) => r.data),

  me: () =>
    client
      .get<{ id: number; name: string; email: string; role: string }>('/auth/me')
      .then((r) => r.data),

  changePassword: (data: ChangePasswordRequest) =>
    client.put('/auth/change-password', data).then((r) => r.data),
}
