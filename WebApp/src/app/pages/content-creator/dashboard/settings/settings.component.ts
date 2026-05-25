import { Component, inject } from '@angular/core';
import { SvgIcons, SvgMenuIcon } from '@utils/svg-icons';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { MenuItem } from '@utils/menu';
import { InlineSvgComponent } from '@components/inline-svg/inline-svg.component';

@Component({
  selector: 'app-settings',
  imports: [RouterModule, InlineSvgComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  public menuIcons = SvgMenuIcon;
  public svgIcon = SvgIcons;
  public activeChild: MenuItem | null = { label: 'Account Settings', link: 'account', icon: SvgMenuIcon.account };
  public isDropdownOpen = false;
  public tabMenu: MenuItem[] = [
    {
      label: 'PERSONAL SETTINGS',
      icon: SvgMenuIcon.dashboard,
      children: [
          { label: 'Account Settings', link: 'account', icon: SvgMenuIcon.account },
          { label: 'Social Links', link: 'social', icon: SvgMenuIcon.social },
          { label: 'Notification', link: 'notification', icon: SvgMenuIcon.notification },
      ],
    },
    {
      label: 'OTHER SETTINGS',
      icon: SvgMenuIcon.dashboard,
      children: [
          { label: 'Localization', link: 'localization', icon: SvgMenuIcon.localization },
      ],
    },
  ];

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      const childPath = this.route.firstChild?.snapshot?.routeConfig?.path;

      if (childPath) {
        // find the child object by its link
        const linkArrayList = this.tabMenu.flatMap(group => group.children || []);
        this.activeChild = linkArrayList.find(child => child.link === childPath) || null;
        console.log(this.activeChild, 'active child');
      }
    });
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

}
