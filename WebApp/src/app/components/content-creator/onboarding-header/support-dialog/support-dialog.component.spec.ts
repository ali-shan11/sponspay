import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupportDialogComponent } from './support-dialog.component';
import { Modal } from 'bootstrap';

describe('SupportDialogComponent', () => {
  let component: SupportDialogComponent;
  let fixture: ComponentFixture<SupportDialogComponent>;

  beforeEach(async () => {
    // Mock Bootstrap Modal prototype methods to prevent real DOM side effects
    spyOn(Modal.prototype, 'show').and.stub();
    spyOn(Modal.prototype, 'hide').and.stub();
    spyOn(Modal.prototype, 'dispose').and.stub();

    await TestBed.configureTestingModule({
      imports: [SupportDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SupportDialogComponent);
    component = fixture.componentInstance;
    // Let configureModal run for real — Modal methods are stubbed
    fixture.detectChanges();
  });

  afterEach(() => {
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set up bsModal on init', () => {
    expect((component as any).bsModal).toBeDefined();
    expect(Modal.prototype.show).toHaveBeenCalled();
  });

  it('should have a closed EventEmitter', () => {
    expect(component.closed).toBeDefined();
  });

  it('should emit closed when hidden.bs.modal fires', () => {
    spyOn(component.closed, 'emit');
    component.modalEl.nativeElement.dispatchEvent(new Event('hidden.bs.modal'));
    expect(component.closed.emit).toHaveBeenCalled();
  });

  describe('close', () => {
    it('should call hide() on bsModal', () => {
      component.close();
      expect(Modal.prototype.hide).toHaveBeenCalled();
    });

    it('should not throw when bsModal is undefined', () => {
      (component as any).bsModal = undefined;
      expect(() => component.close()).not.toThrow();
    });
  });

  describe('ngOnDestroy', () => {
    it('should call dispose() on bsModal', () => {
      component.ngOnDestroy();
      expect(Modal.prototype.dispose).toHaveBeenCalled();
    });

    it('should not throw when bsModal is undefined', () => {
      (component as any).bsModal = undefined;
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });
});
