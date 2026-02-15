import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { List } from './lists/list.entity';
import { ListMember } from './lists/list-member.entity';
import { PendingMessage } from './messages/pending-message.entity';
import { ModerationToken } from './moderation/moderation-token.entity';
import { ImapModule } from './imap/imap.module';
import { ListsModule } from './lists/lists.module';
import { MessagesModule } from './messages/messages.module';
import { MailModule } from './mail/mail.module';
import { ModerationModule } from './moderation/moderation.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DATABASE_PATH || './mailing.db',
      entities: [List, ListMember, PendingMessage, ModerationToken],
      synchronize: true,
    }),
    MailModule,
    ModerationModule,
    ImapModule,
    ListsModule,
    MessagesModule,
    AuthModule,
  ],
})
export class AppModule {}
