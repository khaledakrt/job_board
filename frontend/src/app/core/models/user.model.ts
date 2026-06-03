import { UserRole } from '../constants/roles.constant';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role: 'candidate' | 'recruiter';
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangeEmailRequest {
  newEmail: string;
  confirmNewEmail: string;
  currentPassword: string;
}

export interface AuthResponseData {
  user: AuthUser;
  accessToken: string;
}

export interface RegisterResponseData {
  id: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
}
