/**
 * Canonical RBAC roles for the entire ecosystem.
 * Keep in sync with the Prisma `Role` enum.
 */
export enum Role {
  CUSTOMER = 'CUSTOMER',
  RIDER = 'RIDER',
  RESTAURANT_ADMIN = 'RESTAURANT_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  KITCHEN_STAFF = 'KITCHEN_STAFF',
  CASHIER = 'CASHIER',
}

/** Roles that must authenticate with TOTP 2FA. */
export const TWO_FACTOR_REQUIRED_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.RESTAURANT_ADMIN,
];

/** Roles considered "staff/admin" for back-office dashboards. */
export const STAFF_ROLES: Role[] = [
  Role.RESTAURANT_ADMIN,
  Role.SUPER_ADMIN,
  Role.KITCHEN_STAFF,
  Role.CASHIER,
];
