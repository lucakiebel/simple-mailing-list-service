import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { List } from '../lists/list.entity';

export enum PendingMessageStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('pending_messages')
export class PendingMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => List, (list) => list.pendingMessages, {
    onDelete: 'CASCADE',
  })
  list: List;

  @Column()
  fromEmail: string;

  @Column({ nullable: true })
  subject?: string;

  @Column({ type: 'blob' })
  rawMessage: Buffer;

  @Column({ default: PendingMessageStatus.PENDING })
  status: PendingMessageStatus;
}
