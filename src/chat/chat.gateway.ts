import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
})
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const token = socket.handshake.query.token as string;
      if (!token) {
        socket.disconnect();
        throw new WsException('No token provided');
      }

      const secret = this.config.get<string>('JWT_SECRET') || 'secretKey';
      const payload = this.jwtService.verify(token, { secret });

      socket.data.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name || 'Unknown User',
      };

      this.logger.log(
        `Socket connected: ${socket.id} for user: ${payload.sub}`,
      );

      this.logger.log(`User ${payload.sub} joined room user:${payload.sub}`);

      socket.join(`user:${payload.sub}`);

      this.server.emit('userOnline', { userId: payload.sub });
    } catch (err) {
      this.logger.error(`Connection error: ${err.message}`);
      socket.disconnect();
      throw new WsException('Invalid token');
    }
  }

  handleDisconnect(socket: Socket) {
    const user = socket.data.user;
    if (user) {
      socket.leave(`user:${user.id}`);
      this.server.emit('userOffline', { userId: user.id });
    }
    this.logger.log(`Socket disconnected: ${socket.id}`);
  }

  @SubscribeMessage('messageSent')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: number; text: string },
  ) {
    const sender = client.data.user;

    const message = await this.chatService.createMessage(
      sender.id,
      data.receiverId,
      data.text,
    );
    this.logger.log(
      `Emitting to rooms: user:${sender.id}, user:${data.receiverId} | Message: ${data.text}`,
    );
    this.server.to(`user:${sender.id}`).emit('messageSent', message);
    this.server.to(`user:${data.receiverId}`).emit('messageSent', message);

    return message;
  }

  @SubscribeMessage('getMessages')
  async handleGetMessages(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: number },
  ) {
    const sender = client.data.user;

    const messages = await this.chatService.getMessages(
      sender.id,
      data.receiverId,
    );

    return messages;
  }

  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody('receiverId') receiverId: number,
  ) {
    const senderId = client.data.user.id;
    const room = `chat_${Math.min(senderId, receiverId)}_${Math.max(receiverId, senderId)}`;
    client.join(room);
    return { event: 'joinedChat', data: { room } };
  }
}
