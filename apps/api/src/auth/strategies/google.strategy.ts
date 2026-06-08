import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

export interface OAuthProfile {
  provider: 'GOOGLE' | 'FACEBOOK';
  providerId: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('oauth.google.clientId') || 'missing',
      clientSecret: config.get<string>('oauth.google.clientSecret') || 'missing',
      callbackURL: config.get<string>('oauth.google.callbackUrl') || 'http://localhost:4000/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback): void {
    const user: OAuthProfile = {
      provider: 'GOOGLE',
      providerId: profile.id,
      email: profile.emails?.[0]?.value ?? null,
      fullName: profile.displayName ?? null,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };
    done(null, user);
  }
}
