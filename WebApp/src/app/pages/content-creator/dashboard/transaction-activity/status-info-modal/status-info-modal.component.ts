import { Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Modal } from 'bootstrap';

@Component({
  selector: 'app-status-info-modal',
  imports: [],
  templateUrl: './status-info-modal.component.html',
  styleUrl: './status-info-modal.component.scss'
})
export class StatusInfoModalComponent implements OnInit, OnDestroy {
  @ViewChild('modal', { static: true }) modalEl!: ElementRef<HTMLDivElement>;
  @Output() closed = new EventEmitter<void>();

  private bsModal?: Modal;

  configureModal() {
    this.bsModal = new Modal(this.modalEl.nativeElement, { backdrop: 'static' });
    this.bsModal.show();
    this.modalEl.nativeElement.addEventListener('hidden.bs.modal', () => {
      this.closed.emit();
    });
  }

  ngOnInit() {
    this.configureModal();
  }

  ngOnDestroy(): void {
    this.bsModal?.dispose();
  }

  close() {
    this.bsModal?.hide();
  }
}
