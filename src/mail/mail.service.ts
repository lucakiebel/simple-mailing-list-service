import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  unsubscribeUrl?: string;
}

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly fromName: string;
  private readonly fromEmail: string;
  private readonly logger = new Logger(MailService.name);

  constructor(private config: ConfigService) {
    this.fromName = this.config.getOrThrow('SMTP_FROM_NAME');
    this.fromEmail = this.config.getOrThrow('SMTP_FROM_EMAIL');

    this.transporter = nodemailer.createTransport({
      host: this.config.getOrThrow('SMTP_HOST'),
      port: Number(this.config.getOrThrow('SMTP_PORT')),
      secure: true,
      auth: {
        user: this.config.getOrThrow('SMTP_USER'),
        pass: this.config.getOrThrow('SMTP_PASS'),
      },
    });
  }

  async sendMail(opts: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    unsubscribeUrl?: string;
  }) {
    this.logger.verbose('Sending Email', {
      to: opts.to,
      subject: opts.subject,
    });

    let text = opts.text;
    let html = opts.html;
    const headers: Record<string, string> = {};

    if (opts.unsubscribeUrl) {
      const textFooter =
        `\n\n--\n` +
        `Wenn du keine E-Mails dieser Liste mehr erhalten möchtest, ` +
        `klicke hier: ${opts.unsubscribeUrl}\n`;

      // Plaintext-Footer anhängen
      text += textFooter;

      // HTML-Footer nur anhängen, wenn sowieso HTML vorhanden ist
      if (html) {
        const htmlFooter =
          `<hr><p style="font-size:0.9em;color:#666;">` +
          `Wenn du keine E-Mails dieser Liste mehr erhalten möchtest, ` +
          `<a href="${opts.unsubscribeUrl}">klicke hier, um dich abzumelden</a>.` +
          `</p>`;

        html += htmlFooter;
      }

      headers['List-Unsubscribe'] = `<${opts.unsubscribeUrl}>`;
      headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    }

    const info = <{ messageId: string }>await this.transporter.sendMail({
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: opts.to,
      subject: opts.subject,
      text,
      html,
      headers,
    });

    this.logger.verbose(`Email sent, messageId=${info.messageId}`);
    return info;
  }
}
