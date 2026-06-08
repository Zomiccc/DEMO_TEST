import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-facebook';
import { OAuthProfile } from './google.strategy';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('oauth.facebook.clientId') || 'missing',
      clientSecret: config.get<string>('oauth.facebook.clientSecret') || 'missing',
      callbackURL: config.get<string>('oauth.facebook.callbackUrl') || 'http://localhost:4000/api/auth/facebook/callback',
      profileFields: ['id', 'emails', 'name', 'displayName', 'photos'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (err: unknown, user: OAuthProfile) => void,
  ): void {
    const user: OAuthProfile = {
      provider: 'FACEBOOK',
      providerId: profile.id,
      email: profile.emails?.[0]?.value ?? null,
      fullName: profile.displayName ?? null,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };
    done(null, user);
  }
}
