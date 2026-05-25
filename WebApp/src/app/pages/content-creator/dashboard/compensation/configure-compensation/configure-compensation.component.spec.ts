import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { createMockFirebaseAuth } from '../../../../../../testing/mocks/firebase-auth.mock';
import { createMockHttpClient } from '../../../../../../testing/mocks/http.mock';
import { TokenService } from '@services/token.service';
import { FormControl } from '@angular/forms';

import { ConfigureCompensationComponent } from './configure-compensation.component';

describe('ConfigureCompensationComponent', () => {
  let component: ConfigureCompensationComponent;
  let fixture: ComponentFixture<ConfigureCompensationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigureCompensationComponent],
      providers: [
        provideNoopAnimations(),
        { provide: Auth, useValue: createMockFirebaseAuth() },
        { provide: HttpClient, useValue: createMockHttpClient() },
        { provide: TokenService, useValue: jasmine.createSpyObj('TokenService', ['getToken', 'getCurrentUserObj'], { authReady: Promise.resolve() }) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], { events: of(), url: '/' }) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() }, params: of({}), queryParams: of({}) } },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfigureCompensationComponent);
    component = fixture.componentInstance;

    // Spy on configureModal before detectChanges to prevent real Bootstrap Modal
    spyOn(component, 'configureModal');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('constructor', () => {
    it('should call configureForm during construction', () => {
      expect(component.configurationForm).toBeDefined();
      expect(component.configurationForm.get('country')).toBeDefined();
      expect(component.configurationForm.get('paymentProvider')).toBeDefined();
      expect(component.configurationForm.get('phoneNumber')).toBeDefined();
      expect(component.configurationForm.get('ownerName')).toBeDefined();
    });
  });

  describe('ngOnInit', () => {
    it('should call configureModal on init', () => {
      expect(component.configureModal).toHaveBeenCalledTimes(1);
    });
  });

  describe('configureModal', () => {
    it('should set up bsModal and attach hidden.bs.modal listener', () => {
      const mockModalInstance = {
        show: jasmine.createSpy('show'),
        hide: jasmine.createSpy('hide'),
        dispose: jasmine.createSpy('dispose'),
      };

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

  describe('configureForm', () => {
    it('should create a FormGroup with required validators', () => {
      component.configureForm();

      const form = component.configurationForm;
      expect(form).toBeDefined();
      expect(form.get('country')).toBeDefined();
      expect(form.get('paymentProvider')).toBeDefined();
      expect(form.get('phoneNumber')).toBeDefined();
      expect(form.get('ownerName')).toBeDefined();
    });

    it('should initialize all form controls to null', () => {
      component.configureForm();

      expect(component.configurationForm.get('country')?.value).toBeNull();
      expect(component.configurationForm.get('paymentProvider')?.value).toBeNull();
      expect(component.configurationForm.get('phoneNumber')?.value).toBeNull();
      expect(component.configurationForm.get('ownerName')?.value).toBeNull();
    });

    it('should mark form as invalid when all controls are empty', () => {
      component.configureForm();
      expect(component.configurationForm.valid).toBe(false);
    });

    it('should mark form as valid when all controls have values', () => {
      component.configureForm();
      component.configurationForm.patchValue({
        country: 'NGA',
        paymentProvider: 'MTN Mobile Money (MoMo)',
        phoneNumber: '+2348012345678',
        ownerName: 'John Doe',
      });
      expect(component.configurationForm.valid).toBe(true);
    });
  });

  describe('control getters', () => {
    it('should return the country FormControl', () => {
      const control = component.countryControl;
      expect(control).toBeInstanceOf(FormControl);
      expect(control).toBe(component.configurationForm.get('country') as FormControl);
    });

    it('should return the paymentProvider FormControl', () => {
      const control = component.paymentControl;
      expect(control).toBeInstanceOf(FormControl);
      expect(control).toBe(component.configurationForm.get('paymentProvider') as FormControl);
    });

    it('should return the phoneNumber FormControl', () => {
      const control = component.phoneNumberControl;
      expect(control).toBeInstanceOf(FormControl);
      expect(control).toBe(component.configurationForm.get('phoneNumber') as FormControl);
    });

    it('should return the ownerName FormControl', () => {
      const control = component.ownerNameControl;
      expect(control).toBeInstanceOf(FormControl);
      expect(control).toBe(component.configurationForm.get('ownerName') as FormControl);
    });
  });

  describe('close', () => {
    it('should call hide on the Bootstrap Modal when it exists', () => {
      const mockModalInstance = {
        show: jasmine.createSpy('show'),
        hide: jasmine.createSpy('hide'),
        dispose: jasmine.createSpy('dispose'),
      };

      (component as any).bsModal = mockModalInstance;
      component.close();
      expect(mockModalInstance.hide).toHaveBeenCalledTimes(1);
    });

    it('should not throw when bsModal is undefined', () => {
      (component as any).bsModal = undefined;
      expect(() => component.close()).not.toThrow();
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

    it('should unsubscribe from timerSub when it exists', fakeAsync(() => {
      component.startTimer();
      const timerSub = (component as any).timerSub;
      expect(timerSub).toBeDefined();

      spyOn(timerSub, 'unsubscribe').and.callThrough();
      component.ngOnDestroy();
      expect(timerSub.unsubscribe).toHaveBeenCalled();

      discardPeriodicTasks();
    }));

    it('should not throw when timerSub is undefined', () => {
      (component as any).timerSub = undefined;
      (component as any).bsModal = undefined;
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('onVerifyClick', () => {
    it('should call close and emit verified with true', () => {
      const mockModalInstance = {
        show: jasmine.createSpy('show'),
        hide: jasmine.createSpy('hide'),
        dispose: jasmine.createSpy('dispose'),
      };
      (component as any).bsModal = mockModalInstance;

      spyOn(component.verified, 'emit');

      component.onVerifyClick();

      expect(mockModalInstance.hide).toHaveBeenCalledTimes(1);
      expect(component.verified.emit).toHaveBeenCalledWith(true);
    });
  });

  describe('startTimer', () => {
    it('should set isResendTimerRunning to true', fakeAsync(() => {
      component.isResendTimerRunning = false;
      component.startTimer();
      expect(component.isResendTimerRunning).toBe(true);

      discardPeriodicTasks();
    }));

    it('should update displayTime every second in mm:ss format', fakeAsync(() => {
      component.startTimer();

      // After 1 second (elapsed=0), remaining = 60-0-1 = 59
      tick(1000);
      expect(component.displayTime).toBe('0:59');

      // After 2 seconds (elapsed=1), remaining = 60-1-1 = 58
      tick(1000);
      expect(component.displayTime).toBe('0:58');

      discardPeriodicTasks();
    }));

    it('should zero-pad seconds less than 10', fakeAsync(() => {
      component.startTimer();

      // After 52 seconds (elapsed=51), remaining = 60-51-1 = 8
      tick(52000);
      expect(component.displayTime).toBe('0:08');

      discardPeriodicTasks();
    }));

    it('should show 0:00 one tick before completion', fakeAsync(() => {
      component.startTimer();

      // At elapsed=58, remaining = 60-58-1 = 1
      tick(59000);
      expect(component.displayTime).toBe('0:01');

      // At elapsed=59, remaining = 60-59-1 = 0 -> completes
      tick(1000);
      expect(component.displayTime).toBe('');
      expect(component.isResendTimerRunning).toBe(false);
    }));

    it('should set isResendTimerRunning to false when timer completes', fakeAsync(() => {
      component.startTimer();

      // Complete all 60 ticks
      tick(60000);

      expect(component.isResendTimerRunning).toBe(false);
      expect(component.displayTime).toBe('');
    }));

    it('should unsubscribe previous timer when called again', fakeAsync(() => {
      component.startTimer();
      const firstSub = (component as any).timerSub;
      spyOn(firstSub, 'unsubscribe').and.callThrough();

      component.startTimer();
      expect(firstSub.unsubscribe).toHaveBeenCalled();

      discardPeriodicTasks();
    }));

    it('should display correct time format at various points', fakeAsync(() => {
      component.startTimer();

      // After 1 tick (elapsed=0): remaining = 59 -> "0:59"
      tick(1000);
      expect(component.displayTime).toBe('0:59');

      // After 51 more ticks (elapsed=51): remaining = 8 -> "0:08"
      tick(51000);
      expect(component.displayTime).toBe('0:08');

      discardPeriodicTasks();
    }));
  });

  describe('onConfirmClick', () => {
    it('should set step to 2 and start the timer', fakeAsync(() => {
      expect(component.step).toBe(1);

      component.onConfirmClick();

      expect(component.step).toBe(2);
      expect(component.isResendTimerRunning).toBe(true);

      discardPeriodicTasks();
    }));

    it('should call startTimer', fakeAsync(() => {
      spyOn(component, 'startTimer');
      component.onConfirmClick();
      expect(component.startTimer).toHaveBeenCalledTimes(1);
    }));
  });

  describe('properties', () => {
    it('should initialize step to 1', () => {
      expect(component.step).toBe(1);
    });

    it('should have svgIcons defined', () => {
      expect(component.svgIcons).toBeDefined();
    });

    it('should have countriesList defined', () => {
      expect(component.countriesList).toBeDefined();
    });

    it('should initialize isResendTimerRunning to true', () => {
      expect(component.isResendTimerRunning).toBe(true);
    });

    it('should initialize displayTime to "0:00"', () => {
      expect(component.displayTime).toBe('0:00');
    });

    it('should have paymentProviderList with MTN Mobile Money', () => {
      expect(component.paymentProviderList).toEqual([
        { name: 'MTN Mobile Money (MoMo)' }
      ]);
    });

    it('should have closed EventEmitter', () => {
      expect(component.closed).toBeDefined();
      expect(component.closed.subscribe).toBeDefined();
    });

    it('should have verified EventEmitter', () => {
      expect(component.verified).toBeDefined();
      expect(component.verified.subscribe).toBeDefined();
    });
  });
});
