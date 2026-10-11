import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('/health')
  health() {
    return { status: 'ok', service: 'phanthienquoc-authentication' };
  }

  @Get('/ready')
  ready() {
    return { status: 'ready', database: 'not_checked' };
  }
}
