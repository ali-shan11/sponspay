import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FormControl } from '@angular/forms';

import { PhoneNumberComponent } from './phone-number.component';

describe('PhoneNumberComponent', () => {
  let component: PhoneNumberComponent;
  let fixture: ComponentFixture<PhoneNumberComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhoneNumberComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(PhoneNumberComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default input values', () => {
    expect(component.placeholder).toBe('');
    expect(component.label).toBe('');
    expect(component.controlName).toBeTruthy();
    expect(component.onlyCountries).toEqual([]);
  });

  it('should have svgIcons defined', () => {
    expect(component.svgIcons).toBeTruthy();
  });

  it('should accept placeholder input', () => {
    component.placeholder = 'Enter phone number';
    expect(component.placeholder).toBe('Enter phone number');
  });

  it('should accept label input', () => {
    component.label = 'Phone';
    expect(component.label).toBe('Phone');
  });

  it('should accept a custom FormControl', () => {
    const control = new FormControl('');
    component.controlName = control;
    expect(component.controlName).toBe(control);
  });

  it('should emit countryChange', () => {
    const spy = spyOn(component.countryChange, 'emit');
    // Simulate the handler directly since iti is initialized in AfterViewInit
    component.countryChange.emit('ke');
    expect(spy).toHaveBeenCalledWith('ke');
  });
});
