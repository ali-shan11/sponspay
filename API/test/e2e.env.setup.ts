// Common environment setup for all e2e tests
// This ensures all required environment variables are set before tests run

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_USER = process.env.DB_USER || 'filip';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'startervesna';
process.env.DB_NAME = process.env.DB_NAME || 'dev';
process.env.DB_SYNC = process.env.DB_SYNC || 'true';
process.env.SERVICE_ACCOUNT = process.env.SERVICE_ACCOUNT || 'test';
process.env.SERVICE_ACCOUNT_PRIVATE_KEY =
  process.env.SERVICE_ACCOUNT_PRIVATE_KEY || 'test';
process.env.SERVICE_ACCOUNT_USER = process.env.SERVICE_ACCOUNT_USER || 'test';
process.env.SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || 'test';
process.env.API_KEY_ALLOWED_DOMAINS =
  process.env.API_KEY_ALLOWED_DOMAINS || 'example.com';
process.env.FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@example.com';
process.env.CONTACT_US_EMAIL =
  process.env.CONTACT_US_EMAIL || 'support@example.com';
process.env.FIREBASE_SERVICE_ACCOUNT =
  process.env.FIREBASE_SERVICE_ACCOUNT || '{}';
process.env.FIREBASE_CHECK_REVOKED =
  process.env.FIREBASE_CHECK_REVOKED || 'false';
process.env.TIMEZONE_API_URL =
  process.env.TIMEZONE_API_URL || 'https://example.com';
process.env.PHOTOS_BUCKET = process.env.PHOTOS_BUCKET || 'test-bucket';
process.env.ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID || 'test';
process.env.ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || 'test';
process.env.ZOHO_REDIRECT_URI =
  process.env.ZOHO_REDIRECT_URI || 'https://example.com/oauth';
process.env.ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN || 'token';
process.env.ZOHO_ENVIRONMENT = process.env.ZOHO_ENVIRONMENT || 'production';
process.env.TELEGRAM_SERVICE_URL =
  process.env.TELEGRAM_SERVICE_URL || 'http://localhost:9999';
process.env.INTERNAL_API_KEY =
  process.env.INTERNAL_API_KEY || 'test-internal-key';
process.env.PAWAPAY_BASE_URL =
  process.env.PAWAPAY_BASE_URL || 'https://example.com';
process.env.PAWAPAY_API_TOKEN = process.env.PAWAPAY_API_TOKEN || 'test-token';
process.env.PAWAPAY_CALLBACK_AUTHORITY =
  process.env.PAWAPAY_CALLBACK_AUTHORITY || 'example.com';
process.env.INFOBIP_BASE_URL =
  process.env.INFOBIP_BASE_URL || 'https://example.com';
process.env.INFOBIP_API_KEY = process.env.INFOBIP_API_KEY || 'test-key';
process.env.INFOBIP_SENDER = process.env.INFOBIP_SENDER || 'test-sender';
process.env.ANONYMIZATION_SALT =
  process.env.ANONYMIZATION_SALT || 'test-salt-minimum-32-characters-long';
process.env.EXCHANGE_RATE_API_KEY =
  process.env.EXCHANGE_RATE_API_KEY || 'test-exchange-rate-key';
process.env.EXCHANGE_RATE_BASE_URL =
  process.env.EXCHANGE_RATE_BASE_URL || 'https://v6.exchangerate-api.com/v6';
process.env.MANAGEMENT_EMAIL =
  process.env.MANAGEMENT_EMAIL || 'test-management@example.com';
