import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { Operation } from '@common/types/design.types';

interface JoinRoomPayload {
  templateId: string;
  userId: string;
  userName?: string;
}

interface ApplyOperationsPayload {
  templateId: string;
  operations: Operation[];
  baseVersion: number;
  userId: string;
}

interface CursorUpdate {
  templateId: string;
  userId: string;
  x: number;
  y: number;
}

interface UserPresence {
  userId: string;
  userName: string;
  joinedAt: number;
}

@WebSocketGateway({
  namespace: '/collaboration',
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
})
export class CollaborationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CollaborationGateway.name);
  private readonly roomUsers = new Map<string, Map<string, UserPresence>>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove user from all rooms
    this.roomUsers.forEach((users, roomId) => {
      const userId = this.getUserIdFromSocket(client);
      if (userId && users.has(userId)) {
        users.delete(userId);
        this.server.to(roomId).emit('user_left', { userId });
        this.logger.log(`User ${userId} left room ${roomId}`);
      }
    });
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinRoomPayload,
  ) {
    const roomId = `template:${data.templateId}`;

    // Join the Socket.IO room
    await client.join(roomId);

    // Track user presence
    if (!this.roomUsers.has(roomId)) {
      this.roomUsers.set(roomId, new Map());
    }

    const roomUserMap = this.roomUsers.get(roomId)!;
    roomUserMap.set(data.userId, {
      userId: data.userId,
      userName: data.userName || 'Anonymous',
      joinedAt: Date.now(),
    });

    // Store userId on socket for later reference
    (client as any).userId = data.userId;

    // Send current users to the joining client
    const currentUsers = Array.from(roomUserMap.values());
    client.emit('room_state', {
      users: currentUsers.filter((u) => u.userId !== data.userId),
    });

    // Notify others of new user
    client.to(roomId).emit('user_joined', {
      userId: data.userId,
      userName: data.userName || 'Anonymous',
    });

    this.logger.log(`User ${data.userId} joined room ${roomId}`);

    return {
      success: true,
      roomId,
      userCount: roomUserMap.size,
    };
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { templateId: string; userId: string },
  ) {
    const roomId = `template:${data.templateId}`;

    await client.leave(roomId);

    const roomUserMap = this.roomUsers.get(roomId);
    if (roomUserMap) {
      roomUserMap.delete(data.userId);
      client.to(roomId).emit('user_left', { userId: data.userId });
    }

    this.logger.log(`User ${data.userId} left room ${roomId}`);

    return { success: true };
  }

  @SubscribeMessage('apply_operations')
  async handleApplyOperations(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ApplyOperationsPayload,
  ) {
    const roomId = `template:${data.templateId}`;

    this.logger.log(
      `Broadcasting ${data.operations.length} operations to room ${roomId}`,
    );

    // Broadcast operations to all clients in the room EXCEPT the sender
    client.to(roomId).emit('operations_applied', {
      operations: data.operations,
      userId: data.userId,
      timestamp: Date.now(),
    });

    return {
      success: true,
      operationCount: data.operations.length,
    };
  }

  @SubscribeMessage('cursor_move')
  handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CursorUpdate,
  ) {
    const roomId = `template:${data.templateId}`;

    // Broadcast cursor position to others
    client.to(roomId).emit('cursor_updated', {
      userId: data.userId,
      x: data.x,
      y: data.y,
    });
  }

  @SubscribeMessage('element_selected')
  handleElementSelected(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      templateId: string;
      userId: string;
      pageId: string;
      elementId: string;
    },
  ) {
    const roomId = `template:${data.templateId}`;

    client.to(roomId).emit('element_selection_changed', {
      userId: data.userId,
      pageId: data.pageId,
      elementId: data.elementId,
    });
  }

  private getUserIdFromSocket(socket: Socket): string | undefined {
    return (socket as any).userId;
  }
}
