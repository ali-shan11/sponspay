import {
  normalizeCountryCode,
  findDepositFromActiveConfig,
  isOperationalStatus,
  calculateEffectiveLimits,
} from './pawapay.utils';

describe('PawaPay Utilities', () => {
  describe('normalizeCountryCode', () => {
    it('should convert lowercase to uppercase', () => {
      expect(normalizeCountryCode('uga')).toBe('UGA');
    });

    it('should trim whitespace', () => {
      expect(normalizeCountryCode(' KEN ')).toBe('KEN');
    });

    it('should handle already normalized codes', () => {
      expect(normalizeCountryCode('ZMB')).toBe('ZMB');
    });

    it('should handle mixed case', () => {
      expect(normalizeCountryCode('gHa')).toBe('GHA');
    });

    it('should handle empty string', () => {
      expect(normalizeCountryCode('')).toBe('');
    });

    it('should handle whitespace-only string', () => {
      expect(normalizeCountryCode('   ')).toBe('');
    });

    it('should handle multiple spaces', () => {
      expect(normalizeCountryCode('  ZMB  ')).toBe('ZMB');
    });
  });

  describe('findDepositFromActiveConfig', () => {
    it('should find DEPOSIT operation from active-config object format', () => {
      const operationTypes = {
        PAYOUT: {
          minAmount: '100',
          maxAmount: '5000',
        },
        DEPOSIT: {
          minAmount: '1',
          maxAmount: '10000',
          status: 'OPERATIONAL',
        },
      };

      const result = findDepositFromActiveConfig(operationTypes);

      expect(result).not.toBeNull();
      expect(result?.minAmount).toBe('1');
      expect(result?.maxAmount).toBe('10000');
      expect(result?.status).toBe('OPERATIONAL');
    });

    it('should return null if no DEPOSIT operation exists', () => {
      const operationTypes = {
        PAYOUT: {
          minAmount: '100',
          maxAmount: '5000',
        },
        REFUND: {
          minAmount: '50',
          maxAmount: '2000',
        },
      };

      expect(findDepositFromActiveConfig(operationTypes)).toBeNull();
    });

    it('should preserve additional fields from operation', () => {
      const operationTypes = {
        DEPOSIT: {
          minAmount: '1',
          maxAmount: '10000',
          authType: 'PROVIDER_AUTH',
          pinPrompt: 'AUTOMATIC',
        },
      };

      const result = findDepositFromActiveConfig(operationTypes);
      expect(result?.authType).toBe('PROVIDER_AUTH');
      expect(result?.pinPrompt).toBe('AUTOMATIC');
    });
  });

  describe('isOperationalStatus', () => {
    it('should return true for OPERATIONAL status', () => {
      expect(isOperationalStatus('OPERATIONAL')).toBe(true);
    });

    it('should return true for DELAYED status', () => {
      expect(isOperationalStatus('DELAYED')).toBe(true);
    });

    it('should return false for CLOSED status', () => {
      expect(isOperationalStatus('CLOSED')).toBe(false);
    });

    it('should return false for undefined status', () => {
      expect(isOperationalStatus(undefined)).toBe(false);
    });

    it('should return true for any non-CLOSED, non-undefined status', () => {
      expect(isOperationalStatus('PENDING')).toBe(true);
      expect(isOperationalStatus('ACTIVE')).toBe(true);
      expect(isOperationalStatus('UNKNOWN')).toBe(true);
    });
  });

  describe('calculateEffectiveLimits', () => {
    it('should calculate effective limits when price is below min limit', () => {
      const result = calculateEffectiveLimits(10, 50, 1000);

      expect(result.effectiveMin).toBe(50); // Uses minLimit
      expect(result.effectiveMax).toBe(1000);
      expect(result.maxMultiple).toBe(20); // floor(1000/50)
    });

    it('should calculate effective limits when price is above min limit', () => {
      const result = calculateEffectiveLimits(100, 50, 1000);

      expect(result.effectiveMin).toBe(100); // Uses price
      expect(result.effectiveMax).toBe(1000);
      expect(result.maxMultiple).toBe(10); // floor(1000/100)
    });

    it('should ceil the effective minimum', () => {
      const result = calculateEffectiveLimits(50.7, 10, 1000);

      expect(result.effectiveMin).toBe(51); // ceil(50.7)
      expect(result.effectiveMax).toBe(1000);
      expect(result.maxMultiple).toBe(19); // floor(1000/51)
    });

    it('should cap maxMultiple at 100', () => {
      const result = calculateEffectiveLimits(1, 1, 10000);

      expect(result.effectiveMin).toBe(1);
      expect(result.effectiveMax).toBe(10000);
      expect(result.maxMultiple).toBe(100); // min(floor(10000/1), 100)
    });

    it('should handle when effective min equals max', () => {
      const result = calculateEffectiveLimits(1000, 50, 1000);

      expect(result.effectiveMin).toBe(1000);
      expect(result.effectiveMax).toBe(1000);
      expect(result.maxMultiple).toBe(1); // floor(1000/1000)
    });

    it('should handle decimal prices correctly', () => {
      const result = calculateEffectiveLimits(49.99, 50, 500);

      expect(result.effectiveMin).toBe(50); // max(ceil(49.99), 50) = 50
      expect(result.effectiveMax).toBe(500);
      expect(result.maxMultiple).toBe(10); // floor(500/50)
    });

    it('should handle zero maxMultiple when effective min > effective max', () => {
      const result = calculateEffectiveLimits(1000, 50, 100);

      expect(result.effectiveMin).toBe(1000); // price is higher than max
      expect(result.effectiveMax).toBe(100);
      expect(result.maxMultiple).toBe(0); // floor(100/1000) = 0
    });
  });
});
