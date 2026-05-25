import { Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Modal } from 'bootstrap';
import { SvgIcons } from '@utils/svg-icons';
import { CustomInputComponent } from '@components/custom-input/custom-input.component';
import { ButtonComponent } from '@components/button/button.component';

@Component({
  selector: 'app-integration-dialog',
  imports: [ButtonComponent, CustomInputComponent],
  templateUrl: './integration-dialog.component.html',
  styleUrl: './integration-dialog.component.scss'
})
export class IntegrationDialogComponent implements OnInit, OnDestroy {
  @ViewChild('modal', { static: true }) modalEl!: ElementRef<HTMLDivElement>;
  @Output() closed = new EventEmitter<void>();
  
  public svgIcons = SvgIcons;
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
  
  configureModal(){
    this.bsModal = new Modal(this.modalEl.nativeElement, { backdrop: 'static' });
    this.bsModal.show();
    this.modalEl.nativeElement.addEventListener('hidden.bs.modal', () => {
      this.closed.emit();
    });
  }
}
