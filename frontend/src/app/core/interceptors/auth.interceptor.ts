import {
  HttpErrorResponse,
  HttpRequest,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, catchError, filter, map, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let refreshRequestInFlight = false;
const refreshedToken$ = new BehaviorSubject<string | null>(null);
const REFRESH_SKEW_MS = 30_000;

function isAuthBypassUrl(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/reset-password') ||
    url.includes('/auth/verify-email') ||
    url.includes('/auth/resend-verification')
  );
}

function withAuthHeader(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  const baseReq = req.clone({ withCredentials: true });

  if (!token) {
    return baseReq;
  }

  return baseReq.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

function decodeJwtPayload(token: string): { exp?: number } | null {
  const [, payload] = token.split('.');
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as { exp?: number };
  } catch {
    return null;
  }
}

function shouldRefreshAccessToken(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;

  return payload.exp * 1000 <= Date.now() + REFRESH_SKEW_MS;
}

function refreshAccessToken(authService: AuthService) {
  if (refreshRequestInFlight) {
    return refreshedToken$.pipe(
      filter((token): token is string => Boolean(token)),
      take(1)
    );
  }

  refreshRequestInFlight = true;
  refreshedToken$.next(null);

  return authService.refreshToken().pipe(
    map((response) => {
      refreshRequestInFlight = false;

      if (!response.data?.accessToken) {
        refreshedToken$.next(null);
        authService.logout();
        throw new Error('Unable to refresh access token');
      }

      authService.setSession(response.data.accessToken, response.data.user);
      refreshedToken$.next(response.data.accessToken);
      return response.data.accessToken;
    }),
    catchError((refreshError) => {
      refreshRequestInFlight = false;
      refreshedToken$.next(null);
      authService.logout();
      return throwError(() => refreshError);
    })
  );
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const accessToken = authService.accessToken();
  const skipAuthHeader = isAuthBypassUrl(req.url);

  if (!skipAuthHeader && accessToken && shouldRefreshAccessToken(accessToken)) {
    return refreshAccessToken(authService).pipe(
      switchMap((token) => next(withAuthHeader(req, token)))
    );
  }

  const authReq = withAuthHeader(req, !skipAuthHeader ? accessToken : null);

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || skipAuthHeader || req.url.includes('/auth/refresh')) {
        return throwError(() => error);
      }

      return refreshAccessToken(authService).pipe(
        switchMap((token) => next(withAuthHeader(req, token))),
        catchError((refreshError) => throwError(() => refreshError || error))
      );
    })
  );
};
