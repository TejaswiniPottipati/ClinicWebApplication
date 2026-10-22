import { Controller, Get } from '@nestjs/common';
import { Public } from './common/auth.decorators.js';

@Controller()
export class AppController {
  /** Liveness check for local tooling and deployments. */
  @Public()
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
