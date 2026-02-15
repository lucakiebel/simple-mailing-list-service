import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImapService } from './imap.service';
import { MailModule } from '../mail/mail.module';
import { List } from '../lists/list.entity';
import { ListMember } from '../lists/list-member.entity';
import { PendingMessage } from '../messages/pending-message.entity';
import { ModerationToken } from '../moderation/moderation-token.entity';
import { ImapController } from './imap.controller';

@Module({
  imports: [
    ConfigModule,
    MailModule,
    TypeOrmModule.forFeature([
      List,
      ListMember,
      PendingMessage,
      ModerationToken,
    ]),
  ],
  providers: [ImapService],
  controllers: [ImapController],
})
export class ImapModule {}
