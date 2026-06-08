import { Role } from './roles';

/** Decoded JWT access-token payload attached to every authenticated request. */
export interface JwtPayload {
  sub: string;
  email: string | null;
  phone: string | null;
  roles: Role[];
  /** token id, used for refresh-token rotation/revocation */
  jti?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}
