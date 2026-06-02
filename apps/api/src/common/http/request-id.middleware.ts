import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "crypto";
import { requestContext } from "./request-context";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const requestId = req.header("x-request-id") ?? randomUUID();
    res.setHeader("x-request-id", requestId);
    requestContext.run(requestId, () => next());
  }
}
