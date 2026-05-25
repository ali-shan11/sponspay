import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { UserRole } from '../enums/user.enum';
import { UserChannel } from './user-channel.entity';
import { Terms } from '../../terms/entities/terms.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @IsNotEmpty()
  @IsString()
  firebaseUid: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.Fan })
  @IsEnum(UserRole)
  role: UserRole;

  @Column({ type: 'varchar', nullable: true })
  displayName: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @OneToMany(() => UserChannel, (uc) => uc.user)
  userChannels: UserChannel[];

  @ManyToOne(() => Terms, { nullable: true })
  acceptedTerms: Terms | null;

  @Column({ type: 'timestamp', nullable: true })
  acceptedTermsAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
