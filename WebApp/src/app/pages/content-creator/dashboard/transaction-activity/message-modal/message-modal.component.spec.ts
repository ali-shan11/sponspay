import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { MessageModalComponent } from './message-modal.component';
import { LatestTransaction } from '@app-types/transaction-activity';
import { TRANSACTION_REVENUE_STATUS } from '@utils/enums';

describe('MessageModalComponent', () => {
  let component: MessageModalComponent;
  let fixture: ComponentFixture<MessageModalComponent>;

  const mockMessage: LatestTransaction = {
    messageId: 'msg-001',
    messageContent: 'Hello from Nigeria',
    createdAt: '2026-01-15T10:30:00Z',
    country: 'Nigeria',
    countryCode: 'NGA',
    flag: 'svg-country-flags/svg/ng.svg',
    localAmount: 500,
    localCurrencyCode: 'NGN',
    referralSource: 'youtube',
    referralMedium: 'video',
    revenueStatus: TRANSACTION_REVENUE_STATUS.Earned,
    multiplier: 1,
    replyDeadline: '2026-02-15',
    senderName: 'John Doe',
    telegramMessageLink: 'https://t.me/test_channel/msg-001',
  };

  describe('with configureModal spied (unit tests)', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [MessageModalComponent, HttpClientTestingModule]
      }).compileComponents();

      fixture = TestBed.createComponent(MessageModalComponent);
      component = fixture.componentInstance;
      component.message = mockMessage;
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

    describe('sendReply', () => {
      beforeEach(() => {
        (component as any).dashboardService = { selectedChannelObservable: new BehaviorSubject('channel-123') };
      });

      it('should not send when replyText is empty', () => {
        component.replyText = '';
        component.sendReply();
        expect(component.replyState).toBe('idle');
      });

      it('should not send when replyText is only whitespace', () => {
        component.replyText = '   ';
        component.sendReply();
        expect(component.replyState).toBe('idle');
      });

      it('should not send when already sending', () => {
        component.replyText = 'Hello';
        component.replyState = 'sending';
        component.sendReply();
        // State stays sending, no duplicate call
        expect(component.replyState).toBe('sending');
      });

      it('should set state to sending and call service on valid input', () => {
        const replyToSpy = spyOn((component as any).transactionService, 'replyToMessage').and.returnValue(of({ success: true, revenueStatus: 'earned' }));
        component.replyText = 'Thank you!';
        component.message = { ...mockMessage, revenueStatus: TRANSACTION_REVENUE_STATUS.AwaitingReply };

        component.sendReply();

        expect(replyToSpy).toHaveBeenCalledWith('msg-001', 'Thank you!', 'channel-123');
        expect(component.replyState).toBe('sent');
        expect(component.message.revenueStatus).toBe(TRANSACTION_REVENUE_STATUS.Earned);
      });

      it('should set state to error on service failure with message', () => {
        spyOn((component as any).transactionService, 'replyToMessage').and.returnValue(
          throwError(() => ({ error: { message: 'Channel not found' } }))
        );
        component.replyText = 'Hello';

        component.sendReply();

        expect(component.replyState).toBe('error');
        expect(component.replyError).toBe('Channel not found');
      });

      it('should set default error message when error has no message', () => {
        spyOn((component as any).transactionService, 'replyToMessage').and.returnValue(
          throwError(() => ({}))
        );
        component.replyText = 'Hello';

        component.sendReply();

        expect(component.replyState).toBe('error');
        expect(component.replyError).toBe('Failed to send reply. Please try again.');
      });

      it('should clear previous replyError when retrying', () => {
        const replyToSpy = spyOn((component as any).transactionService, 'replyToMessage').and.returnValue(of({ success: true, revenueStatus: 'earned' }));
        component.replyText = 'Hello';
        component.replyState = 'error';
        component.replyError = 'Previous error';

        component.sendReply();

        expect(component.replyError).toBe('');
        expect(replyToSpy).toHaveBeenCalled();
      });
    });

    describe('closed output', () => {
      it('should have a closed EventEmitter', () => {
        expect(component.closed).toBeDefined();
        expect(component.closed.subscribe).toBeDefined();
      });
    });

    describe('properties', () => {
      it('should have TRANSACTION_REVENUE_STATUS defined', () => {
        expect(component.TRANSACTION_REVENUE_STATUS).toBeDefined();
      });

      it('should have modalEl ViewChild', () => {
        expect(component.modalEl).toBeDefined();
      });

      it('should accept message input', () => {
        expect(component.message).toEqual(mockMessage);
      });
    });
  });

  describe('configureModal (real Bootstrap Modal)', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [MessageModalComponent, HttpClientTestingModule]
      }).compileComponents();

      fixture = TestBed.createComponent(MessageModalComponent);
      component = fixture.componentInstance;
      component.message = mockMessage;
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
      expect(component.closed.emit).toHaveBeenCalledWith(false);
    });

    it('should emit true on hidden.bs.modal when replyState is sent', () => {
      spyOn(component.closed, 'emit');

      fixture.detectChanges();

      component.replyState = 'sent';
      const event = new Event('hidden.bs.modal');
      component.modalEl.nativeElement.dispatchEvent(event);
      expect(component.closed.emit).toHaveBeenCalledWith(true);
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
