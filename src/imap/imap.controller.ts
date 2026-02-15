import { Controller, Get, Query } from '@nestjs/common';
import { ImapService } from './imap.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('debug/imap')
export class ImapController {
  constructor(private readonly imapService: ImapService) {}

  @Get('messages')
  @Public()
  async listMessages() {
    return this.imapService.listInboxMessages();
  }
}
