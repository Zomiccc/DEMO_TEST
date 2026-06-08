/** Order lifecycle statuses (keep in sync with Prisma `OrderStatus`). */
export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  ASSIGNED = 'ASSIGNED',
  PICKED_UP = 'PICKED_UP',
  ON_THE_WAY = 'ON_THE_WAY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

/** WebSocket event names shared between server and all clients. */
export const WS_EVENTS = {
  ORDER_STATUS_UPDATED: 'order:status_updated',
  RIDER_LOCATION: 'rider:location',
  KDS_UPDATE: 'kds:update',
  NEW_ORDER: 'order:new',
  RIDER_ASSIGNMENT: 'rider:assignment',
} as const;

/**
 * Default delivery distance pricing tiers (in km).
 * 0–7km free, 7–10km Rs.200, above 10km disabled by default.
 */
export const DELIVERY_TIERS = {
  FREE_RADIUS_KM: 7,
  MID_RADIUS_KM: 10,
  MID_FEE: 200,
  EXTENDED_PER_KM_DEFAULT: 150,
} as const;

export const RIDER_GPS_BROADCAST_MS = 4000;
export const RIDER_ACCEPT_TIMEOUT_S = 30;

/** Redis key namespaces. */
export const REDIS_KEYS = {
  otp: (channel: string) => `otp:${channel}`,
  refreshToken: (userId: string, jti: string) => `rt:${userId}:${jti}`,
  session: (userId: string) => `session:${userId}`,
  riderGeo: 'geo:riders',
  rateLimit: (id: string) => `rl:${id}`,
} as const;
