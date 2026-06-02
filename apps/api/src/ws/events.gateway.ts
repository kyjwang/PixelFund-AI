import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { QuotesService } from "../quotes/quotes.service";

@WebSocketGateway({ cors: { origin: "*" } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly quotesService: QuotesService) {
    this.quotesService.setEmitter((event, payload) => this.emit(event, payload));
  }

  handleConnection(client: Socket) {
    this.logger.log(`socket connected ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.quotesService.removeClient(client.id);
    this.logger.log(`socket disconnected ${client.id}`);
  }

  @SubscribeMessage("quote.subscribe")
  subscribeTicker(@ConnectedSocket() client: Socket, @MessageBody() payload: { ticker: string }) {
    this.quotesService.ensureSubscription(client.id, payload.ticker);
  }

  emit(event: string, payload: unknown) {
    this.server.emit(event, payload);
  }
}
