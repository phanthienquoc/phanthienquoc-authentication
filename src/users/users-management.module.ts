import { Module } from '@nestjs/common';
import { JwtService } from '../auth/jwt.service';
import { SupabaseClientService } from '../db/supabase.client';
import { AdminGuard } from './admin.guard';
import { UsersManagementController } from './users-management.controller';
import { UsersManagementService } from './users-management.service';

@Module({
  controllers: [UsersManagementController],
  providers: [SupabaseClientService, JwtService, AdminGuard, UsersManagementService],
})
export class UsersManagementModule {}
