import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('currencies')
export class Currency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // e.g., "United States Dollar"
  @Column({ type: 'varchar', length: 128 })
  name: string;

  // e.g., "USD"
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 8 })
  shortCode: string;

  // ISO 4217 numeric code, e.g., 840 for USD
  @Index({ unique: true })
  @Column({ type: 'integer', nullable: true })
  iso4217Numeric: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
