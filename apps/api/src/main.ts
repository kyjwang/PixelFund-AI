import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/errors/http-exception.filter";
import { ResponseEnvelopeInterceptor } from "./common/http/response-envelope.interceptor";
import { validateEnv } from "./common/config/env";
import { RequestLoggingInterceptor } from "./common/observability/request-logging.interceptor";

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: "*" });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  Logger.log(`API listening on port ${port}`, "Bootstrap");
}

bootstrap();
