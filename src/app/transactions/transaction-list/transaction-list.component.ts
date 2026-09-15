import {
  Component,
  DestroyRef,
  inject,
  Injector,
  OnInit,
  ViewChild,
  signal,
  computed,
  runInInjectionContext,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { TransactionService } from '../../services/transaction.service';
import { EquipmentService } from '../../services/equipment.service';
import { UserDirectoryService } from '../../services/user-directory.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import {
  EquipmentTransaction,
  SignTransactionDto,
  TransactionFilterParams,
  TransactionStatus,
} from '../../models/transaction.model';
import { Equipment } from '../../models/equipment.model';
import { User } from '../../models/auth.model';
import { KeyphraseService } from '../../services/keyphrase.service';
import { SearchableSelectComponent } from '../../shared/searchable-select/searchable-select.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    SearchableSelectComponent,
  ],
  templateUrl: './transaction-list.component.html',
})
export class TransactionListComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly transactionService = inject(TransactionService);
  private readonly equipmentService = inject(EquipmentService);
  private readonly userDirectoryService = inject(UserDirectoryService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly keyphraseService = inject(KeyphraseService);
  private readonly fb = inject(FormBuilder);

  currentUser: User | null = null;
  userRole: string = 'ROLE_STAFF';

  // Signals
  transactions = signal<EquipmentTransaction[]>([]);
  searchTerm = signal<string>('');
  selectedStatus = signal<string>('ALL');
  startDateFilter = signal<string>('');
  endDateFilter = signal<string>('');

  staffUsers = signal<User[]>([]);

  page = signal<number>(1);
  pageSize = signal<number>(10);
  pageSizeOptions: number[] = [5, 10, 20, 50];
  totalElements = signal<number>(0);
  totalPages = signal<number>(1);

  isLoading = false;
  isDownloadingPdf = false;

  // Equipment cache
  availableEquipment: Equipment[] = [];

  // Modals
  isSignModalOpen = false;
  isCancelModalOpen = false;
  isDetailModalOpen = false;
  isDirectIssueModalOpen = false;

  selectedTransaction: EquipmentTransaction | null = null;

  employeeKeyphrase: string = '';
  officerKeyphrase: string = '';
  directIssueStaffSearch = signal<string>('');
  directIssueEquipmentSearch = signal<string>('');
  directIssueAccessoryInput = '';
  directIssueAccessories: string[] = [];

  directIssueForm!: FormGroup;

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    this.userRole = this.currentUser?.role || 'ROLE_STAFF';

    this.initDirectIssueForm();
    this.loadTransactions();
    this.loadAvailableEquipment();
    this.searchStaffUsers('');

    // Watch for staff search changes
    runInInjectionContext(this.injector, () => {
      toObservable(this.directIssueStaffSearch)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((query: string) => {
          this.searchStaffUsers(query);
        });
    });
  }

  get isStaff(): boolean {
    return this.userRole === 'ROLE_STAFF';
  }

  get canManage(): boolean {
    return (
      this.userRole === 'ROLE_ADMIN' || this.userRole === 'ROLE_ICT_OFFICER'
    );
  }

  get canSignAsOfficer(): boolean {
    return this.canManage;
  }

  get canSignAsStaff(): boolean {
    return this.isStaff;
  }

  get selectedTransactionHasEmployeeSignature(): boolean {
    return !!this.selectedTransaction?.employeeSigned;
  }

  get selectedTransactionHasOfficerSignature(): boolean {
    return !!this.selectedTransaction?.officerSigned;
  }

  get canCaptureEmployeeSignature(): boolean {
    return (
      !!this.selectedTransaction &&
      this.isStaff &&
      !this.selectedTransactionHasEmployeeSignature
    );
  }

  get canCaptureOfficerSignature(): boolean {
    return (
      !!this.selectedTransaction &&
      this.canManage &&
      this.selectedTransactionHasEmployeeSignature &&
      !this.selectedTransactionHasOfficerSignature
    );
  }

  get directIssueSelectedEquipment(): Equipment | undefined {
    const assetNumber = this.directIssueForm?.get('assetNumber')?.value;
    return this.availableEquipment.find(
      (equipment) => equipment.assetNumber === assetNumber,
    );
  }

  get directIssueSelectedStaff(): User | undefined {
    const staffId = this.directIssueForm?.get('staffId')?.value;
    if (staffId === null || staffId === undefined || staffId === '') {
      return undefined;
    }
    return this.staffUsers().find((user) => user.id === Number(staffId));
  }

  get directIssueRequiresChecklist(): boolean {
    const type = this.directIssueSelectedEquipment?.equipmentType
      ?.trim()
      .toUpperCase();
    return type === 'LAPTOP' || type === 'DESKTOP';
  }

  get filteredStaffUsers(): User[] {
    return this.staffUsers();
  }

  get filteredAvailableEquipment(): Equipment[] {
    const term = this.directIssueEquipmentSearch().toLowerCase().trim();
    if (!term) {
      return this.availableEquipment;
    }

    return this.availableEquipment.filter((equipment) =>
      `${equipment.assetNumber} ${equipment.brandModel} ${equipment.equipmentType}`
        .toLowerCase()
        .includes(term),
    );
  }

  staffUserOptions = computed(() => {
    return this.staffUsers()
      .filter((user) => user.id !== this.currentUser?.id)
      .map((user) => ({
        value: user.id,
        label: `${user.fullName} (${user.employeeId}) - ${
          user.department || 'N/A'
        }`,
      }));
  });

  get equipmentOptions() {
    const selectedStaff = this.directIssueSelectedStaff;

    // Staff must be selected first; no department context exists yet.
    if (!selectedStaff) {
      return [];
    }

    let equipmentList = this.availableEquipment;

    // Show only equipment belonging to the selected user's department.
    if (selectedStaff.department) {
      equipmentList = equipmentList.filter(
        (eq) => eq.department === selectedStaff.department,
      );
    }

    return equipmentList.map((eq) => ({
      value: eq.assetNumber,
      label: `${eq.assetNumber} - ${eq.brandModel} (${eq.equipmentType}) - ${eq.department}`,
    }));
  }

  initDirectIssueForm(): void {
    this.directIssueForm = this.fb.group({
      staffId: [null as number | null, [Validators.required]],
      issuingOfficerId: [this.currentUser?.id || 2, [Validators.required]],
      assetNumber: ['', [Validators.required]],
      accessoriesProvided: [''],
      checklist: this.fb.group({
        osInstalled: ['Windows 11 Pro', [Validators.required]],
        appSystemInstalled: [
          'Office 365, Enterprise Antivirus',
          [Validators.required],
        ],
        antiVirusInstalled: [
          'Kaspersky Endpoint Security',
          [Validators.required],
        ],
        pdfReaderInstalled: ['Adobe Acrobat Reader', [Validators.required]],
        isJoinedToDomain: [true],
        isInstalledVpn: [true],
        isInstalledPrinter: [true],
        additionalNotes: ['Provisioned directly via ICT Service Desk'],
      }),
    });

    this.applyDirectIssueChecklistValidators();

    this.directIssueForm
      .get('assetNumber')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyDirectIssueChecklistValidators());

    // When the staff user changes, clear an equipment selection that no longer belongs to that user's department.
    this.directIssueForm
      .get('staffId')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const assetControl = this.directIssueForm.get('assetNumber');
        const selectedAssetNumber = assetControl?.value;
        if (!selectedAssetNumber) {
          return;
        }

        const selectedStaff = this.directIssueSelectedStaff;
        // Equipment is selected after the staff user; clearing the user should clear the previously dependent equipment selection.
        if (!selectedStaff) {
          assetControl?.setValue('', { emitEvent: false });
          return;
        }

        const assetStillValid = this.availableEquipment.some(
          (eq) =>
            eq.assetNumber === selectedAssetNumber &&
            (!selectedStaff.department ||
              eq.department === selectedStaff.department),
        );

        if (!assetStillValid) {
          assetControl?.setValue('', { emitEvent: false });
        }
      });
  }

  loadStaffUsers(): void {
    if (!this.canManage) {
      return;
    }

    this.userDirectoryService.getAllUsers().subscribe({
      next: (users) => {
        this.staffUsers.set(users.filter((user) =>
          (user.role || '').toUpperCase().includes('STAFF'),
        ));
      },
      error: () => {
        this.staffUsers.set([]);
      },
    });
  }

  searchStaffUsers(query: string): void {
    if (!this.canManage) {
      return;
    }

    this.userDirectoryService.searchUsers(query).subscribe({
      next: (users) => {
        this.staffUsers.set(users);
      },
      error: () => {
        this.staffUsers.set([]);
      },
    });
  }

  loadAvailableEquipment(): void {
    if (this.canManage) {
      this.equipmentService.getAllEquipment().subscribe({
        next: (items) => {
          this.availableEquipment = items.filter(
            (e) => e.status === 'AVAILABLE',
          );
        },
        error: () => {},
      });
    }
  }

  loadTransactions(): void {
    this.isLoading = true;
    const pageIndex = this.page() - 1;

    const filters: TransactionFilterParams = {
      page: pageIndex,
      size: this.pageSize(),
      sort: 'id,desc',
    };

    if (this.isStaff && this.currentUser?.id) {
      filters.staffId = this.currentUser.id;
    }

    if (this.selectedStatus() !== 'ALL') {
      filters.status = this.selectedStatus() as TransactionStatus;
    }
    if (this.startDateFilter()) {
      filters.startDate = this.startDateFilter();
    }
    if (this.endDateFilter()) {
      filters.endDate = this.endDateFilter();
    }

    this.transactionService.getTransactions(filters).subscribe({
      next: (payload) => {
        const items = payload.content || [];
        const pageable = payload.pageable;

        const totalElements = pageable?.totalElements ?? items.length;
        const pageSize = pageable?.pageSize ?? this.pageSize();
        const currentNumber =
          pageable?.pageNumber ?? Math.max(0, this.page() - 1);
        const totalPages =
          pageable?.totalPages ??
          (pageSize > 0
            ? Math.max(1, Math.ceil(Number(totalElements) / pageSize))
            : 1);

        this.transactions.set(items);
        this.totalElements.set(Number(totalElements));
        this.totalPages.set(Number(Math.max(1, totalPages)));
        // Sync UI page (client is 1-based, backend is 0-based)
        this.page.set(Number(currentNumber) + 1);
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        const msg = this.authService.getErrorMessage(err);
        this.toastService.error('Failed to load transactions', msg);
      },
    });
  }

  filteredTransactions = computed(() => {
    const list = this.transactions();
    const term = this.searchTerm().toLowerCase().trim();

    if (!term) return list;

    return list.filter(
      (t) =>
        t.transactionCode.toLowerCase().includes(term) ||
        t.staffName.toLowerCase().includes(term) ||
        t.issuingOfficerName.toLowerCase().includes(term) ||
        t.issuedItems.some(
          (item) =>
            item.assetNumber.toLowerCase().includes(term) ||
            (item.serialNumber &&
              item.serialNumber.toLowerCase().includes(term)) ||
            (item.equipmentType &&
              item.equipmentType.toLowerCase().includes(term)),
        ) ||
        t.returnedItems.some(
          (item) =>
            item.assetNumber.toLowerCase().includes(term) ||
            (item.serialNumber &&
              item.serialNumber.toLowerCase().includes(term)) ||
            (item.equipmentType &&
              item.equipmentType.toLowerCase().includes(term)),
        ),
    );
  });

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
    this.page.set(1);
    this.loadTransactions();
  }

  onStatusChange(status: string): void {
    this.selectedStatus.set(status);
    this.page.set(1);
    this.loadTransactions();
  }

  onStartDateChange(date: string): void {
    const normalized = date && date.length === 10 ? `${date}T00:00:00` : date;
    this.startDateFilter.set(normalized);
    this.page.set(1);
    this.loadTransactions();
  }

  onEndDateChange(date: string): void {
    const normalized = date && date.length === 10 ? `${date}T23:59:59` : date;
    this.endDateFilter.set(normalized);
    this.page.set(1);
    this.loadTransactions();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(Number(size));
    this.page.set(1);
    this.loadTransactions();
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) {
      this.page.set(p);
      this.loadTransactions();
    }
  }

  openSignModal(txn: EquipmentTransaction, event?: Event): void {
    event?.stopPropagation();
    this.selectedTransaction = txn;
    this.employeeKeyphrase = '';
    this.officerKeyphrase = '';
    this.isSignModalOpen = true;
  }

  openCancelModal(txn: EquipmentTransaction, event?: Event): void {
    event?.stopPropagation();
    this.selectedTransaction = txn;
    this.isCancelModalOpen = true;
  }

  openDetailModal(txn: EquipmentTransaction, event?: Event): void {
    event?.stopPropagation();
    this.selectedTransaction = txn;
    this.isDetailModalOpen = true;
  }

  openDirectIssueModal(): void {
    this.directIssueStaffSearch.set('');
    this.directIssueEquipmentSearch.set('');
    this.directIssueAccessoryInput = '';
    this.directIssueAccessories = [];
    this.directIssueForm.reset({
      staffId: null,
      issuingOfficerId: this.currentUser?.id || 2,
      assetNumber: '',
      accessoriesProvided: '',
      checklist: {
        osInstalled: 'Windows 11 Pro',
        appSystemInstalled: 'Office 365, Enterprise Antivirus',
        antiVirusInstalled: 'Kaspersky Endpoint Security',
        pdfReaderInstalled: 'Adobe Acrobat Reader',
        isJoinedToDomain: true,
        isInstalledVpn: true,
        isInstalledPrinter: true,
        additionalNotes: 'Provisioned directly via ICT Service Desk',
      },
    });
    this.applyDirectIssueChecklistValidators();
    this.isDirectIssueModalOpen = true;
  }

  closeModals(): void {
    this.isSignModalOpen = false;
    this.isCancelModalOpen = false;
    this.isDetailModalOpen = false;
    this.isDirectIssueModalOpen = false;
    this.selectedTransaction = null;
    this.directIssueStaffSearch.set('');
    this.directIssueEquipmentSearch.set('');
    this.directIssueAccessoryInput = '';
    this.directIssueAccessories = [];
  }

  addDirectIssueAccessory(): void {
    const value = this.directIssueAccessoryInput.trim();
    if (!value) {
      return;
    }

    const exists = this.directIssueAccessories.some(
      (item) => item.toLowerCase() === value.toLowerCase(),
    );
    if (exists) {
      this.directIssueAccessoryInput = '';
      return;
    }

    this.directIssueAccessories = [...this.directIssueAccessories, value];
    this.directIssueAccessoryInput = '';
    this.syncAccessoriesToForm();
  }

  removeDirectIssueAccessory(index: number): void {
    if (index < 0 || index >= this.directIssueAccessories.length) {
      return;
    }

    this.directIssueAccessories = this.directIssueAccessories.filter(
      (_, itemIndex) => itemIndex !== index,
    );
    this.syncAccessoriesToForm();
  }

  onDirectIssueAccessoryKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    this.addDirectIssueAccessory();
  }


  submitSignatures(): void {
    if (!this.selectedTransaction) return;

    if (this.canCaptureEmployeeSignature) {
      if (!this.employeeKeyphrase || this.employeeKeyphrase.length < 6) {
        this.toastService.warning(
          'Keyphrase Required',
          'Please enter your keyphrase (min 6 characters) before signing.',
        );
        return;
      }

      this.isLoading = true;
      this.keyphraseService.signTransactionAsEmployee(this.selectedTransaction.id, this.employeeKeyphrase).subscribe({
        next: (updated) => {
          this.isLoading = false;
          this.closeModals();
          this.toastService.success(
            'Transaction Signed',
            `Transaction ${updated.transactionCode} signed successfully!`,
          );
          this.loadTransactions();
        },
        error: (err) => {
          this.isLoading = false;
          const msg = this.authService.getErrorMessage(err);
          this.toastService.error('Error Signing Transaction', msg);
        },
      });
    } else if (this.canCaptureOfficerSignature) {
      if (!this.selectedTransactionHasEmployeeSignature) {
        this.toastService.warning(
          'Awaiting Staff Signature',
          'This transaction cannot be completed until the staff member has signed the request.',
        );
        return;
      }

      if (!this.officerKeyphrase || this.officerKeyphrase.length < 6) {
        this.toastService.warning(
          'Keyphrase Required',
          'Please enter your keyphrase (min 6 characters) before signing.',
        );
        return;
      }

      this.isLoading = true;
      this.keyphraseService.signTransactionAsOfficer(this.selectedTransaction.id, this.officerKeyphrase).subscribe({
        next: (updated) => {
          this.isLoading = false;
          this.closeModals();
          this.toastService.success(
            'Transaction Signed',
            `Transaction ${updated.transactionCode} signed & completed! Equipment status updated.`,
          );
          this.loadTransactions();
        },
        error: (err) => {
          this.isLoading = false;
          const msg = this.authService.getErrorMessage(err);
          this.toastService.error('Error Signing Transaction', msg);
        },
      });
    } else {
      this.toastService.warning(
        'Nothing to Submit',
        'This transaction already has the available signatures.',
      );
    }
  }

  confirmCancel(): void {
    if (!this.selectedTransaction) return;

    this.isLoading = true;
    this.transactionService
      .cancelTransaction(this.selectedTransaction.id)
      .subscribe({
        next: (updated) => {
          this.isLoading = false;
          this.closeModals();
          this.toastService.info(
            'Transaction Cancelled',
            `Transaction ${updated.transactionCode} cancelled.`,
          );
          this.loadTransactions();
        },
        error: (err) => {
          this.isLoading = false;
          const msg = this.authService.getErrorMessage(err);
          this.toastService.error('Error Cancelling Transaction', msg);
        },
      });
  }

  submitDirectIssue(): void {
    if (this.directIssueAccessoryInput.trim()) {
      this.addDirectIssueAccessory();
    }

    if (this.directIssueForm.invalid) {
      this.directIssueForm.markAllAsTouched();
      return;
    }

    const raw = this.directIssueForm.value;
    const accessoriesProvided = this.directIssueAccessories.join(', ');
    const dto = {
      staffId: Number(raw.staffId),
      issuingOfficerId: Number(raw.issuingOfficerId),
      issuedItems: [
        {
          assetNumber: raw.assetNumber,
          accessoriesProvided,
        },
      ],
      checklist: raw.checklist,
    };

    this.isLoading = true;
    this.transactionService.directIssue(dto).subscribe({
      next: (created) => {
        this.isLoading = false;
        this.closeModals();
        this.toastService.success(
          'Direct Issue Created',
          `Direct equipment issuance ${created.transactionCode} created! Pending signatures.`,
        );
        this.loadTransactions();
      },
      error: (err) => {
        this.isLoading = false;
        const msg = this.authService.getErrorMessage(err);
        this.toastService.error('Error Creating Issuance', msg);
      },
    });
  }

  private applyDirectIssueChecklistValidators(): void {
    const checklistGroup = this.directIssueForm.get('checklist') as FormGroup;
    const requiredFields = [
      'osInstalled',
      'appSystemInstalled',
      'antiVirusInstalled',
      'pdfReaderInstalled',
    ];
    const requiresChecklist = this.directIssueRequiresChecklist;

    for (const fieldName of requiredFields) {
      const control = checklistGroup.get(fieldName);
      if (!control) {
        continue;
      }

      if (requiresChecklist) {
        control.setValidators([Validators.required]);
      } else {
        control.clearValidators();
      }
      control.updateValueAndValidity({ emitEvent: false });
    }

    checklistGroup.updateValueAndValidity({ emitEvent: false });
  }

  downloadPdf(txnId: number, event?: Event): void {
    event?.stopPropagation();
    this.isDownloadingPdf = true;

    this.transactionService.downloadPdf(txnId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `transaction_${txnId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        this.isDownloadingPdf = false;
        this.toastService.success(
          'PDF Downloaded',
          'Official transaction PDF file saved.',
        );
      },
      error: () => {
        this.isDownloadingPdf = false;
        this.toastService.error(
          'PDF Error',
          'Failed to generate PDF document.',
        );
      },
    });
  }

  getStatusClass(status: TransactionStatus): string {
    switch (status) {
      case 'PENDING_SIGNATURE':
        return 'status-indicator pending';
      case 'COMPLETED':
        return 'status-indicator completed';
      case 'CANCELLED':
        return 'status-indicator danger';
      default:
        return 'status-indicator';
    }
  }

  private syncAccessoriesToForm(): void {
    this.directIssueForm
      .get('accessoriesProvided')
      ?.setValue(this.directIssueAccessories.join(', '));
  }
}
