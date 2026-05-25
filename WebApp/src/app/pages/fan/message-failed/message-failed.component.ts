import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { SvgSocialIcons, SvgIcons } from '@utils/svg-icons';

@Component({
  selector: 'app-message-failed',
  imports: [ButtonComponent],
  templateUrl: './message-failed.component.html',
  styleUrl: './message-failed.component.scss'
})
export class MessageFailedComponent implements AfterViewInit {
  @ViewChild('modal', { static: false }) modal: ElementRef | undefined;
  @Input() modalType: 'failed'|'refunded'|'timed_out' = 'failed';
  @Output() modelClose: EventEmitter<boolean> = new EventEmitter<boolean>();
  socialIcons = SvgSocialIcons;
  svgIcons = SvgIcons;

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
}
