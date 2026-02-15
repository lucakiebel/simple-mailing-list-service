import { ListMode } from '../list.entity';

export class CreateListDto {
  name: string;
  email: string; // z.B. mitglieder@verein.de
  mode?: ListMode;
}
