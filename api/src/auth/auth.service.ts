import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hashPassword, verifyPassword } from '../common/password.js';
import type { AuthResult, Role } from '../common/types.js';
import { UsersRepository } from '../data/users.repository.js';

export interface JwtPayload {
  sub: string;
  role: Role;
  name: string;
}

@Injectable()
export class AuthService {
  // Checked against when the email is unknown, so both failure cases take the same time.
  private readonly dummyHash = hashPassword('not-a-real-password');

  constructor(
    private readonly users: UsersRepository,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.users.findByEmail(email);
    const valid = await verifyPassword(
      password,
      user?.passwordHash ?? (await this.dummyHash),
    );
    if (!user || !valid)
      throw new UnauthorizedException('Invalid email or password.');

    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      name: user.name,
    };
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken: await this.jwt.signAsync(payload),
    };
  }
}
