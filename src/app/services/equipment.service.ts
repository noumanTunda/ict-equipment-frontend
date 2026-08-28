import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../models/auth.model';
import {
  CreateEquipmentDto,
  Equipment,
  PaginatedPayload,
  UpdateEquipmentDto,
} from '../models/equipment.model';

@Injectable({
  providedIn: 'root',
})
export class EquipmentService {
  private readonly baseUrl = 'http://localhost:8080/api/v1/equipment';
  private readonly http = inject(HttpClient);

  createEquipment(data: CreateEquipmentDto): Observable<Equipment> {
    return this.http
      .post<ApiResponse<Equipment>>(this.baseUrl, data)
      .pipe(map((res) => res.payload));
  }

  getEquipmentById(id: number): Observable<Equipment> {
    return this.http
      .get<ApiResponse<Equipment>>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => res.payload));
  }

  getEquipmentByAssetNumber(assetNumber: string): Observable<Equipment> {
    return this.http
      .get<ApiResponse<Equipment>>(`${this.baseUrl}/asset/${assetNumber}`)
      .pipe(map((res) => res.payload));
  }

  getEquipmentPaginated(
    page: number = 0,
    size: number = 10,
    sort: string = 'id,desc',
  ): Observable<PaginatedPayload<Equipment>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    if (sort) {
      params = params.set('sort', sort);
    }

    return this.http
      .get<ApiResponse<PaginatedPayload<Equipment>>>(this.baseUrl, { params })
      .pipe(map((res) => res.payload));
  }

  getAllEquipment(): Observable<Equipment[]> {
    return this.http
      .get<ApiResponse<Equipment[]>>(`${this.baseUrl}/all`)
      .pipe(map((res) => res.payload));
  }

  updateEquipment(id: number, data: UpdateEquipmentDto): Observable<Equipment> {
    return this.http
      .put<ApiResponse<Equipment>>(`${this.baseUrl}/${id}`, data)
      .pipe(map((res) => res.payload));
  }

  deleteEquipment(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${id}`)
      .pipe(map(() => void 0));
  }
}
