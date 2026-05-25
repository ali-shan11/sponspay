import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { IntegrationDialogComponent } from './integration-dialog.component';

describe('IntegrationDialogComponent', () => {
  let component: IntegrationDialogComponent;
  let fixture: ComponentFixture<IntegrationDialogComponent>;

  describe('with configureModal spied (unit tests)', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [IntegrationDialogComponent, HttpClientTestingModule]
      })
      .compileComponents();

      fixture = TestBed.createComponent(IntegrationDialogComponent);
      component = fixture.componentInstance;
      // Spy on configureModal before detectChanges to prevent real Modal instantiation
      spyOn(component, 'configureModal');
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    describe('ngOnInit', () => {
      it('should call configureModal()', () => {
        expect(component.configureModal).toHaveBeenCalled();
      });
    });

    describe('ngOnDestroy', () => {
      it('should call dispose() on bsModal if it exists', () => {
        const disposeSpy = jasmine.createSpy('dispose');
        (component as any).bsModal = { dispose: disposeSpy };

        component.ngOnDestroy();

        expect(disposeSpy).toHaveBeenCalled();
      });

      it('should not throw when bsModal is undefined', () => {
        (component as any).bsModal = undefined;
        expect(() => component.ngOnDestroy()).not.toThrow();
      });
    });

    describe('close', () => {
      it('should call hide() on bsModal if it exists', () => {
        const hideSpy = jasmine.createSpy('hide');
        (component as any).bsModal = { hide: hideSpy, dispose: jasmine.createSpy('dispose') };

        component.close();

        expect(hideSpy).toHaveBeenCalled();
      });

      it('should not throw when bsModal is undefined', () => {
        (component as any).bsModal = undefined;
        expect(() => component.close()).not.toThrow();
      });
    });

    describe('closed output', () => {
      it('should have a closed EventEmitter', () => {
        expect(component.closed).toBeDefined();
        expect(component.closed.subscribe).toBeDefined();
      });
    });

    describe('properties', () => {
      it('should have svgIcons defined', () => {
        expect(component.svgIcons).toBeDefined();
      });

      it('should have modalEl ViewChild', () => {
        expect(component.modalEl).toBeDefined();
      });
    });
  });

  describe('configureModal (real Bootstrap Modal)', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [IntegrationDialogComponent, HttpClientTestingModule]
      }).compileComponents();

      fixture = TestBed.createComponent(IntegrationDialogComponent);
      component = fixture.componentInstance;
      // Do NOT spy on configureModal here - let it run for real
    });

    afterEach(() => {
      // Clean up any Bootstrap modal backdrop/artifacts left in the DOM
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('padding-right');
    });

    it('should create a real Modal, call show, and register hidden listener', () => {
      spyOn(component.closed, 'emit');

      fixture.detectChanges(); // triggers ngOnInit -> configureModal for real

      // bsModal should be set (a real Bootstrap Modal instance)
      expect((component as any).bsModal).toBeDefined();

      // Dispatch the hidden.bs.modal event to verify the listener was attached
      const event = new Event('hidden.bs.modal');
      component.modalEl.nativeElement.dispatchEvent(event);
      expect(component.closed.emit).toHaveBeenCalled();
    });

    it('should dispose the real modal on destroy', () => {
      fixture.detectChanges(); // triggers ngOnInit -> configureModal
      const bsModal = (component as any).bsModal;
      expect(bsModal).toBeDefined();

      // ngOnDestroy should call dispose without throwing
      expect(() => component.ngOnDestroy()).not.toThrow();
      // Set bsModal to undefined so TestBed cleanup doesn't double-dispose
      (component as any).bsModal = undefined;
    });

    it('should hide the real modal on close', () => {
      fixture.detectChanges(); // triggers ngOnInit -> configureModal
      const bsModal = (component as any).bsModal;
      const hideSpy = spyOn(bsModal, 'hide').and.callThrough();

      component.close();
      expect(hideSpy).toHaveBeenCalled();
    });
  });
});
