import {
  createParamDecorator,
  SetMetadata,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Role } from './types.js';

/** The caller, as decoded from their access token by JwtAuthGuard. */
export interface AuthUser {
  id: string;
  role: Role;
  name: string;
}

export type AuthenticatedRequest = Request & { user?: AuthUser };

export const IS_PUBLIC_KEY = 'isPublic';
/** Skips the access-token check (every route requires one by default). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
/** Restricts a route to the given roles. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser => {
    const user = ctx.switchToHttp().getRequest<AuthenticatedRequest>().user;
    // JwtAuthGuard runs first on every non-public route, so this only fails on a wiring mistake.
    if (!user)
      throw new Error('CurrentUser used on a route without authentication');
    return user;
  },
);
