import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let refreshRequestInFlight = false;

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

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const accessToken = authService.accessToken();
  const skipAuthHeader = isAuthBypassUrl(req.url);

  let authReq = req.clone({ withCredentials: true });

  if (accessToken && !skipAuthHeader) {
    authReq = authReq.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || skipAuthHeader || req.url.includes('/auth/refresh')) {
        return throwError(() => error);
      }

      if (refreshRequestInFlight) {
        return throwError(() => error);
      }

      refreshRequestInFlight = true;

      return authService.refreshToken().pipe(
        switchMap((response) => {
          refreshRequestInFlight = false;

          if (!response.data?.accessToken) {
            authService.logout();
            return throwError(() => error);
          }

          authService.setSession(response.data.accessToken, response.data.user);

          const retryReq = req.clone({
            withCredentials: true,
            setHeaders: {
              Authorization: `Bearer ${response.data.accessToken}`,
            },
          });

          return next(retryReq);
        }),
        catchError((refreshError) => {
          refreshRequestInFlight = false;
          authService.logout();
          return throwError(() => refreshError);
        })
      );
    })
  );
};
