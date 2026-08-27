import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  RegisterRequest, ResetPasswordDto, ResetPasswordRequestDto,
  User,
} from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly authApiUrl = 'http://localhost:8080/api/v1/auth';
  private readonly accessTokenKey = 'ppra_access_token';
  private readonly refreshTokenKey = 'ppra_refresh_token';
  private readonly userKey = 'ppra_current_user';

  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${this.authApiUrl}/login`, request)
      .pipe(
        map((response) => response.payload),
        tap((payload) => this.saveAuthSession(payload)),
      );
  }

  register(request: RegisterRequest): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(
      `${this.authApiUrl}/register`,
      request,
    );
  }

  forgotPassword(request: ResetPasswordRequestDto): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(
      `${this.authApiUrl}/forgot-password`,
      request
    );
  }

  resetPassword(request: ResetPasswordDto): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(
      `${this.authApiUrl}/reset-password`,
      request
    );
  }

  saveToken(accessToken: string, refreshToken?: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(this.accessTokenKey, accessToken);
    if (refreshToken) {
      window.localStorage.setItem(this.refreshTokenKey, refreshToken);
    }
  }

  getToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem(this.accessTokenKey);
  }

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem(this.refreshTokenKey);
  }

  saveUser(user: User): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  getUser(): User | null {
    if (typeof window === 'undefined') {
      return null;
    }
    const rawUser = window.localStorage.getItem(this.userKey);
    if (!rawUser) {
      return null;
    }
    try {
      return JSON.parse(rawUser) as User;
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(this.accessTokenKey);
      window.localStorage.removeItem(this.refreshTokenKey);
      window.localStorage.removeItem(this.userKey);
    }
    this.router.navigate(['/login']);
  }

  /**
   * Converts HTTP/API failures into user-friendly messages.
   * Spring Boot ApiResponse error bodies carry a `message` field.
   */
  getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const apiError = error.error as {
        message?: string;
        errors?: Array<{ field?: string; message?: string; defaultMessage?: string }>;
      } | undefined;

      // Handle Spring MethodArgumentNotValidException field errors
      if (apiError?.errors && Array.isArray(apiError.errors) && apiError.errors.length > 0) {
        const firstError = apiError.errors[0];
        return firstError.message || firstError.defaultMessage || 'Invalid input provided.';
      }

      // Handle general API error message
      if (apiError?.message) {
        // If message starts with generic Spring Validation text, clean it up
        if (apiError.message.includes('Validation failed for argument')) {
          return 'Validation failed: Please ensure your password meets all complexity requirements.';
        }
        return apiError.message;
      }

      if (error.status === 0) {
        return 'Unable to reach the server. Please check your connection and try again.';
      }
      if (error.status === 400) {
        return 'Invalid request. Please check your inputs and try again.';
      }
      if (error.status === 401) {
        return 'Invalid Employee Check No. or Password.';
      }
      if (error.status === 403) {
        return 'You are not authorised to perform this action.';
      }
      if (error.status === 409) {
        return 'An account with this Employee ID or Email already exists.';
      }
      return error.message || `Request failed with status ${error.status}.`;
    }
    return 'An unexpected error occurred. Please try again.';
  }

  private saveAuthSession(auth: AuthResponse): void {
    this.saveToken(auth.accessToken, auth.refreshToken);
    this.saveUser(auth.user);
  }
}
