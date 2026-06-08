import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtPayload, Role } from '@app/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/interceptors/audit-log.interceptor';
import { OrdersService } from './orders.service';
import { CheckoutDto, PlaceOrderDto, UpdateOrderStatusDto } from './dto/order.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Price a cart (fee, promo, loyalty) without placing it' })
  checkout(@CurrentUser('sub') userId: string, @Body() dto: CheckoutDto) {
    return this.orders.checkout(userId, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Place an order (instant or scheduled)' })
  place(@CurrentUser('sub') userId: string, @Body() dto: PlaceOrderDto) {
    return this.orders.place(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'My order history' })
  history(@CurrentUser('sub') userId: string) {
    return this.orders.findForUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Order detail with status timeline + tracking' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.findOne(user.sub, user.roles, id);
  }

  @Post(':id/reorder')
  @ApiOperation({ summary: 'Build a checkout payload from a past order' })
  reorder(@CurrentUser('sub') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.reorder(userId, id);
  }

  @Roles(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN, Role.KITCHEN_STAFF, Role.CASHIER, Role.RIDER)
  @Audit('ORDER_STATUS_UPDATE')
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status (staff/rider) — broadcasts via WebSocket' })
  updateStatus(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orders.updateStatus(id, dto.status, dto.note, userId);
  }
}
