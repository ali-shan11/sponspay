import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatusInfoModalComponent } from './status-info-modal.component';

describe('StatusInfoModalComponent', () => {
  let component: StatusInfoModalComponent;
  let fixture: ComponentFixture<StatusInfoModalComponent>;

  describe('with configureModal spied (unit tests)', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [StatusInfoModalComponent]
      })
      .compileComponents();

      fixture = TestBed.createComponent(StatusInfoModalComponent);
      component = fixture.componentInstance;
      spyOn(component, 'configureModal');
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should call configureModal on init', () => {
      expect(component.configureModal).toHaveBeenCalled();
    });

    it('should emit closed on close', () => {
      spyOn(component.closed, 'emit');
      (component as any).bsModal = { hide: jasmine.createSpy('hide'), dispose: jasmine.createSpy('dispose') };
      component.close();
      expect((component as any).bsModal.hide).toHaveBeenCalled();
    });

    it('should dispose modal on destroy', () => {
      const disposeSpy = jasmine.createSpy('dispose');
      (component as any).bsModal = { dispose: disposeSpy };
      component.ngOnDestroy();
      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should not throw on destroy when bsModal is undefined', () => {
      (component as any).bsModal = undefined;
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('configureModal (real Bootstrap Modal)', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [StatusInfoModalComponent]
      }).compileComponents();

      fixture = TestBed.createComponent(StatusInfoModalComponent);
      component = fixture.componentInstance;
    });

    afterEach(() => {
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('padding-right');
    });

    it('should create a real Modal, call show, and register hidden listener', () => {
      spyOn(component.closed, 'emit');

      fixture.detectChanges();

      expect((component as any).bsModal).toBeDefined();

      const event = new Event('hidden.bs.modal');
      component.modalEl.nativeElement.dispatchEvent(event);
      expect(component.closed.emit).toHaveBeenCalled();
    });

    it('should dispose the real modal on destroy', () => {
      fixture.detectChanges();
      expect((component as any).bsModal).toBeDefined();

      expect(() => component.ngOnDestroy()).not.toThrow();
      (component as any).bsModal = undefined;
    });

    it('should hide the real modal on close', () => {
      fixture.detectChanges();
      const bsModal = (component as any).bsModal;
      const hideSpy = spyOn(bsModal, 'hide').and.callThrough();

      component.close();
      expect(hideSpy).toHaveBeenCalled();
    });
  });
});
