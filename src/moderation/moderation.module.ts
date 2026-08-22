import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModerationController } from './moderation.controller';
import { ModerationAdminController } from './moderation-admin.controller';
import { PendingMessage } from '../messages/pending-message.entity';
import { ModerationToken } from './moderation-token.entity';
import { ListMember } from '../lists/list-member.entity';
import { List } from '../lists/list.entity';
import { MailModule } from '../mail/mail.module';
import { DeliveryLogModule } from '../delivery-log/delivery-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PendingMessage,
      ModerationToken,
      List,
      ListMember,
    ]),
    MailModule,
    DeliveryLogModule,
  ],
  controllers: [ModerationController, ModerationAdminController],
})
export class ModerationModule {}
