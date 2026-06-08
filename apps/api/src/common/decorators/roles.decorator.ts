import { SetMetadata } from '@nestjs/common';
import { Role } from '@app/shared';

export const ROLES_KEY = 'roles';

/** Restricts a route to one or more RBAC roles. Used with RolesGuard. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
