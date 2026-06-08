# API Reference

Base URL: `http://localhost:4000/api` · Interactive docs: `/api/docs` (Swagger).

All protected routes require the `access_token` httpOnly cookie (set on login) or
an `Authorization: Bearer <token>` header. Tokens are never stored in localStorage.

## Auth

| Method | Path                     | Auth   | Description                                  |
|--------|--------------------------|--------|----------------------------------------------|
| POST   | `/auth/register`         | public | Register a customer                          |
| POST   | `/auth/rider/register`   | public | Register a rider (CNIC, pending approval)    |
| POST   | `/auth/login`            | public | Login (+ `totp` for admins with 2FA)         |
| POST   | `/auth/otp/request`      | public | Send SMS OTP                                 |
| POST   | `/auth/otp/verify`       | public | Verify phone OTP                             |
| POST   | `/auth/forgot-password`  | public | Send password-reset OTP                      |
| POST   | `/auth/reset-password`   | public | Reset password using OTP                     |
| POST   | `/auth/refresh`          | cookie | Rotate access + refresh tokens               |
| POST   | `/auth/logout`           | jwt    | Revoke all refresh tokens                    |
| GET    | `/auth/me`               | jwt    | Current user from JWT                        |
| POST   | `/auth/2fa/setup`        | admin  | Begin TOTP setup (returns QR data URL)       |
| POST   | `/auth/2fa/verify`       | admin  | Confirm + enable TOTP                        |
| GET    | `/auth/google`           | public | Start Google OAuth2                          |
| GET    | `/auth/google/callback`  | public | Google OAuth2 callback                       |
| GET    | `/auth/facebook`         | public | Start Facebook OAuth2                        |
| GET    | `/auth/facebook/callback`| public | Facebook OAuth2 callback                     |

### Examples

```bash
# Register
curl -X POST localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"jane@example.com","password":"StrongP@ss1","fullName":"Jane Doe"}'

# Login (stores httpOnly cookies)
curl -i -X POST localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"jane@example.com","password":"StrongP@ss1"}'
```

## Health

| Method | Path       | Auth   | Description                  |
|--------|------------|--------|------------------------------|
| GET    | `/health`  | public | DB + Redis readiness probe   |

> The full, always-current contract is auto-generated at `/api/docs` and can be
> exported as OpenAPI JSON (`/api/docs-json`) for the Flutter / mobile team.
