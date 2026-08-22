import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ModerationAction,
  ModerationToken,
} from './moderation-token.entity';
import {
  PendingMessage,
  PendingMessageStatus,
} from '../messages/pending-message.entity';
import { MailService } from '../mail/mail.service';
import { DeliveryLogService } from '../delivery-log/delivery-log.service';
import { DeliverySource } from '../delivery-log/delivery-log.entity';
import { ListMember } from '../lists/list-member.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Attachment } from 'nodemailer/lib/mailer';

class ModerateActionDto {
  action: 'approve' | 'reject';
}

@Controller('lists/:id/messages/pending')
@ApiBearerAuth()
export class ModerationAdminController {
  constructor(
    @InjectRepository(PendingMessage)
    private pendingRepo: Repository<PendingMessage>,
    @InjectRepository(ModerationToken)
    private tokenRepo: Repository<ModerationToken>,
    @InjectRepository(ListMember)
    private memberRepo: Repository<ListMember>,
    private mailService: MailService,
    private deliveryLogService: DeliveryLogService,
  ) {}

  @Get()
  @Roles('admin')
  async getPending(@Param('id') id: string) {
    const messages = await this.pendingRepo.find({
      where: { list: { id: Number(id) }, status: PendingMessageStatus.PENDING },
      relations: ['list'],
      order: { id: 'DESC' },
    });

    return messages.map((m) => ({
      id: m.id,
      fromEmail: m.fromEmail,
      subject: m.subject,
      status: m.status,
      createdAt: m.id, // UUID v7 enthält Zeitstempel
    }));
  }

  @Post(':pendingId')
  @Roles('admin')
  async moderate(
    @Param('id') id: string,
    @Param('pendingId') pendingId: string,
    @Body() dto: ModerateActionDto,
  ) {
    const pending = await this.pendingRepo.findOne({
      where: { id: pendingId, list: { id: Number(id) } },
      relations: ['list'],
    });

    if (!pending) {
      return { error: 'Pending message not found' };
    }

    if (pending.status !== PendingMessageStatus.PENDING) {
      return { error: 'Message already moderated' };
    }

    if (dto.action === 'approve') {
      const members = await this.memberRepo.find({
        where: { list: { id: pending.list.id }, active: true },
      });

      const parsed = await (
        await import('mailparser')
      ).simpleParser(pending.rawMessage);
      const subject = parsed.subject || pending.subject || '';
      const text = parsed.text || '';

      const attachments: Attachment[] = parsed.attachments.map((att) => ({
        filename: att.filename || 'attachment',
        content: att.content,
        contentType: att.contentType,
        contentDisposition: att.contentDisposition as
          | 'attachment'
          | 'inline'
          | undefined,
        cid: att.cid || undefined,
      }));

      for (const m of members) {
        const logEntry = await this.deliveryLogService.create({
          messageId: parsed.messageId || undefined,
          listId: pending.list.id,
          fromEmail: pending.fromEmail,
          subject,
          recipientEmail: m.email,
          source: DeliverySource.MODERATION,
        });

        try {
          await this.mailService.sendMail({
            to: m.email,
            subject,
            text,
            attachments,
            from: { name: pending.list.name, email: pending.list.email },
          });

          await this.deliveryLogService.markSent(logEntry.id);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          await this.deliveryLogService.markFailed(logEntry.id, msg);
        }
      }

      pending.status = PendingMessageStatus.APPROVED;
      await this.pendingRepo.save(pending);

      return { status: 'approved' };
    }

    if (dto.action === 'reject') {
      pending.status = PendingMessageStatus.REJECTED;
      await this.pendingRepo.save(pending);
      return { status: 'rejected' };
    }

    return { error: 'Invalid action' };
  }
}
