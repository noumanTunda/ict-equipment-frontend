import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../models/auth.model';
import { PaginatedPayload } from '../models/equipment.model';
import {
  CreateTransactionDto,
  DirectIssueDto,
  EquipmentTransaction,
  SignTransactionDto,
  TransactionFilterParams,
} from '../models/transaction.model';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private readonly baseUrl =
    'http://localhost:8080/api/v1/equipment-transactions';
  private readonly http = inject(HttpClient);

  createTransaction(
    data: CreateTransactionDto,
  ): Observable<EquipmentTransaction> {
    return this.http
      .post<ApiResponse<EquipmentTransaction>>(this.baseUrl, data)
      .pipe(map((res) => res.payload));
  }

  directIssue(data: DirectIssueDto): Observable<EquipmentTransaction> {
    return this.http
      .post<ApiResponse<EquipmentTransaction>>(`${this.baseUrl}/issue`, data)
      .pipe(map((res) => res.payload));
  }

  getTransactionById(id: number): Observable<EquipmentTransaction> {
    return this.http
      .get<ApiResponse<EquipmentTransaction>>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => res.payload));
  }

  getTransactionByCode(code: string): Observable<EquipmentTransaction> {
    return this.http
      .get<ApiResponse<EquipmentTransaction>>(`${this.baseUrl}/code/${code}`)
      .pipe(map((res) => res.payload));
  }

  getTransactions(
    filters: TransactionFilterParams = {},
  ): Observable<PaginatedPayload<EquipmentTransaction>> {
    let params = new HttpParams()
      .set('page', (filters.page ?? 0).toString())
      .set('size', (filters.size ?? 10).toString());

    if (filters.staffId) {
      params = params.set('staffId', filters.staffId.toString());
    }
    if (filters.status) {
      params = params.set('status', filters.status);
    }
    if (filters.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params = params.set('endDate', filters.endDate);
    }
    if (filters.sort) {
      params = params.set('sort', filters.sort);
    }

    return this.http
      .get<
        ApiResponse<PaginatedPayload<EquipmentTransaction>>
      >(this.baseUrl, { params })
      .pipe(map((res) => res.payload));
  }

  submitSignatures(
    id: number,
    signatures: SignTransactionDto,
  ): Observable<EquipmentTransaction> {
    return this.http
      .post<
        ApiResponse<EquipmentTransaction>
      >(`${this.baseUrl}/${id}/sign`, signatures)
      .pipe(map((res) => res.payload));
  }

  cancelTransaction(id: number): Observable<EquipmentTransaction> {
    return this.http
      .post<
        ApiResponse<EquipmentTransaction>
      >(`${this.baseUrl}/${id}/cancel`, {})
      .pipe(map((res) => res.payload));
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/pdf`, {
      responseType: 'blob',
    });
  }
}
