import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Currency } from '../entities/currency.entity';

/**
 * Seeds a set of currencies that cover all countries in our PaymentProvider list.
 * Runs on every application bootstrap regardless of environment.
 *
 * Notes:
 * - Uses ISO 4217 numeric codes (e.g., USD = 840).
 * - shortCode is the 3-letter alphabetic code (e.g., USD, XOF, KES).
 * - Unique on shortCode and iso4217Numeric (nullable allowed).
 */
type CurrencySeed = {
  shortCode: string;
  name: string;
  iso4217Numeric: number;
};

const UNIQUE_CURRENCIES: CurrencySeed[] = [
  // West Africa Economic and Monetary Union (WAEMU)
  { shortCode: 'XOF', name: 'West African CFA franc', iso4217Numeric: 952 },
  // Central African Economic and Monetary Community (CEMAC)
  { shortCode: 'XAF', name: 'Central African CFA franc', iso4217Numeric: 950 },
  // Country-specific
  { shortCode: 'CDF', name: 'Congolese franc', iso4217Numeric: 976 }, // DR Congo
  { shortCode: 'ETB', name: 'Ethiopian birr', iso4217Numeric: 230 }, // Ethiopia
  { shortCode: 'GHS', name: 'Ghanaian cedi', iso4217Numeric: 936 }, // Ghana
  { shortCode: 'GNF', name: 'Guinean franc', iso4217Numeric: 324 }, // Guinea (Conakry)
  { shortCode: 'KES', name: 'Kenyan shilling', iso4217Numeric: 404 }, // Kenya
  { shortCode: 'LSL', name: 'Lesotho loti', iso4217Numeric: 426 }, // Lesotho
  { shortCode: 'MWK', name: 'Malawian kwacha', iso4217Numeric: 454 }, // Malawi
  { shortCode: 'MZN', name: 'Mozambican metical', iso4217Numeric: 943 }, // Mozambique
  { shortCode: 'NGN', name: 'Nigerian naira', iso4217Numeric: 566 }, // Nigeria
  { shortCode: 'RWF', name: 'Rwandan franc', iso4217Numeric: 646 }, // Rwanda
  { shortCode: 'SLE', name: 'Sierra Leonean leone', iso4217Numeric: 925 }, // Sierra Leone (new leone)
  { shortCode: 'ZAR', name: 'South African rand', iso4217Numeric: 710 }, // South Africa
  { shortCode: 'TZS', name: 'Tanzanian shilling', iso4217Numeric: 834 }, // Tanzania
  { shortCode: 'UGX', name: 'Ugandan shilling', iso4217Numeric: 800 }, // Uganda
  { shortCode: 'ZMW', name: 'Zambian kwacha', iso4217Numeric: 967 }, // Zambia
  // Common fallback used across the app
  { shortCode: 'USD', name: 'United States Dollar', iso4217Numeric: 840 },
];

@Injectable()
export class CurrencySeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(CurrencySeeder.name);

  constructor(
    @InjectRepository(Currency)
    private readonly currencyRepo: Repository<Currency>,
  ) {}

  async onApplicationBootstrap() {
    try {
      const desiredCodes = UNIQUE_CURRENCIES.map((c) => c.shortCode);
      const desiredNumericCodes = UNIQUE_CURRENCIES.map(
        (c) => c.iso4217Numeric,
      );

      // Check for existing currencies by both shortCode and iso4217Numeric
      const existing = await this.currencyRepo.find({
        where: [
          { shortCode: In(desiredCodes) },
          { iso4217Numeric: In(desiredNumericCodes) },
        ],
        select: ['shortCode', 'iso4217Numeric'],
      });

      const existingCodes = new Set(existing.map((e) => e.shortCode));
      const existingNumericCodes = new Set(
        existing.map((e) => e.iso4217Numeric).filter((n) => n !== null),
      );

      const missing = UNIQUE_CURRENCIES.filter(
        (c) =>
          !existingCodes.has(c.shortCode) &&
          !existingNumericCodes.has(c.iso4217Numeric),
      );

      if (missing.length === 0) {
        this.logger.log('Currencies already seeded.');
        return;
      }

      // Use upsert to handle race conditions and duplicate key violations
      for (const currency of missing) {
        try {
          await this.currencyRepo.upsert(
            {
              shortCode: currency.shortCode,
              name: currency.name,
              iso4217Numeric: currency.iso4217Numeric,
            },
            {
              conflictPaths: ['shortCode'],
              skipUpdateIfNoValuesChanged: true,
            },
          );
        } catch {
          // If upsert fails, try with iso4217Numeric conflict path
          try {
            await this.currencyRepo.upsert(
              {
                shortCode: currency.shortCode,
                name: currency.name,
                iso4217Numeric: currency.iso4217Numeric,
              },
              {
                conflictPaths: ['iso4217Numeric'],
                skipUpdateIfNoValuesChanged: true,
              },
            );
          } catch (secondUpsertError) {
            this.logger.warn(
              `Failed to upsert currency ${currency.shortCode}: ${secondUpsertError}`,
            );
          }
        }
      }

      this.logger.log(
        `Processed ${missing.length} currencies: ${missing
          .map((m) => `${m.shortCode} (${m.iso4217Numeric})`)
          .join(', ')}`,
      );
    } catch (error) {
      this.logger.error('Currency seeding failed', error as any);
    }
  }
}
