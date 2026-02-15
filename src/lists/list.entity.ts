import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ListMember } from './list-member.entity';
import { PendingMessage } from '../messages/pending-message.entity';

export enum ListMode {
  OPEN = 'open',
  MEMBERS_ONLY = 'members_only',
  MODERATED = 'moderated',
}

@Entity('lists')
export class List {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string; // z.B. "mitglieder@verein.de"

  @Column({ default: ListMode.OPEN })
  mode: ListMode;

  @OneToMany(() => ListMember, (m) => m.list)
  members: ListMember[];

  @OneToMany(() => PendingMessage, (m) => m.list)
  pendingMessages: PendingMessage[];
}
