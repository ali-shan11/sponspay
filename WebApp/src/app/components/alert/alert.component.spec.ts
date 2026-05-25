import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AlertService } from '@services/alert.service';
import { AlertMessage } from '@app-types/alerts';

import { AlertComponent } from './alert.component';

describe('AlertComponent', () => {
  let component: AlertComponent;
  let fixture: ComponentFixture<AlertComponent>;
  let mockAlertService: any;
  let alertSubject: BehaviorSubject<AlertMessage[]>;

  beforeEach(async () => {
    alertSubject = new BehaviorSubject<AlertMessage[]>([]);
    mockAlertService = {
      alert$: alertSubject.asObservable(),
      removeById: jasmine.createSpy('removeById'),
    };

    await TestBed.configureTestingModule({
      imports: [AlertComponent, NoopAnimationsModule],
      providers: [
        { provide: AlertService, useValue: mockAlertService },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AlertComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty alertMessages', () => {
    expect(component.alertMessages).toEqual([]);
  });

  it('should have alertIcons defined', () => {
    expect(component.alertIcons).toBeDefined();
  });

  describe('ngOnInit', () => {
    it('should subscribe to alert$ and update alertMessages', () => {
      const messages: AlertMessage[] = [
        { id: '1', title: 'Success', message: 'Test message', type: 'success' },
      ];
      alertSubject.next(messages);
      expect(component.alertMessages).toEqual(messages);
    });

    it('should set timeout for new alerts', fakeAsync(() => {
      const messages: AlertMessage[] = [
        { id: '1', title: 'Success', message: 'Test message', type: 'success' },
      ];
      alertSubject.next(messages);

      // After alertTimeOut (7000ms), removeAlert should be triggered
      tick(7000);
      // removeAlert calls setTimeout(200ms) then alertService.removeById
      tick(200);
      expect(mockAlertService.removeById).toHaveBeenCalledWith('1');
    }));

    it('should not set duplicate timeout for the same alert id', fakeAsync(() => {
      const messages: AlertMessage[] = [
        { id: '1', title: 'Success', message: 'Test message', type: 'success' },
      ];
      alertSubject.next(messages);
      // Emit same messages again
      alertSubject.next(messages);

      tick(7000);
      tick(200);
      // Should only be called once despite two emissions
      expect(mockAlertService.removeById).toHaveBeenCalledTimes(1);
    }));
  });

  describe('removeAlert', () => {
    it('should clear timeout and call alertService.removeById after delay', fakeAsync(() => {
      const messages: AlertMessage[] = [
        { id: '1', title: 'Success', message: 'Test message', type: 'success' },
      ];
      alertSubject.next(messages);

      component.removeAlert('1');
      tick(200);
      expect(mockAlertService.removeById).toHaveBeenCalledWith('1');
    }));

    it('should handle removal of alert without existing timeout', fakeAsync(() => {
      component.removeAlert('nonexistent');
      tick(200);
      expect(mockAlertService.removeById).toHaveBeenCalledWith('nonexistent');
    }));
  });

  describe('ngOnDestroy', () => {
    it('should clear all timeouts', fakeAsync(() => {
      const messages: AlertMessage[] = [
        { id: '1', title: 'Alert 1', message: 'Msg 1', type: 'success' },
        { id: '2', title: 'Alert 2', message: 'Msg 2', type: 'error' },
      ];
      alertSubject.next(messages);

      component.ngOnDestroy();

      // Timeouts should be cleared, so no removeById calls after timeout
      tick(7000);
      tick(200);
      expect(mockAlertService.removeById).not.toHaveBeenCalled();
    }));
  });
});
