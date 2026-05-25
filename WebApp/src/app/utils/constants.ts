import { getAlpha2Code } from './countrycodes';
import { SvgCountryFlags } from './svg-icons';
import { APP_ENDPOINTS } from './urls';

export const userPlaceholderImage = 'images/user-placeholder.png';

export const COUNTRIES_LIST = [
  { name: 'Kenya', img: SvgCountryFlags.kenya },
  { name: 'Tanzania', img: SvgCountryFlags.tanzania },
  { name: 'Uganda', img: SvgCountryFlags.uganda },
  { name: 'South Africa', img: SvgCountryFlags.southAfrica },
  { name: 'Nigeria', img: SvgCountryFlags.nigeria },
  { name: 'South Sudan', img: SvgCountryFlags.southSudan },
];

export const ACCESS_TOKEN = "access_token";

export const GetFlagUrl = (countryCode:string): string => {
  const alpha2Code = getAlpha2Code(countryCode);
  return alpha2Code ? 'svg-country-flags/svg/' + alpha2Code.toLowerCase() + '.svg' : '';
}

// List of public endpoints that don't require authorization
export const PUBLIC_ENDPOINTS = [
  APP_ENDPOINTS.LANDING_PAGE_DETAILS,
  APP_ENDPOINTS.CONTACT_US,
  APP_ENDPOINTS.NEWS_LATEST,
  APP_ENDPOINTS.FAN,
  APP_ENDPOINTS.FAN_PAYMENT,
  APP_ENDPOINTS.CHECK_CHANNEL_AVAILABILITY,
  APP_ENDPOINTS.SIGN_IN_CREATOR,
  APP_ENDPOINTS.COUNTRY_MARKET_DATA,
  APP_ENDPOINTS.PAWAPAY_PREDICT_PROVIDER,
];

export const REDIRECT_TO_DASHBOARD_FROM = ['', '/', '/contact-us', '/faq', '/onboarding'];

export const minimumNumberOfSubscribers = 1; // Minimum subscribers required to be eligible for monetization
export const SubscriberDurationInMonths = 12; // Duration to consider for subscriber count

export const generateQR = async (qrData: string): Promise<string> => {
  const { default: QRCodeStyling } = await import('qr-code-styling');
  const qrCode = new QRCodeStyling({
    width: 185,
    height: 185,
    data: qrData,
    image: 'svg/message-table.svg',
    dotsOptions: {
      color: '#000', 
      type: 'rounded'
    },
    imageOptions: {
      crossOrigin: 'anonymous',
      margin: 5
    },
    cornersSquareOptions: {
      type: 'extra-rounded'
    }
  });

  const blob = await qrCode.getRawData('png');

  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('QR code data conversion error'));
    reader.readAsDataURL(blob as Blob);
  });
  return dataUrl;
}

export const LocalVars = {
  transStartTime: 'trans-start-time',
  transSessionId: 'trans-session-id',
}