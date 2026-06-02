import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { requestContext } from "../http/request-context";
import { DomainError } from "./domain.error";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const requestId = requestContext.getRequestId();

    if (exception instanceof DomainError) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details,
          requestId
        }
      });
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return response.status(status).json({
        error: {
          code: `HTTP_${status}`,
          message: exception.message,
          details: exception.getResponse(),
          requestId
        }
      });
    }

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected server error",
        requestId,
        details: process.env.NODE_ENV === "development" ? String(exception) : undefined
      }
    });
  }
}
