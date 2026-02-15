import { Controller, Get, Param, Res } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModerationAction, ModerationToken } from './moderation-token.entity';
import {
  PendingMessage,
  PendingMessageStatus,
} from '../messages/pending-message.entity';
import { MailService } from '../mail/mail.service';
import type { Response } from 'express';
import { ListMember } from '../lists/list-member.entity';
import { Public } from '../auth/decorators/public.decorator';

@Controller('moderate')
export class ModerationController {
  constructor(
    @InjectRepository(ModerationToken)
    private tokenRepo: Repository<ModerationToken>,
    @InjectRepository(PendingMessage)
    private pendingRepo: Repository<PendingMessage>,
    @InjectRepository(ListMember)
    private memberRepo: Repository<ListMember>,
    private mailService: MailService,
  ) {}

  @Get(':token')
  @Public()
  async handle(@Param('token') token: string, @Res() res: Response) {
    const moderationToken = await this.tokenRepo.findOne({
      where: { token },
      relations: ['message', 'message.list'],
    });

    if (!moderationToken) {
      return res.status(400).send('Ungültiger oder abgelaufener Link.');
    }
    if (moderationToken.usedAt || moderationToken.expiresAt < new Date()) {
      return res
        .status(400)
        .send('Dieser Link wurde bereits verwendet oder ist abgelaufen.');
    }

    const pending = moderationToken.message;

    if (moderationToken.action === ModerationAction.APPROVE) {
      const members = await this.memberRepo.find({
        where: { list: { id: pending.list.id }, active: true },
      });

      // simpleParser auf rawMessage, um Subject/Text zu bekommen
      const parsed = await (
        await import('mailparser')
      ).simpleParser(pending.rawMessage);
      const subject = parsed.subject || pending.subject || '';
      const text = parsed.text || '';

      for (const m of members) {
        await this.mailService.sendMail({
          to: m.email,
          subject,
          text,
        });
      }

      pending.status = PendingMessageStatus.APPROVED;
      await this.pendingRepo.save(pending);

      moderationToken.usedAt = new Date();
      await this.tokenRepo.save(moderationToken);

      return res.send(
        'Die Nachricht wurde freigegeben und an die Liste verteilt.',
      );
    } else if (moderationToken.action === ModerationAction.REJECT) {
      pending.status = PendingMessageStatus.REJECTED;
      await this.pendingRepo.save(pending);

      moderationToken.usedAt = new Date();
      await this.tokenRepo.save(moderationToken);

      return res.send('Die Nachricht wurde abgelehnt.');
    }

    return res.status(400).send('Unbekannte Aktion.');
  }
}
