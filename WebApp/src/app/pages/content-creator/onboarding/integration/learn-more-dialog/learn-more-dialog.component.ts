import { Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Modal } from 'bootstrap';

@Component({
  selector: 'app-learn-more-dialog',
  templateUrl: './learn-more-dialog.component.html',
  styleUrl: './learn-more-dialog.component.scss'
})
export class LearnMoreDialogComponent implements OnInit, OnDestroy {
  @ViewChild('modal', { static: true }) modalEl!: ElementRef<HTMLDivElement>;
  @Output() closed = new EventEmitter<void>();

  private bsModal?: Modal;

  ngOnInit() {
    this.configureModal();
  }

  ngOnDestroy(): void {
    this.bsModal?.dispose();
  }

  close() {
    this.bsModal?.hide();
  }

  configureModal() {
    this.bsModal = new Modal(this.modalEl.nativeElement, { backdrop: true });
    this.bsModal.show();
    this.modalEl.nativeElement.addEventListener('hidden.bs.modal', () => {
      this.closed.emit();
    });
  }
}
