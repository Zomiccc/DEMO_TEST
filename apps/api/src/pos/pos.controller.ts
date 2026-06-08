import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@app/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/interceptors/audit-log.interceptor';
import { PosService } from './pos.service';

@ApiTags('POS')
@ApiBearerAuth()
@Controller('pos')
export class PosController {
  constructor(private readonly pos: PosService) {}

  @Roles(Role.CASHIER, Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Audit('POS_ORDER')
  @Post()
  @ApiOperation({ summary: 'Create POS dine-in / takeaway order' })
  create(
    @CurrentUser('sub') cashierId: string,
    @Body() dto: { branchId: string; type: 'DINE_IN' | 'TAKEAWAY'; tableNumber?: string; items: { productId: string; quantity: number }[]; paymentMethod: 'CASH' | 'CARD' | 'WALLET' },
  ) {
    return this.pos.createPosOrder(cashierId, dto);
  }

  @Roles(Role.CASHIER, Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN)
  @Get()
  @ApiOperation({ summary: 'List POS orders for a branch' })
  list(@Query('branchId') branchId: string) {
    return this.pos.posOrders(branchId);
  }
}
