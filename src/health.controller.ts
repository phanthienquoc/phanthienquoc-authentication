import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AuthRepository } from './auth/auth.repository';

@Controller()
export class HealthController {
  constructor(private readonly authRepository: AuthRepository) {}

  @Get('/health')
  health() {
    return { status: 'ok', service: 'phanthienquoc-authentication' };
  }

  @Get('/ready')
  async ready() {
    try {
      await this.authRepository.ready();
      return { status: 'ready', database: 'connected' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        service: 'phanthienquoc-authentication',
        database: 'unavailable',
      });
    }
  }
}
