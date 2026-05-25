import { Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { SvgIcons } from '@utils/svg-icons';
import { Modal } from 'bootstrap';

@Component({
  selector: 'app-compensation-added-dialog',
  imports: [ButtonComponent],
  templateUrl: './compensation-added-dialog.component.html',
  styleUrl: './compensation-added-dialog.component.scss'
})
export class CompensationAddedDialogComponent implements OnInit, OnDestroy {
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
