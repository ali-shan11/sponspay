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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../transaction/entities/transaction.entity';

@WebSocketGateway({
  namespace: 'fan',
  cors: {
    origin: true, // Allow all origins for fan payments (public endpoint)
    credentials: true,
  },
})
export class FanGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FanGateway.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  /**
   * Handle client connection
   */
  handleConnection(client: Socket): void {
    this.logger.log(`Fan client connected: ${client.id}`);
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket): void {
    this.logger.log(`Fan client disconnected: ${client.id}`);
  }

  /**
   * Notify fan about payment status update
   * Uses fanSessionId-based rooms for anonymous fan tracking
   * @param fanSessionId - The unique session ID for this fan payment
   * @param payload - Payment status payload
   */
  notifyPaymentStatus(
    fanSessionId: string,
    payload: {
      status: string;
      depositId: string;
      transactionId: string;
      reason?: string;
    },
  ): void {
    const room = `fan:${fanSessionId}`;
    const event = 'paymentStatus';

    this.logger.log(
      `Emitting ${event} to room ${room} with status ${payload.status}`,
    );

    this.server.to(room).emit(event, {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify fan about message delivery status
   * @param fanSessionId - The unique session ID for this fan payment
   * @param payload - Message delivery status payload
   */
  notifyMessageDelivery(
    fanSessionId: string,
    payload: {
      status: 'delivered' | 'failed';
      messageId: string | null;
      error?: string;
      refunded?: boolean;
    },
  ): void {
    const room = `fan:${fanSessionId}`;
    const event = 'messageDelivery';

    this.logger.log(
      `Emitting ${event} to room ${room} with status ${payload.status}`,
    );

    this.server.to(room).emit(event, {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Allow fans to join their session-specific room
   * This should be called by the client after receiving fanSessionId from payment initiation
   * @param client - The socket client
   * @param fanSessionId - The fan session ID (without "fan:" prefix)
   */
  @SubscribeMessage('joinFanRoom')
  async joinFanRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() fanSessionId: string,
  ): Promise<void> {
    // Strip "fan:" prefix if client accidentally included it
    const cleanSessionId = fanSessionId.replace(/^fan:/, '');
    const room = `fan:${cleanSessionId}`;
    client.join(room);
    this.logger.log(`Fan client ${client.id} joined room ${room}`);

    // Send confirmation
    client.emit('roomJoined', {
      fanSessionId: cleanSessionId,
      timestamp: new Date().toISOString(),
    });

    // Replay missed payment status if the transaction already settled
    // (handles race condition where PawaPay callback arrives before client connects)
    try {
      const transaction = await this.transactionRepo.findOne({
        where: { fanSessionId: cleanSessionId },
        relations: ['status'],
      });

      if (
        transaction &&
        (transaction.status.code === 'succeeded' ||
          transaction.status.code === 'failed')
      ) {
        this.logger.log(
          `Replaying missed paymentStatus for session ${cleanSessionId}: ${transaction.status.code}`,
        );
        client.emit('paymentStatus', {
          status: transaction.status.code,
          depositId: transaction.depositId,
          transactionId: transaction.id,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to check missed events for session ${cleanSessionId}: ${error?.message}`,
      );
    }
  }
}
