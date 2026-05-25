import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Country } from './country.entity';
import { Currency } from './currency.entity';

@Entity('country_prices')
@Unique(['country', 'currency'])
export class CountryPrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Country, (country) => country.countryPrices, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'countryId' })
  @Index()
  country: Country;

  @Column({ type: 'uuid' })
  countryId: string;

  @ManyToOne(() => Currency, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'currencyId' })
  @Index()
  currency: Currency;

  @Column({ type: 'uuid' })
  currencyId: string;

  // Message price in this currency for this country
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
