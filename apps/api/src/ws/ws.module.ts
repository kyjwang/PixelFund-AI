import { Module } from "@nestjs/common";
import { EventsGateway } from "./events.gateway";
import { QuotesModule } from "../quotes/quotes.module";

@Module({
  imports: [QuotesModule],
  providers: [EventsGateway],
  exports: [EventsGateway]
})
export class WsModule {}
