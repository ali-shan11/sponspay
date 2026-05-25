import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';

import { CustomInputComponent } from './custom-input.component';

describe('CustomInputComponent', () => {
  let component: CustomInputComponent;
  let fixture: ComponentFixture<CustomInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomInputComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default input values', () => {
    expect(component.type).toBe('text');
    expect(component.placeholder).toBe('');
    expect(component.disabled).toBe(false);
    expect(component.label).toBe('');
    expect(component.subLabel).toBe('');
    expect(component.info).toBe('');
    expect(component.controlName).toBeTruthy();
  });

  it('should have svgIcons defined', () => {
    expect(component.svgIcons).toBeTruthy();
  });

  it('should accept type input', () => {
    component.type = 'email';
    expect(component.type).toBe('email');
  });

  it('should accept password type input', () => {
    component.type = 'password';
    expect(component.type).toBe('password');
  });

  it('should accept number type input', () => {
    component.type = 'number';
    expect(component.type).toBe('number');
  });

  it('should accept tel type input', () => {
    component.type = 'tel';
    expect(component.type).toBe('tel');
  });

  it('should accept placeholder input', () => {
    component.placeholder = 'Enter your name';
    expect(component.placeholder).toBe('Enter your name');
  });

  it('should accept label input', () => {
    component.label = 'Name';
    fixture.detectChanges();
    expect(component.label).toBe('Name');
  });

  it('should accept subLabel input', () => {
    component.subLabel = 'Optional';
    fixture.detectChanges();
    expect(component.subLabel).toBe('Optional');
  });

  it('should accept info input', () => {
    component.info = 'Some help text';
    fixture.detectChanges();
    expect(component.info).toBe('Some help text');
  });

  it('should accept disabled input', () => {
    component.disabled = true;
    fixture.detectChanges();
    expect(component.disabled).toBe(true);
  });

  it('should accept a custom FormControl', () => {
    const control = new FormControl('test value');
    component.controlName = control;
    fixture.detectChanges();
    expect(component.controlName.value).toBe('test value');
  });

  describe('findMaxNumberOfControl', () => {
    it('should return null when no maxlength error exists', () => {
      component.controlName = new FormControl('');
      expect(component.findMaxNumberOfControl).toBeNull();
    });

    it('should return requiredLength when maxlength error exists', () => {
      const control = new FormControl('toolongvalue', [Validators.maxLength(5)]);
      component.controlName = control;
      control.markAsTouched();
      control.updateValueAndValidity();
      expect(component.findMaxNumberOfControl).toBe(5);
    });
  });

  describe('findMinNumberOfControl', () => {
    it('should return null when no minlength error exists', () => {
      component.controlName = new FormControl('');
      expect(component.findMinNumberOfControl).toBeNull();
    });

    it('should return requiredLength when minlength error exists', () => {
      const control = new FormControl('ab', [Validators.minLength(5)]);
      component.controlName = control;
      control.markAsTouched();
      control.updateValueAndValidity();
      expect(component.findMinNumberOfControl).toBe(5);
    });
  });

  describe('onEnter', () => {
    it('should emit enterPressed event', () => {
      spyOn(component.enterPressed, 'emit');
      component.onEnter();
      expect(component.enterPressed.emit).toHaveBeenCalled();
    });
  });
});
