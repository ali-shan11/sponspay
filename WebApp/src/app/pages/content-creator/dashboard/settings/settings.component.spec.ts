import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { createMockFirebaseAuth } from '../../../../../testing/mocks/firebase-auth.mock';
import { createMockHttpClient } from '../../../../../testing/mocks/http.mock';
import { TokenService } from '@services/token.service';
import { SvgMenuIcon } from '@utils/svg-icons';

import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let routerEventsSubject: Subject<unknown>;
  let mockActivatedRoute: { firstChild: { snapshot: { routeConfig: { path: string } } } | null; snapshot: { paramMap: Map<string, string> } };

  beforeEach(async () => {
    routerEventsSubject = new Subject<unknown>();

    mockActivatedRoute = {
      firstChild: {
        snapshot: {
          routeConfig: {
            path: 'account'
          }
        }
      },
      snapshot: { paramMap: new Map() },
    };

    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        { provide: Auth, useValue: createMockFirebaseAuth() },
        { provide: HttpClient, useValue: createMockHttpClient() },
        { provide: TokenService, useValue: jasmine.createSpyObj('TokenService', ['getToken', 'getCurrentUserObj'], { authReady: Promise.resolve() }) },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate'), navigateByUrl: jasmine.createSpy('navigateByUrl'), events: routerEventsSubject.asObservable(), url: '/' } },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('constructor / NavigationEnd subscription', () => {
    it('should set activeChild when NavigationEnd fires and a matching child path exists', () => {
      mockActivatedRoute.firstChild = {
        snapshot: { routeConfig: { path: 'social' } }
      };

      routerEventsSubject.next(new NavigationEnd(1, '/settings/social', '/settings/social'));

      expect(component.activeChild).toEqual({ label: 'Social Links', link: 'social', icon: SvgMenuIcon.social });
    });

    it('should set activeChild to account settings when path is account', () => {
      mockActivatedRoute.firstChild = {
        snapshot: { routeConfig: { path: 'account' } }
      };

      routerEventsSubject.next(new NavigationEnd(2, '/settings/account', '/settings/account'));

      expect(component.activeChild).toEqual({ label: 'Account Settings', link: 'account', icon: SvgMenuIcon.account });
    });

    it('should set activeChild to notification when path is notification', () => {
      mockActivatedRoute.firstChild = {
        snapshot: { routeConfig: { path: 'notification' } }
      };

      routerEventsSubject.next(new NavigationEnd(3, '/settings/notification', '/settings/notification'));

      expect(component.activeChild).toEqual({ label: 'Notification', link: 'notification', icon: SvgMenuIcon.notification });
    });

    it('should set activeChild to localization when path is localization', () => {
      mockActivatedRoute.firstChild = {
        snapshot: { routeConfig: { path: 'localization' } }
      };

      routerEventsSubject.next(new NavigationEnd(4, '/settings/localization', '/settings/localization'));

      expect(component.activeChild).toEqual({ label: 'Localization', link: 'localization', icon: SvgMenuIcon.localization });
    });

    it('should set activeChild to null when childPath does not match any tab menu link', () => {
      mockActivatedRoute.firstChild = {
        snapshot: { routeConfig: { path: 'nonexistent' } }
      };

      routerEventsSubject.next(new NavigationEnd(5, '/settings/nonexistent', '/settings/nonexistent'));

      expect(component.activeChild).toBeNull();
    });

    it('should not change activeChild when firstChild is null', () => {
      const previousChild = component.activeChild;
      mockActivatedRoute.firstChild = null;

      routerEventsSubject.next(new NavigationEnd(6, '/settings', '/settings'));

      // activeChild should remain unchanged since childPath is falsy
      expect(component.activeChild).toEqual(previousChild);
    });

    it('should ignore non-NavigationEnd events', () => {
      const previousChild = component.activeChild;

      // Emit a generic event that is not NavigationEnd
      routerEventsSubject.next({ id: 1, url: '/settings/social' });

      expect(component.activeChild).toEqual(previousChild);
    });

    it('should handle multiple NavigationEnd events in sequence', () => {
      mockActivatedRoute.firstChild = {
        snapshot: { routeConfig: { path: 'social' } }
      };
      routerEventsSubject.next(new NavigationEnd(1, '/settings/social', '/settings/social'));
      expect(component.activeChild).toEqual({ label: 'Social Links', link: 'social', icon: SvgMenuIcon.social });

      mockActivatedRoute.firstChild = {
        snapshot: { routeConfig: { path: 'localization' } }
      };
      routerEventsSubject.next(new NavigationEnd(2, '/settings/localization', '/settings/localization'));
      expect(component.activeChild).toEqual({ label: 'Localization', link: 'localization', icon: SvgMenuIcon.localization });
    });
  });

  describe('toggleDropdown', () => {
    it('should open the dropdown when it is closed', () => {
      component.isDropdownOpen = false;

      component.toggleDropdown();

      expect(component.isDropdownOpen).toBeTrue();
    });

    it('should close the dropdown when it is open', () => {
      component.isDropdownOpen = true;

      component.toggleDropdown();

      expect(component.isDropdownOpen).toBeFalse();
    });

    it('should toggle multiple times correctly', () => {
      expect(component.isDropdownOpen).toBeFalse();

      component.toggleDropdown();
      expect(component.isDropdownOpen).toBeTrue();

      component.toggleDropdown();
      expect(component.isDropdownOpen).toBeFalse();

      component.toggleDropdown();
      expect(component.isDropdownOpen).toBeTrue();
    });
  });

  describe('initial state', () => {
    it('should have isDropdownOpen set to false initially', () => {
      expect(component.isDropdownOpen).toBeFalse();
    });

    it('should have activeChild default to Account Settings', () => {
      expect(component.activeChild).toEqual({ label: 'Account Settings', link: 'account', icon: SvgMenuIcon.account });
    });

    it('should have tabMenu with 2 groups', () => {
      expect(component.tabMenu.length).toBe(2);
    });

    it('should have PERSONAL SETTINGS group with 3 children', () => {
      const personalSettings = component.tabMenu[0];
      expect(personalSettings.label).toBe('PERSONAL SETTINGS');
      expect(personalSettings.children?.length).toBe(3);
    });

    it('should have OTHER SETTINGS group with 1 child', () => {
      const otherSettings = component.tabMenu[1];
      expect(otherSettings.label).toBe('OTHER SETTINGS');
      expect(otherSettings.children?.length).toBe(1);
    });

    it('should have menuIcons set to SvgMenuIcon', () => {
      expect(component.menuIcons).toBe(SvgMenuIcon);
    });
  });
});
