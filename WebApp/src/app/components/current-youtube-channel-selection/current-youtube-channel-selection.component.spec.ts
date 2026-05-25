import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { DashboardService } from '@services/dashboard.service';
import { CreatorYoutubeChannel } from '@app-types/dashboard';

import { CurrentYoutubeChannelSelectionComponent } from './current-youtube-channel-selection.component';

describe('CurrentYoutubeChannelSelectionComponent', () => {
  let component: CurrentYoutubeChannelSelectionComponent;
  let fixture: ComponentFixture<CurrentYoutubeChannelSelectionComponent>;
  let mockDashboardService: jasmine.SpyObj<DashboardService> & {
    selectedChannelObservable: BehaviorSubject<string>;
    channelList$: BehaviorSubject<CreatorYoutubeChannel[]>;
  };

  const mockChannels: CreatorYoutubeChannel[] = [
    {
      id: 'ch-1',
      youtubeChannelId: 'UC111',
      channelName: 'Channel One',
      telegramHandle: '@channelone',
      role: 'owner',
      createdAt: '2025-01-01T00:00:00Z'
    },
    {
      id: 'ch-2',
      youtubeChannelId: 'UC222',
      channelName: 'Channel Two',
      telegramHandle: '@channeltwo',
      role: 'owner',
      createdAt: '2025-02-01T00:00:00Z'
    }
  ];

  beforeEach(async () => {
    const selectedChannelSubject = new BehaviorSubject<string>('');
    const channelListSubject = new BehaviorSubject<CreatorYoutubeChannel[]>(mockChannels);
    mockDashboardService = {
      ...jasmine.createSpyObj('DashboardService', ['loadChannels']),
      selectedChannelObservable: selectedChannelSubject,
      channelList$: channelListSubject,
    } as any;

    await TestBed.configureTestingModule({
      imports: [CurrentYoutubeChannelSelectionComponent],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CurrentYoutubeChannelSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have isChannelDropdownOpen initially false', () => {
    expect(component.isChannelDropdownOpen).toBe(false);
  });

  it('should call loadChannels on init', () => {
    expect(mockDashboardService.loadChannels).toHaveBeenCalled();
  });

  it('should read channel list from service', () => {
    expect(component.channelList.length).toBe(2);
    expect(component.channelList[0].channelName).toBe('Channel One');
  });

  describe('toggleChannelDropdown', () => {
    it('should toggle dropdown open', () => {
      const event = new MouseEvent('click');
      spyOn(event, 'stopPropagation');

      component.toggleChannelDropdown(event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.isChannelDropdownOpen).toBe(true);
    });

    it('should toggle dropdown closed', () => {
      component.isChannelDropdownOpen = true;
      const event = new MouseEvent('click');
      spyOn(event, 'stopPropagation');

      component.toggleChannelDropdown(event);

      expect(component.isChannelDropdownOpen).toBe(false);
    });
  });

  describe('onChannelOptionClick', () => {
    it('should toggle dropdown and update selected channel', () => {
      component.isChannelDropdownOpen = true;

      component.onChannelOptionClick('ch-2');

      expect(component.isChannelDropdownOpen).toBe(false);
      expect(mockDashboardService.selectedChannelObservable.value).toBe('ch-2');
    });
  });

  describe('selectedChannelOption', () => {
    it('should return the currently selected channel', () => {
      mockDashboardService.selectedChannelObservable.next('ch-1');
      const selected = component.selectedChannelOption;
      expect(selected).toBeTruthy();
      expect(selected!.id).toBe('ch-1');
      expect(selected!.channelName).toBe('Channel One');
    });

    it('should return undefined when no channel matches', () => {
      mockDashboardService.selectedChannelObservable.next('non-existent');
      const selected = component.selectedChannelOption;
      expect(selected).toBeUndefined();
    });
  });

  describe('onClickOutside', () => {
    it('should close dropdown on outside click when event has target', () => {
      component.isChannelDropdownOpen = true;
      const event = { target: document.body } as unknown as MouseEvent;

      component.onClickOutside(event);

      expect(component.isChannelDropdownOpen).toBe(false);
    });

    it('should not close dropdown when event target is null', () => {
      component.isChannelDropdownOpen = true;
      const event = { target: null } as unknown as MouseEvent;

      component.onClickOutside(event);

      expect(component.isChannelDropdownOpen).toBe(true);
    });
  });

  describe('channelList with empty list', () => {
    it('should return empty array when service has no channels', () => {
      mockDashboardService.channelList$.next([]);
      expect(component.channelList.length).toBe(0);
    });
  });
});
