import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { List, ListMode } from './list.entity';
import { ListMember, MemberRole } from './list-member.entity';
import { CreateListDto } from './dto/create-list.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class ListsService {
  constructor(
    @InjectRepository(List) private listsRepo: Repository<List>,
    @InjectRepository(ListMember) private membersRepo: Repository<ListMember>,
  ) {}

  async createList(dto: CreateListDto): Promise<List> {
    const list = this.listsRepo.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      mode: dto.mode ?? ListMode.MODERATED,
    });
    return this.listsRepo.save(list);
  }

  async findAllLists(): Promise<List[]> {
    return this.listsRepo.find();
  }

  async findList(id: number): Promise<List> {
    const list = await this.listsRepo.findOne({ where: { id } });
    if (!list) throw new NotFoundException('List not found');
    return list;
  }

  async addMember(listId: number, dto: CreateMemberDto): Promise<ListMember> {
    const list = await this.findList(listId);

    const member = this.membersRepo.create({
      list,
      email: dto.email.toLowerCase(),
      name: dto.name,
      role: dto.role ?? MemberRole.MEMBER,
      active: dto.active ?? true,
      unsubscribeToken: randomUUID(),
    });

    return this.membersRepo.save(member);
  }

  async listMembers(listId: number): Promise<ListMember[]> {
    const list = await this.findList(listId);
    return this.membersRepo.find({
      where: { list: { id: list.id } },
      relations: ['lists'],
    });
  }

  async setMemberActive(
    memberId: number,
    active: boolean,
  ): Promise<ListMember> {
    const member = await this.membersRepo.findOne({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Member not found');
    member.active = active;
    return this.membersRepo.save(member);
  }

  async findMemberByUnsubscribeToken(token: string): Promise<ListMember> {
    const member = await this.membersRepo.findOne({
      where: { unsubscribeToken: token },
      relations: ['lists'],
    });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }
}
