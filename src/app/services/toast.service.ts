import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly toastsSubject = new BehaviorSubject<Toast[]>([]);
  toasts$ = this.toastsSubject.asObservable();

  show(
    type: ToastType,
    title: string,
    message: string,
    duration: number = 4500,
  ): void {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: Toast = { id, type, title, message, duration };
    const current = this.toastsSubject.value;
    this.toastsSubject.next([...current, toast]);

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  success(title: string, message: string = ''): void {
    this.show('success', title, message);
  }

  error(title: string, message: string = ''): void {
    this.show('error', title, message, 6000);
  }

  warning(title: string, message: string = ''): void {
    this.show('warning', title, message);
  }

  info(title: string, message: string = ''): void {
    this.show('info', title, message);
  }

  remove(id: string): void {
    const filtered = this.toastsSubject.value.filter((t) => t.id !== id);
    this.toastsSubject.next(filtered);
  }
}
