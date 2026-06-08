import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthTokens, JwtPayload, Role } from '@app/shared';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtRefreshGuard } from '../common/guards/jwt-refresh.guard';
import { Audit } from '../common/interceptors/audit-log.interceptor';
import { OAuthProfile } from './strategies/google.strategy';
import {
  Enable2faVerifyDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterCustomerDto,
  RegisterRiderDto,
  RequestOtpDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private isProd(): boolean {
    return this.config.get<string>('env') === 'production';
  }

  /** Sets access + refresh tokens as httpOnly cookies (never localStorage). */
  private setAuthCookies(res: Response, tokens: AuthTokens): void {
    const secure = this.isProd();
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/api/auth' });
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new customer' })
  registerCustomer(@Body() dto: RegisterCustomerDto) {
    return this.auth.registerCustomer(dto);
  }

  @Public()
  @Post('rider/register')
  @ApiOperation({ summary: 'Register a rider (CNIC upload, pending admin approval)' })
  registerRider(@Body() dto: RegisterRiderDto) {
    return this.auth.registerRider(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email/phone + password (+ TOTP for admins)' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.login(dto);
    this.setAuthCookies(res, tokens);
    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  @Public()
  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request an OTP code via SMS' })
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto.phone);
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a phone OTP code' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a password-reset OTP' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using OTP code' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate access + refresh tokens' })
  async refresh(@CurrentUser() user: JwtPayload, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.refresh(user);
    this.setAuthCookies(res, tokens);
    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke all refresh tokens' })
  async logout(@CurrentUser('sub') userId: string, @Res({ passthrough: true }) res: Response) {
    this.clearAuthCookies(res);
    return this.auth.logout(userId);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Current authenticated user (from JWT)' })
  me(@CurrentUser() user: JwtPayload) {
    return user;
  }

  // ── 2FA setup (admins) ─────────────────────────────────
  @ApiBearerAuth()
  @Roles(Role.SUPER_ADMIN, Role.RESTAURANT_ADMIN)
  @Audit('2FA_SETUP_BEGIN')
  @Post('2fa/setup')
  @ApiOperation({ summary: 'Begin TOTP 2FA setup (returns QR code)' })
  begin2fa(@CurrentUser('sub') userId: string) {
    return this.auth.begin2faSetup(userId);
  }

  @ApiBearerAuth()
  @Roles(Role.SUPER_ADMIN, Role.RESTAURANT_ADMIN)
  @Audit('2FA_ENABLED')
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm and enable TOTP 2FA' })
  confirm2fa(@CurrentUser('sub') userId: string, @Body() dto: Enable2faVerifyDto) {
    return this.auth.confirm2fa(userId, dto.totp);
  }

  // ── OAuth: Google ──────────────────────────────────────
  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth2 login' })
  googleAuth(): void {
    // Guard redirects to Google.
  }

  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google/callback')
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = await this.auth.oauthLogin(req.user as OAuthProfile);
    this.setAuthCookies(res, tokens);
    res.redirect(this.frontendRedirect());
  }

  // ── OAuth: Facebook ────────────────────────────────────
  @Public()
  @UseGuards(AuthGuard('facebook'))
  @Get('facebook')
  @ApiOperation({ summary: 'Initiate Facebook OAuth2 login' })
  facebookAuth(): void {
    // Guard redirects to Facebook.
  }

  @Public()
  @UseGuards(AuthGuard('facebook'))
  @Get('facebook/callback')
  async facebookCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = await this.auth.oauthLogin(req.user as OAuthProfile);
    this.setAuthCookies(res, tokens);
    res.redirect(this.frontendRedirect());
  }

  private frontendRedirect(): string {
    const origins = this.config.get<string[]>('corsOrigins') ?? ['http://localhost:3000'];
    return `${origins[0]}/auth/callback`;
  }
}
