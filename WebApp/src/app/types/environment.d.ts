export interface Environment {
  API_BASE: string;
  API_TIME_BASE: string;
  API_KEY?: string;
  zoho: {
    enabled: boolean;
    widgetCode: string;
    pagesenseEnabled: boolean;
  };
  firebase: {
    projectId: string;
    appId: string;
    storageBucket: string;
    apiKey: string;
    authDomain: string;
    messagingSenderId: string;
    measurementId: string;
  };
  production: boolean;
  mockYouTubeOnboarding?: boolean;
}
