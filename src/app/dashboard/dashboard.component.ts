import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { User } from '../models/auth.model';

export interface EquipmentUnit {
  unitNo: string;
  serialNo: string;
  equipmentName: string;
  category: string;
  location: string;
  assignee: string;
  status: 'Active' | 'Under Maintenance' | 'Pending Approval' | 'Dispatched' | 'Deleted';
  meterReading?: string;
  tasksDueCount: number;
  isExpanded?: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink,FormsModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);

  // User State
  currentUser: User | null = null;
  userRole: 'ROLE_ADMIN' | 'ROLE_ICT_OFFICER' | 'ROLE_STAFF' = 'ROLE_STAFF';

  // Navigation Sidebar State
  isSidebarCollapsed = false;
  isMobileMenuOpen = false;

  // Filter & Search Controls
  selectedFilterStatus = 'Active';
  selectedLocationFilter = 'All Locations';
  searchQuery = '';

  // Data List
  equipmentList: EquipmentUnit[] = [];

  // Active Dropdown Action Tracker
  activeDropdownUnitNo: string | null = null;

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    if (this.currentUser?.role) {
      this.userRole = this.currentUser.role as any;
    }
    this.loadEquipmentData();
  }

  loadEquipmentData(): void {
    // Session state binding
    // In production, fetch via EquipmentService HTTP pipeline
    this.equipmentList = [];
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  toggleRowExpansion(unit: EquipmentUnit): void {
    unit.isExpanded = !unit.isExpanded;
  }

  toggleActionDropdown(unitNo: string, event: Event): void {
    event.stopPropagation();
    this.activeDropdownUnitNo = this.activeDropdownUnitNo === unitNo ? null : unitNo;
  }

  closeActionDropdowns(): void {
    this.activeDropdownUnitNo = null;
  }

  logout(): void {
    this.authService.logout();
  }
}
