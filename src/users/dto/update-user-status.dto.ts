import { IsIn } from 'class-validator';
import { AdminActionDto } from './admin-action.dto';

export class UpdateUserStatusDto extends AdminActionDto {
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status!: 'ACTIVE' | 'SUSPENDED';
}
