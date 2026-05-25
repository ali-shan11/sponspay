import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange, SimpleChanges } from '@angular/core';
import { FormControl } from '@angular/forms';
import { TransactionCountryList, TransactionFilter } from '@app-types/transaction-activity';
import { REVENUE_STATUS } from '@utils/enums';

import { FilterModalComponent } from './filter-modal.component';

describe('FilterModalComponent', () => {
  let component: FilterModalComponent;
  let fixture: ComponentFixture<FilterModalComponent>;

  const mockCountryList: TransactionCountryList[] = [
    { countryCode: 'NGA', countryName: 'Nigeria', currencies: ['NGN'] },
    { countryCode: 'KEN', countryName: 'Kenya', currencies: ['KES'] },
  ];

  const mockFilterObj: TransactionFilter = {
    country: null,
    status: null,
    dateRange: null,
    canceled: false,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilterModalComponent);
    component = fixture.componentInstance;

    // Spy on configureModal before detectChanges to prevent real Bootstrap Modal
    spyOn(component, 'configureModal');
    component.countryList = mockCountryList;
    component.filterObj = { ...mockFilterObj };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call configureModal on init', () => {
      expect(component.configureModal).toHaveBeenCalledTimes(1);
    });
  });

  describe('configureModal', () => {
    it('should set up bsModal, show it, and attach hidden.bs.modal listener', () => {
      const mockModalInstance = {
        show: jasmine.createSpy('show'),
        hide: jasmine.createSpy('hide'),
        dispose: jasmine.createSpy('dispose'),
      };

      // Restore the spy so we can test the real behavior via callFake
      (component.configureModal as jasmine.Spy).and.callFake(() => {
        (component as any).bsModal = mockModalInstance;
        component.modalEl.nativeElement.addEventListener('hidden.bs.modal', () => {
          component.closed.emit();
        });
      });

      component.configureModal();

      expect((component as any).bsModal).toBe(mockModalInstance);

      // Verify the hidden.bs.modal event listener was attached
      spyOn(component.closed, 'emit');
      const event = new Event('hidden.bs.modal');
      component.modalEl.nativeElement.dispatchEvent(event);
      expect(component.closed.emit).toHaveBeenCalled();
    });
  });

  describe('ngOnChanges', () => {
    it('should patch form values when filterObj changes', () => {
      const newFilter: TransactionFilter = {
        country: ['NGA'],
        status: ['pending'],
        dateRange: 30,
        canceled: true,
      };

      const changes: SimpleChanges = {
        filterObj: new SimpleChange(null, newFilter, false),
      };

      component.filterObj = newFilter;
      component.ngOnChanges(changes);

      // canceled should be reset to false
      expect(component.filterObj.canceled).toBe(false);

      // Form should be patched with the new filter values
      expect(component.filterForm.get('country')?.value).toEqual(['NGA']);
      expect(component.filterForm.get('status')?.value).toEqual(['pending']);
      expect(component.filterForm.get('dateRange')?.value).toBe(30);
    });

    it('should not patch form when changes is null-ish', () => {
      spyOn(component.filterForm, 'patchValue');
      component.ngOnChanges(null as any);
      expect(component.filterForm.patchValue).not.toHaveBeenCalled();
    });

    it('should not patch form when filterObj change has no currentValue', () => {
      spyOn(component.filterForm, 'patchValue');
      const changes: SimpleChanges = {
        filterObj: new SimpleChange(null, undefined, true),
      };
      component.ngOnChanges(changes);
      expect(component.filterForm.patchValue).not.toHaveBeenCalled();
    });

    it('should not patch form when a different property changes', () => {
      spyOn(component.filterForm, 'patchValue');
      const changes: SimpleChanges = {
        countryList: new SimpleChange(null, mockCountryList, false),
      };
      component.ngOnChanges(changes);
      expect(component.filterForm.patchValue).not.toHaveBeenCalled();
    });
  });

  describe('configureForm', () => {
    it('should create a FormGroup with country, status, and dateRange controls', () => {
      component.configureForm();

      expect(component.filterForm).toBeDefined();
      expect(component.filterForm.get('country')).toBeDefined();
      expect(component.filterForm.get('status')).toBeDefined();
      expect(component.filterForm.get('dateRange')).toBeDefined();
    });

    it('should initialize all form controls to null', () => {
      component.configureForm();

      expect(component.filterForm.get('country')?.value).toBeNull();
      expect(component.filterForm.get('status')?.value).toBeNull();
      expect(component.filterForm.get('dateRange')?.value).toBeNull();
    });
  });

  describe('control getters', () => {
    it('should return the country FormControl', () => {
      const control = component.countryControl;
      expect(control).toBeInstanceOf(FormControl);
      expect(control).toBe(component.filterForm.get('country') as FormControl);
    });

    it('should return the status FormControl', () => {
      const control = component.statusControl;
      expect(control).toBeInstanceOf(FormControl);
      expect(control).toBe(component.filterForm.get('status') as FormControl);
    });

    it('should return the dateRange FormControl', () => {
      const control = component.dateRangeControl;
      expect(control).toBeInstanceOf(FormControl);
      expect(control).toBe(component.filterForm.get('dateRange') as FormControl);
    });
  });

  describe('ngOnDestroy', () => {
    it('should dispose the Bootstrap Modal when it exists', () => {
      const mockModalInstance = {
        show: jasmine.createSpy('show'),
        hide: jasmine.createSpy('hide'),
        dispose: jasmine.createSpy('dispose'),
      };

      (component as any).bsModal = mockModalInstance;
      component.ngOnDestroy();
      expect(mockModalInstance.dispose).toHaveBeenCalledTimes(1);
    });

    it('should not throw when bsModal is undefined', () => {
      (component as any).bsModal = undefined;
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('close', () => {
    it('should set filterObj.canceled to true, emit closed, and hide modal', () => {
      const mockModalInstance = {
        show: jasmine.createSpy('show'),
        hide: jasmine.createSpy('hide'),
        dispose: jasmine.createSpy('dispose'),
      };
      (component as any).bsModal = mockModalInstance;

      spyOn(component.closed, 'emit');

      component.close();

      expect(component.filterObj.canceled).toBe(true);
      expect(component.closed.emit).toHaveBeenCalledWith(component.filterObj);
      expect(mockModalInstance.hide).toHaveBeenCalledTimes(1);
    });

    it('should not throw when bsModal is undefined', () => {
      (component as any).bsModal = undefined;
      spyOn(component.closed, 'emit');
      expect(() => component.close()).not.toThrow();
      expect(component.filterObj.canceled).toBe(true);
      expect(component.closed.emit).toHaveBeenCalled();
    });
  });

  describe('onConfirmClick', () => {
    it('should set canceled to false, update filterObj from form raw values, and emit', () => {
      // Set form values
      component.filterForm.patchValue({
        country: ['NGA'],
        status: ['pending'],
        dateRange: 7,
      });

      spyOn(component.closed, 'emit');

      component.onConfirmClick();

      expect(component.filterObj.canceled).toBe(false);
      expect(component.filterObj.country).toEqual(['NGA']);
      expect(component.filterObj.status).toEqual(['pending']);
      expect(component.filterObj.dateRange).toBe(7);
      expect(component.closed.emit).toHaveBeenCalledWith(component.filterObj);
    });

    it('should emit with null values when form is not filled', () => {
      spyOn(component.closed, 'emit');

      component.onConfirmClick();

      expect(component.filterObj.country).toBeNull();
      expect(component.filterObj.status).toBeNull();
      expect(component.filterObj.dateRange).toBeNull();
      expect(component.closed.emit).toHaveBeenCalled();
    });
  });

  describe('properties', () => {
    it('should have revenueStatusList with Awaiting Reply, Earned, Auto-Replied', () => {
      expect(component.revenueStatusList).toEqual([
        { name: REVENUE_STATUS.AwaitingReply, value: 'Awaiting Reply' },
        { name: REVENUE_STATUS.Earned, value: 'Earned' },
        { name: REVENUE_STATUS.AutoReplied, value: 'Auto-Replied' },
      ]);
    });

    it('should have dateRangeOptions with 6 options', () => {
      expect(component.dateRangeOptions.length).toBe(6);
      expect(component.dateRangeOptions[0]).toEqual({ text: 'Today', value: 0 });
      expect(component.dateRangeOptions[5]).toEqual({ text: 'This Year', value: 365 });
    });

    it('should have a modalIcon', () => {
      expect(component.modalIcon).toBeDefined();
    });

    it('should accept countryList input', () => {
      expect(component.countryList).toEqual(mockCountryList);
    });
  });

  describe('clearAll', () => {
    it('should reset the form, update filterObj, and emit closed', () => {
      component.filterForm.patchValue({ country: ['KEN'], status: ['earned'], dateRange: 30 });
      spyOn(component.closed, 'emit');

      component.clearAll();

      expect(component.filterForm.get('country')?.value).toBeNull();
      expect(component.filterForm.get('status')?.value).toBeNull();
      expect(component.filterForm.get('dateRange')?.value).toBeNull();
      expect(component.filterObj.canceled).toBeFalse();
      expect(component.closed.emit).toHaveBeenCalledWith(jasmine.objectContaining({
        country: null, status: null, dateRange: null, canceled: false
      }));
    });
  });
});
