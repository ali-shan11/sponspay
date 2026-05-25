import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Terms {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', unique: true })
  version: number;

  @Column({ type: 'text' })
  html: string;

  @CreateDateColumn()
  createdAt: Date;
}
