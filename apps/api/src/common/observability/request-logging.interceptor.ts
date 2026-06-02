import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { requestContext } from "../http/request-context";

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const requestId = requestContext.getRequestId();

    return next.handle().pipe(
      tap(() => {
        const latencyMs = Date.now() - now;
        this.logger.log(
          JSON.stringify({
            requestId,
            method: req.method,
            path: req.url,
            statusCode: res.statusCode,
            latencyMs
          })
        );
      })
    );
  }
}
