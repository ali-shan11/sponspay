declare global {
  interface Window {
    $zoho: {
      salesiq: {
        ready: () => void;
        visitor?: {
          info: (callback: (data: any) => void) => void;
          question: (question: string) => void;
        };
        chat?: {
          start: () => void;
          end: () => void;
        };
        floatbutton?: {
          visible: (state: 'show' | 'hide') => void;
        };
        customaction?: {
          perform: (action: string, data?: any) => void;
        };
      };
    };
    Cypress?: any;
  }
}

export {};
