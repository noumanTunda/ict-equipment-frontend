import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../models/auth.model';
import {
  EquipmentReportFilter,
  EquipmentReportResponse,
  TransactionReportFilter,
  TransactionReportResponse,
  StaffAssetReportResponse,
  OverdueTransactionReportResponse,
} from '../models/report.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private readonly baseUrl = `${environment.apiUrl}/reports`;
  private readonly http = inject(HttpClient);

  // Equipment Reports
  getEquipmentReport(
    filters: EquipmentReportFilter = {},
  ): Observable<EquipmentReportResponse> {
    let params = this.buildEquipmentReportParams(filters);

    return this.http
      .get<ApiResponse<EquipmentReportResponse>>(`${this.baseUrl}/equipment`, {
        params,
      })
      .pipe(map((res) => res.payload));
  }

  getEquipmentReportCsv(
    filters: EquipmentReportFilter = {},
  ): Observable<Blob> {
    let params = this.buildEquipmentReportParams(filters);

    return this.http.get(`${this.baseUrl}/equipment/csv`, {
      params,
      responseType: 'blob',
    });
  }

  getEquipmentReportPdf(
    filters: EquipmentReportFilter = {},
  ): Observable<Blob> {
    let params = this.buildEquipmentReportParams(filters);

    return this.http.get(`${this.baseUrl}/equipment/pdf`, {
      params,
      responseType: 'blob',
    });
  }

  private buildEquipmentReportParams(
    filters: EquipmentReportFilter,
  ): HttpParams {
    let params = new HttpParams()
      .set('page', (filters.page ?? 0).toString())
      .set('size', (filters.size ?? 20).toString());

    if (filters.sort) {
      params = params.set('sort', filters.sort);
    }
    if (filters.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params = params.set('endDate', filters.endDate);
    }
    if (filters.department) {
      params = params.set('department', filters.department);
    }
    if (filters.equipmentCategory) {
      params = params.set('equipmentCategory', filters.equipmentCategory);
    }
    if (filters.equipmentStatus) {
      params = params.set('equipmentStatus', filters.equipmentStatus);
    }
    if (filters.hasWarranty !== undefined) {
      params = params.set('hasWarranty', filters.hasWarranty.toString());
    }
    if (filters.searchQuery) {
      params = params.set('searchQuery', filters.searchQuery);
    }

    return params;
  }

  // Transaction Reports
  getTransactionReport(
    filters: TransactionReportFilter = {},
  ): Observable<TransactionReportResponse> {
    let params = this.buildTransactionReportParams(filters);

    return this.http
      .get<ApiResponse<TransactionReportResponse>>(
        `${this.baseUrl}/transactions`,
        { params },
      )
      .pipe(map((res) => res.payload));
  }

  getTransactionReportCsv(
    filters: TransactionReportFilter = {},
  ): Observable<Blob> {
    let params = this.buildTransactionReportParams(filters);

    return this.http.get(`${this.baseUrl}/transactions/csv`, {
      params,
      responseType: 'blob',
    });
  }

  getTransactionReportPdf(
    filters: TransactionReportFilter = {},
  ): Observable<Blob> {
    let params = this.buildTransactionReportParams(filters);

    return this.http.get(`${this.baseUrl}/transactions/pdf`, {
      params,
      responseType: 'blob',
    });
  }

  private buildTransactionReportParams(
    filters: TransactionReportFilter,
  ): HttpParams {
    let params = new HttpParams()
      .set('page', (filters.page ?? 0).toString())
      .set('size', (filters.size ?? 20).toString());

    if (filters.sort) {
      params = params.set('sort', filters.sort);
    }
    if (filters.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params = params.set('endDate', filters.endDate);
    }
    if (filters.transactionStatus) {
      params = params.set('transactionStatus', filters.transactionStatus);
    }
    if (filters.staffIds && filters.staffIds.length > 0) {
      filters.staffIds.forEach((id) => {
        params = params.append('staffIds', id.toString());
      });
    }
    if (filters.itemCondition) {
      params = params.set('itemCondition', filters.itemCondition);
    }
    if (filters.overdueThresholdDays !== undefined) {
      params = params.set(
        'overdueThresholdDays',
        filters.overdueThresholdDays.toString(),
      );
    }

    return params;
  }

  // Staff Asset Reports
  getStaffAssetReport(staffId: number): Observable<StaffAssetReportResponse> {
    return this.http
      .get<ApiResponse<StaffAssetReportResponse>>(
        `${this.baseUrl}/staff/${staffId}/assets`,
      )
      .pipe(map((res) => res.payload));
  }

  getStaffAssetReportCsv(staffId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/staff/${staffId}/assets/csv`, {
      responseType: 'blob',
    });
  }

  getStaffAssetReportPdf(staffId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/staff/${staffId}/assets/pdf`, {
      responseType: 'blob',
    });
  }

  // Overdue Transaction Reports
  getOverdueTransactionsReport(
    overdueThresholdDays: number = 30,
    page: number = 0,
    size: number = 20,
    sort?: string,
  ): Observable<OverdueTransactionReportResponse> {
    let params = new HttpParams()
      .set('overdueThresholdDays', overdueThresholdDays.toString())
      .set('page', page.toString())
      .set('size', size.toString());

    if (sort) {
      params = params.set('sort', sort);
    }

    return this.http
      .get<ApiResponse<OverdueTransactionReportResponse>>(
        `${this.baseUrl}/transactions/overdue`,
        { params },
      )
      .pipe(map((res) => res.payload));
  }

  getOverdueTransactionsReportCsv(
    overdueThresholdDays: number = 30,
  ): Observable<Blob> {
    let params = new HttpParams().set(
      'overdueThresholdDays',
      overdueThresholdDays.toString(),
    );

    return this.http.get(`${this.baseUrl}/transactions/overdue/csv`, {
      params,
      responseType: 'blob',
    });
  }

  getOverdueTransactionsReportPdf(
    overdueThresholdDays: number = 30,
  ): Observable<Blob> {
    let params = new HttpParams().set(
      'overdueThresholdDays',
      overdueThresholdDays.toString(),
    );

    return this.http.get(`${this.baseUrl}/transactions/overdue/pdf`, {
      params,
      responseType: 'blob',
    });
  }
}
