import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { List } from '../lists/list.entity';

export enum DeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

export enum DeliverySource {
  DIRECT = 'direct',
  MODERATION = 'moderation',
  MANUAL = 'manual',
}

@Entity('delivery_log')
@Index(['messageId', 'listId', 'recipientEmail'], { unique: true })
export class DeliveryLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  messageId?: string;

  @Column()
  listId: number;

  @ManyToOne(() => List, { onDelete: 'CASCADE' })
  list: List;

  @Column()
  fromEmail: string;

  @Column({ nullable: true })
  subject?: string;

  @Column()
  recipientEmail: string;

  @Column({ default: DeliveryStatus.PENDING })
  status: DeliveryStatus;

  @Column({ nullable: true, type: 'text' })
  errorMessage?: string;

  @Column()
  sentAt: Date;

  @Column({ default: DeliverySource.DIRECT })
  source: DeliverySource;
}
