import {
  Component,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-virtual-try-on-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './virtual-try-on-modal.component.html',
  styleUrl: './virtual-try-on-modal.component.css',
  encapsulation: ViewEncapsulation.Emulated
})
export class VirtualTryOnModalComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() busy = false;
  @Input() error: string | null = null;
  @Input() personFileName: string | null = null;
  @Input() canRun = false;
  @Input() garmentImageUrl: string | null = null;
  @Input() garmentLabel = 'Garment';
  @Input() garmentAlt = 'Garment preview';
  @Input() resultUrl: string | null = null;
  @Input() progress: number | null = null;
  @Input() statusMessage = '';
  @Input() title = 'Virtual try-on';
  @Input() subtitle = 'Preview this garment on you with AI';
  @Input() icon = '👕';
  @Input() titleId = 'virtual-tryon-title';

  @Output() closed = new EventEmitter<void>();
  @Output() personFileChange = new EventEmitter<File | null>();
  @Output() runTryOn = new EventEmitter<void>();

  @HostBinding('class.wc-tryon-host--open')
  get hostOpen(): boolean {
    return this.open;
  }

  @HostBinding('attr.aria-hidden')
  get ariaHidden(): string | null {
    return this.open ? null : 'true';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('open' in changes) {
      this.syncBodyScrollLock();
    }
  }

  ngOnDestroy(): void {
    document.body.classList.remove('wc-tryon-body-lock');
  }

  private syncBodyScrollLock(): void {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('wc-tryon-body-lock', this.open);
  }

  onBackdropClick(): void {
    if (!this.busy) {
      this.requestClose();
    }
  }

  requestClose(): void {
    this.closed.emit();
  }

  onPersonFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const imageFile =
      file && file.type.startsWith('image/') ? file : null;
    this.personFileChange.emit(imageFile);
  }

  /** Shown in the bar; when busy with no numeric value, the bar uses indeterminate styling. */
  get displayProgress(): number | null {
    if (this.progress == null) {
      return null;
    }
    return Math.min(100, Math.max(0, Math.round(this.progress)));
  }
}
