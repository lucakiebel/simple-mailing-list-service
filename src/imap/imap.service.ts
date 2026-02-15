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

  /**
   * Äußerer Loop: verbindet, pollt, reconnectet bei Fehlern
   */
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

  /**
   * Einmalige Verbindung + Mailbox öffnen
   */
  private async connect() {
    this.client = new ImapFlow({
      host: this.config.getOrThrow('IMAP_HOST'),
      port: Number(this.config.get('IMAP_PORT')),
      secure: this.config.get('IMAP_TLS') === 'true',
      auth: {
        user: this.config.getOrThrow('IMAP_USER'),
        pass: this.config.get('IMAP_PASS'),
      },
    });

    this.client.on('error', (err) => {
      // dieser Handler verhindert "Unhandled 'error' event"
      this.logger.error(`IMAP error: ${err.message}`, err as any);
      // Fehler selbst führt dazu, dass die Verbindung schließt;
      // der äußere Worker-Loop merkt das über Exceptions in pollLoop/checkInbox.
    });

    this.client.on('close', () => {
      this.logger.warn('IMAP connection closed');
      // KEIN logout() und KEIN start() hier – das macht der Worker-Loop
    });

    await this.client.connect();
    await this.client.mailboxOpen('INBOX');
    this.logger.log('IMAP connected, start polling');
  }

  /**
   * Innerer Poll-Loop, bricht bei Verbindungsfehlern ab
   */
  private async pollLoop() {
    while (this.running && this.client && this.client.usable) {
      try {
        await this.checkInbox();
      } catch (err) {
        this.logger.error('Error in checkInbox', err);
        // Fehler nach außen geben → runWorker reconnectet
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
      for await (const msg of client.fetch({ seen: false }, { source: true })) {
        if (!msg.source) continue;
        const raw = msg.source;
        await this.handleIncomingMessage(raw);
        await client.messageFlagsAdd(msg.seq, ['\\Seen']);
      }
    } catch (err: unknown) {
      // Typische Fehlercodes von ImapFlow:
      //  - ETIMEOUT (Socket timeout)
      //  - NoConnection (Connection not available)
      if (
        (err as ImapError).code === 'NoConnection' ||
        (err as ImapError).code === 'ETIMEOUT'
      ) {
        this.logger.warn(`checkInbox aborted: ${(err as ImapError).code}`);
      } else {
        this.logger.error('Unexpected error in checkInbox', err);
      }
      throw err;
    }
  }

  private async handleIncomingMessage(raw: Buffer) {
    const parsed = await simpleParser(raw);

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
      }
    };

    add(parsed.to);
    add(parsed.cc);

    if (!recipients.length) {
      this.logger.warn('No recipients in To/Cc, skipping');
      return;
    }

    const lists = await this.listsRepo.find({
      where: { email: In(recipients) },
    });

    if (!lists.length) {
      this.logger.warn(`No lists for recipients ${recipients.join(', ')}`);
      return;
    }

    const subject = parsed.subject || '';
    const text = parsed.text || '';
    const html = parsed.html || undefined;

    for (const list of lists) {
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

    const isMember = !!member;
    const isAdmin = member?.role === MemberRole.ADMIN;

    if (list.mode === ListMode.OPEN) {
      await this.distributeToMembers(list, subject, text, html);
      return;
    }

    if (isAdmin) {
      await this.distributeToMembers(list, subject, text, html);
      return;
    }

    if (list.mode === ListMode.MEMBERS_ONLY && isMember) {
      await this.distributeToMembers(list, subject, text, html);
      return;
    }

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

    for (const m of members) {
      await this.mailService.sendMail({
        to: m.email,
        subject,
        text,
        html,
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

    const approveToken = this.tokenRepo.create({
      message: pending,
      token: randomUUID(),
      action: ModerationAction.APPROVE,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const rejectToken = this.tokenRepo.create({
      message: pending,
      token: randomUUID(),
      action: ModerationAction.REJECT,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await this.tokenRepo.save([approveToken, rejectToken]);

    const admins = await this.membersRepo.find({
      where: { list: { id: list.id }, role: MemberRole.ADMIN, active: true },
    });

    const baseUrl = this.config.getOrThrow<string>('PUBLIC_BASE_URL');
    const approveUrl = `${baseUrl}/moderate/${approveToken.token}`;
    const rejectUrl = `${baseUrl}/moderate/${rejectToken.token}`;

    const preview = text.slice(0, 300);

    for (const admin of admins) {
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
}
