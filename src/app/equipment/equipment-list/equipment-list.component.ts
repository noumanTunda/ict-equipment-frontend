import { EquipmentDepartment } from './../../models/equipment.model';
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EquipmentService } from '../../services/equipment.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Equipment, EquipmentStatus } from '../../models/equipment.model';
import { User } from '../../models/auth.model';

export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}

export interface PageableInfo {
  pageNumber: number;
  pageSize: number;
  totalElements?: number;
  totalPages?: number;
}

export interface SpringPage<T> {
  content: T[];
  pageable: PageableInfo;
  totalElements?: number;
  totalPages?: number;
}

@Component({
  selector: 'app-equipment-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './equipment-list.component.html',
})
export class EquipmentListComponent implements OnInit {
  private readonly equipmentService = inject(EquipmentService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  currentUser: User | null = null;
  userRole: string = 'ROLE_STAFF';

  // Signals for state management
  equipmentList = signal<Equipment[]>([]);
  searchTerm = signal<string>('');
  selectedStatus = signal<string>('ALL');
  selectedType = signal<string>('ALL');

  page = signal<number>(1);
  pageSize = signal<number>(10);
  pageSizeOptions: number[] = [5, 10, 20, 50];
  totalElements = signal<number>(0);
  totalPages = signal<number>(1);

  isLoading = false;

  equipmentTypes: string[] = [
    'LAPTOP',
    'DESKTOP',
    'PRINTER',
    'UPS',
    'SCANNER',
    'MONITOR',
    'OTHER',
  ];

  equipmentDepartment: string[] = [
    'ICT',
    'FINANCE_AND_ACCOUNTS',
    'LEGAL_SERVICES',
    'HUMAN_RESOURCE_AND_ADMINISTRATION',
    'PLANNING_AND_COORDINATION',
  ];

  statusOptions: EquipmentStatus[] = [
    'AVAILABLE',
    'ISSUED',
    'RETURNED',
    'MAINTENANCE',
    'DISPOSED',
  ];

  isCreateModalOpen = false;
  isEditModalOpen = false;
  isDeleteModalOpen = false;
  isDetailModalOpen = false;
  selectedEquipment: Equipment | null = null;

  equipmentForm!: FormGroup;

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    this.userRole = this.currentUser?.role || 'ROLE_STAFF';

    if (!this.canManage) {
      this.router.navigate(['/dashboard/requests']);
      return;
    }

    this.initForm();
    this.loadEquipment();
  }

  get canManage(): boolean {
    return (
      this.userRole === 'ROLE_ADMIN' || this.userRole === 'ROLE_ICT_OFFICER'
    );
  }

  initForm(): void {
    this.equipmentForm = this.fb.group({
      assetNumber: [
        '',
        [Validators.required, Validators.pattern(/^[A-Z0-9-]+$/i)],
      ],
      serialNumber: ['', [Validators.required]],
      equipmentType: ['LAPTOP', [Validators.required]],
      brandModel: ['', [Validators.required]],
      supplierDetails: ['', [Validators.required]],
      description: ['', [Validators.required]],
      status: ['AVAILABLE' as EquipmentStatus, [Validators.required]],
      department: ['ICT' as EquipmentDepartment, [Validators.required]],
    });
  }

  loadEquipment(): void {
    if (!this.canManage) return;

    this.isLoading = true;
    const pageIndex = this.page() - 1;

    this.equipmentService
      .getEquipmentPaginated(
        pageIndex,
        this.pageSize(),
        'id,desc',
        this.selectedStatus(),
        this.selectedType(),
        this.searchTerm(),
      )
      .subscribe({
        next: (
          response:
            | ApiResponse<SpringPage<Equipment>>
            | SpringPage<Equipment>
            | any,
        ) => {
          const pageData: SpringPage<Equipment> = response?.data
            ? response.data
            : response;
          const items = pageData?.content || [];

          this.equipmentList.set(items);

          const total =
            pageData?.pageable?.totalElements ??
            pageData?.totalElements ??
            items.length;

          const pages =
            pageData?.pageable?.totalPages ?? pageData?.totalPages ?? 1;

          this.totalElements.set(Number(total));
          this.totalPages.set(Number(pages));

          this.isLoading = false;
        },
        error: (err: any) => {
          this.isLoading = false;
          const msg = this.authService.getErrorMessage(err);
          this.toastService.error('Failed to load equipment', msg);
        },
      });
  }

  // Computed signal for client-side filtering
  filteredEquipment = computed(() => {
    const list = this.equipmentList();
    const st = this.normalizeStatus(this.selectedStatus());
    const tp = this.selectedType();
    const term = this.searchTerm().toLowerCase().trim();

    return list.filter((item) => {
      const matchesStatus =
        st === 'ALL' || this.normalizeStatus(item.status) === st;
      const matchesType = tp === 'ALL' || item.equipmentType === tp;
      const matchesSearch =
        !term ||
        item.assetNumber?.toLowerCase().includes(term) ||
        item.serialNumber?.toLowerCase().includes(term) ||
        item.brandModel?.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term) ||
        item.supplierDetails?.toLowerCase().includes(term);

      return matchesStatus && matchesType && matchesSearch;
    });
  });

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
    this.page.set(1);
    this.loadEquipment();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(Number(size));
    this.page.set(1);
    this.loadEquipment();
  }

  onStatusChange(status: string): void {
    this.selectedStatus.set(this.normalizeStatus(status));
    this.page.set(1);
    this.loadEquipment();
  }

  onTypeChange(type: string): void {
    this.selectedType.set(type);
    this.page.set(1);
    this.loadEquipment();
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages() && !this.isLoading) {
      this.page.set(p);
      this.loadEquipment();
    }
  }

  openCreateModal(): void {
    this.equipmentForm.reset({
      equipmentType: 'LAPTOP',
      status: 'AVAILABLE',
    });
    this.equipmentForm.get('assetNumber')?.enable();
    this.equipmentForm.get('serialNumber')?.enable();
    this.isCreateModalOpen = true;
  }

  openEditModal(item: Equipment, event?: Event): void {
    event?.stopPropagation();
    this.selectedEquipment = item;
    this.equipmentForm.patchValue({
      assetNumber: item.assetNumber,
      serialNumber: item.serialNumber,
      equipmentType: item.equipmentType,
      brandModel: item.brandModel,
      supplierDetails: item.supplierDetails,
      description: item.description,
      department: item.department,
      status: item.status,
    });

    if (item.status === 'ISSUED') {
      this.equipmentForm.get('assetNumber')?.disable();
      this.equipmentForm.get('serialNumber')?.disable();
    } else {
      this.equipmentForm.get('assetNumber')?.enable();
      this.equipmentForm.get('serialNumber')?.enable();
    }

    this.isEditModalOpen = true;
  }

  openDetailModal(item: Equipment, event?: Event): void {
    event?.stopPropagation();
    this.selectedEquipment = item;
    this.isDetailModalOpen = true;
  }

  openDeleteModal(item: Equipment, event?: Event): void {
    event?.stopPropagation();
    this.selectedEquipment = item;
    this.isDeleteModalOpen = true;
  }

  closeModals(): void {
    this.isCreateModalOpen = false;
    this.isEditModalOpen = false;
    this.isDeleteModalOpen = false;
    this.isDetailModalOpen = false;
    this.selectedEquipment = null;
  }

  saveEquipment(): void {
    if (this.equipmentForm.invalid) {
      this.equipmentForm.markAllAsTouched();
      return;
    }

    const formRaw = this.equipmentForm.getRawValue();
    this.isLoading = true;

    if (this.isCreateModalOpen) {
      this.equipmentService.createEquipment(formRaw).subscribe({
        next: (created: Equipment) => {
          this.isLoading = false;
          this.closeModals();
          this.toastService.success(
            'Equipment Created',
            `Asset ${created.assetNumber} has been added to inventory.`,
          );
          this.loadEquipment();
        },
        error: (err: any) => {
          this.isLoading = false;
          const msg = this.authService.getErrorMessage(err);
          this.toastService.error('Error Creating Equipment', msg);
        },
      });
    } else if (this.isEditModalOpen && this.selectedEquipment) {
      this.equipmentService
        .updateEquipment(this.selectedEquipment.id, formRaw)
        .subscribe({
          next: (updated: Equipment) => {
            this.isLoading = false;
            this.closeModals();
            this.toastService.success(
              'Equipment Updated',
              `Asset ${updated.assetNumber} record updated.`,
            );
            this.loadEquipment();
          },
          error: (err: any) => {
            this.isLoading = false;
            const msg = this.authService.getErrorMessage(err);
            this.toastService.error('Error Updating Equipment', msg);
          },
        });
    }
  }

  confirmDelete(): void {
    if (!this.selectedEquipment) return;

    if (this.selectedEquipment.status === 'ISSUED') {
      this.toastService.warning(
        'Action Restricted',
        'Cannot delete equipment that is currently issued to staff.',
      );
      return;
    }

    this.isLoading = true;
    this.equipmentService.deleteEquipment(this.selectedEquipment.id).subscribe({
      next: () => {
        this.isLoading = false;
        this.closeModals();
        this.toastService.success(
          'Equipment Deleted',
          `Asset record was successfully removed.`,
        );
        this.loadEquipment();
      },
      error: (err: any) => {
        this.isLoading = false;
        const msg = this.authService.getErrorMessage(err);
        this.toastService.error('Error Deleting Equipment', msg);
      },
    });
  }

  getStatusClass(status: EquipmentStatus): string {
    switch (this.normalizeStatus(status)) {
      case 'AVAILABLE':
        return 'status-indicator active';
      case 'ISSUED':
        return 'status-indicator pending';
      case 'RETURNED':
        return 'status-indicator active';
      case 'MAINTENANCE':
        return 'status-indicator danger';
      case 'DISPOSED':
        return 'status-indicator';
      default:
        return 'status-indicator';
    }
  }

  private normalizeStatus(status: string): string {
    return (
      status?.trim().toUpperCase().replace('MAINTENACE', 'MAINTENANCE') || 'ALL'
    );
  }
}
