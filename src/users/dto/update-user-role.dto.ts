import { IsIn } from 'class-validator';
import { AdminActionDto } from './admin-action.dto';

export class UpdateUserRoleDto extends AdminActionDto {
  @IsIn(['USER', 'ADMIN'])
  role!: 'USER' | 'ADMIN';
}
