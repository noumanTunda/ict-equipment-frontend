import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RequestService } from '../../services/request.service';
import { EquipmentService } from '../../services/equipment.service';
import { TransactionService } from '../../services/transaction.service';
import { UserDirectoryService } from '../../services/user-directory.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import {
  ApproveRequestDto,
  CreateEquipmentRequestDto,
  EquipmentRequest,
  RequestStatus,
  RequestType,
} from '../../models/request.model';
import { Equipment } from '../../models/equipment.model';
import { EquipmentType } from '../../models/request.model';
import { User } from '../../models/auth.model';
import { IctChecklist, ReturnCondition } from '../../models/transaction.model';
import { SignaturePadComponent } from '../../shared/signature-pad/signature-pad.component';
import { SearchableSelectComponent } from '../../shared/searchable-select/searchable-select.component';
import { catchError, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-request-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    SignaturePadComponent,
    SearchableSelectComponent,
  ],
  templateUrl: './request-list.component.html',
})
export class RequestListComponent implements OnInit {
  private readonly requestService = inject(RequestService);
  private readonly equipmentService = inject(EquipmentService);
  private readonly transactionService = inject(TransactionService);
  private readonly userDirectoryService = inject(UserDirectoryService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  currentUser: User | null = null;
  userRole: string = 'ROLE_STAFF';

  // Signals
  requests = signal<EquipmentRequest[]>([]);
  searchTerm = signal<string>('');
  activeStatusTab = signal<RequestStatus | 'ALL'>('PENDING');
  submitReturnAssetSearch = signal<string>('');
  approveIssueAssetSearch = signal<string>('');
  approveReturnAssetSearch = signal<string>('');

  page = signal<number>(1);
  pageSize = signal<number>(10);
  pageSizeOptions: number[] = [5, 10, 20, 50];
  totalElements = signal<number>(0);
  totalPages = signal<number>(1);

  isLoading = false;
  isLoadingReturnAssets = false;

  // Equipment cache
  allEquipment: Equipment[] = [];
  availableEquipment: Equipment[] = [];
  issuedEquipment: Equipment[] = [];
  returnAssetOptions: Equipment[] = [];
  staffUsers: User[] = [];

  // Options
  requestTypes: RequestType[] = ['ISSUE', 'RETURN', 'EXCHANGE'];
  equipmentTypes: string[] = [
    'LAPTOP',
    'DESKTOP',
    'PRINTER',
    'UPS',
    'SCANNER',
    'MONITOR',
    'OTHER',
  ];
  returnConditions: ReturnCondition[] = ['GOOD', 'FAIR', 'DAMAGED', 'OBSOLETE'];

  // Accessories mapping for each equipment type
  equipmentAccessories: Record<string, string[]> = {
    LAPTOP: ['Charger', 'Mouse', 'Carrying Bag', 'External HDD', 'Headset','Mouse Pad','Docking Station','Laptop Stand'],
    DESKTOP: ['Keyboard', 'Mouse', 'Speakers','Web Cam','Bluetooth Adapter','Wi-Fi Adapter'],
    UPS: ['Power Cord', 'USB Cable', 'Manual','UPS Stand'],
    SCANNER: ['Power Cord', 'USB Cable', 'Driver CD', 'Manual'],
    PRINTER: ['Power Cord', 'USB Cable', 'Driver CD', 'Paper Tray', 'Manual'],
    MONITOR: ['Power Cord', 'HDMI Cable', 'VGA Cable','Monitor Arm', 'Light Bar', 'USB B Cable'],
    OTHER: []
  };

  // Form control for selected accessories
  selectedAccessories: string[] = [];
  otherAccessoriesText: string = '';

  requestKeyphrase: string = '';

  // Modals
  isSubmitModalOpen = false;
  isApproveModalOpen = false;
  isRejectModalOpen = false;
  isDetailModalOpen = false;

  selectedRequest: EquipmentRequest | null = null;

  // Reactive Forms
  requestForm!: FormGroup;
  approveForm!: FormGroup;
  rejectForm!: FormGroup;

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    this.userRole = this.currentUser?.role || 'ROLE_STAFF';

    this.initForms();
    this.loadEquipmentLists();
    this.loadStaffUsers();
    this.loadRequests();
  }

  get isStaff(): boolean {
    return this.userRole === 'ROLE_STAFF';
  }

  get canApprove(): boolean {
    return (
      this.userRole === 'ROLE_ADMIN' || this.userRole === 'ROLE_ICT_OFFICER'
    );
  }

  initForms(): void {
    this.requestForm = this.fb.group({
      requestType: ['ISSUE' as RequestType, [Validators.required]],
      reason: ['', [Validators.required, Validators.minLength(5)]],
      preferredEquipmentType: ['LAPTOP'],
      returnAssetNumber: [''],
      issueAssetNumber: [''],
      employeeSignature: [null as string | null],
    });

    this.approveForm = this.fb.group({
      issueAssetNumber: [''],
      returnAssetNumber: [''],
      accessoriesProvided: ['Charger, Mouse, Carrying Bag'],
      returnCondition: ['GOOD' as ReturnCondition],
      returnRemarks: ['Normal wear and tear'],
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
        additionalNotes: ['Configured for domain staff access'],
      }),
    });

    this.rejectForm = this.fb.group({
      rejectionReason: ['', [Validators.required, Validators.minLength(5)]],
    });
  }

  loadEquipmentLists(): void {
    if (this.canApprove) {
      this.equipmentService.getAllEquipment().subscribe({
        next: (items) => {
          this.allEquipment = items;
          this.availableEquipment = items.filter(
            (e) => e.status === 'AVAILABLE',
          );
          this.issuedEquipment = items.filter((e) => e.status === 'ISSUED');
        },
        error: () => {},
      });
    }
  }

  loadStaffUsers(): void {
    if (!this.canApprove) {
      return;
    }

    this.userDirectoryService.getAllUsers().subscribe({
      next: (users) => {
        this.staffUsers = users.filter((user) =>
          (user.role || '').toUpperCase().includes('STAFF'),
        );
        // If an approval modal is already open while users finish loading,
        // refresh the default asset selection against the request filters.
        if (this.isApproveModalOpen && this.selectedRequest) {
          this.afterApprovalRequestDetailLoaded();
        }
      },
      error: () => {
        this.staffUsers = [];
      },
    });
  }

  loadRequests(): void {
    this.isLoading = true;
    const pageIndex = this.page() - 1;

    if (this.isStaff) {
      this.requestService
        .getMyRequests(pageIndex, this.pageSize(), 'id,desc')
        .subscribe({
          next: (payload) => {
            const items = payload.content || [];
            this.requests.set(items);
            this.hydrateMissingPreferredEquipmentTypes(items);
            this.resolvePageInfo(payload, items);
            this.isLoading = false;
          },
          error: (err) => {
            this.isLoading = false;
            const msg = this.authService.getErrorMessage(err);
            this.toastService.error('Failed to load requests', msg);
          },
        });
    } else {
      const status =
        this.activeStatusTab() === 'ALL'
          ? undefined
          : (this.activeStatusTab() as RequestStatus);
      const obs = status
        ? this.requestService.getRequestsByStatus(
            status,
            pageIndex,
            this.pageSize(),
            'id,desc',
          )
        : this.requestService.getAllPendingRequests(
            pageIndex,
            this.pageSize(),
            'id,desc',
          );

      obs.subscribe({
        next: (payload) => {
          const items = payload.content || [];
          this.requests.set(items);
          this.hydrateMissingPreferredEquipmentTypes(items);
          this.resolvePageInfo(payload, items);
          this.isLoading = false;
        },
        error: (err) => {
          this.isLoading = false;
          const msg = this.authService.getErrorMessage(err);
          this.toastService.error('Failed to load requests', msg);
        },
      });
    }
  }

  filteredRequests = computed(() => {
    const list = this.requests();
    const term = this.searchTerm().toLowerCase().trim();

    if (!term) return list;

    return list.filter(
      (r) =>
        r.requestCode.toLowerCase().includes(term) ||
        r.staffName.toLowerCase().includes(term) ||
        r.reason.toLowerCase().includes(term) ||
        r.requestType.toLowerCase().includes(term),
    );
  });

  get approvalEquipmentOptions(): Equipment[] {
    if (!this.selectedRequest) {
      return [];
    }

    const preferredType = this.normalizeEquipmentType(
      this.selectedRequest.preferredEquipmentType || '',
    );

    let filtered = this.availableEquipment;

    // Filter by the preferred equipment type first (e.g. UPS only).
    if (preferredType) {
      filtered = filtered.filter(
        (equipment) =>
          equipment.equipmentType.trim().toUpperCase() === preferredType,
      );
    }

    // Then only show equipment from the requesting user's department.
    const staffDepartment = this.getStaffDepartment(
      this.selectedRequest.staffId,
    );
    if (staffDepartment) {
      filtered = filtered.filter(
        (equipment) => equipment.department === staffDepartment,
      );
    }

    return filtered;
  }

  get filteredSubmitReturnAssetOptions(): Equipment[] {
    const term = this.submitReturnAssetSearch().toLowerCase().trim();
    if (!term) {
      return this.returnAssetOptions;
    }

    return this.returnAssetOptions.filter((equipment) =>
      `${equipment.assetNumber} ${equipment.brandModel} ${equipment.equipmentType}`
        .toLowerCase()
        .includes(term),
    );
  }

  get filteredApprovalIssueOptions(): Equipment[] {
    const term = this.approveIssueAssetSearch().toLowerCase().trim();
    if (!term) {
      return this.approvalEquipmentOptions;
    }

    return this.approvalEquipmentOptions.filter((equipment) =>
      `${equipment.assetNumber} ${equipment.brandModel} ${equipment.equipmentType}`
        .toLowerCase()
        .includes(term),
    );
  }

  get filteredApprovalReturnOptions(): Equipment[] {
    const term = this.approveReturnAssetSearch().toLowerCase().trim();
    if (!term) {
      return this.returnAssetOptions;
    }

    return this.returnAssetOptions.filter((equipment) =>
      `${equipment.assetNumber} ${equipment.brandModel} ${equipment.equipmentType}`
        .toLowerCase()
        .includes(term),
    );
  }

  get submitReturnAssetOptions() {
    return this.returnAssetOptions.map(eq => ({
      value: eq.assetNumber,
      label: `${eq.assetNumber} - ${eq.brandModel} (${eq.equipmentType})`
    }));
  }

  get approvalIssueAssetOptions() {
    return this.approvalEquipmentOptions.map(eq => ({
      value: eq.assetNumber,
      label: `${eq.assetNumber} - ${eq.brandModel} (${eq.equipmentType}) - ${eq.department || 'N/A'}`
    }));
  }

  get approvalReturnAssetOptions() {
    return this.returnAssetOptions.map(eq => ({
      value: eq.assetNumber,
      label: `${eq.assetNumber} - ${eq.brandModel} (${eq.equipmentType})`
    }));
  }

  get requiresChecklist(): boolean {
    const type = this.normalizeEquipmentType(

      this.selectedRequest?.preferredEquipmentType || '',
    );
    return !!type && (type === 'LAPTOP' || type === 'DESKTOP');
  }

  get selectedRequestPreferredEquipmentType(): string {
    const preferredType = this.normalizeEquipmentType(
      this.selectedRequest?.preferredEquipmentType || '',
    );
    return preferredType || 'N/A';
  }

  getPreferredEquipmentType(request: EquipmentRequest): string {
    const preferredType = this.normalizeEquipmentType(
      request.preferredEquipmentType || '',
    );
    return preferredType || 'N/A';
  }

  get selectedRequestHasSignature(): boolean {
    return !!this.selectedRequest?.employeeSignature;
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(Number(size));
    this.page.set(1);
    this.loadRequests();
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) {
      this.page.set(p);
      this.loadRequests();
    }
  }

  switchTab(tab: RequestStatus | 'ALL'): void {
    this.activeStatusTab.set(tab);
    this.page.set(1);
    this.loadRequests();
  }

  openSubmitModal(): void {
    this.requestForm.reset({
      requestType: 'ISSUE',
      preferredEquipmentType: 'LAPTOP',
      employeeSignature: null,
    });
    this.requestSignatureBase64 = null;
    this.submitReturnAssetSearch.set('');
    if (this.isStaff && this.currentUser?.id) {
      this.loadReturnAssetOptions(this.currentUser.id);
    }
    this.isSubmitModalOpen = true;
  }

  openApproveModal(reqItem: EquipmentRequest, event?: Event): void {
    event?.stopPropagation();
    this.returnAssetOptions = [];

    this.selectedRequest = reqItem;
    this.approveIssueAssetSearch.set('');
    this.approveReturnAssetSearch.set('');

    this.approveForm.patchValue({
      issueAssetNumber: reqItem.issueAssetNumber || '',
      returnAssetNumber: reqItem.returnAssetNumber || '',
      returnCondition: 'GOOD',
    });

    if (reqItem.staffId) {
      this.loadReturnAssetOptions(reqItem.staffId);
    }

    this.configureApprovalChecklistValidators();
    this.isApproveModalOpen = true;

    // Always fetch the full request before showing the asset dropdown. The
    // list endpoint may omit preferredEquipmentType, so this ensures the
    // correct type filter is applied during approval.
    this.requestService.getRequestById(reqItem.id).subscribe({
      next: (hydrated) => {
        if (!this.isApproveModalOpen) {
          return;
        }
        this.selectedRequest = hydrated;
        this.afterApprovalRequestDetailLoaded();
      },
      error: () => {
        if (!this.isApproveModalOpen) {
          return;
        }
        // Keep the row data if the detail endpoint is unavailable.
        this.afterApprovalRequestDetailLoaded();
      },
    });
  }

  private afterApprovalRequestDetailLoaded(): void {
    if (!this.selectedRequest) {
      return;
    }

    this.configureApprovalChecklistValidators();

    const requestType = this.selectedRequest.requestType;
    if (requestType !== 'ISSUE' && requestType !== 'EXCHANGE') {
      return;
    }

    const options = this.approvalEquipmentOptions;
    const assetControl = this.approveForm.get('issueAssetNumber');
    const currentAsset = assetControl?.value;

    if (
      assetControl &&
      (!currentAsset ||
        !options.some((equipment) => equipment.assetNumber === currentAsset))
    ) {
      assetControl.setValue(options[0]?.assetNumber || '');
    }
  }

  openRejectModal(reqItem: EquipmentRequest, event?: Event): void {
    event?.stopPropagation();
    this.selectedRequest = reqItem;
    this.rejectForm.reset();
    this.isRejectModalOpen = true;
  }

  openDetailModal(reqItem: EquipmentRequest, event?: Event): void {
    event?.stopPropagation();
    this.selectedRequest = reqItem;
    this.isDetailModalOpen = true;
  }

  closeModals(): void {
    this.isSubmitModalOpen = false;
    this.isApproveModalOpen = false;
    this.isRejectModalOpen = false;
    this.isDetailModalOpen = false;
    this.selectedRequest = null;
    this.submitReturnAssetSearch.set('');
    this.approveIssueAssetSearch.set('');
    this.approveReturnAssetSearch.set('');
  }

  onRequestSignatureChange(signature: string | null): void {
    this.requestSignatureBase64 = signature;
    this.requestForm.get('employeeSignature')?.setValue(signature);
  }

  private loadReturnAssetOptions(staffId: number): void {
    this.isLoadingReturnAssets = true;

    this.transactionService
      .getTransactions({
        staffId,
        page: 0,
        size: 200,
        sort: 'id,desc',
      })
      .subscribe({
        next: (payload) => {
          const transactions = payload.content || [];
          const issuedAssetNumbers = new Set<string>();
          const returnedAssetNumbers = new Set<string>();
          const issuedAssetMeta = new Map<
            string,
            { equipmentType: string; brandModel: string }
          >();

          for (const transaction of transactions) {
            for (const issued of transaction.issuedItems || []) {
              issuedAssetNumbers.add(issued.assetNumber);
              issuedAssetMeta.set(issued.assetNumber, {
                equipmentType: issued.equipmentType || 'Equipment',
                brandModel:
                  issued.accessoriesProvided ||
                  issued.equipmentType ||
                  'Issued Asset',
              });
            }

            for (const returned of transaction.returnedItems || []) {
              returnedAssetNumbers.add(returned.assetNumber);
            }
          }

          this.returnAssetOptions = Array.from(issuedAssetNumbers)
            .filter((assetNumber) => !returnedAssetNumbers.has(assetNumber))
            .map((assetNumber) => {
              const equipment = this.allEquipment.find(
                (item) => item.assetNumber === assetNumber,
              );

              if (equipment) {
                return equipment;
              }

              const meta = issuedAssetMeta.get(assetNumber);
              return {
                id: 0,
                assetNumber,
                serialNumber: '',
                equipmentType: meta?.equipmentType || 'Equipment',
                brandModel: meta?.brandModel || 'Issued Asset',
                supplierDetails: '',
                description: '',
                status: 'ISSUED',
                createdAt: '',
                updatedAt: '',
              } as Equipment;
            });
          this.isLoadingReturnAssets = false;
        },
        error: () => {
          this.returnAssetOptions = [];
          this.isLoadingReturnAssets = false;
        },
      });
  }

  private resolvePageInfo(
    payload: {
      pageable?: {
        totalElements?: number;
        totalPages?: number;
        pageSize?: number;
      };
      totalElements?: number;
      totalPages?: number;
    },
    items: EquipmentRequest[],
  ): void {
    const totalElements =
      payload.pageable?.totalElements ?? payload.totalElements ?? items.length;
    const pageSize = payload.pageable?.pageSize ?? this.pageSize();
    const derivedTotalPages =
      pageSize > 0 ? Math.max(1, Math.ceil(totalElements / pageSize)) : 1;

    this.totalElements.set(totalElements);
    this.totalPages.set(
      payload.pageable?.totalPages ?? payload.totalPages ?? derivedTotalPages,
    );
  }

  private normalizeEquipmentType(type: EquipmentType | string): string {
    if (!type) return '';
    return String(type).trim();
  }

  private getStaffDepartment(staffId: number): string {
    return (
      this.staffUsers.find((user) => user.id === staffId)?.department || ''
    );
  }

  private hydrateMissingPreferredEquipmentTypes(
    requests: EquipmentRequest[],
  ): void {
    // The list endpoint may not include preferredEquipmentType, so we need to
    // fetch the full request details for any requests missing this field
    const missingRequests = requests.filter(
      (request) => !request.preferredEquipmentType || request.preferredEquipmentType === '' as any,
    );

    if (!missingRequests.length) {
      return;
    }

    forkJoin(
      missingRequests.map((request) =>
        this.requestService.getRequestById(request.id).pipe(
          catchError(() => of(null)),
        ),
      ),
    ).subscribe({
      next: (hydratedRequests) => {
        const hydratedById = new Map<number, EquipmentRequest>();
        hydratedRequests.forEach((request) => {
          if (request) {
            hydratedById.set(request.id, request);
          }
        });

        this.requests.set(
          requests.map((request) => hydratedById.get(request.id) ?? request),
        );
      },
    });
  }

  private configureApprovalChecklistValidators(): void {
    const checklistGroup = this.approveForm.get('checklist') as FormGroup;
    const requiredFields = [
      'osInstalled',
      'appSystemInstalled',
      'antiVirusInstalled',
      'pdfReaderInstalled',
    ];

    for (const fieldName of requiredFields) {
      const control = checklistGroup.get(fieldName);
      if (!control) {
        continue;
      }

      if (this.requiresChecklist) {
        control.setValidators([Validators.required]);
      } else {
        control.clearValidators();
      }
      control.updateValueAndValidity({ emitEvent: false });
    }

    checklistGroup.updateValueAndValidity({ emitEvent: false });
  }

  submitRequest(): void {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }

    const val: CreateEquipmentRequestDto = this.requestForm.value;
    const employeeSignature =
      this.requestSignatureBase64 ?? val.employeeSignature ?? null;

    if (this.isStaff && !employeeSignature) {
      this.toastService.warning(
        'Signature Required',
        'Please sign the request before submitting it.',
      );
      return;
    }

    if (val.requestType === 'RETURN' && !val.returnAssetNumber) {
      this.toastService.warning(
        'Validation Error',
        'Return Asset Number is required for Return requests.',
      );
      return;
    }

    this.isLoading = true;
    this.requestService
      .submitRequest({
        ...val,
        preferredEquipmentType: val.preferredEquipmentType,
        employeeSignature: employeeSignature ?? undefined,
      })
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          this.closeModals();
          this.toastService.success(
            'Request Submitted',
            `Application ${res.requestCode} submitted successfully!`,
          );
          this.loadRequests();
        },
        error: (err) => {
          this.isLoading = false;
          const msg = this.authService.getErrorMessage(err);
          this.toastService.error('Error Submitting Request', msg);
        },
      });
  }

  approveRequest(): void {
    if (!this.selectedRequest) return;
    if (this.approveForm.invalid) {
      this.approveForm.markAllAsTouched();
      return;
    }

    const raw = this.approveForm.value;
    const requestType = this.selectedRequest.requestType;

    const checklist: IctChecklist = {
      osInstalled: raw.checklist.osInstalled,
      appSystemInstalled: raw.checklist.appSystemInstalled,
      antiVirusInstalled: raw.checklist.antiVirusInstalled,
      pdfReaderInstalled: raw.checklist.pdfReaderInstalled,
      isJoinedToDomain: !!raw.checklist.isJoinedToDomain,
      isInstalledVpn: !!raw.checklist.isInstalledVpn,
      isInstalledPrinter: !!raw.checklist.isInstalledPrinter,
      additionalNotes: raw.checklist.additionalNotes || undefined,
    };

    const dto: ApproveRequestDto = {
      requestId: this.selectedRequest.id,
      issueAssetNumber:
        (requestType === 'ISSUE' || requestType === 'EXCHANGE') &&
        raw.issueAssetNumber
          ? raw.issueAssetNumber
          : undefined,
      returnAssetNumber:
        (requestType === 'RETURN' || requestType === 'EXCHANGE') &&
        raw.returnAssetNumber
          ? raw.returnAssetNumber
          : undefined,
      checklist,
      accessoriesProvided: raw.accessoriesProvided || undefined,
      returnCondition: raw.returnCondition || undefined,
      returnRemarks: raw.returnRemarks || undefined,
    };

    this.isLoading = true;
    this.requestService.approveRequest(dto, this.currentUser?.id).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.closeModals();
        this.toastService.success(
          'Request Approved',
          `Request ${res.requestCode} approved and transaction generated.`,
        );
        this.loadRequests();
      },
      error: (err) => {
        this.isLoading = false;
        const msg = this.authService.getErrorMessage(err);
        this.toastService.error('Error Approving Request', msg);
      },
    });
  }

  rejectRequest(): void {
    if (!this.selectedRequest) return;
    if (this.rejectForm.invalid) {
      this.rejectForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.requestService
      .rejectRequest(this.selectedRequest.id, this.rejectForm.value)
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          this.closeModals();
          this.toastService.info(
            'Request Rejected',
            `Request ${res.requestCode} has been rejected.`,
          );
          this.loadRequests();
        },
        error: (err) => {
          this.isLoading = false;
          const msg = this.authService.getErrorMessage(err);
          this.toastService.error('Error Rejecting Request', msg);
        },
      });
  }

  getStatusClass(status: RequestStatus): string {
    switch (status) {
      case 'PENDING':
        return 'status-indicator pending';
      case 'APPROVED':
        return 'status-indicator approved';
      case 'REJECTED':
        return 'status-indicator rejected';
      case 'COMPLETED':
        return 'status-indicator completed';
      default:
        return 'status-indicator';
    }
  }
}
