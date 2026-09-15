import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../models/auth.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class KeyphraseService {
  private readonly userUrl = `${environment.apiUrl}/users`;
  private readonly transactionUrl = `${environment.apiUrl}/equipment-transactions`;
  private readonly http = inject(HttpClient);

  setKeyphrase(keyphrase: string): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.userUrl}/keyphrase`, { keyphrase })
      .pipe(map(() => undefined));
  }

  updateKeyphrase(currentKeyphrase: string, newKeyphrase: string): Observable<void> {
    return this.http
      .put<ApiResponse<void>>(`${this.userUrl}/keyphrase`, {
        currentKeyphrase,
        newKeyphrase,
      })
      .pipe(map(() => undefined));
  }

  signTransactionAsEmployee(transactionId: number, keyphrase: string): Observable<any> {
    return this.http
      .post<ApiResponse<any>>(
        `${this.transactionUrl}/${transactionId}/sign/employee`,
        { keyphrase }
      )
      .pipe(map((res) => res.payload));
  }

  signTransactionAsOfficer(transactionId: number, keyphrase: string): Observable<any> {
    return this.http
      .post<ApiResponse<any>>(
        `${this.transactionUrl}/${transactionId}/sign/officer`,
        { keyphrase }
      )
      .pipe(map((res) => res.payload));
  }
}
