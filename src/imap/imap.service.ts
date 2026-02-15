import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImapFlow } from 'imapflow';
import { AddressObject, simpleParser } from 'mailparser';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { List, ListMode } from '../lists/list.entity';
import { ListMember, MemberRole } from '../lists/list-member.entity';
import {
  PendingMessage,
  PendingMessageStatus,
} from '../messages/pending-message.entity';
import {
  ModerationAction,
  ModerationToken,
} from '../moderation/moderation-token.entity';
import { MailService } from '../mail/mail.service';
import { randomUUID } from 'crypto';
import { NodemailerNestLogger } from '../mail/nodemailer-logger';

interface ImapError extends Error {
  code: string;
}

@Injectable()
export class ImapService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ImapService.name);
  private client: ImapFlow | null = null;
  private running = false;

  constructor(
    private config: ConfigService,
    private mailService: MailService,
    @InjectRepository(List) private listsRepo: Repository<List>,
    @InjectRepository(ListMember) private membersRepo: Repository<ListMember>,
    @InjectRepository(PendingMessage)
    private pendingRepo: Repository<PendingMessage>,
    @InjectRepository(ModerationToken)
    private tokenRepo: Repository<ModerationToken>,
  ) {}

  onModuleInit() {
    this.running = true;
    void this.runWorker();
  }

  async onModuleDestroy() {
    this.running = false;
    if (this.client && this.client.usable) {
      try {
        await this.client.logout();
      } catch {
        /* ignore */
      }
    }
  }

  private async runWorker() {
    while (this.running) {
      try {
        await this.connect();
        await this.pollLoop();
      } catch (err) {
        this.logger.error('IMAP worker crashed, will reconnect', err);
      } finally {
        if (this.client) {
          try {
            if (this.client.usable) {
              await this.client.logout();
            }
          } catch {
            /* ignore */
          }
          this.client = null;
        }
      }

      if (!this.running) break;

      this.logger.warn('Reconnecting to IMAP in 10s...');
      await new Promise((res) => setTimeout(res, 10_000));
    }
  }

  private async connect() {
    const host = this.config.getOrThrow<string>('IMAP_HOST');
    const port = Number(this.config.get('IMAP_PORT') ?? 993);

    this.logger.log(`Connecting to IMAP ${host}:${port} (secure=true)`);

    this.client = new ImapFlow({
      host,
      port,
      secure: true, // always use tls
      auth: {
        user: this.config.getOrThrow('IMAP_USER'),
        pass: this.config.get('IMAP_PASS'),
      },
      logger: new NodemailerNestLogger(this.logger),
    });

    this.client.on('error', (err) => {
      this.logger.error(`IMAP error: ${err.message}`, err as any);
    });

    this.client.on('close', () => {
      this.logger.warn('IMAP connection closed');
    });

    await this.client.connect();
    await this.client.mailboxOpen('INBOX');
    this.logger.log('IMAP connected, start polling');
  }

  private async pollLoop() {
    while (this.running && this.client && this.client.usable) {
      try {
        await this.checkInbox();
      } catch (err) {
        this.logger.error('Error in checkInbox', err);
        throw err;
      }
      await new Promise((res) => setTimeout(res, 30_000));
    }
  }

  private async checkInbox() {
    const client = this.client;
    if (!client || !client.usable) {
      throw new Error('IMAP client not connected');
    }

    try {
      const unseenSeqNums = await client.search({ seen: false });
      if (!unseenSeqNums || !unseenSeqNums.length) {
        this.logger.verbose('No unseen messages in INBOX');
        return;
      }

      this.logger.verbose(
        `Found ${unseenSeqNums.length} unseen messages`,
        unseenSeqNums,
      );

      for (const seq of unseenSeqNums) {
        this.logger.verbose(`Processing message seq=${seq}`);

        const msg = await client.fetchOne(seq, { source: true, flags: true });
        if (!msg || !msg.source) {
          this.logger.warn(`No source for message seq=${seq}, skipping`);
          continue;
        }

        const raw = msg.source;

        try {
          await this.handleIncomingMessage(raw);
          await client.messageFlagsAdd(seq, ['\\Seen']);
          this.logger.verbose(`Marked message seq=${seq} as \\Seen`);
        } catch (err) {
          this.logger.error(`Error while handling message seq=${seq}`, err);
        }
      }
    } catch (err: unknown) {
      const code = (err as ImapError).code;
      if (code === 'NoConnection' || code === 'ETIMEOUT') {
        this.logger.warn(`checkInbox aborted: ${code}`);
      } else {
        this.logger.error('Unexpected error in checkInbox', err as any);
      }
      throw err;
    }
  }

  private async handleIncomingMessage(raw: Buffer) {
    const parsed = await simpleParser(raw);

    //console.log(parsed, JSON.stringify(parsed.to));

    const from = parsed.from?.value[0]?.address?.toLowerCase();
    if (!from) {
      this.logger.warn('Missing from address, skipping');
      return;
    }

    const recipients: string[] = [];
    const add = (v?: AddressObject | AddressObject[]) => {
      if (Array.isArray(v)) {
        v.forEach((ao) => {
          ao.value.forEach((address) => {
            recipients.push(address.address!.toLowerCase());
          });
        });
      } else {
        v?.value.forEach((address) => {
          recipients.push(address.address!.toLowerCase());
        });
      }
    };

    add(parsed.to);
    add(parsed.cc);

    if (!recipients.length) {
      this.logger.warn('No recipients in To/Cc, skipping');
      return;
    }

    this.logger.verbose('Recipients found', recipients);

    const lists = await this.listsRepo.find({
      where: { email: In(recipients) },
    });

    this.logger.verbose('Lists found', lists);

    if (!lists.length) {
      this.logger.warn(`No lists for recipients ${recipients.join(', ')}`);
      return;
    }

    const subject = parsed.subject || '';
    const text = parsed.text || '';
    const html = parsed.html || undefined;

    for (const list of lists) {
      this.logger.verbose('Processing for list', list.id, from, subject);
      await this.processForList(list, from, subject, text, html, raw);
    }
  }

  private async processForList(
    list: List,
    fromEmail: string,
    subject: string,
    text: string,
    html: string | undefined,
    raw: Buffer,
  ) {
    const member = await this.membersRepo.findOne({
      where: { list: { id: list.id }, email: fromEmail, active: true },
      relations: ['list'],
    });

    this.logger.verbose('Sending member found', member);

    const isMember = !!member;
    const isAdmin = member?.role === MemberRole.ADMIN;

    if (list.mode === ListMode.OPEN) {
      this.logger.verbose('Distributing because list is open');
      await this.distributeToMembers(list, subject, text, html);
      return;
    }

    if (isAdmin) {
      this.logger.verbose('Distributing because sending member is admin');
      await this.distributeToMembers(list, subject, text, html);
      return;
    }

    if (list.mode === ListMode.MEMBERS_ONLY && isMember) {
      this.logger.verbose(
        'Distributing because sending member is member of list',
      );
      await this.distributeToMembers(list, subject, text, html);
      return;
    }

    this.logger.verbose('Enqueueing for moderation');
    await this.enqueueForModeration(list, fromEmail, subject, raw, text, html);
  }

  private async distributeToMembers(
    list: List,
    subject: string,
    text: string,
    html?: string,
  ) {
    const members = await this.membersRepo.find({
      where: { list: { id: list.id }, active: true },
    });

    const baseUrl = this.config.getOrThrow<string>('PUBLIC_BASE_URL');

    this.logger.verbose('Distributing to members', members);

    for (const m of members) {
      const unsubscribeUrl = m.unsubscribeToken
        ? `${baseUrl}/unsubscribe/${m.unsubscribeToken}`
        : undefined;

      this.logger.verbose('Distributing to member', m.name);

      await this.mailService.sendMail({
        to: m.email,
        subject,
        text,
        html,
        unsubscribeUrl,
      });

      await new Promise((res) => setTimeout(res, 100));
    }
  }

  private async enqueueForModeration(
    list: List,
    fromEmail: string,
    subject: string,
    raw: Buffer,
    text: string,
    html?: string,
  ) {
    const pending = this.pendingRepo.create({
      list,
      fromEmail,
      subject,
      rawMessage: raw,
      status: PendingMessageStatus.PENDING,
    });
    await this.pendingRepo.save(pending);
    this.logger.verbose('Enqueued for moderation');
    this.logger.verbose('Pending', pending);

    const approveToken = this.tokenRepo.create({
      message: pending,
      token: randomUUID(),
      action: ModerationAction.APPROVE,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    this.logger.verbose('Approve-Token', approveToken);
    const rejectToken = this.tokenRepo.create({
      message: pending,
      token: randomUUID(),
      action: ModerationAction.REJECT,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    this.logger.verbose('Reject-Token', rejectToken);

    await this.tokenRepo.save([approveToken, rejectToken]);

    const admins = await this.membersRepo.find({
      where: { list: { id: list.id }, role: MemberRole.ADMIN, active: true },
    });
    this.logger.verbose('Admins', admins);

    const baseUrl = this.config.getOrThrow<string>('PUBLIC_BASE_URL');
    const approveUrl = `${baseUrl}/moderate/${approveToken.token}`;
    const rejectUrl = `${baseUrl}/moderate/${rejectToken.token}`;

    const preview = text.slice(0, 300);

    this.logger.verbose(
      'Send to admins:',
      preview,
      approveUrl,
      baseUrl,
      rejectUrl,
    );

    for (const admin of admins) {
      this.logger.verbose('Sending to admin:', admin);
      await this.mailService.sendMail({
        to: admin.email,
        subject: `[Moderation] Neue Nachricht für Liste "${list.name}"`,
        text:
          `Von: ${fromEmail}\nBetreff: ${subject}\n\n` +
          `Vorschau:\n${preview}\n\n` +
          `Freigeben: ${approveUrl}\n` +
          `Ablehnen: ${rejectUrl}\n`,
        html: html
          ? `<p><b>Von:</b> ${fromEmail}<br/><b>Betreff:</b> ${subject}</p>
             <p><b>Vorschau:</b><br/><pre>${preview}</pre></p>
             <p><a href="${approveUrl}">Freigeben</a> | <a href="${rejectUrl}">Ablehnen</a></p>`
          : undefined,
      });
    }
  }

  async listInboxMessages() {
    const host = this.config.getOrThrow<string>('IMAP_HOST');
    const port = Number(this.config.get('IMAP_PORT'));
    const secure = this.config.get('IMAP_TLS') === 'true';
    const user = this.config.getOrThrow<string>('IMAP_USER');
    const pass = this.config.get<string>('IMAP_PASS');

    const client = new ImapFlow({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    const logger = this.logger;
    const result: Record<string, any>[] = [];

    try {
      await client.connect();
      await client.mailboxOpen('INBOX');

      const exists = client.mailbox;
      if (!exists) {
        await client.logout();
        return [];
      }

      const startSeq = Math.max(1);
      const range = `${startSeq}:*`;

      for await (const msg of client.fetch(range, { envelope: true })) {
        const env = msg.envelope;
        result.push({
          seq: msg.seq,
          uid: msg.uid,
          subject: env?.subject,
          date: env?.date,
          from: env?.from?.map((a) => a.address),
          to: env?.to?.map((a) => a.address),
          cc: env?.cc?.map((a) => a.address),
          labels: msg.labels,
          flags: msg.flags,
        });
      }

      await client.logout();
    } catch (err) {
      logger.error('Error while listing inbox messages', err);
      try {
        if (!client.usable) {
          await client.logout();
        }
      } catch {
        /* ignore */
      }
    }

    return result;
  }
}
