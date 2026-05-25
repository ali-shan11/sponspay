import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';

import { CustomTextareaComponent } from './custom-textarea.component';

describe('CustomTextareaComponent', () => {
  let component: CustomTextareaComponent;
  let fixture: ComponentFixture<CustomTextareaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomTextareaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomTextareaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default input values', () => {
    expect(component.placeholder).toBe('');
    expect(component.rows).toBe(2);
    expect(component.disabled).toBe(false);
    expect(component.label).toBe('');
    expect(component.info).toBe('');
    expect(component.controlName).toBeTruthy();
  });

  it('should have svgIcons defined', () => {
    expect(component.svgIcons).toBeTruthy();
  });

  it('should accept placeholder input', () => {
    component.placeholder = 'Enter description';
    expect(component.placeholder).toBe('Enter description');
  });

  it('should accept rows input', () => {
    component.rows = 5;
    fixture.detectChanges();
    expect(component.rows).toBe(5);
  });

  it('should accept disabled input', () => {
    component.disabled = true;
    fixture.detectChanges();
    expect(component.disabled).toBe(true);
  });

  it('should accept label input', () => {
    component.label = 'Description';
    fixture.detectChanges();
    expect(component.label).toBe('Description');
  });

  it('should accept info input', () => {
    component.info = 'Help text here';
    fixture.detectChanges();
    expect(component.info).toBe('Help text here');
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
});
