import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import { ApiResponse } from '../models/auth.model';
import { PaginatedPayload } from '../models/equipment.model';
import {
  ApproveRequestDto,
  CreateEquipmentRequestDto,
  EquipmentRequest,
  RejectRequestDto,
  RequestStatus,
} from '../models/request.model';

@Injectable({
  providedIn: 'root',
})
export class RequestService {
  private readonly baseUrl = 'http://localhost:8080/api/v1/equipment-requests';
  private readonly http = inject(HttpClient);

  submitRequest(data: CreateEquipmentRequestDto): Observable<EquipmentRequest> {
    return this.http
      .post<ApiResponse<EquipmentRequest>>(this.baseUrl, data)
      .pipe(map((res) => res.payload));
  }

  getMyRequests(
    page: number = 0,
    size: number = 10,
    sort: string = 'id,desc',
  ): Observable<PaginatedPayload<EquipmentRequest>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);

    return this.http
      .get<ApiResponse<PaginatedPayload<EquipmentRequest>>>(
        `${this.baseUrl}/my-requests`,
        {
          params,
        },
      )
      .pipe(map((res) => res.payload));
  }

  getRequestById(id: number): Observable<EquipmentRequest> {
    return this.http
      .get<ApiResponse<EquipmentRequest>>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => res.payload));
  }

  getRequestByCode(code: string): Observable<EquipmentRequest> {
    return this.http
      .get<ApiResponse<EquipmentRequest>>(`${this.baseUrl}/code/${code}`)
      .pipe(map((res) => res.payload));
  }

  getAllPendingRequests(
    page: number = 0,
    size: number = 10,
    sort: string = 'id,desc',
  ): Observable<PaginatedPayload<EquipmentRequest>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);

    return this.http
      .get<ApiResponse<PaginatedPayload<EquipmentRequest>>>(
        `${this.baseUrl}/admin/all`,
        {
          params,
        },
      )
      .pipe(map((res) => res.payload));
  }

  getRequestsByStatus(
    status: RequestStatus,
    page: number = 0,
    size: number = 10,
    sort: string = 'id,desc',
  ): Observable<PaginatedPayload<EquipmentRequest>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);

    return this.http
      .get<
        ApiResponse<PaginatedPayload<EquipmentRequest>>
      >(`${this.baseUrl}/admin/all/${status}`, { params })
      .pipe(map((res) => res.payload));
  }

  approveRequest(
    data: ApproveRequestDto,
    officerId?: number,
  ): Observable<EquipmentRequest> {
    if (officerId) {
      return this.http
        .post<
          ApiResponse<EquipmentRequest>
        >(`${this.baseUrl}/approve/${officerId}`, data)
        .pipe(
          map((res) => res.payload),
          catchError(() =>
            this.http
              .post<
                ApiResponse<EquipmentRequest>
              >(`${this.baseUrl}/approve`, data)
              .pipe(map((res) => res.payload)),
          ),
        );
    }

    return this.http
      .post<ApiResponse<EquipmentRequest>>(`${this.baseUrl}/approve`, data)
      .pipe(map((res) => res.payload));
  }

  rejectRequest(
    requestId: number,
    data: RejectRequestDto,
  ): Observable<EquipmentRequest> {
    return this.http
      .post<
        ApiResponse<EquipmentRequest>
      >(`${this.baseUrl}/${requestId}/reject`, data)
      .pipe(map((res) => res.payload));
  }
}
