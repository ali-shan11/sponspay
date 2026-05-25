import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtpInputComponent } from './otp-input.component';

describe('OtpInputComponent', () => {
  let component: OtpInputComponent;
  let fixture: ComponentFixture<OtpInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OtpInputComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(OtpInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have 6 otp controls', () => {
    expect(component.otpControls.length).toBe(6);
  });

  it('should have a formControl', () => {
    expect(component.formControl).toBeTruthy();
  });

  describe('writeValue', () => {
    it('should distribute a 6-digit string across controls', () => {
      component.writeValue('123456');
      expect(component.otpControls[0].value).toBe('1');
      expect(component.otpControls[1].value).toBe('2');
      expect(component.otpControls[2].value).toBe('3');
      expect(component.otpControls[3].value).toBe('4');
      expect(component.otpControls[4].value).toBe('5');
      expect(component.otpControls[5].value).toBe('6');
    });

    it('should clear all controls when value is not 6 chars', () => {
      // First set a value
      component.writeValue('123456');
      // Then set a shorter value
      component.writeValue('123');
      component.otpControls.forEach(control => {
        expect(control.value).toBe('');
      });
    });

    it('should clear all controls when value is empty string', () => {
      component.writeValue('123456');
      component.writeValue('');
      component.otpControls.forEach(control => {
        expect(control.value).toBe('');
      });
    });

    it('should clear all controls when value is null/undefined', () => {
      component.writeValue('123456');
      component.writeValue(null as unknown as string);
      component.otpControls.forEach(control => {
        expect(control.value).toBe('');
      });
    });
  });

  describe('registerOnChange', () => {
    it('should register a change callback', () => {
      const fn = jasmine.createSpy('onChange');
      component.registerOnChange(fn);
      // Trigger an update to verify the registered fn is called
      component['updateFormControl']();
      expect(fn).toHaveBeenCalled();
    });
  });

  describe('registerOnTouched', () => {
    it('should register a touched callback', () => {
      const fn = jasmine.createSpy('onTouched');
      component.registerOnTouched(fn);
      component['updateFormControl']();
      expect(fn).toHaveBeenCalled();
    });
  });

  describe('setDisabledState', () => {
    it('should disable all controls when true', () => {
      component.setDisabledState(true);
      component.otpControls.forEach(control => {
        expect(control.disabled).toBe(true);
      });
    });

    it('should enable all controls when false', () => {
      component.setDisabledState(true);
      component.setDisabledState(false);
      component.otpControls.forEach(control => {
        expect(control.enabled).toBe(true);
      });
    });
  });

  describe('onInput', () => {
    it('should set value and try to focus next input for non-last index', () => {
      const nextInput = document.createElement('input');
      spyOn(nextInput, 'focus');
      const input = document.createElement('input');
      input.value = '5';
      Object.defineProperty(input, 'nextElementSibling', { value: nextInput });
      const event = { target: input } as unknown as Event;

      component.onInput(event, 2);

      expect(component.otpControls[2].value).toBe('5');
      expect(nextInput.focus).toHaveBeenCalled();
    });

    it('should strip non-numeric characters', () => {
      const input = document.createElement('input');
      input.value = 'a';
      Object.defineProperty(input, 'nextElementSibling', { value: null });
      const event = { target: input } as unknown as Event;

      component.onInput(event, 0);

      expect(component.otpControls[0].value).toBe('');
    });

    it('should only keep the first digit if multiple digits entered', () => {
      const input = document.createElement('input');
      input.value = '789';
      Object.defineProperty(input, 'nextElementSibling', { value: null });
      const event = { target: input } as unknown as Event;

      component.onInput(event, 5);

      expect(component.otpControls[5].value).toBe('7');
    });

    it('should not focus next input if index is 5 (last)', () => {
      const input = document.createElement('input');
      input.value = '9';
      const nextInput = document.createElement('input');
      spyOn(nextInput, 'focus');
      Object.defineProperty(input, 'nextElementSibling', { value: nextInput });
      const event = { target: input } as unknown as Event;

      component.onInput(event, 5);

      // at index 5 the "index < 5" condition fails, so no focus
      expect(nextInput.focus).not.toHaveBeenCalled();
    });

    it('should not focus next input if value is empty', () => {
      const input = document.createElement('input');
      input.value = '';
      const nextInput = document.createElement('input');
      spyOn(nextInput, 'focus');
      Object.defineProperty(input, 'nextElementSibling', { value: nextInput });
      const event = { target: input } as unknown as Event;

      component.onInput(event, 0);

      expect(nextInput.focus).not.toHaveBeenCalled();
    });
  });

  describe('onKeydown', () => {
    it('should focus previous input on Backspace when current is empty and index > 0', () => {
      const prevInput = document.createElement('input');
      spyOn(prevInput, 'focus');
      const input = document.createElement('input');
      input.value = '';
      Object.defineProperty(input, 'previousElementSibling', { value: prevInput });
      const event = new KeyboardEvent('keydown', { key: 'Backspace' });
      Object.defineProperty(event, 'target', { value: input });

      component.onKeydown(event, 3);

      expect(prevInput.focus).toHaveBeenCalled();
    });

    it('should not focus previous input on Backspace when index is 0', () => {
      const prevInput = document.createElement('input');
      spyOn(prevInput, 'focus');
      const input = document.createElement('input');
      input.value = '';
      Object.defineProperty(input, 'previousElementSibling', { value: prevInput });
      const event = new KeyboardEvent('keydown', { key: 'Backspace' });
      Object.defineProperty(event, 'target', { value: input });

      component.onKeydown(event, 0);

      expect(prevInput.focus).not.toHaveBeenCalled();
    });

    it('should not focus previous input on Backspace when current has value', () => {
      const prevInput = document.createElement('input');
      spyOn(prevInput, 'focus');
      const input = document.createElement('input');
      input.value = '5';
      Object.defineProperty(input, 'previousElementSibling', { value: prevInput });
      const event = new KeyboardEvent('keydown', { key: 'Backspace' });
      Object.defineProperty(event, 'target', { value: input });

      component.onKeydown(event, 3);

      expect(prevInput.focus).not.toHaveBeenCalled();
    });

    it('should not react to non-Backspace keys', () => {
      const prevInput = document.createElement('input');
      spyOn(prevInput, 'focus');
      const input = document.createElement('input');
      input.value = '';
      Object.defineProperty(input, 'previousElementSibling', { value: prevInput });
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      Object.defineProperty(event, 'target', { value: input });

      component.onKeydown(event, 3);

      expect(prevInput.focus).not.toHaveBeenCalled();
    });
  });

  describe('onPaste', () => {
    it('should distribute pasted 6-digit value across controls', () => {
      const event = {
        preventDefault: jasmine.createSpy('preventDefault'),
        clipboardData: { getData: () => '654321' }
      } as unknown as ClipboardEvent;

      component.onPaste(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.otpControls[0].value).toBe('6');
      expect(component.otpControls[1].value).toBe('5');
      expect(component.otpControls[2].value).toBe('4');
      expect(component.otpControls[3].value).toBe('3');
      expect(component.otpControls[4].value).toBe('2');
      expect(component.otpControls[5].value).toBe('1');
    });

    it('should not set values if pasted data is not exactly 6 digits', () => {
      component.writeValue('000000');
      const event = {
        preventDefault: jasmine.createSpy('preventDefault'),
        clipboardData: { getData: () => '123' }
      } as unknown as ClipboardEvent;

      component.onPaste(event);

      expect(event.preventDefault).toHaveBeenCalled();
      // Values should remain as set by writeValue
      expect(component.otpControls[0].value).toBe('0');
    });

    it('should not set values if pasted data contains non-digits', () => {
      const event = {
        preventDefault: jasmine.createSpy('preventDefault'),
        clipboardData: { getData: () => '12ab56' }
      } as unknown as ClipboardEvent;

      component.onPaste(event);

      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should handle missing clipboardData', () => {
      const event = {
        preventDefault: jasmine.createSpy('preventDefault'),
        clipboardData: null
      } as unknown as ClipboardEvent;

      component.onPaste(event);

      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('updateFormControl (private, tested via onInput)', () => {
    it('should set formControl value to full OTP when all 6 digits are filled', () => {
      component.writeValue('123456');
      // Trigger updateFormControl by calling onInput
      const input = document.createElement('input');
      input.value = '6';
      Object.defineProperty(input, 'nextElementSibling', { value: null });
      const event = { target: input } as unknown as Event;
      component.onInput(event, 5);

      // formControl should have the full OTP
      // After onInput at index 5 with '6', all controls are: 1,2,3,4,5,6
      expect(component.formControl.value).toBe('123456');
    });

    it('should set formControl to null when not all 6 digits filled', () => {
      component.otpControls[0].setValue('1');
      component.otpControls[1].setValue('2');
      // Leave others empty
      const input = document.createElement('input');
      input.value = '2';
      Object.defineProperty(input, 'nextElementSibling', { value: document.createElement('input') });
      const event = { target: input } as unknown as Event;
      component.onInput(event, 1);

      expect(component.formControl.value).toBeNull();
    });
  });
});
