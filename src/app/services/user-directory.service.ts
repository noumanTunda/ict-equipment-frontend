import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Observable,
  catchError,
  concatMap,
  defaultIfEmpty,
  filter,
  from,
  of,
  take,
} from 'rxjs';
import { ApiResponse, User } from '../models/auth.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserDirectoryService {
  private readonly http = inject(HttpClient);

  private readonly candidateEndpoints: string[] = [
    `${environment.apiUrl}/users/search`,
  ];

  getAllUsers(): Observable<User[]> {
    return from(this.candidateEndpoints).pipe(
      concatMap((url) =>
        this.http.get<ApiResponse<User[]> | User[]>(url).pipe(
          concatMap((response) => {
            if (Array.isArray(response)) {
              return of(response);
            }
            const wrapped = response as ApiResponse<User[]> & {
              data?: User[];
            };
            return of(wrapped?.payload ?? wrapped?.data ?? []);
          }),
          catchError(() => of(null)),
        ),
      ),
      filter((users): users is User[] => Array.isArray(users)),
      take(1),
      defaultIfEmpty([]),
    );
  }

  searchUsers(query: string): Observable<User[]> {
    const searchEndpoint = this.candidateEndpoints.find(
      (endpoint) => endpoint.includes('/search')
    );
    if (!searchEndpoint) {
      return of([]);
    }
    const url = query.trim()
      ? `${searchEndpoint}?query=${encodeURIComponent(query)}`
      : searchEndpoint;
    return this.http.get<ApiResponse<User[]>>(url).pipe(
      concatMap((response) => {
        const wrapped = response as ApiResponse<User[]> & {
          data?: User[];
        };
        return of(wrapped?.payload ?? wrapped?.data ?? []);
      }),
      catchError(() => of([])),
    );
  }
}
