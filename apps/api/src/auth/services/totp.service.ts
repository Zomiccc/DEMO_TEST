import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';

/**
 * TOTP (Google Authenticator) for Super Admin / Restaurant Admin 2FA.
 * Secrets are encrypted (AES-256) before persistence by the caller.
 */
@Injectable()
export class TotpService {
  constructor(private readonly config: ConfigService) {}

  generateSecret(): string {
    return authenticator.generateSecret();
  }

  async buildQrCode(accountName: string, secret: string): Promise<{ otpauthUrl: string; qrDataUrl: string }> {
    const issuer = this.config.get<string>('security.totpIssuer') ?? 'RMS-Platform';
    const otpauthUrl = authenticator.keyuri(accountName, issuer, secret);
    const qrDataUrl = await toDataURL(otpauthUrl);
    return { otpauthUrl, qrDataUrl };
  }

  verify(token: string, secret: string): boolean {
    return authenticator.verify({ token, secret });
  }
}
