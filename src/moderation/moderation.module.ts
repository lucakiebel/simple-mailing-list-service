import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModerationController } from './moderation.controller';
import { PendingMessage } from '../messages/pending-message.entity';
import { ModerationToken } from './moderation-token.entity';
import { ListMember } from '../lists/list-member.entity';
import { List } from '../lists/list.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PendingMessage,
      ModerationToken,
      List,
      ListMember,
    ]),
    MailModule,
  ],
  controllers: [ModerationController],
})
export class ModerationModule {}
