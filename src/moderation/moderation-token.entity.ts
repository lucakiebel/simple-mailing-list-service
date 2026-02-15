import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PendingMessage } from '../messages/pending-message.entity';

export enum ModerationAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

@Entity('moderation_tokens')
export class ModerationToken {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PendingMessage, { onDelete: 'CASCADE' })
  message: PendingMessage;

  @Column({ unique: true })
  token: string;

  @Column()
  action: ModerationAction;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  usedAt?: Date;
}
