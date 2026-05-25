import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-otp-input',
  imports: [ReactiveFormsModule],
  templateUrl: './otp-input.component.html',
  styleUrl: './otp-input.component.scss'
})
export class OtpInputComponent {
  @Input() formControl: FormControl = new FormControl();
  otpControls: FormControl[] = Array(6).fill(null).map(() => new FormControl(''));
  private onChange: (value: string) => void = () => {
    console.log('changed');
  };
  private onTouched: () => void = () => {
    console.log('touched');
  };

  writeValue(value: string): void {
    if (value && value.length === 6) {
      this.otpControls.forEach((control, index) => control.setValue(value[index] || '', { emitEvent: false }));
    } else {
      this.otpControls.forEach(control => control.setValue('', { emitEvent: false }));
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.otpControls.forEach(control => isDisabled ? control.disable() : control.enable());
  }

  onInput(event: Event, index: number): void {
    // const input = event.target as HTMLInputElement;
    // const value = input.value;
    // if (value.length === 1 && index < 5) {
    //   const nextInput = input.nextElementSibling as HTMLInputElement;
    //   nextInput?.focus();
    // }
    // this.updateFormControl();

    const input = event.target as HTMLInputElement;
    let value = input.value;

    value = value.replace(/[^0-9]/g, '').slice(0, 1);
    input.value = value;
    this.otpControls[index].setValue(value, { emitEvent: false });

    if (value && index < 5) {
      const nextInput = input.nextElementSibling as HTMLInputElement;
      nextInput?.focus();
    }

    this.updateFormControl();
  }

  onKeydown(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && !input.value && index > 0) {
      const prevInput = input.previousElementSibling as HTMLInputElement;
      prevInput?.focus();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasteData = event.clipboardData?.getData('text') || '';
    if (/^\d{6}$/.test(pasteData)) {
      pasteData.split('').forEach((char, index) => {
        this.otpControls[index].setValue(char, { emitEvent: false });
      });
      this.updateFormControl();
      const lastInput = document.querySelectorAll('.otp-input')[5] as HTMLInputElement;
      lastInput?.focus();
    }
  }

  private updateFormControl(): void {
    const otpValue = this.otpControls.map(control => control.value || '').join('');
    this.formControl.setValue(otpValue.length === 6 ? otpValue : null, { emitEvent: false });
    this.onChange(otpValue);
    this.onTouched();
  }
}
