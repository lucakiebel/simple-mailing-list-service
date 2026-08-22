import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ImapService } from './imap.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller()
export class ImapController {
  constructor(private readonly imapService: ImapService) {}

  @Get('imap/status')
  @Roles('admin')
  @ApiBearerAuth()
  getStatus() {
    return this.imapService.getStatus();
  }

  @Get('debug/imap/messages')
  @Public()
  async listMessages() {
    if (process.env.NODE_ENV === 'production') {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }
    return this.imapService.listInboxMessages();
  }
}
