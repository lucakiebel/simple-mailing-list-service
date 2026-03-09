import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { List, ListMode } from './list.entity';
import { ListMember, MemberRole } from './list-member.entity';
import { CreateListDto } from './dto/create-list.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { randomUUID } from 'crypto';
import { ExternalMemberDto } from './dto/external-member.dto';

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

  async updateListMode(id: number, mode: ListMode) {
    const list = await this.findList(id);
    list.mode = mode;
    return this.listsRepo.save(list);
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
      relations: ['list'],
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

  async changeMemberRole(
    memberId: number,
    role: MemberRole,
  ): Promise<ListMember> {
    const member = await this.membersRepo.findOne({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Member not found');
    member.role = role;
    return this.membersRepo.save(member);
  }

  async findMemberByUnsubscribeToken(token: string): Promise<ListMember> {
    const member = await this.membersRepo.findOne({
      where: { unsubscribeToken: token },
      relations: ['list'],
    });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async syncMembersFromExternal(
    listId: number,
    source: string,
    externalMembers: ExternalMemberDto[],
  ): Promise<void> {
    const list = await this.findList(listId);

    await this.membersRepo.manager.transaction(async (em) => {
      const repo = em.getRepository(ListMember);

      const existing = await repo.find({
        where: { list: { id: list.id }, source },
      });

      const existingByExtId = new Map(
        existing
          .filter((m) => m.externalId)
          .map((m) => [m.externalId as string, m]),
      );

      const seen = new Set<string>();

      for (const ext of externalMembers) {
        const email = ext.email.toLowerCase();
        seen.add(ext.externalId);

        const current = existingByExtId.get(ext.externalId);

        if (!current) {
          const member = repo.create({
            list,
            email,
            name: ext.name,
            role: MemberRole.MEMBER,
            active: true,
            unsubscribeToken: randomUUID(),
            externalId: ext.externalId,
            source,
          });
          await repo.save(member);
        } else {
          let changed = false;

          if (current.email !== email) {
            current.email = email;
            changed = true;
          }
          if (ext.name && current.name !== ext.name) {
            current.name = ext.name;
            changed = true;
          }

          if (!current.active) {
            changed = true;
          }

          if (changed) {
            await repo.save(current);
          }
        }
      }

      const toDeactivate = existing.filter(
        (m) => m.externalId && !seen.has(m.externalId),
      );
      for (const m of toDeactivate) {
        m.active = false;
        //optional: repo.remove(m)
      }
      if (toDeactivate.length > 0) {
        await repo.save(toDeactivate);
      }
    });
  }
}
