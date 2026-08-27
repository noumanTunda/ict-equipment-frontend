import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService } from '../../services/auth.service';
import { ResetPasswordDto } from '../../models/auth.model';

interface PasswordStrength {
  level: number;
  label: string;
  barClass: string;
  width: string;
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  resetPasswordForm!: FormGroup<{
    newPassword: FormControl<string>;
    confirmPassword: FormControl<string>;
  }>;

  token = '';
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showNewPassword = false;
  showConfirmPassword = false;

  private readonly destroy$ = new Subject<void>();
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';

    if (!this.token) {
      this.errorMessage = 'Invalid or missing password reset token. Please request a new link.';
    }

    this.resetPasswordForm = this.fb.nonNullable.group(
      {
        newPassword: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!]).*$/),
          ],
        ],
        confirmPassword: ['', [Validators.required]],
      },
      {
        validators: this.matchPasswordValidator('newPassword', 'confirmPassword'),
      }
    );
  }

  get newPasswordControl(): FormControl<string> {
    return this.resetPasswordForm.controls.newPassword;
  }

  get confirmPasswordControl(): FormControl<string> {
    return this.resetPasswordForm.controls.confirmPassword;
  }

  get passwordStrength(): PasswordStrength {
    const password = this.newPasswordControl.value;
    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[@#$%^&+=!]/.test(password)) score++;

    const maxScore = 6;

    if (score <= 2) {
      return {
        level: 0,
        label: 'Weak',
        barClass: 'bg-red-500',
        width: `${Math.max((score / maxScore) * 100, 15)}%`,
      };
    }
    if (score <= 4) {
      return {
        level: 1,
        label: 'Fair',
        barClass: 'bg-yellow-500',
        width: `${(score / maxScore) * 100}%`,
      };
    }
    if (score === 5) {
      return {
        level: 2,
        label: 'Good',
        barClass: 'bg-blue-600',
        width: `${(score / maxScore) * 100}%`,
      };
    }
    return {
      level: 3,
      label: 'Strong',
      barClass: 'bg-green-600',
      width: '100%',
    };
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.token) {
      this.errorMessage = 'Missing reset token. Please request a new reset link.';
      return;
    }

    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const request: ResetPasswordDto = {
      token: this.token,
      newPassword: this.newPasswordControl.value,
      confirmPassword: this.confirmPasswordControl.value,
    };

    this.authService
      .resetPassword(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.successMessage =
            response.message || 'Password has been successfully updated. Redirecting to login...';

          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2500);
        },
        error: (error: unknown) => {
          this.isLoading = false;
          this.errorMessage = this.authService.getErrorMessage(error);
        },
      });
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private matchPasswordValidator(passwordKey: string, confirmKey: string): ValidatorFn {
    return (form: AbstractControl): ValidationErrors | null => {
      const password = form.get(passwordKey)?.value;
      const confirmPassword = form.get(confirmKey)?.value;

      if (!confirmPassword) {
        return null;
      }

      return password === confirmPassword ? null : { passwordMismatch: true };
    };
  }
}
