import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmCancellationComponent } from './confirm-cancellation.component';

describe('ConfirmCancellationComponent', () => {
  let component: ConfirmCancellationComponent;
  let fixture: ComponentFixture<ConfirmCancellationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmCancellationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmCancellationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.keepMeUpdated).toBe(false);
    expect(component.reason).toBe('');
  });

  it('should have a reasonChange EventEmitter', () => {
    expect(component.reasonChange).toBeDefined();
    expect(component.reasonChange.subscribe).toBeDefined();
  });

  describe('handleReasonChange', () => {
    it('should emit reason and keepMeUpdated through reasonChange', () => {
      spyOn(component.reasonChange, 'emit');
      component.reason = 'Too expensive';
      component.keepMeUpdated = true;

      component.handleReasonChange();

      expect(component.reasonChange.emit).toHaveBeenCalledWith({
        reason: 'Too expensive',
        keepMeUpdated: true,
      });
    });

    it('should emit empty reason and false keepMeUpdated when defaults', () => {
      spyOn(component.reasonChange, 'emit');

      component.handleReasonChange();

      expect(component.reasonChange.emit).toHaveBeenCalledWith({
        reason: '',
        keepMeUpdated: false,
      });
    });

    it('should emit the current state of reason and keepMeUpdated', () => {
      spyOn(component.reasonChange, 'emit');
      component.reason = 'No longer needed';
      component.keepMeUpdated = false;

      component.handleReasonChange();

      expect(component.reasonChange.emit).toHaveBeenCalledWith({
        reason: 'No longer needed',
        keepMeUpdated: false,
      });
    });
  });
});
