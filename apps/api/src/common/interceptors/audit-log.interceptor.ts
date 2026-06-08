import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { JwtPayload } from '@app/shared';
import { AuditService } from '../../audit/audit.service';

export const AUDIT_ACTION_KEY = 'auditAction';

/** Decorator: tag a controller handler with an action name to auto-audit it. */
export const Audit = (action: string) => SetMetadata(AUDIT_ACTION_KEY, action);

/**
 * Logs every handler tagged with @Audit() to audit_logs after success,
 * capturing user_id, action, ip, user-agent and timestamp.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.get<string>(AUDIT_ACTION_KEY, context.getHandler());
    if (!action) return next.handle();

    const req = context.switchToHttp().getRequest();
    const user: JwtPayload | undefined = req.user;
    const ip = (req.headers['x-forwarded-for'] as string) ?? req.ip;

    return next.handle().pipe(
      tap(() => {
        void this.audit.log({
          userId: user?.sub ?? null,
          action,
          entity: req.route?.path,
          ip,
          userAgent: req.headers['user-agent'],
          metadata: { method: req.method, params: req.params },
        });
      }),
    );
  }
}
