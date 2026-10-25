import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { ListUsersDto } from './dto/list-users.dto';
import { UsersManagementService } from './users-management.service';

@Controller('admin/users')
@UseGuards(AdminGuard)
export class UsersManagementController {
  constructor(private readonly users: UsersManagementService) {}

  @Get()
  list(@Query() query: ListUsersDto) {
    return this.users.list(query);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const result = await this.users.getById(id);
    if (!result) throw new NotFoundException('User not found');
    return result;
  }
}
