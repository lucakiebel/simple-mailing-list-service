import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { DeliveryLog, DeliveryStatus, DeliverySource } from './delivery-log.entity';

export interface DeliveryLogFilter {
  listId?: number;
  status?: DeliveryStatus;
  recipientEmail?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface DeliveryStats {
  total: number;
  sent: number;
  failed: number;
  today: number;
  byList: { listId: number; listName: string; total: number; sent: number; failed: number }[];
}

@Injectable()
export class DeliveryLogService {
  constructor(
    @InjectRepository(DeliveryLog)
    private repo: Repository<DeliveryLog>,
  ) {}

  async create(params: {
    messageId?: string;
    listId: number;
    fromEmail: string;
    subject?: string;
    recipientEmail: string;
    source: DeliverySource;
  }): Promise<DeliveryLog> {
    const entry = this.repo.create({
      messageId: params.messageId,
      listId: params.listId,
      fromEmail: params.fromEmail,
      subject: params.subject,
      recipientEmail: params.recipientEmail,
      status: DeliveryStatus.PENDING,
      sentAt: new Date(),
      source: params.source,
    });
    return this.repo.save(entry);
  }

  async markSent(id: string): Promise<void> {
    await this.repo.update(id, { status: DeliveryStatus.SENT });
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await this.repo.update(id, {
      status: DeliveryStatus.FAILED,
      errorMessage,
    });
  }

  async findByFilter(filter: DeliveryLogFilter): Promise<DeliveryLog[]> {
    const where: any = {};
    if (filter.listId) where.listId = filter.listId;
    if (filter.status) where.status = filter.status;
    if (filter.recipientEmail) where.recipientEmail = filter.recipientEmail;
    if (filter.dateFrom && filter.dateTo) {
      where.sentAt = Between(new Date(filter.dateFrom), new Date(filter.dateTo));
    } else if (filter.dateFrom) {
      where.sentAt = MoreThanOrEqual(new Date(filter.dateFrom));
    } else if (filter.dateTo) {
      where.sentAt = LessThanOrEqual(new Date(filter.dateTo));
    }

    return this.repo.find({
      where,
      relations: ['list'],
      order: { sentAt: 'DESC' },
    });
  }

  async getStats(): Promise<DeliveryStats> {
    const total = await this.repo.count();
    const sent = await this.repo.count({ where: { status: DeliveryStatus.SENT } });
    const failed = await this.repo.count({ where: { status: DeliveryStatus.FAILED } });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const today = await this.repo.count({
      where: { sentAt: MoreThanOrEqual(todayStart) },
    });

    const byListRaw = await this.repo
      .createQueryBuilder('log')
      .select('log.listId', 'listId')
      .addSelect('COUNT(*)', 'total')
      .addSelect("SUM(CASE WHEN log.status = 'sent' THEN 1 ELSE 0 END)", 'sent')
      .addSelect("SUM(CASE WHEN log.status = 'failed' THEN 1 ELSE 0 END)", 'failed')
      .groupBy('log.listId')
      .getRawMany();

    const byList = byListRaw.map((r: any) => ({
      listId: r.listId,
      listName: '',
      total: Number(r.total),
      sent: Number(r.sent),
      failed: Number(r.failed),
    }));

    return { total, sent, failed, today, byList };
  }
}
