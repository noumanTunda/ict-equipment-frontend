import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="fixed top-5 right-5 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none"
    >
      @for (toast of toastService.toasts$ | async; track toast.id) {
        <div
          class="pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-xl border transition-all duration-300 transform translate-y-0"
          [ngClass]="getToastClasses(toast.type)"
        >
          <!-- Icon -->
          <div class="shrink-0 mt-0.5">
            @if (toast.type === 'success') {
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="h-5 w-5 text-emerald-600"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            } @else if (toast.type === 'error') {
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="h-5 w-5 text-rose-600"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            } @else if (toast.type === 'warning') {
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="h-5 w-5 text-amber-600"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 9v3.75m0 3.75h.007v.008H12v-.008s0 0 0 0ZM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            } @else {
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="h-5 w-5 text-sky-600"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                />
              </svg>
            }
          </div>

          <!-- Content -->
          <div class="flex-1 text-xs">
            <h4 class="font-bold text-slate-900 leading-tight mb-0.5">
              {{ toast.title }}
            </h4>
            @if (toast.message) {
              <p class="text-slate-600 leading-normal">{{ toast.message }}</p>
            }
          </div>

          <!-- Close Button -->
          <button
            (click)="toastService.remove(toast.id)"
            class="shrink-0 text-slate-400 hover:text-slate-700 text-lg leading-none font-bold ml-1"
          >
            &times;
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);

  getToastClasses(type: Toast['type']): string {
    switch (type) {
      case 'success':
        return 'bg-white border-emerald-200 text-slate-800';
      case 'error':
        return 'bg-white border-rose-200 text-slate-800';
      case 'warning':
        return 'bg-white border-amber-200 text-slate-800';
      case 'info':
        return 'bg-white border-sky-200 text-slate-800';
      default:
        return 'bg-white border-slate-200 text-slate-800';
    }
  }
}
