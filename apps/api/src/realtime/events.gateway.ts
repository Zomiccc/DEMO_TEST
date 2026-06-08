import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WS_EVENTS } from '@app/shared';

/**
 * Central WebSocket gateway for real-time concerns:
 *  - live order status timeline (per-order room)
 *  - rider GPS broadcast (per-order room)
 *  - KDS updates (per-branch kitchen room)
 * Clients join the rooms relevant to them; the server emits via the helper methods.
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class EventsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket): void {
    this.logger.debug(`WS client connected: ${client.id}`);
  }

  @SubscribeMessage('order:subscribe')
  subscribeOrder(@ConnectedSocket() client: Socket, @MessageBody() orderId: string): void {
    client.join(this.orderRoom(orderId));
  }

  @SubscribeMessage('kds:subscribe')
  subscribeKds(@ConnectedSocket() client: Socket, @MessageBody() branchId: string): void {
    client.join(this.kdsRoom(branchId));
  }

  @SubscribeMessage('rider:subscribe')
  subscribeRider(@ConnectedSocket() client: Socket, @MessageBody() riderId: string): void {
    client.join(this.riderRoom(riderId));
  }

  @SubscribeMessage('user:subscribe')
  subscribeUser(@ConnectedSocket() client: Socket, @MessageBody() userId: string): void {
    client.join(this.userRoom(userId));
  }

  // ── Server-side emit helpers (called by services) ──────
  emitOrderStatus(orderId: string, payload: unknown): void {
    this.server.to(this.orderRoom(orderId)).emit(WS_EVENTS.ORDER_STATUS_UPDATED, payload);
  }

  emitRiderLocation(orderId: string, payload: unknown): void {
    this.server.to(this.orderRoom(orderId)).emit(WS_EVENTS.RIDER_LOCATION, payload);
  }

  emitKdsUpdate(branchId: string, payload: unknown): void {
    this.server.to(this.kdsRoom(branchId)).emit(WS_EVENTS.KDS_UPDATE, payload);
  }

  emitNewOrder(branchId: string, payload: unknown): void {
    this.server.to(this.kdsRoom(branchId)).emit(WS_EVENTS.NEW_ORDER, payload);
  }

  emitRiderAssignment(riderId: string, payload: unknown): void {
    this.server.to(this.riderRoom(riderId)).emit(WS_EVENTS.RIDER_ASSIGNMENT, payload);
  }

  emitNotification(userId: string, payload: unknown): void {
    this.server.to(this.userRoom(userId)).emit('notification', payload);
  }

  private orderRoom(orderId: string): string {
    return `order:${orderId}`;
  }

  private kdsRoom(branchId: string): string {
    return `kds:${branchId}`;
  }

  private riderRoom(riderId: string): string {
    return `rider:${riderId}`;
  }

  private userRoom(userId: string): string {
    return `user:${userId}`;
  }
}
