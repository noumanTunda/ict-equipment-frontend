import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReportsService } from '../services/reports.service';
import { ToastService } from '../services/toast.service';
import {
  EquipmentReportFilter,
  TransactionReportFilter,
  EquipmentReportResponse,
  TransactionReportResponse,
  StaffAssetReportResponse,
  OverdueTransactionReportResponse,
} from '../models/report.model';
import { EquipmentStatus, EquipmentDepartment } from '../models/equipment.model';
import { TransactionStatus } from '../models/transaction.model';
import { ItemCondition } from '../models/equipment.model';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './reports.component.html',
})
export class ReportsComponent {
  private readonly reportsService = inject(ReportsService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  selectedReportType = signal<'equipment' | 'transaction' | 'staff' | 'overdue'>('equipment');
  isLoading = signal(false);

  // Equipment report data
  equipmentReportData = signal<EquipmentReportResponse | null>(null);
  equipmentFilters: EquipmentReportFilter = {
    page: 0,
    size: 20,
  };

  // Transaction report data
  transactionReportData = signal<TransactionReportResponse | null>(null);
  transactionFilters: TransactionReportFilter = {
    page: 0,
    size: 20,
  };

  // Staff asset report data
  selectedStaffId = signal<number | null>(null);
  staffAssetReportData = signal<StaffAssetReportResponse | null>(null);

  // Overdue report data
  overdueThresholdDays = signal<number>(30);
  overdueReportData = signal<OverdueTransactionReportResponse | null>(null);

  // Dropdown options
  departments: EquipmentDepartment[] = [
    'ICT',
    'FINANCE_AND_ACCOUNTS',
    'LEGAL_SERVICES',
    'HUMAN_RESOURCE_AND_ADMINISTRATION',
    'PLANNING_AND_COORDINATION',
  ];

  equipmentStatuses: EquipmentStatus[] = [
    'AVAILABLE',
    'ISSUED',
    'RETURNED',
    'MAINTENANCE',
    'DISPOSED',
  ];

  transactionStatuses: TransactionStatus[] = [
    'DRAFT',
    'PENDING_SIGNATURE',
    'COMPLETED',
    'CANCELLED',
  ];

  itemConditions: ItemCondition[] = ['GOOD', 'FAIR', 'DAMAGED', 'OBSOLETE'];

  // Equipment report methods
  generateEquipmentReport(format: 'json' | 'csv' | 'pdf'): void {
    this.isLoading.set(true);

    if (format === 'json') {
      this.reportsService
        .getEquipmentReport(this.equipmentFilters)
        .subscribe({
          next: (data) => {
            this.equipmentReportData.set(data);
            this.isLoading.set(false);
            this.toastService.success('Equipment report generated successfully');
          },
          error: () => {
            this.isLoading.set(false);
            this.toastService.error('Failed to generate equipment report');
          },
        });
    } else if (format === 'csv') {
      this.reportsService.getEquipmentReportCsv(this.equipmentFilters).subscribe({
        next: (blob) => this.downloadFile(blob, 'equipment-report.csv'),
        error: () => {
          this.isLoading.set(false);
          this.toastService.error('Failed to download CSV report');
        },
      });
    } else if (format === 'pdf') {
      this.reportsService.getEquipmentReportPdf(this.equipmentFilters).subscribe({
        next: (blob) => this.downloadFile(blob, 'equipment-report.pdf'),
        error: () => {
          this.isLoading.set(false);
          this.toastService.error('Failed to download PDF report');
        },
      });
    }
  }

  // Transaction report methods
  generateTransactionReport(format: 'json' | 'csv' | 'pdf'): void {
    this.isLoading.set(true);

    if (format === 'json') {
      this.reportsService
        .getTransactionReport(this.transactionFilters)
        .subscribe({
          next: (data) => {
            this.transactionReportData.set(data);
            this.isLoading.set(false);
            this.toastService.success('Transaction report generated successfully');
          },
          error: () => {
            this.isLoading.set(false);
            this.toastService.error('Failed to generate transaction report');
          },
        });
    } else if (format === 'csv') {
      this.reportsService.getTransactionReportCsv(this.transactionFilters).subscribe({
        next: (blob) => this.downloadFile(blob, 'transaction-report.csv'),
        error: () => {
          this.isLoading.set(false);
          this.toastService.error('Failed to download CSV report');
        },
      });
    } else if (format === 'pdf') {
      this.reportsService.getTransactionReportPdf(this.transactionFilters).subscribe({
        next: (blob) => this.downloadFile(blob, 'transaction-report.pdf'),
        error: () => {
          this.isLoading.set(false);
          this.toastService.error('Failed to download PDF report');
        },
      });
    }
  }

  // Staff asset report methods
  generateStaffReport(format: 'json' | 'csv' | 'pdf'): void {
    const staffId = this.selectedStaffId();
    if (!staffId) {
      this.toastService.error('Please select a staff member');
      return;
    }

    this.isLoading.set(true);

    if (format === 'json') {
      this.reportsService.getStaffAssetReport(staffId).subscribe({
        next: (data) => {
          this.staffAssetReportData.set(data);
          this.isLoading.set(false);
          this.toastService.success('Staff asset report generated successfully');
        },
        error: () => {
          this.isLoading.set(false);
          this.toastService.error('Failed to generate staff asset report');
        },
      });
    } else if (format === 'csv') {
      this.reportsService.getStaffAssetReportCsv(staffId).subscribe({
        next: (blob) => this.downloadFile(blob, `staff-${staffId}-assets.csv`),
        error: () => {
          this.isLoading.set(false);
          this.toastService.error('Failed to download CSV report');
        },
      });
    } else if (format === 'pdf') {
      this.reportsService.getStaffAssetReportPdf(staffId).subscribe({
        next: (blob) => this.downloadFile(blob, `staff-${staffId}-assets.pdf`),
        error: () => {
          this.isLoading.set(false);
          this.toastService.error('Failed to download PDF report');
        },
      });
    }
  }

  // Overdue report methods
  generateOverdueReport(format: 'json' | 'csv' | 'pdf'): void {
    this.isLoading.set(true);
    const threshold = this.overdueThresholdDays() || 30;

    if (format === 'json') {
      this.reportsService.getOverdueTransactionsReport(threshold).subscribe({
        next: (data) => {
          this.overdueReportData.set(data);
          this.isLoading.set(false);
          this.toastService.success('Overdue transactions report generated successfully');
        },
        error: () => {
          this.isLoading.set(false);
          this.toastService.error('Failed to generate overdue report');
        },
      });
    } else if (format === 'csv') {
      this.reportsService.getOverdueTransactionsReportCsv(threshold).subscribe({
        next: (blob) => this.downloadFile(blob, 'overdue-transactions.csv'),
        error: () => {
          this.isLoading.set(false);
          this.toastService.error('Failed to download CSV report');
        },
      });
    } else if (format === 'pdf') {
      this.reportsService.getOverdueTransactionsReportPdf(threshold).subscribe({
        next: (blob) => this.downloadFile(blob, 'overdue-transactions.pdf'),
        error: () => {
          this.isLoading.set(false);
          this.toastService.error('Failed to download PDF report');
        },
      });
    }
  }

  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    this.isLoading.set(false);
    this.toastService.success('File downloaded successfully');
  }

  getStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      AVAILABLE: 'status-indicator completed',
      ISSUED: 'status-indicator pending',
      RETURNED: 'status-indicator completed',
      MAINTENANCE: 'status-indicator warning',
      DISPOSED: 'status-indicator danger',
      COMPLETED: 'status-indicator completed',
      PENDING_SIGNATURE: 'status-indicator pending',
      CANCELLED: 'status-indicator danger',
      DRAFT: 'status-indicator warning',
    };
    return statusMap[status] || 'status-indicator';
  }
}
