// src/lists/lists.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { ListsService } from './lists.service';
import { CreateListDto } from './dto/create-list.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import type { Response } from 'express';
import { SyncMemberDto } from './dto/external-member.dto';

@Controller('lists')
@ApiBearerAuth()
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Post()
  @Roles('admin')
  createList(@Body() dto: CreateListDto) {
    return this.listsService.createList(dto);
  }

  @Get()
  @Roles('admin')
  getLists() {
    return this.listsService.findAllLists();
  }

  @Get(':id')
  @Roles('admin')
  getList(@Param('id') id: string) {
    return this.listsService.findList(Number(id));
  }

  @Get(':id/members')
  @Roles('admin')
  getMembers(@Param('id') id: string) {
    return this.listsService.listMembers(Number(id));
  }

  @Post(':id/members')
  @Roles('admin')
  addMember(@Param('id') id: string, @Body() dto: CreateMemberDto) {
    return this.listsService.addMember(Number(id), dto);
  }

  @Patch('members/:memberId/active')
  @Roles('admin')
  setMemberActive(
    @Param('memberId') memberId: string,
    @Query('active') active: string,
  ) {
    return this.listsService.setMemberActive(
      Number(memberId),
      active !== 'false',
    );
  }

  @Get('unsubscribe/:token')
  @Public()
  async unsubscribe(@Param('token') token: string, @Res() res: Response) {
    const member = await this.listsService.findMemberByUnsubscribeToken(token);

    if (!member) {
      return res.status(404).send('Ungültiger oder abgelaufener Abmeldelink.');
    }

    if (!member.active) {
      return res.send(
        `Du bist bereits von der Liste "${member.list.name}" abgemeldet.`,
      );
    }

    await this.listsService.setMemberActive(member.id, false);

    return res.send(
      `Du wurdest von der Liste "${member.list.name}" abgemeldet.`,
    );
  }

  @Put(':id/sync-members')
  @Roles('admin')
  syncMembers(@Param('id') id: string, @Body() dto: SyncMemberDto) {
    return this.listsService.syncMembersFromExternal(
      Number(id),
      dto.source,
      dto.members,
    );
  }
}
