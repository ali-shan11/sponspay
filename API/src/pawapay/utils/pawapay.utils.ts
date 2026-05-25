/**
 * Shared utility functions for PawaPay data processing
 */

import {
  ActiveConfigurationCurrency,
  ActiveConfigurationOperation,
} from '../interfaces/provider.interface';

/**
 * Normalize country code to uppercase ISO 3166-1 alpha-3 format
 * @param countryCode - Country code to normalize (e.g., "uga", " KEN ")
 * @returns Normalized country code (e.g., "UGA", "KEN")
 */
export function normalizeCountryCode(countryCode: string): string {
  return countryCode.trim().toUpperCase();
}

/**
 * Find DEPOSIT operation from active-configuration endpoint
 * @param operationTypes - Object map of operations from /active-conf endpoint
 * @returns DEPOSIT operation or null if not found
 */
export function findDepositFromActiveConfig(
  operationTypes: ActiveConfigurationCurrency['operationTypes'],
): ActiveConfigurationOperation | null {
  return operationTypes.DEPOSIT ?? null;
}

/**
 * Check if a status value indicates the service is operational (not CLOSED)
 * @param status - Operation status (e.g., "OPEN", "CLOSED", "PENDING")
 * @returns true if operational, false if CLOSED or undefined
 */
export function isOperationalStatus(status: string | undefined): boolean {
  return status !== undefined && status !== 'CLOSED';
}

/**
 * Calculate effective transaction limits for a given price
 * @param price - Base price for the transaction
 * @param minLimit - Minimum transaction limit from provider
 * @param maxLimit - Maximum transaction limit from provider
 * @returns Effective limits and maximum multiple
 */
export function calculateEffectiveLimits(
  price: number,
  minLimit: number,
  maxLimit: number,
): {
  effectiveMin: number;
  effectiveMax: number;
  maxMultiple: number;
} {
  const effectiveMin = Math.ceil(Math.max(price, minLimit));
  const effectiveMax = maxLimit;
  const maxMultiple = Math.min(Math.floor(effectiveMax / effectiveMin), 100);

  return { effectiveMin, effectiveMax, maxMultiple };
}
