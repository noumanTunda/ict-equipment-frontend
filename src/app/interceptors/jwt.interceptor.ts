import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpRequest,
  HttpHandlerFn,
} from '@angular/common/http';
import {
  BehaviorSubject,
  catchError,
  filter,
  finalize,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import { AuthService } from '../services/auth.service';
import {environment} from "../../environments/environment";

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | false | null>(null);

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  const isApiRequest = req.url.includes(`${environment.apiUrl}`);
  const isAuthRequest = req.url.includes('/auth/');

  if (
    isApiRequest &&
    !isAuthRequest &&
    token &&
    authService.isTokenExpired(token)
  ) {
    return handleExpiredToken(req, next, authService);
  }

  let authReq = req;
  if (token && isApiRequest && !isAuthRequest) {
    authReq = addTokenHeader(req, token);
  }

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.url.includes('/auth/login') &&
        !req.url.includes('/auth/register') &&
        !req.url.includes('/auth/refresh')
      ) {
        return handleExpiredToken(req, next, authService);
      }
      return throwError(() => error);
    }),
  );
};

function addTokenHeader(
  request: HttpRequest<unknown>,
  token: string,
): HttpRequest<unknown> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

function handleExpiredToken(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((authResponse) => {
        isRefreshing = false;
        refreshTokenSubject.next(authResponse.accessToken);
        return next(addTokenHeader(request, authResponse.accessToken));
      }),
      catchError((refreshErr) => {
        isRefreshing = false;
        refreshTokenSubject.next(false);
        authService.logout();
        return throwError(() => refreshErr);
      }),
      finalize(() => {
        if (isRefreshing && refreshTokenSubject.value === null) {
          isRefreshing = false;
        }
      }),
    );
  } else {
    return refreshTokenSubject.pipe(
      filter((token) => token !== null),
      take(1),
      switchMap((token) => {
        if (token === false) {
          authService.logout();
          return throwError(() => new Error('Token refresh failed'));
        }

        if (typeof token === 'string') {
          return next(addTokenHeader(request, token));
        }

        return throwError(() => new Error('Invalid token state'));
      }),
    );
  }
}
