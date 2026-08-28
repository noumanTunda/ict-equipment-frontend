import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { User } from '../models/auth.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // User State
  currentUser: User | null = null;
  userRole: string = 'ROLE_STAFF';

  // Sidebar State
  isSidebarCollapsed = false;
  isMobileMenuOpen = false;

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    if (this.currentUser?.role) {
      this.userRole = this.currentUser.role;
    }

    if (this.router.url === '/dashboard' || this.router.url === '/dashboard/') {
      if (this.userRole === 'ROLE_STAFF') {
        this.router.navigate(['/dashboard/requests']);
      } else {
        this.router.navigate(['/dashboard/equipment']);
      }
    }
  }

  get isStaff(): boolean {
    return this.userRole === 'ROLE_STAFF';
  }

  get isOfficerOrAdmin(): boolean {
    return this.userRole === 'ROLE_ADMIN' || this.userRole === 'ROLE_ICT_OFFICER';
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
