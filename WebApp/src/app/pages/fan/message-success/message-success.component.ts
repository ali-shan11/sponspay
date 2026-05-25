import { AfterViewInit, Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { SvgIcons, SvgSocialIcons } from '@utils/svg-icons';

@Component({
  selector: 'app-message-success',
  imports: [ButtonComponent],
  templateUrl: './message-success.component.html',
  styleUrl: './message-success.component.scss',
})
export class MessageSuccessComponent implements AfterViewInit {
  @ViewChild('modal', { static: false }) modal: ElementRef | undefined;
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
    this.close();
  }
}
