import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { LoginRequest } from '../../models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup<{
    employeeIdOrEmail: FormControl<string>;
    password: FormControl<string>;
  }>;

  isLoading = false;
  showPassword = false;

  private readonly destroy$ = new Subject<void>();
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.loginForm = this.fb.nonNullable.group({
      employeeIdOrEmail: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  get employeeIdOrEmailControl(): FormControl<string> {
    return this.loginForm.controls.employeeIdOrEmail;
  }

  get passwordControl(): FormControl<string> {
    return this.loginForm.controls.password;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const request: LoginRequest = {
      employeeIdOrEmail: this.employeeIdOrEmailControl.value.trim(),
      password: this.passwordControl.value,
    };

    this.authService
      .login(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          this.toastService.success(
            'Sign In Successful',
            `Welcome back, ${res.user?.fullName || 'Staff Member'}!`,
          );
          this.router.navigate(['/dashboard']);
        },
        error: (error: unknown) => {
          this.isLoading = false;
          const msg = this.authService.getErrorMessage(error);
          this.toastService.error('Authentication Failed', msg);
        },
      });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
