import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { InlineSvgComponent } from '../inline-svg/inline-svg.component';

@Component({
  selector: 'app-button',
  imports: [CommonModule, InlineSvgComponent],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss'
})
export class ButtonComponent {
  @Input() type: 'secondary'|'primary'|'danger' = 'primary';
  @Input() btnText = '';
  @Input() iconUrl = '';
  @Input() iconType: 'svg'|'img' = 'svg';
  @Input() disabled = false;
  @Input() iconPlacement: 'before'|'after' = 'after';
  @Output() btnClick = new EventEmitter<boolean>();

  onButtonClick(){
    this.btnClick.emit(true);
  }
}
