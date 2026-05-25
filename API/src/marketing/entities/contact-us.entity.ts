import {
  IsEmail,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  Length,
} from 'class-validator';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class ContactUs {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    length: 50,
  })
  @IsNotEmpty()
  @Length(2, 50)
  @IsString()
  firstName: string;

  @Column({
    length: 50,
  })
  @IsNotEmpty()
  @Length(2, 50)
  @IsString()
  lastName: string;

  @Column()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @Column()
  @IsNotEmpty()
  country: string;

  @Column()
  @IsPhoneNumber()
  phoneNumber?: string;

  @Column()
  @IsNotEmpty()
  interest: string;

  @Column({
    length: 500,
  })
  @IsNotEmpty()
  @Length(5, 500)
  @IsString()
  message: string;

  @CreateDateColumn()
  dateAdded: Date;
}
