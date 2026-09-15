import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { KeyphraseService } from '../../services/keyphrase.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-keyphrase',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './keyphrase.component.html',
})
export class KeyphraseComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly keyphraseService = inject(KeyphraseService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  hasKeyphrase = false;
  isLoading = false;

  setKeyphraseForm!: FormGroup;
  updateKeyphraseForm!: FormGroup;

  ngOnInit(): void {
    this.initForms();
    this.checkKeyphraseStatus();
  }

  initForms(): void {
    this.setKeyphraseForm = this.fb.group({
      keyphrase: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.updateKeyphraseForm = this.fb.group({
      currentKeyphrase: ['', [Validators.required, Validators.minLength(6)]],
      newKeyphrase: ['', [Validators.required, Validators.minLength(6)]],
      confirmNewKeyphrase: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  checkKeyphraseStatus(): void {
    // For now, we'll assume user doesn't have a keyphrase set
    // In a real implementation, you might want to add an endpoint to check this
    this.hasKeyphrase = false;
  }

  setKeyphrase(): void {
    if (this.setKeyphraseForm.invalid) {
      this.setKeyphraseForm.markAllAsTouched();
      return;
    }

    const keyphrase = this.setKeyphraseForm.get('keyphrase')?.value;
    const confirmPassword = this.setKeyphraseForm.get('confirmPassword')?.value;

    if (keyphrase !== confirmPassword) {
      this.toastService.error('Validation Error', 'Keyphrases do not match');
      return;
    }

    this.isLoading = true;
    this.keyphraseService.setKeyphrase(keyphrase).subscribe({
      next: () => {
        this.isLoading = false;
        this.toastService.success('Success', 'Keyphrase set successfully');
        this.setKeyphraseForm.reset();
        this.hasKeyphrase = true;
      },
      error: (err) => {
        this.isLoading = false;
        const msg = this.authService.getErrorMessage(err);
        this.toastService.error('Error', msg);
      },
    });
  }

  updateKeyphrase(): void {
    if (this.updateKeyphraseForm.invalid) {
      this.updateKeyphraseForm.markAllAsTouched();
      return;
    }

    const currentKeyphrase = this.updateKeyphraseForm.get('currentKeyphrase')?.value;
    const newKeyphrase = this.updateKeyphraseForm.get('newKeyphrase')?.value;
    const confirmNewKeyphrase = this.updateKeyphraseForm.get('confirmNewKeyphrase')?.value;

    if (newKeyphrase !== confirmNewKeyphrase) {
      this.toastService.error('Validation Error', 'New keyphrases do not match');
      return;
    }

    if (currentKeyphrase === newKeyphrase) {
      this.toastService.error('Validation Error', 'New keyphrase must be different from current keyphrase');
      return;
    }

    this.isLoading = true;
    this.keyphraseService.updateKeyphrase(currentKeyphrase, newKeyphrase).subscribe({
      next: () => {
        this.isLoading = false;
        this.toastService.success('Success', 'Keyphrase updated successfully');
        this.updateKeyphraseForm.reset();
      },
      error: (err) => {
        this.isLoading = false;
        const msg = this.authService.getErrorMessage(err);
        this.toastService.error('Error', msg);
      },
    });
  }
}
