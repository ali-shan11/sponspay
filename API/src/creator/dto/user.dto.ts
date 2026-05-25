import { IsString } from 'class-validator';

export class AssignCreatorRoleDTO {
  @IsString()
  uid: string;
}
