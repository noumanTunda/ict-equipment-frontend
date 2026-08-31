import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { RequestService } from '../services/request.service';
import { EquipmentService } from '../services/equipment.service';
import { TransactionService } from '../services/transaction.service';
import { User } from '../models/auth.model';
import { Equipment } from '../models/equipment.model';
import { EquipmentRequest } from '../models/request.model';
import { EquipmentTransaction } from '../models/transaction.model';

interface DashboardStatCard {
  label: string;
  value: string;
  note: string;
  tone: 'blue' | 'emerald' | 'amber' | 'rose' | 'slate';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly requestService = inject(RequestService);
  private readonly equipmentService = inject(EquipmentService);
  private readonly transactionService = inject(TransactionService);
  private readonly router = inject(Router);

  // User State
  currentUser: User | null = null;
  userRole: string = 'ROLE_STAFF';

  // Sidebar State
  isSidebarCollapsed = false;
  isMobileMenuOpen = false;

  isLoadingDashboard = false;
  dashboardError = '';

  dashboardCards = signal<DashboardStatCard[]>([]);
  recentRequests = signal<EquipmentRequest[]>([]);
  recentTransactions = signal<EquipmentTransaction[]>([]);
  inventorySummary = signal<Equipment[]>([]);

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    if (this.currentUser?.role) {
      this.userRole = this.currentUser.role;
    }

    this.loadDashboardData();
  }

  get isStaff(): boolean {
    return this.userRole === 'ROLE_STAFF';
  }

  get isOfficerOrAdmin(): boolean {
    return (
      this.userRole === 'ROLE_ADMIN' || this.userRole === 'ROLE_ICT_OFFICER'
    );
  }

  get isDashboardHomeView(): boolean {
    return (
      this.router.url === '/dashboard' || this.router.url === '/dashboard/'
    );
  }

  get dashboardTitle(): string {
    return this.isStaff ? 'Staff Dashboard' : 'Operations Dashboard';
  }

  get dashboardDescription(): string {
    return this.isStaff
      ? 'Track your requests, signatures, and active equipment from one place.'
      : 'Monitor inventory health, request throughput, and transaction signing status.';
  }

  refreshDashboard(): void {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    if (this.isStaff) {
      this.loadStaffDashboard();
      return;
    }

    this.loadOfficerDashboard();
  }

  private loadStaffDashboard(): void {
    if (!this.currentUser?.id) {
      return;
    }

    this.isLoadingDashboard = true;
    this.dashboardError = '';

    forkJoin({
      requests: this.requestService.getMyRequests(0, 1000, 'id,desc'),
    }).subscribe({
      next: ({ requests }) => {
        const requestItems = requests.content || [];
        const pendingRequests = requestItems.filter(
          (item) => item.status === 'PENDING',
        ).length;
        const approvedRequests = requestItems.filter(
          (item) => item.status === 'APPROVED',
        ).length;
        const completedRequests = requestItems.filter(
          (item) => item.status === 'COMPLETED',
        ).length;

        this.dashboardCards.set([
          {
            label: 'My Requests',
            value: String(
              requests.pageable?.totalElements ?? requestItems.length,
            ),
            note: 'All requests submitted under your account.',
            tone: 'blue',
          },
          {
            label: 'Pending Review',
            value: String(pendingRequests),
            note: 'Awaiting action from ICT officers.',
            tone: 'amber',
          },
          {
            label: 'Approved Requests',
            value: String(approvedRequests),
            note: 'Requests approved and waiting for fulfillment.',
            tone: 'emerald',
          },
          {
            label: 'Completed Requests',
            value: String(completedRequests),
            note: 'Requests that have been fully closed.',
            tone: 'rose',
          },
        ]);

        this.recentRequests.set(requestItems.slice(0, 5));
        this.recentTransactions.set([]);
        this.isLoadingDashboard = false;
      },
      error: () => {
        this.dashboardError = 'Failed to load staff dashboard data.';
        this.isLoadingDashboard = false;
      },
    });
  }

  private loadOfficerDashboard(): void {
    this.isLoadingDashboard = true;
    this.dashboardError = '';

    forkJoin({
      equipment: this.equipmentService.getAllEquipment(),
      pendingRequests: this.requestService.getRequestsByStatus(
        'PENDING',
        0,
        1,
        'id,desc',
      ),
      approvedRequests: this.requestService.getRequestsByStatus(
        'APPROVED',
        0,
        1,
        'id,desc',
      ),
      rejectedRequests: this.requestService.getRequestsByStatus(
        'REJECTED',
        0,
        1,
        'id,desc',
      ),
      completedRequests: this.requestService.getRequestsByStatus(
        'COMPLETED',
        0,
        1,
        'id,desc',
      ),
      recentPendingRequests: this.requestService.getRequestsByStatus(
        'PENDING',
        0,
        5,
        'id,desc',
      ),
      recentTransactions: this.transactionService.getTransactions({
        page: 0,
        size: 5,
        sort: 'id,desc',
      }),
      pendingTransactions: this.transactionService.getTransactions({
        status: 'PENDING_SIGNATURE',
        page: 0,
        size: 1,
        sort: 'id,desc',
      }),
      completedTransactions: this.transactionService.getTransactions({
        status: 'COMPLETED',
        page: 0,
        size: 1,
        sort: 'id,desc',
      }),
    }).subscribe({
      next: ({
        equipment,
        pendingRequests,
        approvedRequests,
        rejectedRequests,
        completedRequests,
        recentPendingRequests,
        recentTransactions,
        pendingTransactions,
        completedTransactions,
      }) => {
        const availableEquipment = equipment.filter(
          (item) => item.status === 'AVAILABLE',
        );
        const issuedEquipment = equipment.filter(
          (item) => item.status === 'ISSUED',
        );
        const requestResolutionCount =
          (approvedRequests.pageable?.totalElements ?? 0) +
          (rejectedRequests.pageable?.totalElements ?? 0) +
          (completedRequests.pageable?.totalElements ?? 0);
        const pendingTransactionCount =
          pendingTransactions.pageable?.totalElements ?? 0;
        const completedTransactionCount =
          completedTransactions.pageable?.totalElements ?? 0;

        this.inventorySummary.set(equipment);
        this.dashboardCards.set([
          {
            label: 'Total Equipment',
            value: String(equipment.length),
            note: 'Registered assets across the inventory.',
            tone: 'blue',
          },
          {
            label: 'Available',
            value: String(availableEquipment.length),
            note: 'Ready for issuing to staff.',
            tone: 'emerald',
          },
          {
            label: 'Issued',
            value: String(issuedEquipment.length),
            note: 'Currently assigned assets.',
            tone: 'amber',
          },
          {
            label: 'Pending Requests',
            value: String(pendingRequests.pageable?.totalElements ?? 0),
            note: 'Requests waiting for review.',
            tone: 'rose',
          },
          {
            label: 'Requests Resolved',
            value: String(requestResolutionCount),
            note: `Transactions awaiting signature: ${pendingTransactionCount}. Completed: ${completedTransactionCount}.`,
            tone: 'slate',
          },
        ]);

        this.recentRequests.set(
          (recentPendingRequests.content || []).slice(0, 5),
        );
        this.recentTransactions.set(
          (recentTransactions.content || []).slice(0, 5),
        );

        this.isLoadingDashboard = false;
      },
      error: () => {
        this.dashboardError = 'Failed to load operations dashboard data.';
        this.isLoadingDashboard = false;
      },
    });
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  isRouteActive(path: string): boolean {
    return this.router.url.includes(path);
  }

  logout(): void {
    this.authService.logout();
  }
}
