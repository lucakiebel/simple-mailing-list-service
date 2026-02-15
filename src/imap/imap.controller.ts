import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ImapService } from './imap.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('debug/imap')
export class ImapController {
  constructor(private readonly imapService: ImapService) {}

  @Get('messages')
  @Public()
  async listMessages() {
    if (process.env.NODE_ENV === 'production') {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }
    return this.imapService.listInboxMessages();
  }
}
