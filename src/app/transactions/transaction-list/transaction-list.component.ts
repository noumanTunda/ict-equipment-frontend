import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  ViewChild,
  signal,
  computed,
} from '@angular/core';
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
import { SignaturePadComponent } from '../../shared/signature-pad/signature-pad.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    SignaturePadComponent,
  ],
  templateUrl: './transaction-list.component.html',
})
export class TransactionListComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly transactionService = inject(TransactionService);
  private readonly equipmentService = inject(EquipmentService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  currentUser: User | null = null;
  userRole: string = 'ROLE_STAFF';

  // Signals
  transactions = signal<EquipmentTransaction[]>([]);
  searchTerm = signal<string>('');
  selectedStatus = signal<string>('ALL');
  startDateFilter = signal<string>('');
  endDateFilter = signal<string>('');

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

  @ViewChild('employeeSigPad') employeeSigPad?: SignaturePadComponent;
  @ViewChild('officerSigPad') officerSigPad?: SignaturePadComponent;

  employeeSignatureBase64: string | null = null;
  officerSignatureBase64: string | null = null;

  directIssueForm!: FormGroup;

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    this.userRole = this.currentUser?.role || 'ROLE_STAFF';

    this.initDirectIssueForm();
    this.loadTransactions();
    this.loadAvailableEquipment();
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
    return !!this.selectedTransaction?.employeeSignature;
  }

  get selectedTransactionHasOfficerSignature(): boolean {
    return !!this.selectedTransaction?.officerSignature;
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

  get directIssueRequiresChecklist(): boolean {
    const type = this.directIssueSelectedEquipment?.equipmentType
      ?.trim()
      .toUpperCase();
    return type === 'LAPTOP' || type === 'DESKTOP';
  }

  initDirectIssueForm(): void {
    this.directIssueForm = this.fb.group({
      staffId: [1, [Validators.required]],
      issuingOfficerId: [this.currentUser?.id || 2, [Validators.required]],
      assetNumber: ['', [Validators.required]],
      accessoriesProvided: ['Charger, Carrying Case, Wireless Mouse'],
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
        this.transactions.set(items);
        const totalElements = payload.pageable?.totalElements ?? items.length;
        const pageSize = payload.pageable?.pageSize ?? this.pageSize();
        const derivedTotalPages =
          pageSize > 0 ? Math.max(1, Math.ceil(totalElements / pageSize)) : 1;
        this.totalElements.set(totalElements);
        this.totalPages.set(payload.pageable?.totalPages ?? derivedTotalPages);
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
        t.issuingOfficerName.toLowerCase().includes(term),
    );
  });

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
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
    this.employeeSignatureBase64 = null;
    this.officerSignatureBase64 = null;
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
    this.applyDirectIssueChecklistValidators();
    this.isDirectIssueModalOpen = true;
  }

  closeModals(): void {
    this.isSignModalOpen = false;
    this.isCancelModalOpen = false;
    this.isDetailModalOpen = false;
    this.isDirectIssueModalOpen = false;
    this.selectedTransaction = null;
  }

  onEmployeeSigChange(sig: string | null): void {
    this.employeeSignatureBase64 = sig;
  }

  onOfficerSigChange(sig: string | null): void {
    this.officerSignatureBase64 = sig;
  }

  submitSignatures(): void {
    if (!this.selectedTransaction) return;

    const payload: SignTransactionDto = {};

    if (this.canCaptureEmployeeSignature) {
      if (!this.employeeSignatureBase64) {
        this.toastService.warning(
          'Signature Required',
          'Please sign before submitting the transaction.',
        );
        return;
      }

      payload.employeeSignature = this.employeeSignatureBase64;
    }

    if (this.canCaptureOfficerSignature) {
      if (!this.selectedTransactionHasEmployeeSignature) {
        this.toastService.warning(
          'Awaiting Staff Signature',
          'This transaction cannot be completed until the staff member has signed the request.',
        );
        return;
      }

      if (!this.officerSignatureBase64) {
        this.toastService.warning(
          'Signature Required',
          'Please sign as the issuing officer before submitting.',
        );
        return;
      }

      payload.officerSignature = this.officerSignatureBase64;
    }

    if (!this.canCaptureEmployeeSignature && !this.canCaptureOfficerSignature) {
      this.toastService.warning(
        'Nothing to Submit',
        'This transaction already has the available signatures.',
      );
      return;
    }

    this.isLoading = true;
    this.transactionService
      .submitSignatures(this.selectedTransaction.id, payload)
      .subscribe({
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
    if (this.directIssueForm.invalid) {
      this.directIssueForm.markAllAsTouched();
      return;
    }

    const raw = this.directIssueForm.value;
    const dto = {
      staffId: Number(raw.staffId),
      issuingOfficerId: Number(raw.issuingOfficerId),
      issuedItems: [
        {
          assetNumber: raw.assetNumber,
          accessoriesProvided: raw.accessoriesProvided,
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
}
