import { Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild, OnInit, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '@components/button/button.component';
import { CustomInputComponent } from '@components/custom-input/custom-input.component';
import { CustomSelectComponent } from '@components/custom-select/custom-select.component';
import { OtpInputComponent } from '@components/otp-input/otp-input.component';
import { PhoneNumberComponent } from '@components/phone-number/phone-number.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { COUNTRIES_LIST } from '@utils/constants';
import { SvgIcons } from '@utils/svg-icons';
import { Modal } from 'bootstrap';
import { interval, Subscription, take } from 'rxjs';

@Component({
  selector: 'app-configure-compensation',
  imports: [NgSelectModule, ReactiveFormsModule, CustomSelectComponent, OtpInputComponent, PhoneNumberComponent, CustomInputComponent, ButtonComponent],
  templateUrl: './configure-compensation.component.html',
  styleUrl: './configure-compensation.component.scss'
})
export class ConfigureCompensationComponent implements OnDestroy, OnInit {
  @ViewChild('modal', { static: true }) modalEl!: ElementRef<HTMLDivElement>;
  @Output() closed = new EventEmitter<void>();
  @Output() verified = new EventEmitter<boolean>();

  public step: 1 | 2 = 1;
  public svgIcons = SvgIcons;
  private bsModal?: Modal;
  public configurationForm!: FormGroup;
  public countriesList = COUNTRIES_LIST;
  public isResendTimerRunning = true;
  public displayTime = '0:00';
  public paymentProviderList = [
    {name: 'MTN Mobile Money (MoMo)'}
  ];
  private timerSub?: Subscription;
  public fb= inject(FormBuilder);

  constructor () {
    this.configureForm();
  }

  ngOnInit() {
    this.configureModal();
  }

  configureModal(){
    this.bsModal = new Modal(this.modalEl.nativeElement, { backdrop: 'static' });
    this.bsModal.show();
    this.modalEl.nativeElement.addEventListener('hidden.bs.modal', () => {
      this.closed.emit();
    });
  }

  configureForm(){
    this.configurationForm = this.fb.group({
      country: [null, [Validators.required]],
      paymentProvider: [null, [Validators.required]],
      phoneNumber: [null, [Validators.required]],
      ownerName: [null, [Validators.required]],
    })
  }

  get countryControl(){
    return this.configurationForm.get('country') as FormControl;
  }
  get paymentControl(){
    return this.configurationForm.get('paymentProvider') as FormControl;
  }
  get phoneNumberControl(){
    return this.configurationForm.get('phoneNumber') as FormControl;
  }
  get ownerNameControl(){
    return this.configurationForm.get('ownerName') as FormControl;
  }

  close() {
    this.bsModal?.hide();
  }

  ngOnDestroy() {
    this.bsModal?.dispose();
    this.timerSub?.unsubscribe();
  }

  onVerifyClick(){
    this.close();
    this.verified.emit(true);
  }

  startTimer(): void {
    const duration = 60;
    this.isResendTimerRunning = true;

    this.timerSub?.unsubscribe();
    this.timerSub = interval(1000)
      .pipe(take(duration))
      .subscribe((elapsed) => {
        const remaining = duration - elapsed - 1;
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        this.displayTime = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;

        if (remaining === 0) {
          this.isResendTimerRunning = false;
          this.displayTime = '';
        }
      });
  }

  onConfirmClick(){
    this.step = 2;
    this.startTimer(); 
  }
}
