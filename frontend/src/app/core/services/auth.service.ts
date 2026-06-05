import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, finalize, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { APP_ROUTES } from '../constants/routes.constant';
import { USER_ROLES } from '../constants/roles.constant';
import { ApiResponse } from '../models/api-response.model';
import {
  AuthResponseData,
  AuthUser,
  ChangePasswordRequest,
  ChangeEmailRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  RegisterResponseData,
  ResetPasswordRequest,
} from '../models/user.model';
import { TokenStorageService } from './token-storage.service';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  initialized: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenStorage = inject(TokenStorageService);

  private readonly state = signal<AuthState>({
    user: null,
    accessToken: null,
    initialized: false,
  });

  readonly user = computed(() => this.state().user);
  readonly accessToken = computed(() => this.state().accessToken);
  readonly isAuthenticated = computed(() => !!this.state().accessToken);
  readonly isInitialized = computed(() => this.state().initialized);
  readonly isCandidate = computed(() => this.state().user?.role === USER_ROLES.CANDIDATE);
  readonly isRecruiter = computed(() => this.state().user?.role === USER_ROLES.RECRUITER);
  readonly isAdmin = computed(() => this.state().user?.role === USER_ROLES.ADMIN);
  readonly isTrainingProvider = computed(
    () => this.state().user?.role === USER_ROLES.TRAINING_PROVIDER
  );
  readonly isInstitutionProvider = computed(
    () => this.state().user?.role === USER_ROLES.INSTITUTION_PROVIDER
  );

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private readonly apiUrl = environment.apiUrl;

  constructor() {
    this.hydrateFromStorage();
  }

  hydrateFromStorage(): void {
    const accessToken = this.tokenStorage.getAccessToken();
    const user = this.tokenStorage.getUser();

    this.state.set({
      user,
      accessToken,
      initialized: true,
    });
  }

  clearError(): void {
    this.errorMessage.set(null);
  }

  login(payload: LoginRequest): Observable<ApiResponse<AuthResponseData>> {
    this.loading.set(true);
    this.clearError();

    return this.http
      .post<ApiResponse<AuthResponseData>>(`${this.apiUrl}/auth/login`, payload, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.data) {
            this.setSession(response.data.accessToken, response.data.user);
            this.navigateByRole(response.data.user.role);
          }
        }),
        finalize(() => this.loading.set(false))
      );
  }

  register(payload: RegisterRequest): Observable<ApiResponse<RegisterResponseData>> {
    this.loading.set(true);
    this.clearError();

    return this.http
      .post<ApiResponse<RegisterResponseData>>(`${this.apiUrl}/auth/register`, payload)
      .pipe(finalize(() => this.loading.set(false)));
  }

  forgotPassword(payload: ForgotPasswordRequest): Observable<ApiResponse<null>> {
    this.loading.set(true);
    this.clearError();

    return this.http
      .post<ApiResponse<null>>(`${this.apiUrl}/auth/forgot-password`, payload)
      .pipe(finalize(() => this.loading.set(false)));
  }

  resetPassword(payload: ResetPasswordRequest): Observable<ApiResponse<null>> {
    this.loading.set(true);
    this.clearError();

    return this.http
      .post<ApiResponse<null>>(`${this.apiUrl}/auth/reset-password`, payload)
      .pipe(finalize(() => this.loading.set(false)));
  }

  changePassword(payload: ChangePasswordRequest): Observable<ApiResponse<null>> {
    this.loading.set(true);
    this.clearError();

    return this.http
      .post<ApiResponse<null>>(`${this.apiUrl}/auth/change-password`, payload, {
        withCredentials: true,
      })
      .pipe(
        tap(() => this.logout(false)),
        finalize(() => this.loading.set(false))
      );
  }

  changeEmail(
    payload: ChangeEmailRequest
  ): Observable<ApiResponse<{ email: string; devVerifyUrl?: string }>> {
    this.loading.set(true);
    this.clearError();

    return this.http
      .post<ApiResponse<{ email: string; devVerifyUrl?: string }>>(
        `${this.apiUrl}/auth/change-email`,
        payload,
        {
        withCredentials: true,
      })
      .pipe(
        tap(() => this.logout(false)),
        finalize(() => this.loading.set(false))
      );
  }

  verifyEmail(token: string): Observable<ApiResponse<{ email: string }>> {
    return this.http.post<ApiResponse<{ email: string }>>(
      `${this.apiUrl}/auth/verify-email`,
      { token }
    );
  }

  resendVerification(
    email: string
  ): Observable<ApiResponse<{ devVerifyUrl?: string } | null>> {
    this.loading.set(true);
    this.clearError();
    return this.http
      .post<ApiResponse<{ devVerifyUrl?: string } | null>>(
        `${this.apiUrl}/auth/resend-verification`,
        { email }
      )
      .pipe(finalize(() => this.loading.set(false)));
  }

  refreshToken(): Observable<ApiResponse<AuthResponseData>> {
    return this.http.post<ApiResponse<AuthResponseData>>(
      `${this.apiUrl}/auth/refresh`,
      {},
      { withCredentials: true }
    );
  }

  setSession(accessToken: string, user: AuthUser): void {
    this.tokenStorage.setAccessToken(accessToken);
    this.tokenStorage.setUser(user);

    this.state.update((current) => ({
      ...current,
      accessToken,
      user,
      initialized: true,
    }));
  }

  logout(redirect = true): void {
    this.tokenStorage.clear();
    this.state.set({
      user: null,
      accessToken: null,
      initialized: true,
    });

    if (redirect) {
      void this.router.navigate([APP_ROUTES.HOME]);
    }
  }

  navigateByRole(role: AuthUser['role']): void {
    if (role === USER_ROLES.CANDIDATE) {
      void this.router.navigate([APP_ROUTES.CANDIDATE.DASHBOARD]);
      return;
    }

    if (role === USER_ROLES.RECRUITER) {
      void this.router.navigate([APP_ROUTES.RECRUITER.DASHBOARD]);
      return;
    }

    if (role === USER_ROLES.ADMIN) {
      void this.router.navigate([APP_ROUTES.ADMIN.DASHBOARD]);
      return;
    }

    if (role === USER_ROLES.TRAINING_PROVIDER) {
      void this.router.navigate([APP_ROUTES.PROVIDER.TRAINING]);
      return;
    }

    if (role === USER_ROLES.INSTITUTION_PROVIDER) {
      void this.router.navigate([APP_ROUTES.PROVIDER.INSTITUTION]);
      return;
    }

    void this.router.navigate([APP_ROUTES.HOME]);
  }

  setError(message: string): void {
    this.errorMessage.set(message);
  }
}
