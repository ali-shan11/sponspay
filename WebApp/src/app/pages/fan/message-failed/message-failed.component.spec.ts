import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { createMockFirebaseAuth } from '../../../../testing/mocks/firebase-auth.mock';
import { createMockHttpClient } from '../../../../testing/mocks/http.mock';
import { TokenService } from '@services/token.service';

import { MessageFailedComponent } from './message-failed.component';

describe('MessageFailedComponent', () => {
  let component: MessageFailedComponent;
  let fixture: ComponentFixture<MessageFailedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageFailedComponent],
      providers: [
        { provide: Auth, useValue: createMockFirebaseAuth() },
        { provide: HttpClient, useValue: createMockHttpClient() },
        { provide: TokenService, useValue: jasmine.createSpyObj('TokenService', ['getToken', 'getCurrentUserObj'], { authReady: Promise.resolve() }) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], { events: of(), url: '/' }) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() }, params: of({}), queryParams: of({}) } },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MessageFailedComponent);
    component = fixture.componentInstance;
    // Don't call fixture.detectChanges() here - ngAfterViewInit calls open()
    // which uses window.bootstrap.Modal, not available in test environment
  });

  it('should create', () => {
    spyOn(component, 'open');
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('ngAfterViewInit', () => {
    it('should call open()', () => {
      const openSpy = spyOn(component, 'open');
      component.ngAfterViewInit();
      expect(openSpy).toHaveBeenCalled();
    });
  });

  describe('open', () => {
    it('should create a bootstrap Modal and call show() when modal element exists', () => {
      const showSpy = jasmine.createSpy('show');
      const fakeModalElement = document.createElement('div');
      (component as any).modal = { nativeElement: fakeModalElement };

      (window as any).bootstrap = {
        Modal: jasmine.createSpy('Modal').and.returnValue({ show: showSpy }),
      };

      component.open();

      expect((window as any).bootstrap.Modal).toHaveBeenCalledWith(fakeModalElement, {
        backdrop: 'static',
        keyboard: false,
      });
      expect(showSpy).toHaveBeenCalled();
    });

    it('should not throw when modal element is undefined', () => {
      (component as any).modal = undefined;
      expect(() => component.open()).not.toThrow();
    });
  });

  describe('close', () => {
    it('should call hide() on existing modal instance and emit modelClose', () => {
      const hideSpy = jasmine.createSpy('hide');
      const fakeModalElement = document.createElement('div');
      (component as any).modal = { nativeElement: fakeModalElement };

      (window as any).bootstrap = {
        Modal: {
          getInstance: jasmine.createSpy('getInstance').and.returnValue({ hide: hideSpy }),
        },
      };

      spyOn(component.modelClose, 'emit');

      component.close();

      expect((window as any).bootstrap.Modal.getInstance).toHaveBeenCalledWith(fakeModalElement);
      expect(hideSpy).toHaveBeenCalled();
      expect(component.modelClose.emit).toHaveBeenCalledWith(true);
    });

    it('should not throw when modal element is undefined', () => {
      (component as any).modal = undefined;
      expect(() => component.close()).not.toThrow();
    });

    it('should not throw when getInstance returns null', () => {
      const fakeModalElement = document.createElement('div');
      (component as any).modal = { nativeElement: fakeModalElement };

      (window as any).bootstrap = {
        Modal: {
          getInstance: jasmine.createSpy('getInstance').and.returnValue(null),
        },
      };

      spyOn(component.modelClose, 'emit');

      expect(() => component.close()).not.toThrow();
      expect(component.modelClose.emit).toHaveBeenCalledWith(true);
    });
  });

  describe('onConfirm', () => {
    it('should call close()', () => {
      const closeSpy = spyOn(component, 'close');
      component.onConfirm();
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('modalType input', () => {
    it('should default to failed', () => {
      expect(component.modalType).toBe('failed');
    });

    it('should accept refunded value', () => {
      component.modalType = 'refunded';
      expect(component.modalType).toBe('refunded');
    });

    it('should accept timed_out value', () => {
      component.modalType = 'timed_out';
      expect(component.modalType).toBe('timed_out');
    });
  });

  describe('properties', () => {
    it('should have socialIcons defined', () => {
      expect(component.socialIcons).toBeDefined();
    });

    it('should have svgIcons defined', () => {
      expect(component.svgIcons).toBeDefined();
    });

    it('should have modelClose as EventEmitter', () => {
      expect(component.modelClose).toBeDefined();
    });
  });
});
