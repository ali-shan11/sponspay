import { DatePipe } from '@angular/common';
import { Component, ElementRef, EventEmitter, inject, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LatestTransaction } from '@app-types/transaction-activity';
import { LatestTransactionService } from '@services/latest-transaction.service';
import { DashboardService } from '@services/dashboard.service';
import { TRANSACTION_REVENUE_STATUS } from '@utils/enums';
import { Modal } from 'bootstrap';
import { StatusInfoModalComponent } from '../status-info-modal/status-info-modal.component';

@Component({
  selector: 'app-message-modal',
  imports: [DatePipe, FormsModule, StatusInfoModalComponent],
  templateUrl: './message-modal.component.html',
  styleUrl: './message-modal.component.scss'
})
export class MessageModalComponent implements OnInit, OnDestroy {
  @ViewChild('modal', { static: true }) modalEl!: ElementRef<HTMLDivElement>;
  @Input() message!: LatestTransaction;
  @Output() closed = new EventEmitter<boolean>();

  private transactionService = inject(LatestTransactionService);
  private dashboardService = inject(DashboardService);

  TRANSACTION_REVENUE_STATUS = TRANSACTION_REVENUE_STATUS;
  isStatusInfoModalOpen = false;
  replyText = '';
  replyState: 'idle' | 'sending' | 'sent' | 'error' = 'idle';
  replyError = '';
  private bsModal?: Modal;

  configureModal(){
    this.bsModal = new Modal(this.modalEl.nativeElement, { backdrop: 'static' });
    this.bsModal.show();
    this.modalEl.nativeElement.addEventListener('hidden.bs.modal', () => {
      this.closed.emit(this.replyState === 'sent');
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

  sendReply() {
    if (!this.replyText.trim() || this.replyState === 'sending') return;

    this.replyState = 'sending';
    this.replyError = '';

    const channelId = this.dashboardService.selectedChannelObservable.value;
    this.transactionService.replyToMessage(this.message.messageId, this.replyText.trim(), channelId).subscribe({
      next: () => {
        this.replyState = 'sent';
        this.message.revenueStatus = TRANSACTION_REVENUE_STATUS.Earned;
      },
      error: (err) => {
        this.replyState = 'error';
        this.replyError = err?.error?.message || 'Failed to send reply. Please try again.';
      },
    });
  }
}
