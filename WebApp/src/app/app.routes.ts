import { Routes } from '@angular/router';
import { authChildGuard, authGuard } from '../guards/auth.guard';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

export const routes: Routes = [
  // OAuth callback page (no layout, standalone for popup)
  {
    path: 'oauth/callback',
    loadComponent: () => import('./pages/oauth-callback/oauth-callback.component').then(c => c.OAuthCallbackComponent)
  },

  {
    path: '',
    loadComponent: () => import('./layout/landing-layout/landing-layout.component').then(c => c.LandingLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/landing-page/landing-page.component').then(c => c.LandingPageComponent) },
      { path: 'contact-us', loadComponent: () => import('./pages/contact-us/contact-us.component').then(c => c.ContactUsComponent) },
      { path: 'about', loadComponent: () => import('./pages/about/about.component').then(c => c.AboutComponent) },
      { path: 'terms', loadComponent: () => import('./pages/terms/terms.component').then(c => c.TermsComponent) },
      { path: 'privacy', loadComponent: () => import('./pages/privacy/privacy.component').then(c => c.PrivacyComponent) },
      { path: 'faq', loadComponent: () => import('./pages/faq/faq.component').then(c => c.FaqComponent) },
    ]
  },
  {
    path: '',
    loadComponent: () => import('./layout/onboarding-layout/onboarding-layout.component').then(c => c.OnboardingLayoutComponent),
    children: [
      { path: 'onboarding', loadComponent: () => import('./pages/content-creator/onboarding/onboarding.component').then(c => c.OnboardingComponent) },
      { path: 'cancellation', loadComponent: () => import('./pages/content-creator/cancellation/cancellation.component').then(c => c.CancellationComponent) }
    ]
  },
  {
    path: '',
    loadComponent: () => import('./layout/dashboard-layout/dashboard-layout.component').then(c => c.DashboardLayoutComponent),
    canActivate: [authGuard],
    canActivateChild: [authChildGuard],
    providers: [provideCharts(withDefaultRegisterables())],
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/content-creator/dashboard/dashboard/dashboard.component').then(c => c.DashboardComponent), data:{title: 'Dashboard'} },
      // { path: 'compensation', loadComponent: () => import('./pages/content-creator/dashboard/compensation/compensation.component').then(c => c.CompensationComponent), data:{title: 'Compensation'} },
      // { path: 'compensation/:id', loadComponent: () => import('./pages/content-creator/dashboard/compensation/compensation-detail/compensation-detail.component').then(c => c.CompensationDetailComponent), data:{title: 'Compensation'} },
      // { path: 'integration', loadComponent: () => import('./pages/content-creator/dashboard/integration/integration.component').then(c => c.IntegrationComponent), data:{title: 'Integration'} },
      // { path: 'settings', loadComponent: () => import('./pages/content-creator/dashboard/settings/settings.component').then(c => c.SettingsComponent), data:{title: 'Settings'},
      //   children: [
      //     { path: '', redirectTo: 'account', pathMatch: 'full' },
      //     { path:'account', loadComponent: () => import('./pages/content-creator/dashboard/settings/account/account.component').then(c => c.AccountComponent), data:{title: 'Settings'} },
      //     { path:'social', loadComponent: () => import('./pages/content-creator/dashboard/settings/social/social.component').then(c => c.SocialComponent), data:{title: 'Settings'} },
      //     { path:'notification', loadComponent: () => import('./pages/content-creator/dashboard/settings/notification/notification.component').then(c => c.NotificationComponent), data:{title: 'Settings'} },
      //     { path:'localization', loadComponent: () => import('./pages/content-creator/dashboard/settings/localization/localization.component').then(c => c.LocalizationComponent), data:{title: 'Settings'} },
      //   ]
      // },
      // { path: 'help', loadComponent: () => import('./pages/content-creator/dashboard/help-center/help-center.component').then(c => c.HelpCenterComponent), data:{title: 'Help Center'}},
      { path: 'compensation', loadComponent: () => import('./pages/content-creator/coming-soon/coming-soon.component').then(c => c.ComingSoonComponent), data:{title: 'Compensation'}},
      { path: 'integration', loadComponent: () => import('./pages/content-creator/coming-soon/coming-soon.component').then(c => c.ComingSoonComponent), data:{title: 'Integration'}},
      { path: 'transaction-activity', loadComponent: () => import('./pages/content-creator/dashboard/transaction-activity//transaction-activity.component').then(c => c.TransactionActivityComponent), data:{title: 'Transaction Activity'}},
      { path: 'settings', loadComponent: () => import('./pages/content-creator/coming-soon/coming-soon.component').then(c => c.ComingSoonComponent), data:{title: 'Settings'}},
      { path: 'help', loadComponent: () => import('./pages/content-creator/coming-soon/coming-soon.component').then(c => c.ComingSoonComponent), data:{title: 'Help Center'}},
    ]
  },
  {
    path: '',
    loadComponent: () => import('./layout/onboarding-layout/onboarding-layout.component').then(c => c.OnboardingLayoutComponent),
    children: [
      { path: 'fan/:handle', loadComponent: () => import('./pages/fan/fan-video/fan-video.component').then(c => c.FanVideoComponent), children:[]},
      // { path: 'message-send', loadComponent: () => import('./pages/fan/message-success/message-success.component').then(c => c.MessageSuccessComponent) },
      // { path: 'message-declined', loadComponent: () => import('./pages/fan/message-failed/message-failed.component').then(c => c.MessageFailedComponent) },
    ]
  },
];
