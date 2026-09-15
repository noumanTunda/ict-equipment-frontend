import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-password.component.html',
})
export class ChangePasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  isLoading = false;
  changePasswordForm!: FormGroup;

  constructor() {
    this.initForm();
  }

  initForm(): void {
    this.changePasswordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmNewPassword: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  changePassword(): void {
    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    const currentPassword = this.changePasswordForm.get('currentPassword')?.value;
    const newPassword = this.changePasswordForm.get('newPassword')?.value;
    const confirmNewPassword = this.changePasswordForm.get('confirmNewPassword')?.value;

    if (newPassword !== confirmNewPassword) {
      this.toastService.error('Validation Error', 'New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      this.toastService.error('Validation Error', 'New password must be different from current password');
      return;
    }

    this.isLoading = true;
    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.isLoading = false;
        this.toastService.success('Success', 'Password changed successfully');
        this.changePasswordForm.reset();
      },
      error: (err) => {
        this.isLoading = false;
        const msg = this.authService.getErrorMessage(err);
        this.toastService.error('Error', msg);
      },
    });
  }
}
