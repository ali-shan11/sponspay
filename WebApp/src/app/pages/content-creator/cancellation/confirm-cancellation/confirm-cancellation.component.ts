import { NgClass } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CancelOnboarding } from '@app-types/onboarding';

@Component({
  selector: 'app-confirm-cancellation',
  imports: [FormsModule, NgClass],
  templateUrl: './confirm-cancellation.component.html',
  styleUrl: './confirm-cancellation.component.scss'
})
export class ConfirmCancellationComponent {
  @Output() reasonChange = new EventEmitter<CancelOnboarding>();
  keepMeUpdated = false;
  reason = '';

  handleReasonChange(){
    this.reasonChange.emit({
      reason: this.reason,
      keepMeUpdated: this.keepMeUpdated
    });
  }

}
