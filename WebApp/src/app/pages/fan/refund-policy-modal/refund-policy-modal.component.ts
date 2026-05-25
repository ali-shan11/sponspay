import { AfterViewInit, Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'app-refund-policy-modal',
  imports: [],
  templateUrl: './refund-policy-modal.component.html',
  styleUrl: './refund-policy-modal.component.scss',
})
export class RefundPolicyModalComponent implements AfterViewInit {
  @ViewChild('modal', { static: false }) modal: ElementRef | undefined;
  @Output() modalClose = new EventEmitter<void>();

  ngAfterViewInit(): void {
    this.open();
  }

  open() {
    const modalElement = this.modal?.nativeElement;
    if (modalElement) {
      const modal = new window.bootstrap.Modal(modalElement, {
        backdrop: true,
        keyboard: true,
      });
      modal.show();
      modalElement.addEventListener('hidden.bs.modal', () => {
        this.modalClose.emit();
      });
    }
  }

  close() {
    const modalElement = this.modal?.nativeElement;
    if (modalElement) {
      const modal = window.bootstrap.Modal.getInstance(modalElement);
      modal?.hide();
    }
  }
}
