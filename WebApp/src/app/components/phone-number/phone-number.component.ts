import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import intlTelInput from 'intl-tel-input/intlTelInputWithUtils';
import { SvgIcons } from '@utils/svg-icons';
import { getAlpha2Code } from '@utils/countrycodes';

@Component({
  selector: 'app-phone-number',
  imports: [ReactiveFormsModule],
  templateUrl: './phone-number.component.html',
  styleUrl: './phone-number.component.scss'
})
export class PhoneNumberComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() controlName: FormControl = new FormControl();
  @Input() placeholder = '';
  @Input() countryCode!: string;
  @Input() label = '';
  @Input() onlyCountries: string[] = [];
  @Output() countryChange = new EventEmitter<string>();
  @ViewChild('phoneInput') phoneInput!: ElementRef<HTMLInputElement>;

  svgIcons = SvgIcons;
  private iti: ReturnType<typeof intlTelInput> | null = null;

  ngAfterViewInit(): void {
    const input = this.phoneInput.nativeElement;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const initialCountry = (this.onlyCountries.length ? this.onlyCountries[0] : 'us') as any;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    this.iti = intlTelInput(input, {
      initialCountry,
      separateDialCode: true,
      strictMode: true,
      formatAsYouType: true,
      countrySearch: true,
      autoPlaceholder: 'aggressive',
      ...(this.onlyCountries.length ? { onlyCountries: this.onlyCountries as any } : {}),
    } as any);
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // Capture paste before intl-tel-input's strictMode handler to properly
    // handle full international numbers (e.g. +2250503456789) with separateDialCode.
    // The library's handler doesn't strip the dial code from pasted values.
    input.addEventListener('paste', this.onPasteHandler, { capture: true });
    input.addEventListener('countrychange', this.onCountryChangeHandler);
    input.addEventListener('input', this.onInputHandler);
    input.addEventListener('blur', this.onBlurHandler);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes?.['countryCode']?.currentValue && this.iti) {
      const iso2 = getAlpha2Code(this.countryCode).toLowerCase();
      if (iso2) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.iti.setCountry(iso2 as any);
      }
    }
  }

  ngOnDestroy(): void {
    const input = this.phoneInput?.nativeElement;
    if (input) {
      input.removeEventListener('paste', this.onPasteHandler, { capture: true });
      input.removeEventListener('countrychange', this.onCountryChangeHandler);
      input.removeEventListener('input', this.onInputHandler);
      input.removeEventListener('blur', this.onBlurHandler);
    }
    this.iti?.destroy();
  }

  private onPasteHandler = (e: ClipboardEvent): void => {
    if (!this.iti) return;
    const raw = e.clipboardData?.getData('text')?.trim();
    if (!raw) return;
    // Strip everything except digits and leading +
    const digits = raw.replace(/[^0-9+]/g, '');
    if (!digits) return;
    // Treat as international number: use setNumber() which properly
    // handles separateDialCode (strips dial code, updates country flag).
    const number = digits.startsWith('+') ? digits : `+${digits}`;
    e.stopImmediatePropagation();
    e.preventDefault();
    this.iti.setNumber(number);
    this.updateFormControl();
  };

  private onCountryChangeHandler = (): void => {
    const data = this.iti?.getSelectedCountryData();
    if (data?.iso2) {
      this.countryChange.emit(data.iso2);
    }
  };

  private onInputHandler = (): void => {
    this.updateFormControl();
  };

  private onBlurHandler = (): void => {
    this.controlName.markAsTouched();
    this.updateFormControl();
  };

  private updateFormControl(): void {
    if (!this.iti) return;
    const number = this.iti.getNumber();
    const isValid = this.iti.isValidNumber();

    this.controlName.setValue(number || null, { emitEvent: true });

    if (!number) {
      this.controlName.setErrors(null);
    } else if (!isValid) {
      const errorCode = this.iti.getValidationError();
      const errorMap = ['Invalid number', 'Invalid country code', 'Too short', 'Too long', 'Invalid number'];
      this.controlName.setErrors({
        invalidPhone: { errorCode, errorMessage: errorMap[errorCode] || 'Invalid number' }
      });
    } else {
      this.controlName.setErrors(null);
    }
  }
}
