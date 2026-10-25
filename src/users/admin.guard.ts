import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthRepository } from '../auth/auth.repository';
import { JwtService } from '../auth/jwt.service';

type AdminRequest = {
  headers?: {
    authorization?: string;
  };
};

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: AuthRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const authorization = request.headers?.authorization;

    if (!authorization?.startsWith('Bearer ') || !authorization.slice(7).trim()) {
      throw new UnauthorizedException('Bearer token required');
    }

    const claims = this.jwt.verify(authorization.slice(7).trim());
    if (claims.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }

    const user = await this.users.findById(claims.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired access token');
    }
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
