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
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService } from '../../services/auth.service';
import { RegisterRequest } from '../../models/auth.model';

interface PasswordStrength {
  level: number;
  label: string;
  barClass: string;
  width: string;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent implements OnInit, OnDestroy {
  readonly departments = [
    'ICT',
    'Procurement',
    'Finance',
    'Human Resources',
    'Legal',
    'Internal Audit',
    'Administration',
    'Planning, Monitoring & Evaluation',
    'Other',
  ];

  readonly roles = ['ROLE_STAFF', 'ROLE_ICT_ADMIN', 'ROLE_HEAD_OF_DEPARTMENT'];

  registerForm!: FormGroup<{
    employeeId: FormControl<string>;
    fullName: FormControl<string>;
    department: FormControl<string>;
    role: FormControl<string>;
    mobileNo: FormControl<string>;
    email: FormControl<string>;
    password: FormControl<string>;
    confirmPassword: FormControl<string>;
  }>;

  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showPassword = false;
  showConfirmPassword = false;

  private readonly destroy$ = new Subject<void>();
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    this.registerForm = this.fb.nonNullable.group(
      {
        employeeId: [
          '',
          [Validators.required, Validators.pattern(/^[a-zA-Z0-9]+$/)],
        ],
        fullName: [
          '',
          [
            Validators.required,
            Validators.minLength(3),
            Validators.pattern(/^[a-zA-Z][a-zA-Z\s.'-]*$/),
          ],
        ],
        department: ['ICT', [Validators.required]],
        role: ['ROLE_STAFF', [Validators.required]],
        mobileNo: [
          '',
          [Validators.required, Validators.pattern(/^\+?[0-9]{9,15}$/)],
        ],
        email: ['', [Validators.required, Validators.email]],
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(6),
            Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).+$/),
          ],
        ],
        confirmPassword: ['', [Validators.required]],
      },
      {
        validators: this.matchPasswordValidator('password', 'confirmPassword'),
      },
    );
  }

  get employeeIdControl(): FormControl<string> {
    return this.registerForm.controls.employeeId;
  }

  get fullNameControl(): FormControl<string> {
    return this.registerForm.controls.fullName;
  }

  get departmentControl(): FormControl<string> {
    return this.registerForm.controls.department;
  }

  get roleControl(): FormControl<string> {
    return this.registerForm.controls.role;
  }

  get mobileNoControl(): FormControl<string> {
    return this.registerForm.controls.mobileNo;
  }

  get emailControl(): FormControl<string> {
    return this.registerForm.controls.email;
  }

  get passwordControl(): FormControl<string> {
    return this.registerForm.controls.password;
  }

  get confirmPasswordControl(): FormControl<string> {
    return this.registerForm.controls.confirmPassword;
  }

  get passwordStrength(): PasswordStrength {
    const password = this.passwordControl.value;
    let score = 0;

    if (password.length >= 8) {
      score++;
    }
    if (password.length >= 12) {
      score++;
    }
    if (/[a-z]/.test(password)) {
      score++;
    }
    if (/[A-Z]/.test(password)) {
      score++;
    }
    if (/\d/.test(password)) {
      score++;
    }
    if (/[^A-Za-z0-9]/.test(password)) {
      score++;
    }

    const maxScore = 6;

    if (score <= 2) {
      return {
        level: 0,
        label: 'Weak',
        barClass: 'bg-red-500',
        width: `${Math.max((score / maxScore) * 100, 10)}%`,
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

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const payload: RegisterRequest = {
      employeeId: this.employeeIdControl.value.trim().toUpperCase(),
      fullName: this.fullNameControl.value.trim().replace(/\s+/g, ' '),
      department: this.departmentControl.value,
      role: this.roleControl.value,
      mobileNo: this.mobileNoControl.value.trim(),
      email: this.emailControl.value.trim().toLowerCase(),
      password: this.passwordControl.value,
    };

    this.authService
      .register(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.successMessage =
            response.message ||
            'Registration successful. Please check your email for account activation details.';
          this.registerForm.reset({
            department: 'ICT',
            role: 'ROLE_STAFF',
          });
        },
        error: (error: unknown) => {
          this.isLoading = false;
          this.errorMessage = this.authService.getErrorMessage(error);
        },
      });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
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
