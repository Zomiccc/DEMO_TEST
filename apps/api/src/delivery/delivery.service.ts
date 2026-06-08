import { Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryZone } from '@prisma/client';
import { GeoPoint, haversineKm } from '@app/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateZoneDto, UpdateZoneDto } from './dto/delivery.dto';

const PEAK_KEY = 'delivery:peak';

export interface DeliveryQuote {
  deliverable: boolean;
  distanceKm: number;
  fee: number;
  zoneId: string | null;
  zoneName: string | null;
  reason?: string;
  peakActive: boolean;
}

@Injectable()
export class DeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ── Zone management ────────────────────────────────────
  listZones(branchId: string): Promise<DeliveryZone[]> {
    return this.prisma.deliveryZone.findMany({
      where: { branchId },
      orderBy: { minKm: 'asc' },
    });
  }

  createZone(dto: CreateZoneDto): Promise<DeliveryZone> {
    return this.prisma.deliveryZone.create({ data: dto });
  }

  async updateZone(id: string, dto: UpdateZoneDto): Promise<DeliveryZone> {
    const zone = await this.prisma.deliveryZone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException('Zone not found');
    return this.prisma.deliveryZone.update({ where: { id }, data: dto });
  }

  async removeZone(id: string): Promise<{ deleted: true }> {
    await this.prisma.deliveryZone.delete({ where: { id } });
    return { deleted: true };
  }

  // ── Peak-hour toggle ───────────────────────────────────
  async setPeak(enabled: boolean): Promise<{ peakActive: boolean }> {
    if (enabled) await this.redis.client.set(PEAK_KEY, '1');
    else await this.redis.del(PEAK_KEY);
    return { peakActive: enabled };
  }

  async isPeakActive(): Promise<boolean> {
    return (await this.redis.get(PEAK_KEY)) === '1';
  }

  /**
   * Core fee engine + geofencing.
   * Tiers (seeded defaults): 0-7km free, 7-10km Rs.200, 10km+ disabled unless an
   * enabled zone with a per-km rate (e.g. Rs.150/km) covers the distance.
   * Peak multiplier applies when the global peak toggle is on.
   */
  async quote(branchId: string, dest: GeoPoint): Promise<DeliveryQuote> {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new NotFoundException('Branch not found');

    const distanceKm = Number(
      haversineKm({ lat: branch.lat, lng: branch.lng }, dest).toFixed(2),
    );
    const peakActive = await this.isPeakActive();

    const zones = await this.prisma.deliveryZone.findMany({ where: { branchId } });
    const zone = zones.find((z) => distanceKm >= z.minKm && distanceKm <= z.maxKm);

    if (!zone) {
      return {
        deliverable: false,
        distanceKm,
        fee: 0,
        zoneId: null,
        zoneName: null,
        reason: 'No delivery zone covers this distance.',
        peakActive,
      };
    }
    if (!zone.isEnabled) {
      return {
        deliverable: false,
        distanceKm,
        fee: 0,
        zoneId: zone.id,
        zoneName: zone.name,
        reason: 'Delivery to this distance is currently disabled.',
        peakActive,
      };
    }

    const perKm = zone.perKmRate ? Number(zone.perKmRate) : null;
    let fee = perKm !== null ? perKm * distanceKm : Number(zone.fee);
    if (peakActive) fee *= Number(zone.peakMultiplier);

    return {
      deliverable: true,
      distanceKm,
      fee: Number(fee.toFixed(2)),
      zoneId: zone.id,
      zoneName: zone.name,
      peakActive,
    };
  }
}
