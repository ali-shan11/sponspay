import { IsBoolean, IsNotEmpty, IsString, Length } from 'class-validator';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity()
@Unique(['apiKey'])
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    length: 15,
  })
  @IsNotEmpty()
  @Length(15)
  @IsString()
  apiKey: string;

  @Column({
    length: 50,
    nullable: true,
  })
  @Length(1, 50)
  @IsString()
  description: string;

  @CreateDateColumn()
  dateAdded: Date;

  @Column({ default: false })
  @IsBoolean()
  banned: boolean;
}
