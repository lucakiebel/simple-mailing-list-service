import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { List } from './list.entity';

export enum MemberRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

@Entity('list_members')
export class ListMember {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => List, (list) => list.members, { onDelete: 'CASCADE' })
  list: List;

  @Column()
  email: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ default: MemberRole.MEMBER })
  role: MemberRole;

  @Column({ default: true })
  active: boolean;

  @Column({ nullable: true, unique: true })
  unsubscribeToken?: string;
}
