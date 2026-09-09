import {
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface SelectOption {
  value: any;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './searchable-select.component.html',
  styleUrls: ['./searchable-select.component.css']
})
export class SearchableSelectComponent {
  options = input<SelectOption[]>([]);
  placeholder = input<string>('Search and select...');
  label = input<string>('');
  required = input<boolean>(false);
  disabled = input<boolean>(false);

  selectedValue = input<any>(null);
  selectedValueChange = output<any>();

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  searchTerm = signal<string>('');
  isOpen = signal<boolean>(false);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as Node | null;
    if (!target || !this.elementRef.nativeElement.contains(target)) {
      this.closeDropdown();
    }
  }

  filteredOptions = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const opts = this.options();

    if (!term) {
      return opts;
    }

    return opts.filter(option =>
      option.label.toLowerCase().includes(term)
    );
  });

  selectedOption = computed(() => {
    const opts = this.options();
    const val = this.selectedValue();
    return opts.find(opt => opt.value === val);
  });

  toggleDropdown(): void {
    if (this.disabled()) return;
    this.isOpen.set(!this.isOpen());
  }

  openDropdown(): void {
    if (this.disabled()) return;
    this.isOpen.set(true);
  }

  closeDropdown(): void {
    this.isOpen.set(false);
  }

  selectOption(option: SelectOption): void {
    if (option.disabled) return;
    this.selectedValueChange.emit(option.value);
    this.searchTerm.set('');
    this.closeDropdown();
  }

  clearSelection(event?: Event): void {
    event?.stopPropagation();
    this.selectedValueChange.emit(null);
    this.searchTerm.set('');
    this.closeDropdown();
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
    if (!this.isOpen()) {
      this.openDropdown();
    }
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeDropdown();
    }
  }
}
