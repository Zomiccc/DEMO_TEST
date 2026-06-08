import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthTokens, JwtPayload, Role, TWO_FACTOR_REQUIRED_ROLES } from '@app/shared';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CryptoService } from '../common/crypto/crypto.service';
import { TokenService } from './services/token.service';
import { OtpService } from './services/otp.service';
import { TotpService } from './services/totp.service';
import { OAuthProfile } from './strategies/google.strategy';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterCustomerDto,
  RegisterRiderDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly tokens: TokenService,
    private readonly otp: OtpService,
    private readonly totp: TotpService,
    private readonly crypto: CryptoService,
    private readonly config: ConfigService,
  ) {}

  private hash(password: string): Promise<string> {
    const rounds = this.config.get<number>('security.bcryptRounds') ?? 12;
    return bcrypt.hash(password, rounds);
  }

  // ── Customer registration ──────────────────────────────
  async registerCustomer(dto: RegisterCustomerDto): Promise<{ id: string }> {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Either email or phone is required.');
    }
    if (dto.email && (await this.users.findByEmail(dto.email))) {
      throw new ConflictException('Email already registered.');
    }
    if (dto.phone && (await this.users.findByPhone(dto.phone))) {
      throw new ConflictException('Phone already registered.');
    }

    const user = await this.users.create({
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      passwordHash: await this.hash(dto.password),
      fullName: dto.fullName,
      roles: [Role.CUSTOMER],
      wallet: { create: {} },
      loyalty: { create: {} },
    });

    if (dto.phone) await this.otp.sendOtp(dto.phone);
    return { id: user.id };
  }

  // ── Rider registration (pending admin approval) ────────
  async registerRider(dto: RegisterRiderDto): Promise<{ id: string; status: string }> {
    if (await this.users.findByPhone(dto.phone)) {
      throw new ConflictException('Phone already registered.');
    }
    const user = await this.users.create({
      phone: dto.phone,
      fullName: dto.fullName,
      passwordHash: await this.hash(dto.password),
      roles: [Role.RIDER],
      rider: {
        create: {
          // CNIC stored encrypted at rest (AES-256)
          cnic: this.crypto.encrypt(dto.cnic),
          cnicImageUrl: dto.cnicImageUrl,
          vehicleType: dto.vehicleType,
          vehiclePlate: dto.vehiclePlate,
        },
      },
    });
    await this.otp.sendOtp(dto.phone);
    return { id: user.id, status: 'PENDING_APPROVAL' };
  }

  // ── Login (password + optional TOTP for admins) ────────
  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = dto.email
      ? await this.users.findByEmail(dto.email)
      : dto.phone
        ? await this.users.findByPhone(dto.phone)
        : null;

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials.');
    }
    if (!user.isActive) throw new UnauthorizedException('Account disabled.');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials.');

    const roles = user.roles as Role[];
    const needs2fa = roles.some((r) => TWO_FACTOR_REQUIRED_ROLES.includes(r));
    if (needs2fa && user.twoFactorEnabled) {
      if (!dto.totp) throw new UnauthorizedException('2FA code required.');
      const secret = user.twoFactorSecret ? this.crypto.decrypt(user.twoFactorSecret) : '';
      if (!this.totp.verify(dto.totp, secret)) {
        throw new UnauthorizedException('Invalid 2FA code.');
      }
    }

    await this.users.markLoggedIn(user.id);
    return this.tokens.issueTokens({
      userId: user.id,
      email: user.email,
      phone: user.phone,
      roles,
    });
  }

  // ── OTP verification (phone confirmation) ──────────────
  async verifyOtp(dto: VerifyOtpDto): Promise<{ verified: true }> {
    await this.otp.verifyOtp(dto.phone, dto.code);
    const user = await this.users.findByPhone(dto.phone);
    if (user) await this.users.update(user.id, { isPhoneVerified: true });
    return { verified: true };
  }

  async requestOtp(phone: string): Promise<{ sent: true }> {
    await this.otp.sendOtp(phone);
    return { sent: true };
  }

  // ── Password reset via OTP ─────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ sent: true }> {
    // Always respond success to avoid user enumeration.
    const user = await this.users.findByPhone(dto.phone);
    if (user) await this.otp.sendOtp(dto.phone);
    return { sent: true };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ reset: true }> {
    await this.otp.verifyOtp(dto.phone, dto.code);
    const user = await this.users.findByPhone(dto.phone);
    if (!user) throw new BadRequestException('No account for this phone.');
    await this.users.update(user.id, { passwordHash: await this.hash(dto.newPassword) });
    await this.tokens.revokeAll(user.id);
    return { reset: true };
  }

  // ── Refresh-token rotation ─────────────────────────────
  refresh(payload: JwtPayload): Promise<AuthTokens> {
    return this.tokens.rotate(payload);
  }

  async logout(userId: string): Promise<{ ok: true }> {
    await this.tokens.revokeAll(userId);
    return { ok: true };
  }

  // ── OAuth (Google / Facebook) ──────────────────────────
  async oauthLogin(profile: OAuthProfile): Promise<AuthTokens> {
    let user = await this.users.findByProvider(profile.provider, profile.providerId);
    if (!user && profile.email) {
      user = await this.users.findByEmail(profile.email);
    }
    if (!user) {
      user = await this.users.create({
        email: profile.email ?? null,
        fullName: profile.fullName,
        avatarUrl: profile.avatarUrl,
        authProvider: profile.provider,
        providerId: profile.providerId,
        isEmailVerified: !!profile.email,
        roles: [Role.CUSTOMER],
        wallet: { create: {} },
        loyalty: { create: {} },
      });
    }
    return this.tokens.issueTokens({
      userId: user.id,
      email: user.email,
      phone: user.phone,
      roles: user.roles as Role[],
    });
  }

  // ── 2FA (TOTP) setup for admins ────────────────────────
  async begin2faSetup(userId: string): Promise<{ qrDataUrl: string; otpauthUrl: string }> {
    const user = await this.users.getByIdOrThrow(userId);
    const secret = this.totp.generateSecret();
    await this.users.update(userId, { twoFactorSecret: this.crypto.encrypt(secret) });
    return this.totp.buildQrCode(user.email ?? user.phone ?? user.id, secret);
  }

  async confirm2fa(userId: string, token: string): Promise<{ enabled: true }> {
    const user = await this.users.getByIdOrThrow(userId);
    if (!user.twoFactorSecret) throw new BadRequestException('Start 2FA setup first.');
    const secret = this.crypto.decrypt(user.twoFactorSecret);
    if (!this.totp.verify(token, secret)) {
      throw new BadRequestException('Invalid TOTP code.');
    }
    await this.users.update(userId, { twoFactorEnabled: true });
    return { enabled: true };
  }
}
