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

@Injectable({
  providedIn: 'root',
})
export class UserDirectoryService {
  private readonly http = inject(HttpClient);

  private readonly candidateEndpoints: string[] = [
    // 'http://localhost:8080/api/v1/users/all',
    // 'http://localhost:8080/api/v1/users',
    // 'http://localhost:8080/api/v1/auth/users',
    // 'http://localhost:8080/api/v1/auth/users',
    'http://localhost:8080/api/v1/users/search',
    // 'http://localhost:8080/api/v1/users',
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
}
