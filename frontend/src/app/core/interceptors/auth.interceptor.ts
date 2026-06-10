import {
  HttpErrorResponse,
  HttpRequest,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let refreshRequestInFlight = false;
const refreshedToken$ = new BehaviorSubject<string | null>(null);

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

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const accessToken = authService.accessToken();
  const skipAuthHeader = isAuthBypassUrl(req.url);

  const authReq = withAuthHeader(req, !skipAuthHeader ? accessToken : null);

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || skipAuthHeader || req.url.includes('/auth/refresh')) {
        return throwError(() => error);
      }

      if (refreshRequestInFlight) {
        return refreshedToken$.pipe(
          filter((token): token is string => Boolean(token)),
          take(1),
          switchMap((token) => next(withAuthHeader(req, token)))
        );
      }

      refreshRequestInFlight = true;
      refreshedToken$.next(null);

      return authService.refreshToken().pipe(
        switchMap((response) => {
          refreshRequestInFlight = false;

          if (!response.data?.accessToken) {
            refreshedToken$.next(null);
            authService.logout();
            return throwError(() => error);
          }

          authService.setSession(response.data.accessToken, response.data.user);
          refreshedToken$.next(response.data.accessToken);

          return next(withAuthHeader(req, response.data.accessToken));
        }),
        catchError((refreshError) => {
          refreshRequestInFlight = false;
          refreshedToken$.next(null);
          authService.logout();
          return throwError(() => refreshError);
        })
      );
    })
  );
};
