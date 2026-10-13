export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  role: 'participant' | 'mentor' | 'volunteer'
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user_id: number
  role: string
  name: string
}

export interface AuthUser {
  id: number
  name: string
  role: string
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}
