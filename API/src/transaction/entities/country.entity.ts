import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { CountryPrice } from './country-price.entity';

@Entity('countries')
export class Country {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ISO 3166-1 alpha-3 code (e.g., "ZMB", "KEN", "UGA")
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 3 })
  iso3Code: string;

  // Country name (e.g., "Republic of Zambia")
  @Column({ type: 'varchar', length: 128 })
  name: string;

  // ISO 3166-1 alpha-2 code (e.g., "ZM", "KE", "UG")
  @Column({ type: 'varchar', length: 2, nullable: true })
  iso2Code: string | null;

  // Credit card penetration percentage (e.g., 4.4 means 4.4%)
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  creditCardPenetration: number | null;

  // Mobile phone penetration percentage (e.g., 92.7 means 92.7%)
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  mobilePenetration: number | null;

  @OneToMany(() => CountryPrice, (cp) => cp.country)
  countryPrices: CountryPrice[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
