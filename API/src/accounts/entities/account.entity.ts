import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  OneToMany,
  DeleteDateColumn,
} from 'typeorm';
import { User } from '../../creator/entities/user.entity';
import { AccountVerification } from './account-verification.entity';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 32, unique: true })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 128 })
  fullName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nickname: string | null;

  @ManyToOne(() => User, { nullable: false })
  owner: User;

  @Column({ type: 'varchar', length: 128 })
  providerName: string;

  @Column({ type: 'varchar', length: 128 })
  providerCountry: string;

  @Index()
  @Column({ type: 'varchar', length: 3 })
  providerCountryCode: string;

  @Column({ type: 'varchar', length: 3 })
  currencyCode: string;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date | null;

  @OneToMany(() => AccountVerification, (verification) => verification.account)
  verifications: AccountVerification[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
