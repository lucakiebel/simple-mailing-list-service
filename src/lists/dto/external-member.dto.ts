export class ExternalMemberDto {
  externalId: string;
  email: string;
  name?: string;
}

export class SyncMemberDto {
  source: string;
  members: ExternalMemberDto[];
}
