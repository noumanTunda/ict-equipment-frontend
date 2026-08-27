import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService } from '../../services/auth.service';
import { ResetPasswordRequestDto } from '../../models/auth.model';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  forgotPasswordForm!: FormGroup<{
    email: FormControl<string>;
  }>;

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // Cooldown timer state (60 seconds)
  cooldownSeconds = 0;
  isCooldownActive = false;
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  private readonly destroy$ = new Subject<void>();
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    this.forgotPasswordForm = this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  get emailControl(): FormControl<string> {
    return this.forgotPasswordForm.controls.email;
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.isCooldownActive) {
      return;
    }

    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const request: ResetPasswordRequestDto = {
      email: this.emailControl.value.trim().toLowerCase(),
    };

    this.authService
      .forgotPassword(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.successMessage =
            response.message ||
            'If an account exists with that email, a password reset link has been sent.';

          this.startCooldownTimer(60);
        },
        error: (error: unknown) => {
          this.isLoading = false;
          this.errorMessage = this.authService.getErrorMessage(error);
        },
      });
  }

  startCooldownTimer(seconds: number): void {
    this.stopCooldownTimer();
    this.cooldownSeconds = seconds;
    this.isCooldownActive = true;

    this.timerInterval = setInterval(() => {
      this.cooldownSeconds--;

      if (this.cooldownSeconds <= 0) {
        this.stopCooldownTimer();
      }
    }, 1000);
  }

  stopCooldownTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isCooldownActive = false;
    this.cooldownSeconds = 0;
  }

  ngOnDestroy(): void {
    this.stopCooldownTimer();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
