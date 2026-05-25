import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { SvgIcons } from '@utils/svg-icons';

@Component({
  selector: 'app-payment-processing',
  imports: [ButtonComponent],
  templateUrl: './payment-processing.component.html',
  styleUrl: './payment-processing.component.scss'
})
export class PaymentProcessingComponent implements AfterViewInit {
  @ViewChild('modal', { static: false }) modal: ElementRef | undefined;
  @Input({required:true}) messageReceived!: boolean;
  @Input() remainingSeconds = 0;
  @Output() modelClose: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() retryWithDifferentNumber = new EventEmitter<void>();

  svgIcons = SvgIcons;

  get showRetryButton(): boolean {
    return this.remainingSeconds > 0 && this.remainingSeconds <= 540 && !this.messageReceived;
  }

  onRetry(): void {
    this.retryWithDifferentNumber.emit();
  }
  
  ngAfterViewInit(): void {
    this.open();
  }

  open() {
    const modalElement = this.modal?.nativeElement;
    if (modalElement) {
      const modal = new window.bootstrap.Modal(modalElement, {
        backdrop: 'static',
        keyboard: false
      });
      modal.show();
    }
  }

  close() {
    const modalElement = this.modal?.nativeElement;
    if (modalElement) {
      const modal = window.bootstrap.Modal.getInstance(modalElement);
      modal?.hide();
      this.modelClose.emit(true);
    }
  }

  onConfirm() {
    // Handle the confirmation logic
    this.close();
  }

  get formattedTime(): string {
    const minutes = Math.floor(this.remainingSeconds / 60);
    const seconds = this.remainingSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
