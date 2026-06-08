import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload, Role } from '@app/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';

/** Enforces RBAC at the middleware/guard level on every protected route. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    if (!user?.roles?.length) {
      throw new ForbiddenException('No roles assigned to this user.');
    }

    const allowed = user.roles.some((role) => requiredRoles.includes(role));
    if (!allowed) {
      throw new ForbiddenException('Insufficient role permissions.');
    }
    return true;
  }
}
