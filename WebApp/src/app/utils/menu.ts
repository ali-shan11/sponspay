import { SvgMenuIcon } from './svg-icons';

export interface MenuItem {
  label: string;
  icon: string;
  link?: string;
  comingSoon?: boolean;
  children?: MenuItem[];
}

export const MENU_LIST: MenuItem[] = [
  {
    label: 'Home',
    icon: SvgMenuIcon.dashboard,
    children: [
        { label: 'Dashboard', link: '/dashboard', icon: SvgMenuIcon.dashboard },
        { label: 'Compensation', link: '/compensation', icon: SvgMenuIcon.compensation, comingSoon: true },
        { label: 'Integration', link: '/integration', icon: SvgMenuIcon.integration, comingSoon: true },
        { label: 'Transaction Activity', link: '/transaction-activity', icon: SvgMenuIcon.transaction_activity },
    ],
  },
  {
    label: 'Others',
    icon: SvgMenuIcon.dashboard,
    children: [
        { label: 'Settings', link: '/settings', icon: SvgMenuIcon.setting, comingSoon: true },
        { label: 'Help Center', link: '/help', icon: SvgMenuIcon.help, comingSoon: true },
    ],
  },
];
