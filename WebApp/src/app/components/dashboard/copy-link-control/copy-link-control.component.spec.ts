import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { DashboardService } from '@services/dashboard.service';
import { ChannelStatisticsResponse } from '@app-types/dashboard';

import { CopyLinkControlComponent } from './copy-link-control.component';

describe('CopyLinkControlComponent', () => {
  let component: CopyLinkControlComponent;
  let fixture: ComponentFixture<CopyLinkControlComponent>;
  let mockDashboardService: any;
  let selectedChannelSubject: BehaviorSubject<string | null>;

  const mockChannelStats: ChannelStatisticsResponse = {
    channelHandle: 'testhandle',
    linkClicks: 100,
    transactions: 50,
    transactionTrend: 10,
  };

  beforeEach(async () => {
    selectedChannelSubject = new BehaviorSubject<string | null>(null);

    mockDashboardService = {
      selectedChannelObservable: selectedChannelSubject,
      getChannelStatistics: jasmine.createSpy('getChannelStatistics').and.returnValue(of(mockChannelStats)),
    };

    await TestBed.configureTestingModule({
      imports: [CopyLinkControlComponent, BrowserAnimationsModule],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CopyLinkControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.channelStats).toBeNull();
    expect(component.isLoading).toBe(true);
    expect(component.isTextCopied).toBe(false);
    expect(component.hasInteracted).toBe(false);
  });

  describe('channel subscription', () => {
    it('should call getChannelStatistics when channel ID is emitted', () => {
      selectedChannelSubject.next('channel-123');
      expect(mockDashboardService.getChannelStatistics).toHaveBeenCalled();
    });

    it('should not call getChannelStatistics when channel ID is null', () => {
      mockDashboardService.getChannelStatistics.calls.reset();
      selectedChannelSubject.next(null);
      expect(mockDashboardService.getChannelStatistics).not.toHaveBeenCalled();
    });

    it('should set channelStats and isLoading to false on success', () => {
      selectedChannelSubject.next('channel-123');
      expect(component.channelStats).toEqual(mockChannelStats);
      expect(component.isLoading).toBe(false);
    });

    it('should set isLoading to false on error', () => {
      mockDashboardService.getChannelStatistics.and.returnValue(throwError(() => new Error('Failed')));
      selectedChannelSubject.next('channel-123');
      expect(component.isLoading).toBe(false);
    });
  });

  describe('url getter', () => {
    it('should return the correct URL with channelHandle', () => {
      component.channelStats = mockChannelStats;
      expect(component.url).toContain('/fan/testhandle');
    });

    it('should handle null channelStats', () => {
      component.channelStats = null;
      expect(component.url).toContain('/fan/');
    });
  });

  describe('copyToClipboard', () => {
    it('should copy url to clipboard and set isTextCopied', fakeAsync(() => {
      if (!(navigator.clipboard.writeText as any).and) {
        spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
      } else {
        (navigator.clipboard.writeText as jasmine.Spy).and.returnValue(Promise.resolve());
      }
      component.channelStats = mockChannelStats;
      component.copyToClipboard();
      tick();
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(component.url);
      expect(component.isTextCopied).toBe(true);
      expect(component.hasInteracted).toBe(true);
      tick(2000);
      expect(component.isTextCopied).toBe(false);
    }));
  });

  describe('ngOnDestroy', () => {
    it('should not throw when destroyed', () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });
});
