import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import { ApiResponse } from '../models/auth.model';
import { PaginatedPayload } from '../models/equipment.model';
import { environment } from '../../environments/environment';
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
  private readonly equipmentUrl = `${environment.apiUrl}/equipment-requests`;
  private readonly http = inject(HttpClient);

  submitRequest(data: CreateEquipmentRequestDto): Observable<EquipmentRequest> {
    return this.http
      .post<ApiResponse<EquipmentRequest>>(this.equipmentUrl, data)
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
        `${this.equipmentUrl}/my-requests`,
        {
          params,
        },
      )
      .pipe(map((res) => res.payload));
  }

  getRequestById(id: number): Observable<EquipmentRequest> {
    return this.http
      .get<ApiResponse<EquipmentRequest>>(`${this.equipmentUrl}/${id}`)
      .pipe(map((res) => res.payload));
  }

  getRequestByCode(code: string): Observable<EquipmentRequest> {
    return this.http
      .get<ApiResponse<EquipmentRequest>>(`${this.equipmentUrl}/code/${code}`)
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
        `${this.equipmentUrl}/admin/all`,
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
      >(`${this.equipmentUrl}/admin/all/${status}`, { params })
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
        >(`${this.equipmentUrl}/approve/${officerId}`, data)
        .pipe(
          map((res) => res.payload),
          catchError(() =>
            this.http
              .post<
                ApiResponse<EquipmentRequest>
              >(`${this.equipmentUrl}/approve`, data)
              .pipe(map((res) => res.payload)),
          ),
        );
    }

    return this.http
      .post<ApiResponse<EquipmentRequest>>(`${this.equipmentUrl}/approve`, data)
      .pipe(map((res) => res.payload));
  }

  rejectRequest(
    requestId: number,
    data: RejectRequestDto,
  ): Observable<EquipmentRequest> {
    return this.http
      .post<
        ApiResponse<EquipmentRequest>
      >(`${this.equipmentUrl}/${requestId}/reject`, data)
      .pipe(map((res) => res.payload));
  }
}
