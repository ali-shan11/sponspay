import { Environment } from "@app-types/environment";

export const environment: Environment = {
    API_BASE: 'https://api.sponspay.com',
    API_TIME_BASE: 'https://timeapi.io/api',
    zoho: {
        enabled: true,
        widgetCode: 'siq09966e097f86577807036083fd36cc1edb34c00c6a8b9c47b39ca05585b37c18',
        pagesenseEnabled: true
    },
    firebase: {
        projectId: "sponspay-fassil",
        appId: "1:926675461802:web:0d06e72cd58eab191212d3",
        storageBucket: "sponspay-fassil.firebasestorage.app",
        apiKey: "AIzaSyC8fwzavXmU4wjwKVf_ODwBtxQ9Sx9IeMU",
        authDomain: "sponspay.com", // Use custom domain for production
        messagingSenderId: "926675461802",
        measurementId: "G-9EVS5TBYF2"
    },
    production: true,
};
