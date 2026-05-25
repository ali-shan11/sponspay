import { Environment } from "@app-types/environment";

export const environment: Environment = {
    API_BASE: 'https://capsular-dorathy-approximately.ngrok-free.dev',
    API_TIME_BASE: 'https://timeapi.io/api',
    zoho: {
        enabled: false,
        widgetCode: '',
        pagesenseEnabled: false
    },
    firebase: {
        apiKey: "AIzaSyAMDKpCtFyvWO5mIO3K5wx6Q65nGpPCw-0",
        authDomain: "test-99ed7.firebaseapp.com",
        projectId: "test-99ed7",
        storageBucket: "test-99ed7.firebasestorage.app",
        messagingSenderId: "861845717512",
        appId: "1:861845717512:web:71086f831d6602470cc7bd",
        measurementId: "G-DPPWKQ5020"
    },
    production: false,
    mockYouTubeOnboarding: true,
};
