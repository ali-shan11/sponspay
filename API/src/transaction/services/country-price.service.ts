import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CountryPrice } from '../entities/country-price.entity';

@Injectable()
export class CountryPriceService {
  private readonly logger = new Logger(CountryPriceService.name);

  constructor(
    @InjectRepository(CountryPrice)
    private readonly countryPriceRepo: Repository<CountryPrice>,
  ) {}

  /**
   * Get price for a specific country/currency combination
   * @returns Price or null if not configured
   */
  async getPrice(
    countryCode: string,
    currencyCode: string,
  ): Promise<number | null> {
    const countryPrice = await this.countryPriceRepo.findOne({
      where: {
        country: { iso3Code: countryCode.toUpperCase() },
        currency: { shortCode: currencyCode.toUpperCase() },
      },
      relations: ['country', 'currency'],
    });

    return countryPrice ? Number(countryPrice.price) : null;
  }

  /**
   * Get all country prices as a map: "countryCode:currencyCode" -> price
   */
  async getAllPricesAsMap(): Promise<Map<string, number>> {
    const countryPrices = await this.countryPriceRepo.find({
      relations: ['country', 'currency'],
    });

    const map = new Map<string, number>();
    for (const cp of countryPrices) {
      const key = `${cp.country.iso3Code}:${cp.currency.shortCode}`;
      map.set(key, Number(cp.price));
    }

    return map;
  }
}
