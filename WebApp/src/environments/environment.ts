import { Environment } from "@app-types/environment";

export const environment: Environment = {
    API_BASE: 'https://capsular-dorathy-approximately.ngrok-free.dev',
    API_TIME_BASE: 'https://timeapi.io/api',
    API_KEY: 'fBaPyHpZ08Q1luC',
    zoho: {
        enabled: false,
        widgetCode: '',
        pagesenseEnabled: false
    },
    firebase: {
        projectId: "sponspay-fassil",
        appId: "1:926675461802:web:0d06e72cd58eab191212d3",
        storageBucket: "sponspay-fassil.firebasestorage.app",
        apiKey: "AIzaSyC8fwzavXmU4wjwKVf_ODwBtxQ9Sx9IeMU",
        authDomain: "sponspay-fassil.firebaseapp.com", // Use default Firebase domain for localhost
        messagingSenderId: "926675461802",
        measurementId: "G-9EVS5TBYF2"
    },
    production: false,
    mockYouTubeOnboarding: false,
};
