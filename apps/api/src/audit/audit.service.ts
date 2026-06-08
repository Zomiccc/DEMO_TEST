import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/** Persists every admin/sensitive action to the audit_logs table. */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId ?? null,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          ip: entry.ip,
          userAgent: entry.userAgent,
          metadata: entry.metadata as object | undefined,
        },
      });
    } catch (err) {
      // Audit logging must never break the request path.
      this.logger.error(`Failed to write audit log: ${(err as Error).message}`);
    }
  }
}
