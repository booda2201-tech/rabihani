import {
  Component,
  ElementRef,
  EmbeddedViewRef,
  EventEmitter,
  forwardRef,
  HostListener,
  Input,
  OnDestroy,
  Output,
  TemplateRef,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface ModernSelectOption {
  value: any;
  label: string;
  hint?: string;
  icon?: string;
}

@Component({
  selector: 'app-modern-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modern-select.component.html',
  styleUrls: ['./modern-select.component.scss'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => ModernSelectComponent),
    multi: true
  }]
})
export class ModernSelectComponent implements ControlValueAccessor, OnDestroy {
  @Input() options: ModernSelectOption[] = [];
  @Input() placeholder = 'اختر...';
  @Input() searchable = false;
  @Input() tone: 'blue' | 'gold' = 'blue';
  @Input() searchPlaceholder = 'ابحث...';
  @Input() panelMinWidth = 220;
  @Output() valueChange = new EventEmitter<any>();

  @ViewChild('trigger') trigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('menuTpl') menuTpl?: TemplateRef<any>;

  open = false;
  disabled = false;
  query = '';
  value: any = null;

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};
  private viewRef: EmbeddedViewRef<any> | null = null;
  private menuEl: HTMLElement | null = null;
  private scrollHandler = () => {
    if (this.open) this.positionMenu();
  };

  constructor(
    private vcr: ViewContainerRef,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnDestroy(): void {
    document.removeEventListener('scroll', this.scrollHandler, true);
    this.destroyMenu();
  }

  get filtered(): ModernSelectOption[] {
    const q = this.query.trim().toLowerCase();
    const list = this.options || [];
    if (!q) return list;
    return list.filter(option =>
      (option.label || '').toLowerCase().includes(q) ||
      (option.hint || '').toLowerCase().includes(q)
    );
  }

  get selected(): ModernSelectOption | undefined {
    return (this.options || []).find(option => this.same(option.value, this.value));
  }

  writeValue(value: any): void {
    this.value = value;
  }

  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  toggle(event: Event): void {
    event.stopPropagation();
    if (this.disabled) return;
    this.open ? this.close() : this.openMenu();
  }

  openMenu(): void {
    this.open = true;
    this.query = '';
    document.addEventListener('scroll', this.scrollHandler, true);
    setTimeout(() => this.mountMenu());
  }

  close(): void {
    if (!this.open && !this.viewRef) return;
    this.open = false;
    this.onTouched();
    document.removeEventListener('scroll', this.scrollHandler, true);
    this.destroyMenu();
  }

  pick(option: ModernSelectOption, event: Event): void {
    event.stopPropagation();
    this.value = option.value;
    this.onChange(option.value);
    this.valueChange.emit(option.value);
    this.close();
  }

  onQuery(event: Event): void {
    this.query = (event.target as HTMLInputElement).value;
  }

  same(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a === 'object' && typeof b === 'object') {
      if (a.id != null && b.id != null) return String(a.id) === String(b.id);
      return false;
    }
    return String(a) === String(b);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open) return;
    const target = event.target as Node;
    if (this.host.nativeElement.contains(target)) return;
    if (this.menuEl?.contains(target)) return;
    this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) this.close();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.open) this.positionMenu();
  }

  private mountMenu(): void {
    if (!this.open || !this.menuTpl || this.viewRef) return;
    this.viewRef = this.vcr.createEmbeddedView(this.menuTpl);
    this.viewRef.detectChanges();
    this.menuEl = this.viewRef.rootNodes.find((node: Node) => node.nodeType === Node.ELEMENT_NODE) as HTMLElement;
    if (this.menuEl) document.body.appendChild(this.menuEl);
    this.positionMenu();
    if (this.searchable) {
      setTimeout(() => this.menuEl?.querySelector('input')?.focus());
    }
  }

  private destroyMenu(): void {
    this.viewRef?.destroy();
    this.viewRef = null;
    this.menuEl?.remove();
    this.menuEl = null;
  }

  private positionMenu(): void {
    const button = this.trigger?.nativeElement;
    const menu = this.menuEl;
    if (!button || !menu) return;

    const rect = button.getBoundingClientRect();
    const gap = 8;
    const maxHeight = 340;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const available = Math.max(180, Math.min(maxHeight, openUp ? spaceAbove : spaceBelow));
    const width = Math.min(
      Math.max(rect.width, this.panelMinWidth || 220),
      window.innerWidth - 16
    );
    let left = rect.right - width;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));

    menu.style.width = `${width}px`;
    menu.style.left = `${left}px`;
    menu.style.maxHeight = `${available}px`;

    if (openUp) {
      menu.style.top = 'auto';
      menu.style.bottom = `${window.innerHeight - rect.top + gap}px`;
      menu.classList.add('is-up');
    } else {
      menu.style.bottom = 'auto';
      menu.style.top = `${rect.bottom + gap}px`;
      menu.classList.remove('is-up');
    }
  }
}
