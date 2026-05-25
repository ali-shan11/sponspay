import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonComponent } from "../button/button.component";
import { ConfirmationModalIcon } from '../../utils/svg-icons';

@Component({
  selector: 'app-confirmation-modal',
  imports: [ButtonComponent],
  templateUrl: './confirmation-modal.component.html',
  styleUrl: './confirmation-modal.component.scss'
})
export class ConfirmationModalComponent {
  @Input() modalType!: 'logout' | 'general';
  @Input() title!: string;
  @Input() text!: string;
  @Output() closed = new EventEmitter<boolean>();

  public modalIcon = ConfirmationModalIcon;

  close(){
    this.closed.emit(false);
  }

  onConfirmClick(){
    this.closed.emit(true);
  }
}
