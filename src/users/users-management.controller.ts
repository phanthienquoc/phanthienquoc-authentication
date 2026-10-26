import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard, type AdminRequest } from './admin.guard';
import { RecentMfaGuard } from './recent-mfa.guard';
import { ListUsersDto } from './dto/list-users.dto';
import { RevokeUserSessionsDto } from './dto/revoke-user-sessions.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
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
  async getById(@Param('id', new ParseUUIDPipe()) id: string) {
    const result = await this.users.getById(id);
    if (!result) throw new NotFoundException('User not found');
    return result;
  }

  @UseGuards(RecentMfaGuard)
  @Patch(':id/role')
  updateRole(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateUserRoleDto,
    @Req() request: AdminRequest,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.users.updateRole({
      actorUserId: this.actorId(request),
      targetUserId: id,
      role: body.role,
      reasonCode: body.reasonCode,
      requestId,
    });
  }

  @UseGuards(RecentMfaGuard)
  @Patch(':id/status')
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateUserStatusDto,
    @Req() request: AdminRequest,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.users.updateStatus({
      actorUserId: this.actorId(request),
      targetUserId: id,
      status: body.status,
      reasonCode: body.reasonCode,
      requestId,
    });
  }

  @UseGuards(RecentMfaGuard)
  @Post(':id/revoke-sessions')
  @HttpCode(HttpStatus.OK)
  revokeSessions(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: RevokeUserSessionsDto,
    @Req() request: AdminRequest,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.users.revokeSessions({
      actorUserId: this.actorId(request),
      targetUserId: id,
      reasonCode: body.reasonCode,
      requestId,
    });
  }

  private actorId(request: AdminRequest): string {
    const actorId = request.adminPrincipal?.id;
    if (!actorId) throw new ForbiddenException('Administrator access required');
    return actorId;
  }
}
