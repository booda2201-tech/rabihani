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
  image?: string;
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
  sheet = false;

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};
  private viewRef: EmbeddedViewRef<any> | null = null;
  private popEl: HTMLElement | null = null;
  private menuEl: HTMLElement | null = null;
  private prevOverflow = '';
  private lockedBody = false;
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

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).remove();
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
    if (!this.open) return;
    const next = window.innerWidth <= 768;
    if (next !== this.sheet) {
      this.sheet = next;
      this.viewRef?.detectChanges();
    }
    this.positionMenu();
  }

  private mountMenu(): void {
    if (!this.open || !this.menuTpl || this.viewRef) return;
    this.sheet = window.innerWidth <= 768;
    this.viewRef = this.vcr.createEmbeddedView(this.menuTpl);
    this.viewRef.detectChanges();
    this.popEl = this.viewRef.rootNodes.find((node: Node) => node.nodeType === Node.ELEMENT_NODE) as HTMLElement;
    this.menuEl = this.popEl?.querySelector('.ms-menu') as HTMLElement | null;
    if (this.popEl) document.body.appendChild(this.popEl);
    this.positionMenu();
    if (this.searchable && !this.sheet) {
      setTimeout(() => this.menuEl?.querySelector('input')?.focus());
    }
  }

  private destroyMenu(): void {
    this.unlockBody();
    this.viewRef?.destroy();
    this.viewRef = null;
    this.popEl?.remove();
    this.popEl = null;
    this.menuEl = null;
  }

  private positionMenu(): void {
    const button = this.trigger?.nativeElement;
    const menu = this.menuEl;
    const pop = this.popEl;
    if (!button || !menu || !pop) return;

    const narrow = window.innerWidth <= 768;
    pop.classList.toggle('is-sheet', narrow);
    menu.classList.toggle('is-sheet', narrow);

    if (narrow) {
      this.lockBody();
      menu.style.top = 'auto';
      menu.style.bottom = '0';
      menu.style.left = '0';
      menu.style.right = '0';
      menu.style.width = '100%';
      menu.style.maxHeight = 'min(74vh, 560px)';
      menu.classList.remove('is-up');
      return;
    }

    this.unlockBody();

    const rect = button.getBoundingClientRect();
    const gap = 8;
    const maxHeight = 380;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const available = Math.max(180, Math.min(maxHeight, openUp ? spaceAbove : spaceBelow));
    const width = Math.min(
      Math.max(rect.width, this.panelMinWidth || 220, 300),
      window.innerWidth - 16
    );
    let left = rect.right - width;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));

    menu.style.right = 'auto';
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

  private lockBody(): void {
    if (this.lockedBody) return;
    this.prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.lockedBody = true;
  }

  private unlockBody(): void {
    if (!this.lockedBody) return;
    document.body.style.overflow = this.prevOverflow;
    this.lockedBody = false;
  }
}
