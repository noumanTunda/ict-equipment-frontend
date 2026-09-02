import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
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

  // Options
  equipmentTypes: string[] = [
    'LAPTOP',
    'DESKTOP',
    'PRINTER',
    'UPS',
    'SCANNER',
    'MONITOR',
    'OTHER',
  ];

  statusOptions: EquipmentStatus[] = [
    'AVAILABLE',
    'ISSUED',
    'RETURNED',
    'MAINTENANCE',
  ];

  // Modals
  isCreateModalOpen = false;
  isEditModalOpen = false;
  isDeleteModalOpen = false;
  isDetailModalOpen = false;
  selectedEquipment: Equipment | null = null;

  // Forms
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
    });
  }

  loadEquipment(): void {
    if (!this.canManage) return;

    this.isLoading = true;
    const pageIndex = this.page() - 1;

    this.equipmentService
      .getEquipmentPaginated(pageIndex, this.pageSize(), 'id,desc')
      .subscribe({
        next: (payload) => {
          const items = payload.content || [];
          this.equipmentList.set(items);
          this.totalElements.set(
            payload.pageable?.totalElements ?? items.length,
          );
          this.totalPages.set(payload.pageable?.totalPages ?? 1);
          this.isLoading = false;
        },
        error: (err) => {
          this.isLoading = false;
          const msg = this.authService.getErrorMessage(err);
          this.toastService.error('Failed to load equipment', msg);
        },
      });
  }

  // Computed signal for filtering
  filteredEquipment = computed(() => {
    const list = this.equipmentList();
    const term = this.searchTerm().toLowerCase().trim();
    const st = this.selectedStatus();
    const tp = this.selectedType();

    return list.filter((item) => {
      const matchesStatus = st === 'ALL' || item.status === st;
      const matchesType = tp === 'ALL' || item.equipmentType === tp;
      const matchesSearch =
        !term ||
        item.assetNumber.toLowerCase().includes(term) ||
        item.serialNumber.toLowerCase().includes(term) ||
        item.brandModel.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.supplierDetails.toLowerCase().includes(term);

      return matchesStatus && matchesType && matchesSearch;
    });
  });

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
    this.page.set(1);
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(Number(size));
    this.page.set(1);
    this.loadEquipment();
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) {
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
        next: (created) => {
          this.isLoading = false;
          this.closeModals();
          this.toastService.success(
            'Equipment Created',
            `Asset ${created.assetNumber} has been added to inventory.`,
          );
          this.loadEquipment();
        },
        error: (err) => {
          this.isLoading = false;
          const msg = this.authService.getErrorMessage(err);
          this.toastService.error('Error Creating Equipment', msg);
        },
      });
    } else if (this.isEditModalOpen && this.selectedEquipment) {
      this.equipmentService
        .updateEquipment(this.selectedEquipment.id, formRaw)
        .subscribe({
          next: (updated) => {
            this.isLoading = false;
            this.closeModals();
            this.toastService.success(
              'Equipment Updated',
              `Asset ${updated.assetNumber} record updated.`,
            );
            this.loadEquipment();
          },
          error: (err) => {
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
      error: (err) => {
        this.isLoading = false;
        const msg = this.authService.getErrorMessage(err);
        this.toastService.error('Error Deleting Equipment', msg);
      },
    });
  }

  getStatusClass(status: EquipmentStatus): string {
    switch (status) {
      case 'AVAILABLE':
        return 'status-indicator active';
      case 'ISSUED':
        return 'status-indicator pending';
      case 'RETURNED':
        return 'status-indicator active';
      case 'MAINTENANCE':
        return 'status-indicator danger';
      default:
        return 'status-indicator';
    }
  }
}
