/**
 * Default currency preferences for countries that support multiple currencies.
 *
 * Maps ISO 3166-1 alpha-3 country codes to ISO 4217 currency codes.
 *
 * When PawaPay's active-conf endpoint returns multiple currencies for a country,
 * this configuration determines which currency to prefer. If the default currency
 * is not found in the response, the first available currency will be used.
 *
 * For countries not listed here, the first currency in the response is used by default.
 */
export const COUNTRY_DEFAULT_CURRENCIES: Record<string, string> = {
  /**
   * Democratic Republic of Congo
   * Default: CDF (Congolese Franc)
   */
  COD: 'CDF',

  // Future: Add other countries as needed when they start supporting multiple currencies
};
