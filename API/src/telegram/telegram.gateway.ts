import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: 'telegram',
  cors: {
    origin: ['https://admin.socket.io', 'http://localhost:3000'],
    credentials: true,
  },
})
export class TelegramGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TelegramGateway.name);

  /**
   * Handle client connection
   * Clients should join a room based on their Firebase UID
   */
  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Notify a specific user that they have been added as co-admin
   * With Redis adapter, this event will be delivered to the user regardless of which pod they're connected to
   * @param firebaseUid - The Firebase UID of the user to notify
   * @param channelHandle - The handle of the channel they were promoted in
   */
  notifyCoAdminAdded(firebaseUid: string, channelHandle: string): void {
    const room = `user:${firebaseUid}`;
    const event = 'coAdminAdded';
    const payload = {
      channelHandle,
      timestamp: new Date().toISOString(),
      status: 'success',
    };

    this.logger.log(
      `Emitting ${event} to room ${room} for channel ${channelHandle} (via Redis to all pods)`,
    );
    // This now broadcasts to ALL pods via Redis
    this.server.to(room).emit(event, payload);
  }

  /**
   * Allow clients to join their user-specific room
   * This should be called by the client after connecting
   * @param client - The socket client
   * @param firebaseUid - The Firebase UID of the user (without "user:" prefix)
   */
  @SubscribeMessage('joinUserRoom')
  joinUserRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() firebaseUid: string,
  ): void {
    // Strip "user:" prefix if client accidentally included it (defensive coding)
    const cleanUid = firebaseUid.replace(/^user:/, '');
    const room = `user:${cleanUid}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room}`);
  }
}
