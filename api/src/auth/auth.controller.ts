import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Public } from '../common/auth.decorators.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './login.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Doctors and patients sign in here; the token's role decides what they can access. */
  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }
}
