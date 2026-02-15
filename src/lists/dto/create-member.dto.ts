import { MemberRole } from '../list-member.entity';

export class CreateMemberDto {
  email: string;
  name?: string;
  role?: MemberRole;
  active?: boolean;
}
